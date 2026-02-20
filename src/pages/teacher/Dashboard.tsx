import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Loader } from '../../components/common';
import { School, Radio, Plus, ClipboardCheck, Zap, CheckCircle, Mic } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getTeacherSessions } from '../../services/sessionService';
import { getQuizzesByTeacher } from '../../services/quizService';
import { ROUTES } from '../../config/routes';
import type { Session, Teacher } from '../../types';
import type { Quiz } from '../../types/quiz';
import { ClassManagementModal } from '../../components/teacher/ClassManagementModal';
import { DataGenerator } from '../../components/dev/DataGenerator';
import styles from './Dashboard.module.css';

export const TeacherDashboard: React.FC = () => {
    const user = useAuthStore((state) => state.user) as Teacher;
    const setUser = useAuthStore((state) => state.setUser);
    const navigate = useNavigate();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);

    useEffect(() => {
        if (user?.assignedClasses?.length > 0) {
            setSelectedClass('all');
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
                const [fetchedSessions, fetchedQuizzes] = await Promise.all([
                    getTeacherSessions(user.id),
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

    const filteredSessions = useMemo(() => {
        if (!selectedClass || selectedClass === 'all') return sessions;
        return sessions.filter((s: Session) => s.classId === selectedClass);
    }, [sessions, selectedClass]);

    const filteredQuizzes = useMemo(() => {
        if (!selectedClass || selectedClass === 'all') return quizzes;
        return quizzes.filter((q: Quiz) => q.classId === selectedClass);
    }, [quizzes, selectedClass]);



    const stats = [
        {
            icon: <Mic size={24} />,
            label: 'Kayıtlı Derslerim',
            value: filteredSessions.filter((s: Session) => s.status === 'recorded').length.toString(),
            color: 'recorded',
            path: `${ROUTES.TEACHER.SESSIONS}?status=recorded`
        },
        {
            icon: <ClipboardCheck size={24} />,
            label: 'Onay Bekleyenler',
            value: (
                filteredQuizzes.filter((q: Quiz) => q.status === 'draft').length +
                filteredSessions.filter((s: Session) => {
                    if (s.status !== 'transcribed') return false;
                    const hasAssociatedQuiz = quizzes.some(q => q.sessionId === s.id);
                    return !hasAssociatedQuiz;
                }).length
            ).toString(),
            color: 'draft',
            path: `${ROUTES.TEACHER.SESSIONS}?status=draft`
        },
        {
            icon: <CheckCircle size={24} />,
            label: 'Yayına Hazır',
            value: filteredQuizzes.filter((q: Quiz) => q.status === 'approved').length.toString(),
            color: 'approved',
            path: `${ROUTES.TEACHER.SESSIONS}?status=approved`
        },
        {
            icon: <Zap size={24} />,
            label: 'Aktif Sınav',
            value: filteredQuizzes.filter((q: Quiz) => q.status === 'published').length.toString(),
            color: 'published',
            path: `${ROUTES.TEACHER.QUIZZES}?status=published`
        },
    ];

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingState}>
                    <Loader size="lg" />
                    <p>Dashboard yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.greeting}>Merhaba, <span className={styles.teacherName}>{user?.displayName || 'Öğretmenim'}</span></h1>
                    <p className={styles.subtitle}>İşte bugünkü durumunuz ve son aktiviteleriniz.</p>
                </div>

                <div className={styles.contextBar}>
                    {/* ... (keep existing context items) */}
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
                            options={[
                                { value: 'all', label: 'Tüm Sınıflar' },
                                ...(user?.assignedClasses?.map(cls => ({ value: cls, label: cls })) || [])
                            ]}
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
                    >
                        <div className={styles.statIconWrapper}>
                            <div className={styles.statIcon}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statValue}>{stat.value}</div>
                            <div className={styles.statLabel}>{stat.label}</div>
                        </div>
                        <div className={styles.statBgIcon}>
                            {stat.icon}
                        </div>
                        <div className={styles.cardOverlay} />
                    </div>
                ))}
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

            <DataGenerator />
        </div>
    );
};

export default TeacherDashboard;
