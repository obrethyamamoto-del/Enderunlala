import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStudentSubmissions, getQuiz } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { Loader, Button } from '../../components/common';
import {
    ChevronRight,
    Award,
    Calendar,
    Trophy,
    BarChart3,
    ArrowLeft,
    Search,
    Filter
} from 'lucide-react';
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
                const subs = allSubs.filter(s => s.status === 'submitted' || s.status === 'graded');
                setSubmissions(subs);

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

    const avgSuccess = submissions.length > 0 ?
        Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length) : 0;

    if (loading) return <div className={styles.loadingWrapper}><Loader size="lg" /></div>;

    return (
        <div className={styles.page}>
            <div className={styles.breadcrumb}>
                <button className={styles.backBtn} onClick={() => navigate('/student')}>
                    <ArrowLeft size={18} />
                    <span>Panele Dön</span>
                </button>
            </div>

            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>Başarı Geçmişim</h1>
                    <p className={styles.subtitle}>Çözdüğün tüm sınavların detaylı analizleri burada.</p>
                </div>

                <div className={styles.statsSummary}>
                    <div className={styles.statBox}>
                        <div className={styles.statIcon}><Trophy size={18} /></div>
                        <div className={styles.statData}>
                            <span className={styles.statVal}>{submissions.length}</span>
                            <span className={styles.statLbl}>SINAV</span>
                        </div>
                    </div>
                    <div className={styles.statBox}>
                        <div className={styles.statIcon}><BarChart3 size={18} /></div>
                        <div className={styles.statData}>
                            <span className={styles.statVal}>%{avgSuccess}</span>
                            <span className={styles.statLbl}>ORTALAMA</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.filterBar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input type="text" placeholder="Sınav adı ara..." />
                </div>
                <div className={styles.filterBtn}>
                    <Filter size={18} />
                    <span>Filtrele</span>
                </div>
            </div>

            <div className={styles.list}>
                {submissions.map((sub) => {
                    const quiz = quizzes[sub.quizId];
                    const scoreColor = sub.percentage! >= 85 ? '#10b981' : (sub.percentage! >= 60 ? '#f59e0b' : '#ef4444');

                    return (
                        <div key={sub.id} className={styles.resultItem} onClick={() => navigate(`/student/quiz/result/${sub.id}`)}>
                            <div className={styles.resultMain}>
                                <div className={styles.itemIcon} style={{ color: scoreColor }}>
                                    <Award size={24} />
                                </div>
                                <div className={styles.itemContent}>
                                    <h3 className={styles.itemTitle}>{quiz?.title || 'Sınav Sonucu'}</h3>
                                    <div className={styles.itemMeta}>
                                        <div className={styles.metaItem}>
                                            <Calendar size={14} />
                                            <span>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.subjectTag}>{quiz?.subject || 'Genel'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.resultRight}>
                                <div className={styles.scoreGroup}>
                                    <span className={styles.scorePoints}>{sub.score} / {sub.totalPoints}</span>
                                    <div className={styles.percentageBadge} style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}>
                                        %{sub.percentage}
                                    </div>
                                </div>
                                <div className={styles.actionIcon}>
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {submissions.length === 0 && (
                    <div className={styles.empty}>
                        <Trophy size={48} strokeWidth={1} />
                        <h3>Henüz bir sınav sonucun yok</h3>
                        <p>Sınavları çözdükten sonra başarı analizlerini burada görebilirsin.</p>
                        <Button variant="primary" className={styles.vibrantBtn} onClick={() => navigate('/student/quizzes')}>
                            Sınavları Çözmeye Başla
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentResults;
