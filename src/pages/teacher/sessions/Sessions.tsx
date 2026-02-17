import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mic, MoreVertical, School, Radio, FileText } from 'lucide-react';
import { useUIStore } from '../../../stores/uiStore';
import { deleteSession } from '../../../services/sessionService';
import { useAuthStore } from '../../../stores/authStore';
import { getTeacherSessions } from '../../../services/sessionService';
import { getQuizzesByTeacher, deleteQuiz } from '../../../services/quizService';
import { Button, Loader, Select } from '../../../components/common';
import { ROUTES } from '../../../config/routes';
import type { Session, Teacher } from '../../../types';
import type { Quiz } from '../../../types/quiz';
import { ClassManagementModal } from '../../../components/teacher/ClassManagementModal';
import styles from './Sessions.module.css';

const statusLabels: Record<string, string> = {
    recorded: 'Kayıtlı', // Blue
    transcribing: 'Yazıya Dökülüyor...',
    transcribed: 'Yazıya Döküldü', // Purple - AI Analysis Done
    processing: 'İşleniyor...',
    draft: 'Sorular Onaylandı', // Orange - Quiz Draft
    published: 'Yayında', // Green - Quiz Published
    assignment_generated: 'Ödev Oluşturuldu',
    completed: 'Tamamlandı',
};



const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'recorded': return styles.badgeRecorded; // Blue
        case 'transcribed': return styles.badgeTranscribed; // Purple
        case 'draft': return styles.badgeDraft; // Orange (Sorular Onaylandı)
        case 'published': return styles.badgePublished; // Green
        case 'processing':
        case 'transcribing': return styles.badgeProcessing; // Gray/Loading
        default: return styles.badgeDefault;
    }
};

const getItemStatusClass = (status: string) => {
    switch (status) {
        case 'recorded': return styles.itemRecorded;
        case 'transcribed': return styles.itemTranscribed;
        case 'draft': return styles.itemDraft;
        case 'published': return styles.itemPublished;
        default: return '';
    }
};


type StatusFilter = 'all' | 'recorded' | 'transcribed' | 'draft' | 'published';

