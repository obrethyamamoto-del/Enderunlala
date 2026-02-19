import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedQuizzes, getStudentSubmissions } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { Loader } from '../../components/common';
import { ClipboardList, Clock, BookOpen, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import styles from './StudentQuizList.module.css';
import type { Quiz, QuizSubmission } from '../../types/quiz';

type TabType = 'active' | 'completed';

export const StudentQuizList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('active');

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [quizData, submissionData] = await Promise.all([
                    getPublishedQuizzes(),
                    getStudentSubmissions('', user.id)
                ]);

                // Filter quizzes by class
                const studentClassId = (user as any)?.classId;
                const filteredQuizzes = quizData.filter(q => {
                    // Show if no specific classes assigned (public to all students)
                    if (!q.classIds || q.classIds.length === 0) return true;
                    // Show if student's class is in the list
                    return studentClassId && q.classIds.includes(studentClassId);
                });

                setAllQuizzes(filteredQuizzes);
                setSubmissions(submissionData);
            } catch (err) {
                console.error('Failed to fetch quizzes:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const completedQuizIds = new Set(
        submissions
            .filter(s => s.status === 'submitted' || s.status === 'graded')
            .map(s => s.quizId)
    );

    const activeQuizzes = allQuizzes.filter(q => !completedQuizIds.has(q.id));
    const completedQuizzes = allQuizzes.filter(q => completedQuizIds.has(q.id));

    const displayQuizzes = activeTab === 'active' ? activeQuizzes : completedQuizzes;

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <Loader size="lg" />
                    <p>Sınavlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.title}>Sınavlarım</h1>
                    <p className={styles.subtitle}>Eğitim yolculuğundaki tüm sınavlarını buradan takip edebilirsin.</p>
                </div>
            </div>

            <div className={styles.tabBar}>
                <button
                    className={`${styles.tabItem} ${activeTab === 'active' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    <ClipboardList size={20} />
                    <span>Aktif Sınavlar ({activeQuizzes.length})</span>
                </button>
                <button
                    className={`${styles.tabItem} ${activeTab === 'completed' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    <Trophy size={20} />
                    <span>Tamamlananlar ({completedQuizzes.length})</span>
                </button>
            </div>

            {displayQuizzes.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        {activeTab === 'active' ? <BookOpen size={64} strokeWidth={1} /> : <Trophy size={64} strokeWidth={1} />}
                    </div>
                    <h3>{activeTab === 'active' ? 'Henüz aktif bir sınav yok' : 'Henüz tamamladığın bir sınav yok'}</h3>
                    <p>
                        {activeTab === 'active'
                            ? 'Öğretmenlerin yeni sınavlar yayınladığında burada görünecektir.'
                            : 'Çözdüğün sınavların sonuçlarını bu alandan inceleyebilirsin.'}
                    </p>
                </div>
            ) : (
                <div className={styles.quizList}>
                    {displayQuizzes.map((quiz) => {
                        const submission = submissions.find(s => s.quizId === quiz.id);
                        const isCompleted = submission?.status === 'submitted' || submission?.status === 'graded';

                        return (
                            <div
                                key={quiz.id}
                                className={`${styles.quizItem} ${isCompleted ? styles.itemCompleted : styles.itemActive}`}
                                onClick={() => {
                                    if (isCompleted) {
                                        navigate(`/student/quiz/result/${submission?.id}`);
                                    } else {
                                        navigate(`/student/quiz/${quiz.id}`);
                                    }
                                }}
                            >
                                <div className={styles.quizIcon}>
                                    {isCompleted ? <CheckCircle2 size={24} /> : <ClipboardList size={24} />}
                                </div>

                                <div className={styles.quizInfo}>
                                    <div className={styles.quizTitle}>
                                        {quiz.title}
                                    </div>
                                    <div className={styles.quizMeta}>
                                        <span>{quiz.subject || 'Genel'}</span>
                                        <span>•</span>
                                        <span>{quiz.questions.length} Soru</span>
                                        <span>•</span>
                                        <div className={styles.duration}>
                                            <Clock size={16} />
                                            <span>{quiz.estimatedDuration} dk</span>
                                        </div>
                                    </div>
                                    <div className={styles.statusWrapper}>
                                        {isCompleted ? (
                                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                TAMAMLANDI (%{submission?.percentage})
                                            </span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgePublished}`}>
                                                YAYINDA
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.quizActions}>
                                    <div className={isCompleted ? styles.completedLink : styles.startLink}>
                                        {isCompleted ? 'Sonuca Git' : 'Sınava Başla'}
                                        <ChevronRight size={20} className={styles.actionArrow} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentQuizList;
