import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Select } from '../../components/common';
import { BarChart3, Mic, FileText, CheckCircle, ChevronRight, Plus, School, Radio } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getTeacherSessions } from '../../services/sessionService';
import { getQuizzesByTeacher } from '../../services/quizService';
import { ROUTES } from '../../config/routes';
import type { Session, Teacher } from '../../types';
import type { Quiz } from '../../types/quiz';
import { ClassManagementModal } from '../../components/teacher/ClassManagementModal';
import styles from './Dashboard.module.css';

export const TeacherDashboard: React.FC = () => {
    const user = useAuthStore((state) => state.user) as Teacher;
    const setUser = useAuthStore((state) => state.setUser);
    const navigate = useNavigate();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);

    useEffect(() => {
        if (user?.assignedClasses?.length > 0) {
            setSelectedClass(user.assignedClasses[0]);
        }
    }, [user]);

    const handleAddClass = (newClass: string) => {
        if (user) {
            const updatedClasses = [...(user.assignedClasses || []), newClass];
            setUser({ ...user, assignedClasses: updatedClasses });
            if (!selectedClass) setSelectedClass(newClass);
        }
    };

    const handleDeleteClass = (className: string) => {
        if (user) {
            const updatedClasses = user.assignedClasses.filter(c => c !== className);
            setUser({ ...user, assignedClasses: updatedClasses });
            if (selectedClass === className) {
                setSelectedClass(updatedClasses[0] || '');
            }
        }
    };

    const handleUpdateClass = (oldName: string, newName: string) => {
        if (user) {
            const updatedClasses = user.assignedClasses.map(c => c === oldName ? newName : c);
            setUser({ ...user, assignedClasses: updatedClasses });
            if (selectedClass === oldName) setSelectedClass(newName);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                // Son 5 analizi ve tüm sınavları çek
                const [fetchedSessions, fetchedQuizzes] = await Promise.all([
                    getTeacherSessions(user.id, 5),
                    getQuizzesByTeacher(user.id)
                ]);

                setSessions(fetchedSessions);
                setQuizzes(fetchedQuizzes);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const stats = [
        {
            icon: <Mic size={24} />,
            label: 'AI Analiz',
            value: sessions.length.toString(),
            color: 'primary',
            path: ROUTES.TEACHER.SESSIONS
        },
        {
            icon: <FileText size={24} />,
            label: 'Sınavlar',
            value: quizzes.length.toString(),
            color: 'accent',
            path: ROUTES.TEACHER.QUIZZES
        },
        {
            icon: <CheckCircle size={24} />,
            label: 'Aktif Sınav',
            value: quizzes.filter(q => q.status === 'published').length.toString(),
            color: 'secondary',
            path: ROUTES.TEACHER.QUIZZES
        },
        {
            icon: <BarChart3 size={24} />,
            label: 'Onay Bekleyenler',
            value: quizzes.filter(q => q.status === 'draft').length.toString(),
            color: 'teacher',
            path: ROUTES.TEACHER.QUIZZES
        },
    ];

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <p>Dashboard yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.greeting}>Merhaba, {user?.displayName || 'Öğretmenim'}</h1>
                    <p className={styles.subtitle}>İşte bugünkü durumunuz ve son aktiviteleriniz.</p>
                </div>

                <div className={styles.contextBar}>
                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>KURUM SEÇİN</label>
                        <Select
                            options={[{ value: 'enderun', label: 'Enderun Koleji Merkez' }]}
                            value="enderun"
                            onChange={() => { }}
                            icon={<School size={18} />}
                        />
                    </div>

                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>AKTİF SINIF</label>
                        <Select
                            options={user?.assignedClasses?.map(cls => ({ value: cls, label: cls })) || []}
                            value={selectedClass}
                            onChange={(val) => setSelectedClass(val)}
                            placeholder="Sınıf Seçin"
                        />
                    </div>

                    <Button
                        variant="primary"
                        size="md"
                        leftIcon={<Plus size={20} />}
                        className={styles.vibrantAddBtn}
                        onClick={() => setIsClassModalOpen(true)}
                    >
                        Sınıf Ekle
                    </Button>

                    <Button
                        variant="danger"
                        size="md"
                        leftIcon={<Radio size={20} className={styles.liveIcon} />}
                        className={styles.liveRecordBtn}
                        onClick={() => navigate(ROUTES.TEACHER.NEW_SESSION)}
                    >
                        Canlı Kayıt Başlat
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
                        {/* Header: Small Icon */}
                        <div className={styles.statHeader}>
                            <div className={styles.statIconWrapper}>
                                {stat.icon}
                            </div>
                        </div>

                        {/* Footer: Value & Label */}
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stat.value}</span>
                            <span className={styles.statLabel}>{stat.label}</span>
                        </div>

                        {/* Decorative Background Icon */}
                        <div className={styles.statBgIcon}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.contentGrid}>
                {/* Son AI Analizler */}
                <Card variant="default" padding="lg" className={styles.activityCard}>
                    <CardHeader>
                        <div className={styles.sectionHeader}>
                            <CardTitle subtitle="En son kaydettiğiniz dersler">
                                Son AI Analizler
                            </CardTitle>
                            <Link to={ROUTES.TEACHER.SESSIONS} className={styles.seeAllLink}>
                                Tümünü Gör
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.activityList}>
                            {sessions.length > 0 ? (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={styles.activityItem}
                                        onClick={() => navigate(`${ROUTES.TEACHER.SESSIONS}/${session.id}`)}
                                    >
                                        <div className={styles.statIconWrapper} style={{ width: '40px', height: '40px', background: 'white', color: 'inherit', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                            <Mic size={18} />
                                        </div>
                                        <div className={styles.activityContent}>
                                            <h4 className={styles.activityTitle}>{session.title}</h4>
                                            <span className={styles.activityMeta}>
                                                {session.createdAt?.toDate().toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className={styles.activityArrow} />
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>Henüz AI analiz kaydı yok.</p>
                                    <Link to={ROUTES.TEACHER.SESSIONS} className={styles.emptyAction}>
                                        Yeni ders oluştur
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Sınavlar Özeti / Son Sınavlar */}
                <Card variant="default" padding="lg" className={styles.activityCard}>
                    <CardHeader>
                        <div className={styles.sectionHeader}>
                            <CardTitle subtitle="Oluşturduğunuz son sınavlar">
                                Son Sınavlar
                            </CardTitle>
                            <Link to={ROUTES.TEACHER.QUIZZES} className={styles.seeAllLink}>
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
                                        className={styles.activityItem}
                                        onClick={() => navigate(`${ROUTES.TEACHER.QUIZZES}`)}
                                    >
                                        <div className={styles.statIconWrapper} style={{ width: '40px', height: '40px', background: 'white', color: 'inherit', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                            <FileText size={18} />
                                        </div>
                                        <div className={styles.activityContent}>
                                            <h4 className={styles.activityTitle}>{quiz.title}</h4>
                                            <span className={styles.activityMeta}>
                                                {quiz.questions?.length || 0} SORU • {quiz.status === 'published' ? 'YAYINDA' : 'SORULAR ONAYLANDI'}
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className={styles.activityArrow} />
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>Henüz sınav oluşturmadınız.</p>
                                    <Link to={ROUTES.TEACHER.QUIZZES} className={styles.emptyAction}>
                                        Sınav oluştur
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ClassManagementModal
                isOpen={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                institutionName="Enderun Koleji Merkez"
                existingClasses={user?.assignedClasses || []}
                onAddClass={handleAddClass}
                onDeleteClass={handleDeleteClass}
                onUpdateClass={handleUpdateClass}
            />
        </div>
    );
};

export default TeacherDashboard;
