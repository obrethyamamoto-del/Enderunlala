import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MoreVertical, School, FileText, Wand2, ClipboardCheck, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../../stores/uiStore';
import { deleteSession } from '../../../services/sessionService';
import { useAuthStore } from '../../../stores/authStore';
import { getTeacherSessions } from '../../../services/sessionService';
import { getQuizzesByTeacher, deleteQuiz } from '../../../services/quizService';
import { Button, Loader, Select, ConfirmModal } from '../../../components/common';
import { ROUTES } from '../../../config/routes';
import type { Session, Teacher } from '../../../types';
import type { Quiz } from '../../../types/quiz';
import { ClassManagementModal } from '../../../components/teacher/ClassManagementModal';
import styles from './Sessions.module.css';

const statusLabels: Record<string, string> = {
    recorded: 'Kayıtlı', // Blue
    transcribing: 'Yazıya Dökülüyor...',
    transcribed: 'Analiz Edildi', // Purple - AI Analysis Done
    processing: 'İşleniyor...',
    draft: 'Onay Bekliyor', // Purple/Blue - Waiting for approval
    approved: 'Yayına Hazır', // Orange - Approved, ready to publish
    published: 'Yayınlandı', // Green - Quiz Published
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
        case 'transcribed': return styles.badgeTranscribed; // Teal (Analiz Tamam)
        case 'draft': return styles.badgeDraft; // Purple (Onay Bekliyor)
        case 'approved': return styles.badgeApproved; // Orange (Yayına Hazır)
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
        case 'approved': return styles.itemApproved;
        case 'published': return styles.itemPublished;
        default: return '';
    }
};


