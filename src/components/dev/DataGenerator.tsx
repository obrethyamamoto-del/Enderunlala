
import React, { useState } from 'react';
import { db } from '../../config/firebase'; // Adjust paths as needed
import { collection, doc, setDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../../stores/authStore';
import { getPublishedQuizzes } from '../../services/quizService';
import type { Quiz } from '../../types/quiz';
import { Button } from '../common';

const DUMMY_STUDENTS = [
    {
        id: 'student_9a_1_gen',
        email: 'ali.yilmaz@dummy.com',
        displayName: 'Ali Yılmaz',
        role: 'student' as const,
        studentNumber: '901',
        classId: '9-A',
        isActive: true,
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
    },
    {
        id: 'student_9a_2_gen',
        email: 'ayse.demir@dummy.com',
        displayName: 'Ayşe Demir',
        role: 'student' as const,
        studentNumber: '902',
        classId: '9-A',
        isActive: true,
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    },
    {
        id: 'student_9a_3_gen',
        email: 'mehmet.oz@dummy.com',
        displayName: 'Mehmet Öz',
        role: 'student' as const,
        studentNumber: '903',
        classId: '9-A',
        isActive: true,
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet',
    },
    {
        id: 'student_9a_4_gen',
        email: 'zeynep.kaya@dummy.com',
        displayName: 'Zeynep Kaya',
        role: 'student' as const,
        studentNumber: '904',
        classId: '9-A',
        isActive: true,
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zeynep',
    },
];

interface DataGeneratorProps {
    onDataGenerated?: () => void;
}

export const DataGenerator: React.FC<DataGeneratorProps> = ({ onDataGenerated }) => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const generateData = async () => {
        if (!user || !user.institutionId) {
            setStatus('Hata: Kurum ID bulunamadı. Lütfen giriş yapın.');
            return;
        }

        setLoading(true);
        setStatus('Öğrenciler oluşturuluyor...');

        try {
            // 1. Create Students
            for (const student of DUMMY_STUDENTS) {
                const studentData = {
                    ...student,
                    institutionId: user.institutionId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                await setDoc(doc(db, 'users', student.id), studentData);
            }

            setStatus('Sınavlar getiriliyor...');

            // 2. Fetch Published Quizzes
            // Note: In real app, we might filter by classId '9A' or assign quiz to class. 
            // For now, let's assume all published quizzes are valid for 9A or just assign them.
            // If quiz has restricted classIds, we should respect that or just force it for test data.
            const quizzes = await getPublishedQuizzes();

            if (quizzes.length === 0) {
                setStatus('Uyarı: Yayınlanmış sınav bulunamadı. Lütfen önce sınav yayınlayın.');
                setLoading(false);
                return;
            }

            setStatus(`${quizzes.length} sınav için cevaplar üretiliyor...`);

            // 3. Generate Submissions
            let submissionCount = 0;

            for (const quiz of quizzes) {
                for (const student of DUMMY_STUDENTS) {
                    // Decide if this student took this quiz (e.g. 90% chance)
                    if (Math.random() > 0.1) {
                        const submission = createRandomSubmission(quiz, student.id);
                        await addDoc(collection(db, 'quiz_submissions'), submission);
                        submissionCount++;
                    }
                }
            }

            setStatus(`Başarılı! 4 öğrenci ve ${submissionCount} sınav sonucu oluşturuldu.`);
            if (onDataGenerated) {
                onDataGenerated();
            }
        } catch (error: any) {
            console.error('Data generation error:', error);
            setStatus(`Hata: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const createRandomSubmission = (quiz: Quiz, studentId: string) => {
        // Random performance factor for student (0.3 to 0.95 accuracy)
        const studentAccuracy = 0.3 + (Math.random() * 0.65);

        const answers: any[] = quiz.questions.map((q) => {
            const isCorrect = Math.random() < studentAccuracy;
            let pointsEarned = 0;
            let selectedOptionIds: string[] = [];
            let booleanAnswer: boolean | null = null;

            if (q.type === 'multiple_choice') {
                const correctOptions = (q as any).options.filter((o: any) => o.isCorrect);
                const wrongOptions = (q as any).options.filter((o: any) => !o.isCorrect);

                if (isCorrect && correctOptions.length > 0) {
                    selectedOptionIds = [correctOptions[0].id]; // Single correct selection for now
                } else if (wrongOptions.length > 0) {
                    selectedOptionIds = [wrongOptions[Math.floor(Math.random() * wrongOptions.length)].id];
                }
            } else if (q.type === 'true_false') {
                const correctAns = (q as any).correctAnswer;
                booleanAnswer = isCorrect ? correctAns : !correctAns;
            }

            if (isCorrect) pointsEarned = q.points;

            return {
                questionId: q.id,
                questionType: q.type,
                selectedOptionIds,
                booleanAnswer,
                isCorrect,
                pointsEarned,
                answeredAt: new Date(),
                timeSpent: Math.floor(Math.random() * 60) + 10, // 10-70 seconds
            };
        });

        const score = answers.reduce((acc, curr) => acc + curr.pointsEarned, 0);
        const totalPoints = quiz.totalPoints;
        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
        const passed = quiz.settings?.passingScore ? percentage >= quiz.settings.passingScore : true;

        // Random past date (last 7 days)
        const dateOffset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
        const submissionDate = new Date(Date.now() - dateOffset);
        const startedAt = new Date(submissionDate.getTime() - (quiz.estimatedDuration * 60 * 1000));

        return {
            quizId: quiz.id,
            studentId: studentId,
            answers,
            score,
            totalPoints,
            percentage,
            passed,
            status: 'graded',
            attemptNumber: 1,
            startedAt: Timestamp.fromDate(startedAt),
            submittedAt: Timestamp.fromDate(submissionDate),
            gradedAt: Timestamp.fromDate(submissionDate),
            duration: Math.floor((submissionDate.getTime() - startedAt.getTime()) / 1000),
        };
    };

    return (
        <div style={{
            padding: '20px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            margin: '20px 0'
        }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>🛠️ Test Verisi Oluşturucu</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                9A sınıfı için 4 öğrenci oluşturur ve yayınlanmış sınavlar için rastgele sonuçlar üretir.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                    variant="primary"
                    onClick={generateData}
                    disabled={loading}
                    className="vibrantAddBtn" // Re-using existing class for style if available
                >
                    {loading ? 'İşleniyor...' : 'Test Verisi Üret'}
                </Button>
                {status && (
                    <span style={{
                        fontSize: '14px',
                        color: status.includes('Hata') ? '#ef4444' : '#10b981',
                        fontWeight: 500
                    }}>
                        {status}
                    </span>
                )}
            </div>
        </div>
    );
};
