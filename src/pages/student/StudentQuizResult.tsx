import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { QuestionViewer } from '../../components/quiz';
import { getQuiz, getSubmission } from '../../services/quizService';
import { Button, Loader } from '../../components/common';
import { Check, X, ArrowLeft, BarChart2, FileText } from 'lucide-react';
import styles from './StudentQuizResult.module.css';
import type { Quiz, QuizSubmission, QuestionAnswer } from '../../types/quiz';

export const StudentQuizResult: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // This is submissionId
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<QuizSubmission | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const sub = await getSubmission(id);
                if (!sub) {
                    setError('Sonuç bulunamadı.');
                    setLoading(false);
                    return;
                }
                setSubmission(sub);

                const q = await getQuiz(sub.quizId);
                if (q) {
                    setQuiz(q);
                } else {
                    setError('İlgili sınav bilgisi bulunamadı.');
                }
            } catch (err) {
                console.error(err);
                setError('Veriler yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getUIAnswer = (qa: QuestionAnswer) => {
        switch (qa.questionType) {
            case 'multiple_choice':
                return qa.selectedOptionIds?.[0];
            case 'true_false':
                return qa.booleanAnswer;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <StudentLayout>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <Loader size="lg" />
                </div>
            </StudentLayout>
        );
    }

    if (error || !submission || !quiz) {
        return (
            <StudentLayout>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2>⚠️ Hata</h2>
                    <p>{error || 'Verilere ulaşılamadı.'}</p>
                    <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
                        Panele Dön
                    </Button>
                </div>
            </StudentLayout>
        );
    }

    const { percentage = 0, score = 0, totalPoints, passed } = submission;

    return (
        <StudentLayout title="Sınav Sonucu">
            <div className={styles.container}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryHeader}>
                        <h2 className={styles.title}>{quiz.title} - Sınav Özeti</h2>
                        <div className={`${styles.badge} ${passed ? styles.badgePassed : styles.badgeFailed}`}>
                            {passed ? 'BAŞARILI' : 'BAŞARISIZ'}
                        </div>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <div className={`${styles.scoreCircle} ${passed ? styles.passed : styles.failed}`}>
                                <span className={styles.scoreText}>%{percentage}</span>
                            </div>
                            <span className={styles.statLabel}>Başarı Oranı</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{score} / {totalPoints}</span>
                            <span className={styles.statLabel}>Toplam Puan</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{formatDuration(submission.duration)}</span>
                            <span className={styles.statLabel}>Harcanan Süre</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{submission.attemptNumber}.</span>
                            <span className={styles.statLabel}>Deneme</span>
                        </div>
                    </div>
                </div>

                <div className={styles.detailsHeader}>
                    <BarChart2 size={24} className={styles.icon} />
                    <h3 className={styles.detailsTitle}>Soru Detayları</h3>
                </div>

                <div className={styles.questionList}>
                    {quiz.questions.map((question, index) => {
                        const qa = submission.answers.find(a => a.questionId === question.id);
                        const isCorrect = qa?.isCorrect;

                        return (
                            <div key={question.id} className={styles.questionItem}>
                                <div className={styles.questionHeader}>
                                    <div className={styles.questionMeta}>
                                        <span className={styles.qNumber}>Soru {index + 1}</span>
                                        <span className={styles.pointBadge}>{question.points} Puan</span>
                                    </div>
                                    <div className={`${styles.resultIcon} ${isCorrect ? styles.iconCorrect : styles.iconIncorrect}`}>
                                        {isCorrect ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                                    </div>
                                </div>
                                <QuestionViewer
                                    question={question}
                                    answer={qa ? getUIAnswer(qa) : null}
                                    onAnswerChange={() => { }}
                                    readOnly={true}
                                    showFeedback={quiz.settings.showCorrectAnswers === 'immediately' || quiz.settings.showCorrectAnswers === 'after_submission'}
                                />
                                {qa?.feedback && (
                                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem', borderLeft: '4px solid #3b82f6' }}>
                                        <strong>Öğretmen Notu:</strong> {qa.feedback}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.actions}>
                    <Button
                        variant="outline"
                        leftIcon={<ArrowLeft size={18} />}
                        onClick={() => navigate('/student/dashboard')}
                    >
                        Panele Dön
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<FileText size={18} />}
                        onClick={() => navigate('/student/results')}
                    >
                        Tüm Sonuçlarım
                    </Button>
                </div>
            </div>
        </StudentLayout>
    );
};

export default StudentQuizResult;
