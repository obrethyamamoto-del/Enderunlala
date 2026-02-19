import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getPublishedQuizzes, getAllStudentSubmissions, getQuiz } from '../../services/quizService';
import { ROUTES } from '../../config/routes';
import { Loader, Button } from '../../components/common';
import {
    Trophy,
    BookOpen,
    Star,
    Zap,
    School,
    GraduationCap,
    ChevronRight,
    Target,
    Calendar
} from 'lucide-react';
import styles from './Dashboard.module.css';
import type { Quiz, QuizSubmission } from '../../types/quiz';

export const StudentDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const student = user as any;

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
    const [quizMap, setQuizMap] = useState<Record<string, Quiz>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                const [fetchedQuizzes, fetchedSubmissions] = await Promise.all([
                    getPublishedQuizzes(),
                    getAllStudentSubmissions(user.id)
                ]);

                const finishedSubmissions = fetchedSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded');
                const finishedQuizIds = new Set(finishedSubmissions.map(s => s.quizId));

                // Map for quick title lookups
                const qMap: Record<string, Quiz> = {};
                fetchedQuizzes.forEach(q => qMap[q.id] = q);

                // Fetch missing quizzes (e.g. if they are old/closed but student has results)
                const missingIds = Array.from(new Set(finishedSubmissions.map(s => s.quizId))).filter(id => !qMap[id]);
                if (missingIds.length > 0) {
                    await Promise.all(missingIds.map(async (id) => {
                        const q = await getQuiz(id);
                        if (q) qMap[id] = q;
                    }));
                }

                setQuizMap(qMap);
                setQuizzes(fetchedQuizzes.filter(q => !finishedQuizIds.has(q.id)));
                setSubmissions(finishedSubmissions);
            } catch (error) {
                console.error('Dashboard data error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, [user]);

    const avgSuccess = submissions.length > 0
        ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length)
        : 0;

    if (isLoading) return <div className={styles.loadingWrapper}><Loader size="lg" /></div>;

    return (
        <div className={styles.page}>
            {/* Header Area */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div>
                        <h1 className={styles.greeting}>Merhaba, <span className={styles.studentName}>{user?.displayName?.split(' ')[0] || 'Öğrenci'}</span> 👋</h1>
                        <p className={styles.subtitle}>Sınavlarını çözmeye ve başarını artırmaya hazır mısın?</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Button variant="danger" className={styles.vibrantPulseBtn} onClick={() => navigate(ROUTES.STUDENT.QUIZZES)}>
                            SINAVLARA GİT
                        </Button>
                    </div>
                </div>

                <div className={styles.contextBar}>
                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>KURUMUM</label>
                        <div className={styles.contextValue}>
                            <School size={16} />
                            <span>Enderun Koleji Merkez</span>
                        </div>
                    </div>
                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>SINIFIM</label>
                        <div className={styles.contextValue}>
                            <GraduationCap size={16} />
                            <span>{student?.classId || '9-A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.blue}`} onClick={() => navigate(ROUTES.STUDENT.QUIZZES)}>
                    <div className={styles.statIcon}><BookOpen size={24} /></div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{quizzes.length}</span>
                        <span className={styles.statLabel}>AKTİF SINAV</span>
                    </div>
                    <div className={styles.statDecor}><BookOpen size={80} /></div>
                </div>
                <div className={`${styles.statCard} ${styles.purple}`} onClick={() => navigate(ROUTES.STUDENT.RESULTS)}>
                    <div className={styles.statIcon}><Trophy size={24} /></div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{submissions.length}</span>
                        <span className={styles.statLabel}>TAMAMLANAN</span>
                    </div>
                    <div className={styles.statDecor}><Trophy size={80} /></div>
                </div>
                <div className={`${styles.statCard} ${styles.orange}`} onClick={() => navigate(ROUTES.STUDENT.RESULTS)}>
                    <div className={styles.statIcon}><Star size={24} /></div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>%{avgSuccess}</span>
                        <span className={styles.statLabel}>BAŞARI ORT.</span>
                    </div>
                    <div className={styles.statDecor}><Star size={80} /></div>
                </div>
                <div className={`${styles.statCard} ${styles.green}`}>
                    <div className={styles.statIcon}><Target size={24} /></div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>12</span>
                        <span className={styles.statLabel}>SORU ÇÖZÜLDÜ</span>
                    </div>
                    <div className={styles.statDecor}><Target size={80} /></div>
                </div>
            </div>

            {/* Content Lists */}
            <div className={styles.contentGrid}>
                {/* Active Quizzes */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Sana Atanan Sınavlar</h2>
                        <button className={styles.seeAllBtn} onClick={() => navigate(ROUTES.STUDENT.QUIZZES)}>Tümünü Gör</button>
                    </div>
                    <div className={styles.list}>
                        {quizzes.slice(0, 3).map(quiz => (
                            <div key={quiz.id} className={styles.listItem} onClick={() => navigate(ROUTES.STUDENT.QUIZ_PLAYER.replace(':id', quiz.id))}>
                                <div className={styles.itemIcon}><Zap size={20} /></div>
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemTitle}>{quiz.title}</h4>
                                    <div className={styles.itemMeta}>
                                        <span>{quiz.questions.length} Soru</span>
                                        <span>•</span>
                                        <span>{quiz.estimatedDuration} Dakika</span>
                                    </div>
                                </div>
                                <ChevronRight className={styles.itemArrow} size={20} />
                            </div>
                        ))}
                        {quizzes.length === 0 && <div className={styles.empty}>Atanmış yeni bir sınavın yok.</div>}
                    </div>
                </div>

                {/* Recent Results */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Son Sınav Sonuçların</h2>
                        <button className={styles.seeAllBtn} onClick={() => navigate(ROUTES.STUDENT.RESULTS)}>Tümünü Gör</button>
                    </div>
                    <div className={styles.list}>
                        {submissions.slice(0, 3).map(sub => {
                            const quiz = quizMap[sub.quizId];
                            return (
                                <div key={sub.id} className={styles.listItem} onClick={() => navigate(ROUTES.STUDENT.QUIZ_RESULT.replace(':id', sub.id))}>
                                    <div className={`${styles.itemIcon} ${styles.resultIcon}`}><Trophy size={20} /></div>
                                    <div className={styles.itemInfo}>
                                        <h4 className={styles.itemTitle}>{quiz?.title || 'Yükleniyor...'}</h4>
                                        <div className={styles.itemMeta}>
                                            <span style={{ color: sub.percentage! >= 60 ? '#10b981' : '#f59e0b', fontWeight: 800 }}>%{sub.percentage} Başarı</span>
                                            <span>•</span>
                                            <Calendar size={12} style={{ marginRight: 4 }} />
                                            <span>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className={styles.itemArrow} size={20} />
                                </div>
                            );
                        })}
                        {submissions.length === 0 && <div className={styles.empty}>Henüz tamamladığın bir sınav yok.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
