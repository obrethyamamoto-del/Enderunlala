import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublishedQuizzes, getStudentSubmissions } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { Loader } from '../../components/common';
import { ClipboardList, Clock, BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import styles from './StudentQuizList.module.css';
import type { Quiz, QuizSubmission } from '../../types/quiz';

export const StudentQuizList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [quizData, submissionData] = await Promise.all([
                    getPublishedQuizzes(),
                    getStudentSubmissions('', user.id) // Get all student submissions
                ]);
                setQuizzes(quizData);
                setSubmissions(submissionData);
            } catch (err) {
                console.error('Failed to fetch quizzes:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

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
                    <h1 className={styles.title}>Aktif Sınavlarım</h1>
                    <p className={styles.subtitle}>Öğretmenlerin tarafından hazırlanan ve çözmeni bekleyen sınavlar.</p>
                </div>
            </div>

            {quizzes.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <BookOpen size={64} strokeWidth={1} />
                    </div>
                    <h3>Henüz aktif bir sınav yok</h3>
                    <p>Öğretmenlerin yeni sınavlar yayınladığında burada görünecektir.</p>
                </div>
            ) : (
                <div className={styles.quizList}>
                    {quizzes.map((quiz) => {
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
