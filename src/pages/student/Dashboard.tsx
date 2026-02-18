import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Loader, Select } from '../../components/common';
import { Trophy, BookOpen, ChevronRight, Star, Target, Zap, GraduationCap, School } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getPublishedQuizzes, getAllStudentSubmissions } from '../../services/quizService';
import { ROUTES } from '../../config/routes';
import type { Quiz, QuizSubmission } from '../../types/quiz';
import styles from './Dashboard.module.css';

export const StudentDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const student = user as any; // Temporary cast, ideally use type guard

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
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

                setQuizzes(fetchedQuizzes);
                setSubmissions(fetchedSubmissions);
            } catch (error) {
                console.error('Error fetching student dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const stats = [
        {
            icon: <Trophy size={24} />,
            label: 'TAMAMLANAN',
            value: submissions.length.toString(),
            color: 'primary',
            path: ROUTES.STUDENT.RESULTS
        },
        {
            icon: <BookOpen size={24} />,
            label: 'AKTİF SINAVLAR',
            value: quizzes.length.toString(),
            color: 'accent',
            path: ROUTES.STUDENT.QUIZZES
        },
        {
            icon: <Star size={24} />,
            label: 'ORTALAMA BAŞARI',
            value: submissions.length > 0
                ? `%${Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length)}`
                : '%0',
            color: 'secondary',
            path: ROUTES.STUDENT.RESULTS
        },
        {
            icon: <Zap size={24} />,
            label: 'ÇÖZÜM SÜRESİ',
            value: submissions.length > 0
                ? `${Math.round(submissions.reduce((acc, s) => acc + (s.duration || 0), 0) / (submissions.length * 60))} dk`
                : '0 dk',
            color: 'teacher',
            path: ROUTES.STUDENT.RESULTS
        },
    ];

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <Loader size="lg" />
                    <p>Öğrenci Paneli yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.greeting}>Selam, {user?.displayName || 'Öğrenci'} 👋</h1>
                    <p className={styles.subtitle}>Sınavlarını çözmeye ve başarını artırmaya hazır mısın?</p>
                </div>

                <div className={styles.contextBar}>
                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>KURUM</label>
                        <Select
                            options={[{ value: 'enderun', label: 'Enderun Koleji Merkez' }]}
                            value="enderun"
                            onChange={() => { }}
                            icon={<School size={18} />}
                        />
                    </div>

                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>SINIFIM</label>
                        <Select
                            options={[{ value: 'current', label: student?.classId || '9-A' }]}
                            value="current"
                            onChange={() => { }}
                            icon={<GraduationCap size={18} />}
                        />
                    </div>

                    <Button
                        variant="primary"
                        size="md"
                        leftIcon={<BookOpen size={20} />}
                        className={styles.vibrantActionBtn}
                        onClick={() => navigate(ROUTES.STUDENT.QUIZZES)}
                    >
                        Puanlarımı Gör
                    </Button>

                    <Button
                        variant="danger"
                        size="md"
                        leftIcon={<Zap size={20} className={styles.liveIcon} />}
                        className={styles.liveRecordBtn}
                        onClick={() => navigate(ROUTES.STUDENT.QUIZZES)}
                    >
                        Sınavlara Git
                    </Button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`${styles.statCard} ${styles[stat.color]}`}
                        onClick={() => navigate(stat.path)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.statHeader}>
                            <div className={styles.statIconWrapper}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stat.value}</span>
                            <span className={styles.statLabel}>{stat.label}</span>
                        </div>
                        <div className={styles.statBgIcon}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.contentGrid}>
                {/* Atanan Sınavlar */}
                <Card variant="default" padding="lg" className={styles.activityCard}>
                    <CardHeader>
                        <div className={styles.sectionHeader}>
                            <CardTitle subtitle="Çözmeni bekleyen güncel sınavlar">
                                Atanan Sınavlar
                            </CardTitle>
                            <Link to={ROUTES.STUDENT.QUIZZES} className={styles.seeAllLink}>
                                Tümünü Gör
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.activityList}>
                            {quizzes.length > 0 ? (
                                quizzes.slice(0, 5).map((quiz) => (
                                    <div
                                        key={quiz.id}
                                        className={`${styles.activityItem} ${styles.itemPublished}`}
                                        onClick={() => navigate(`${ROUTES.STUDENT.QUIZ_PLAYER.replace(':id', quiz.id)}`)}
                                    >
                                        <div className={styles.activityIconBox}>
                                            <Target size={18} />
                                        </div>
                                        <div className={styles.activityContent}>
                                            <h4 className={styles.activityTitle}>{quiz.title}</h4>
                                            <span className={styles.activityMeta}>
                                                {quiz.questions.length} Soru • {quiz.estimatedDuration} dk • <span className={styles.statusLive}>YAYINDA</span>
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className={styles.activityArrow} />
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>Şu an atanmış yeni bir sınavın yok.</p>
                                    <p className={styles.emptySubtitle}>Öğretmenlerin sınav yayınladığında burada görünecek.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Son Sonuçlar */}
                <Card variant="default" padding="lg" className={styles.activityCard}>
                    <CardHeader>
                        <div className={styles.sectionHeader}>
                            <CardTitle subtitle="En son tamamladığın sınav sonuçları">
                                Son Sonuçlar
                            </CardTitle>
                            <Link to={ROUTES.STUDENT.RESULTS} className={styles.seeAllLink}>
                                Tümünü Gör
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.activityList}>
                            {submissions.length > 0 ? (
                                submissions.slice(0, 5).map((sub) => {
                                    const quiz = quizzes.find(q => q.id === sub.quizId);
                                    return (
                                        <div
                                            key={sub.id}
                                            className={`${styles.activityItem} ${styles.itemCompleted}`}
                                            onClick={() => navigate(`${ROUTES.STUDENT.QUIZ_RESULT.replace(':id', sub.id)}`)}
                                        >
                                            <div className={styles.activityIconBox}>
                                                {sub.percentage! >= 70 ? <Trophy size={18} /> : <Target size={18} />}
                                            </div>
                                            <div className={styles.activityContent}>
                                                <h4 className={styles.activityTitle}>{quiz?.title || 'Sınav Sonucu'}</h4>
                                                <span className={styles.activityMeta}>
                                                    Başarı: %{sub.percentage} • {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : '-'}
                                                </span>
                                            </div>
                                            <ChevronRight size={16} className={styles.activityArrow} />
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>Henüz tamamladığın bir sınav yok.</p>
                                    <Link to={ROUTES.STUDENT.QUIZZES} className={styles.emptyAction}>
                                        İlk sınavını çözmeye başla
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