export const Sessions: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user) as Teacher;
    const setUser = useAuthStore((state) => state.setUser);
    const addToast = useUIStore((state) => state.addToast);

    const [sessions, setSessions] = useState<Session[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

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
        const loadPageData = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                const [sessionData, quizData] = await Promise.all([
                    getTeacherSessions(user.id),
                    getQuizzesByTeacher(user.id)
                ]);
                setSessions(sessionData);
                setQuizzes(quizData);
            } catch (error) {
                console.error('Error loading data:', error);
                addToast({ type: 'error', title: 'Hata', message: 'Veriler yüklenemedi.' });
            } finally {
                setIsLoading(false);
            }
        };

        loadPageData();
    }, [user, addToast]);

    const combinedItems = [
        ...sessions.map(s => ({ ...s, type: 'session' as const })),
        ...quizzes.map(q => ({ ...q, type: 'quiz' as const }))
    ].sort((a, b) => {
        const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date(a.createdAt as any || 0);
        const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date(b.createdAt as any || 0);
        return dateB.getTime() - dateA.getTime();
    });

    const filteredItems = combinedItems.filter(item => {
        // Only show sessions and UNPUBLISHED quizzes in AI Analiz
        if (item.type === 'quiz' && item.status === 'published') {
            return false;
        }

        // Search Filter
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.type === 'session' && item.subject?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.type === 'quiz' && item.subject?.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        // Status Filter
        if (filterStatus === 'all') return true;
        if (filterStatus === 'recorded') return item.status === 'recorded';
        if (filterStatus === 'transcribed') return item.status === 'transcribed';
        if (filterStatus === 'draft') return item.status === 'draft';
        if (filterStatus === 'published') return item.status === 'published';

        return true;
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const item = combinedItems.find(i => i.id === id);
        if (!item) return;

        const typeLabel = item.type === 'session' ? 'analizi' : 'quizi';
        if (!window.confirm(`Bu ${typeLabel} ve ilişkili tüm verileri silmek istediğinize emin misiniz?`)) return;

        try {
            if (item.type === 'session') {
                await deleteSession(id);
                setSessions(prev => prev.filter(s => s.id !== id));
            } else {
                await deleteQuiz(id);
                setQuizzes(prev => prev.filter(q => q.id !== id));
            }
            addToast({ type: 'success', title: 'Başarılı', message: 'Silme işlemi tamamlandı.' });
        } catch (error) {
            console.error('Error deleting:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Silme işlemi başarısız oldu.' });
        }
        setActiveMenuId(null);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.title}>Merhaba, {user?.displayName || 'Öğretmenim'}</h1>
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
                        <label className={styles.contextLabel}>DURUM FİLTRESİ</label>
                        <Select
                            options={[
                                { value: 'all', label: 'Hepsi' },
                                { value: 'recorded', label: 'Kayıtlı' },
                                { value: 'transcribed', label: 'Yazıya Döküldü' },
                                { value: 'draft', label: 'Sorular Onaylandı' },
                            ]}
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val as StatusFilter)}
                            placeholder="Durum Seçin"
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

            {/* List */}
            {isLoading ? (
                <div className={styles.emptyState}>
                    <Loader size="lg" />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className={styles.emptyState}>
                    <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
                        <Mic size={48} strokeWidth={1} />
                    </div>
                    <h3>Henüz bir aktivite yok</h3>
                    <p>Yeni bir ders kaydı başlatarak veya quiz oluşturarak başlayabilirsiniz.</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                        <Button
                            variant="primary"
                            onClick={() => navigate(ROUTES.TEACHER.NEW_SESSION)}
                            leftIcon={<Plus size={20} />}
                        >
                            Yeni Kayıt
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate(ROUTES.TEACHER.NEW_QUIZ)}
                            leftIcon={<FileText size={20} />}
                        >
                            Yeni Quiz
                        </Button>
                    </div>
                </div>
            ) : (
                <div className={styles.sessionsList}>
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className={`${item.type === 'quiz' ? styles.quizItem : styles.sessionItem} ${getItemStatusClass(item.status)}`}
                            onClick={() => navigate(item.type === 'quiz' ? `${ROUTES.TEACHER.QUIZZES}/${item.id}` : `${ROUTES.TEACHER.SESSIONS}/${item.id}`)}
                        >
                            <div className={item.type === 'quiz' ? styles.quizIcon : styles.sessionIcon} data-icon-wrapper>
                                {item.type === 'quiz' ? <FileText size={20} /> : <Mic size={20} className={styles.icon} />}
                            </div>

                            <div className={styles.sessionInfo}>
                                <div className={styles.sessionTitle}>
                                    {item.title.includes('-') ? item.title.split('-').slice(1).join('-').trim() : item.title}
                                </div>
                                <div className={styles.sessionMeta}>
                                    {item.type === 'session' ? (
                                        <>
                                            <span>{item.subject || (item.title.includes('-') ? item.title.split('-')[0].trim() : 'Genel')}</span>
                                            <span> • </span>
                                            <span>{formatDate(item.createdAt)}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{item.subject || (item.title.includes('-') ? item.title.split('-')[0].trim() : 'Genel')}</span>
                                            <span> • </span>
                                            <span>{formatDate(item.createdAt)}</span>
                                            <span> • </span>
                                            <span>{item.questions?.length || 0} Soru</span>
                                        </>
                                    )}
                                </div>
                                <div className={styles.statusWrapper}>
                                    {item.type === 'session' ? (
                                        <span className={`${styles.badge} ${getStatusBadgeClass(item.status)}`}>
                                            {statusLabels[item.status]}
                                        </span>
                                    ) : (
                                        item.status === 'published' ? (
                                            <span className={`${styles.badge} ${styles.badgeCompleted}`}>
                                                Yayında
                                            </span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeDraft}`}>
                                                Sorular Onaylandı
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className={styles.sessionRight}>
                                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                    <button
                                        className={styles.menuBtn}
                                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {activeMenuId === item.id && (
                                        <>
                                            <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                                onClick={() => setActiveMenuId(null)}
                                            />
                                            <div className={styles.menuDropdown}>
                                                <button
                                                    className={styles.menuItem}
                                                    onClick={() => navigate(item.type === 'quiz' ? `${ROUTES.TEACHER.QUIZZES}/${item.id}` : `${ROUTES.TEACHER.SESSIONS}/${item.id}`)}
                                                >
                                                    {item.type === 'quiz' ? 'Düzenle' : 'Görüntüle'}
                                                </button>
                                                {item.type === 'quiz' && (
                                                    <button className={styles.menuItem} onClick={() => navigate(`${ROUTES.TEACHER.QUIZZES}/${item.id}/results`)}>
                                                        Sonuçlar
                                                    </button>
                                                )}
                                                <button
                                                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                                    onClick={(e) => handleDelete(e, item.id)}
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ClassManagementModal
                isOpen={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                institutionName="Enderun Koleji Merkez"
                existingClasses={user?.assignedClasses || []}
                onAddClass={handleAddClass}
                onDeleteClass={handleDeleteClass}
                onUpdateClass={handleUpdateClass}
            />
        </div >
    );
};

export default Sessions;
