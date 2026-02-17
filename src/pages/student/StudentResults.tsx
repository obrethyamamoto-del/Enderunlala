import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { getAllStudentSubmissions, getQuiz, resetStudentSubmissions } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button, Loader, Card } from '../../components/common';
import { FileText, ChevronRight, Award, Calendar, Clock, Trash2 } from 'lucide-react'; instructs: 'import { Trash2 } from "lucide-react";'
import styles from './StudentResults.module.css';
import type { QuizSubmission, Quiz } from '../../types/quiz';

export const StudentResults: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
    const [quizzes, setQuizzes] = useState<Record<string, Quiz>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const allSubs = await getAllStudentSubmissions(user.id);
                // Filter only completed submissions
                const subs = allSubs.filter(s => s.status === 'submitted' || s.status === 'graded');
                setSubmissions(subs);

                // Fetch unique quiz info
                const quizIds = Array.from(new Set(subs.map(s => s.quizId)));
                const quizMap: Record<string, Quiz> = {};

                await Promise.all(quizIds.map(async (id) => {
                    const q = await getQuiz(id);
                    if (q) quizMap[id] = q;
                }));

                setQuizzes(quizMap);
            } catch (err) {
                console.error('Failed to fetch results:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleReset = async () => {
        if (!user) return;
        if (!window.confirm('Tüm sınav geçmişiniz silinecektir. Bu işlem geri alınamaz. Emin misiniz?')) return;

        try {
            setLoading(true);
            await resetStudentSubmissions(user.id);
            setSubmissions([]);
            setQuizzes({});
            addToast({ type: 'success', title: 'Sıfırlandı', message: 'Tüm sınav geçmişiniz silindi.' });
        } catch (err) {
            console.error('Reset failed:', err);
            addToast({ type: 'error', title: 'Hata', message: 'Sıfırlama işlemi başarısız oldu.' });
        } finally {
            setLoading(false);
        }
    };

    const { addToast } = useUIStore();

    const formatDate = (date?: Date) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <StudentLayout title="Sonuçlarım">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                    <Loader size="lg" />
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout title="Sonuçlarım">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.title}>Sınav Geçmişi</h2>
                        <p className={styles.subtitle}>Katıldığınız tüm sınavların detaylarını burada görebilirsiniz.</p>
                    </div>
                    <div className={styles.summaryStats}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryValue}>{submissions.length}</span>
                            <span className={styles.summaryLabel}>Toplam Sınav</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryValue}>
                                {submissions.length > 0 ?
                                    Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length) : 0}%
                            </span>
                            <span className={styles.summaryLabel}>Ortalama Başarı</span>
                        </div>
                        <button className={styles.resetBtn} onClick={handleReset} title="Tüm Geçmişi Temizle (Debug)">
                            <Trash2 size={24} />
                        </button>
                    </div>
                </div>

                {submissions.length === 0 ? (
                    <Card className={styles.emptyState}>
                        <FileText size={48} color="#94a3b8" />
                        <h3>Henüz bir sınava katılmadınız</h3>
                        <p>Öğretmenleriniz tarafından atanan sınavları çözdükten sonra sonuçlarınız burada görünecektir.</p>
                        <Button variant="primary" onClick={() => navigate('/student')}>
                            Sınavları Görüntüle
                        </Button>
                    </Card>
                ) : (
                    <div className={styles.resultsList}>
                        {submissions.map((sub) => {
                            const quiz = quizzes[sub.quizId];
                            const passed = sub.passed;

                            return (
                                <div key={sub.id} className={styles.resultItem} onClick={() => navigate(`/student/quiz/result/${sub.id}`)}>
                                    <div className={styles.resultMain}>
                                        <div className={styles.iconWrapper}>
                                            <Award size={24} color={passed ? '#22c55e' : '#64748b'} />
                                        </div>
                                        <div className={styles.quizInfo}>
                                            <h4 className={styles.quizTitle}>{quiz?.title || 'Bilinmeyen Sınav'}</h4>
                                            <div className={styles.quizMeta}>
                                                <span className={styles.metaItem}>
                                                    <Calendar size={14} />
                                                    {formatDate(sub.submittedAt || sub.startedAt)}
                                                </span>
                                                <span className={styles.metaItem}>
                                                    <Clock size={14} />
                                                    {Math.floor((sub.duration || 0) / 60)} dk {(sub.duration || 0) % 60} sn
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.resultStats}>
                                        <div className={styles.scoreInfo}>
                                            <span className={styles.scoreLabel}>Puan</span>
                                            <span className={styles.scoreValue}>{sub.score} / {sub.totalPoints}</span>
                                        </div>
                                        <div className={styles.percentageInfo}>
                                            <div className={`${styles.percentageBadge} ${passed ? styles.passed : styles.failed}`}>
                                                %{sub.percentage}
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className={styles.arrow} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};
