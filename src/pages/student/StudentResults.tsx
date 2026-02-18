import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStudentSubmissions, getQuiz, resetStudentSubmissions } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button, Loader, ConfirmModal } from '../../components/common';
import { FileText, ChevronRight, Award, Calendar, Clock, Trash2, Trophy, BarChart3 } from 'lucide-react';
import styles from './StudentResults.module.css';
import type { QuizSubmission, Quiz } from '../../types/quiz';

export const StudentResults: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { addToast } = useUIStore();

    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
    const [quizzes, setQuizzes] = useState<Record<string, Quiz>>({});
    const [loading, setLoading] = useState(true);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const allSubs = await getAllStudentSubmissions(user.id);
                // Filter only completed/submitted submissions
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
        setShowResetConfirm(true);
    };

    const confirmReset = async () => {
        if (!user) return;

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
            setShowResetConfirm(false);
        }
    };

    const formatDate = (date?: Date) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingContainer}>
                    <Loader size="lg" />
                    <p>Sonuçlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    const avgSuccess = submissions.length > 0 ?
        Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length) : 0;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h2 className={styles.title}>Başarı Geçmişim</h2>
                    <p className={styles.subtitle}>Katıldığın tüm sınavların detaylı analizlerini buradan inceleyebilirsin.</p>
                </div>

                <div className={styles.summaryStats}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon}><Trophy size={20} /></div>
                        <div className={styles.summaryText}>
                            <span className={styles.summaryValue}>{submissions.length}</span>
                            <span className={styles.summaryLabel}>Sınav</span>
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryIcon}><BarChart3 size={20} /></div>
                        <div className={styles.summaryText}>
                            <span className={styles.summaryValue}>%{avgSuccess}</span>
                            <span className={styles.summaryLabel}>Ortalama</span>
                        </div>
                    </div>
                    <button className={styles.resetBtn} onClick={handleReset} title="Tüm Geçmişi Temizle">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {submissions.length === 0 ? (
                <div className={styles.emptyState}>
                    <FileText size={48} strokeWidth={1} />
                    <h3>Henüz bir sınav sonucun yok</h3>
                    <p>Sınavları çözdükten sonra başarı analizlerini burada görebilirsin.</p>
                    <Button variant="primary" className={styles.vibrantBtn} onClick={() => navigate('/student/quizzes')}>
                        Sınavları Gör
                    </Button>
                </div>
            ) : (
                <div className={styles.resultsList}>
                    {submissions.map((sub) => {
                        const quiz = quizzes[sub.quizId];
                        const passed = sub.passed;

                        return (
                            <div key={sub.id} className={`${styles.resultItem} ${styles.itemCompleted}`} onClick={() => navigate(`/student/quiz/result/${sub.id}`)}>
                                <div className={styles.resultMain}>
                                    <div className={styles.iconWrapper}>
                                        <Award size={24} />
                                    </div>
                                    <div className={styles.quizInfo}>
                                        <h4 className={styles.quizTitle}>{quiz?.title || 'Sınav Sonucu'}</h4>
                                        <div className={styles.quizMeta}>
                                            <span className={styles.metaItem}>
                                                <Calendar size={14} />
                                                {formatDate(sub.submittedAt || sub.startedAt)}
                                            </span>
                                            <span className={styles.metaItem}>
                                                <Clock size={14} />
                                                {Math.floor((sub.duration || 0) / 60)} dk
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.resultStats}>
                                    <div className={styles.scoreInfo}>
                                        <span className={styles.scoreLabel}>PUAN</span>
                                        <span className={styles.scoreValue}>{sub.score} / {sub.totalPoints}</span>
                                    </div>
                                    <div className={styles.percentageInfo}>
                                        <div className={`${styles.percentageBadge} ${passed ? styles.badgePassed : styles.badgeFailed}`}>
                                            %{sub.percentage}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className={styles.detailsBtn}>
                                        Detayları Gör
                                        <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={confirmReset}
                title="Geçmişi Temizle"
                message="Tüm sınav geçmişiniz silinecektir. Bu işlem geri alınamaz. Emin misiniz?"
                confirmText="Sıfırla"
                isLoading={loading}
            />
        </div>
    );
};