type StatusFilter = 'all' | 'recorded' | 'transcribed' | 'draft' | 'approved' | 'published';

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
    const location = useLocation();
    const [selectedClass, setSelectedClass] = useState<string>('all'); // Set default to 'all'
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
    const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'session' | 'quiz', title: string } | null>(null);

    // Sync filter status with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status');
        if (statusParam && ['recorded', 'transcribed', 'draft', 'approved'].includes(statusParam)) {
            setFilterStatus(statusParam as StatusFilter);
        } else {
            setFilterStatus('all');
        }
    }, [location.search]);

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
        // 1. Sadece yayınlanmamış quizleri ve seansları Üretim Atölyesi'nde göster
        if (item.type === 'quiz' && item.status === 'published') {
            return false;
        }

        // 2. Mükerrerliği önle: Eğer bu SEANS (session) için zaten bir SINAV (quiz) oluşturulmuşsa,
        // seansın "Analiz Edildi" satırını gizle, sadece sınavın "Onay Bekliyor" satırını göster.
        if (item.type === 'session' && item.status === 'transcribed') {
            const hasAssociatedQuiz = quizzes.some(q => q.sessionId === item.id);
            if (hasAssociatedQuiz) return false;
        }

        // Class Filter
        const matchesClass = !selectedClass || selectedClass === 'all' || item.classId === selectedClass;

        // Search Filter
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.type === 'session' && item.subject?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.type === 'quiz' && item.subject?.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch || !matchesClass) return false;

        // Status Filter
        if (filterStatus === 'all') return true;
        if (filterStatus === 'recorded') return item.status === 'recorded';
        if (filterStatus === 'draft') return item.status === 'draft' || item.status === 'transcribed';
        if (filterStatus === 'approved') return item.status === 'approved';
        if (filterStatus === 'published') return item.status === 'published';

        return true;
    });

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const item = combinedItems.find(i => i.id === id);
        if (!item) return;

        setItemToDelete({
            id: item.id,
            type: item.type,
            title: item.title
        });
        setActiveMenuId(null);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;

        try {
            if (type === 'session') {
                await deleteSession(id);
                setSessions(prev => prev.filter(s => s.id !== id));
            } else {
                await deleteQuiz(id);
                setQuizzes(prev => prev.filter(q => q.id !== id));
            }
            addToast({ type: 'success', title: 'Başarılı', message: 'Silme işlemi tamamlandı.' });
        } catch (error) {
            addToast({ type: 'error', title: 'Hata', message: 'Silme işlemi başarısız oldu.' });
        } finally {
            setItemToDelete(null);
        }
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
                    <h1 className={styles.title}>Merhaba, <span className={styles.teacherName}>{user?.displayName || 'Öğretmenim'}</span></h1>
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
                            options={[
                                { value: 'all', label: 'Tüm Sınıflar' },
                                ...(user?.assignedClasses?.map((cls: string) => ({ value: cls, label: cls })) || [])
                            ]}
                            value={selectedClass}
                            onChange={(val) => setSelectedClass(val)}
                            placeholder="Sınıf Seçin"
                        />
                    </div>

                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>DURUM FİLTRESİ</label>
                        <Select
                            options={[
                                { value: 'all', label: 'Hepsi' },
                                { value: 'recorded', label: 'Kayıtlı' },
                                { value: 'draft', label: 'Onay Bekliyor' },
                                { value: 'approved', label: 'Yayına Hazır' },
                            ]}
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val as StatusFilter)}
                            placeholder="Durum Seçin"
                        />
                    </div>



                </div>
            </div>

            {/* List */}
            {
                isLoading ? (
                    <div className={styles.emptyState}>
                        <Loader size="lg" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
                            <Mic size={48} strokeWidth={1} />
                        </div>
                        <h3>Henüz bir aktivite yok</h3>
                        <p>Yeni bir ders kaydı başlatarak veya sınav oluşturarak başlayabilirsiniz.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                            <Button
                                variant="ghost"
                                onClick={() => navigate(ROUTES.TEACHER.NEW_SESSION)}
                                leftIcon={<Mic size={20} />}
                            >
                                Yeni Kayıt
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
                                    {item.status === 'recorded' && <Mic size={20} className={styles.icon} />}
                                    {item.status === 'transcribed' && <Wand2 size={20} className={styles.icon} />}
                                    {item.status === 'draft' && <ClipboardCheck size={20} className={styles.icon} />}
                                    {item.status === 'approved' && <CheckCircle size={20} className={styles.icon} />}
                                    {item.status === 'published' && <Zap size={20} className={styles.icon} />}
                                    {!['recorded', 'transcribed', 'draft', 'approved', 'published'].includes(item.status) && (
                                        item.type === 'quiz' ? <FileText size={20} /> : <Mic size={20} className={styles.icon} />
                                    )}
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
                                        <span className={`${styles.badge} ${getStatusBadgeClass(item.status)}`}>
                                            {statusLabels[item.status]}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.sessionRight}>
                                    {/* Factory Line Action Button */}
                                    {item.status === 'transcribed' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={styles.actionBtnTranscribed}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`${ROUTES.TEACHER.SESSIONS}/${item.id}`);
                                            }}
                                            rightIcon={<ArrowRight size={16} />}
                                        >
                                            İncele
                                        </Button>
                                    )}
                                    {item.status === 'draft' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={styles.actionBtnPrimary}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`${ROUTES.TEACHER.QUIZZES}/${item.id}`);
                                            }}
                                            rightIcon={<ArrowRight size={16} />}
                                        >
                                            Onayla
                                        </Button>
                                    )}
                                    {item.status === 'approved' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={styles.actionBtnSuccess}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`${ROUTES.TEACHER.QUIZZES}/${item.id}`);
                                            }}
                                            rightIcon={<ArrowRight size={16} />}
                                        >
                                            Yayınla
                                        </Button>
                                    )}
                                    {item.status === 'published' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={styles.actionBtnGhost}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`${ROUTES.TEACHER.QUIZZES}/${item.id}/results`);
                                            }}
                                        >
                                            Sonuçlar
                                        </Button>
                                    )}

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
                )
            }

            <ClassManagementModal
                isOpen={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                institutionName="Enderun Koleji Merkez"
                existingClasses={user?.assignedClasses || []}
                onAddClass={handleAddClass}
                onDeleteClass={handleDeleteClass}
                onUpdateClass={handleUpdateClass}
            />

            <ConfirmModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title={itemToDelete?.type === 'session' ? 'Analizi Sil' : 'Sınavı Sil'}
                message={`${itemToDelete?.title} ${itemToDelete?.type === 'session' ? 'analizini' : 'sınavını'} ve tüm verilerini silmek istediğinize emin misiniz?`}
                confirmText="Sil"
                isLoading={isLoading}
            />
        </div >
    );
};

export default Sessions;
