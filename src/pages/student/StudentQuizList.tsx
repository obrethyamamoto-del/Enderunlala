import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { getPublishedQuizzes } from '../../services/quizService';
import { Loader } from '../../components/common';
import { Play, HelpCircle, Clock, Book } from 'lucide-react';
import styles from './StudentQuizList.module.css';
import type { Quiz } from '../../types/quiz';

export const StudentQuizList: React.FC = () => {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const data = await getPublishedQuizzes();
                setQuizzes(data);
            } catch (err) {
                console.error('Failed to fetch quizzes:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    if (loading) {
        return (
            <StudentLayout title="Sınavlarım">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <Loader size="lg" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout title="Sınavlarım">
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Aktif Sınavlar</h1>
                    <p className={styles.subtitle}>Çözülmeyi bekleyen veya tekrar edebileceğiniz sınavlar.</p>
                </div>

                {quizzes.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
                            <HelpCircle size={48} strokeWidth={1} />
                        </div>
                        <h3>Henüz aktif bir sınav yok</h3>
                        <p>Öğretmenleriniz yeni bir sınav yayınladığında burada görünecektir.</p>
                    </div>
                ) : (
                    <div className={styles.quizGrid}>
                        {quizzes.map((quiz) => (
                            <div
                                key={quiz.id}
                                className={styles.quizCard}
                                onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.iconBox}>
                                        <Book size={24} strokeWidth={1.5} />
                                    </div>
                                    <span className={styles.questionCount}>
                                        {quiz.questions.length} Soru
                                    </span>
                                </div>

                                <h3 className={styles.quizTitle}>{quiz.title}</h3>
                                <p className={styles.quizDesc}>
                                    {quiz.description || 'Bu sınav için açıklama bulunmuyor.'}
                                </p>

                                <div className={styles.quizFooter}>
                                    <div className={styles.metaInfo}>
                                        <Clock size={14} />
                                        <span>{quiz.estimatedDuration} dk</span>
                                    </div>
                                    <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 600 }}>
                                        Başla <Play size={14} fill="currentColor" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};
