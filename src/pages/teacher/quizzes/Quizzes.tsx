import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    MoreVertical,
    FileText,
    School,
    Zap,
    CheckCircle
} from 'lucide-react';
import { Loader, Select, ConfirmModal } from '../../../components/common';
import { getQuizzesByTeacher, deleteQuiz } from '../../../services/quizService';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { ROUTES } from '../../../config/routes';
import type { Quiz } from '../../../types/quiz';
import type { Teacher } from '../../../types';
import styles from './Quizzes.module.css';

export const Quizzes: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user) as Teacher;
    const addToast = useUIStore((state) => state.addToast);

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'closed'>(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status');
        if (statusParam === 'published' || statusParam === 'closed') {
            return statusParam;
        }
        return 'all';
    });
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [quizToDelete, setQuizToDelete] = useState<{ id: string, title: string } | null>(null);

    useEffect(() => {
        loadQuizzes();
    }, [user]);

    useEffect(() => {
        if (user?.assignedClasses?.length > 0) {
            setSelectedClass('all');
        }
    }, [user]);

    const loadQuizzes = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const data = await getQuizzesByTeacher(user.id);
            setQuizzes(data);
        } catch (error) {
            console.error('Error loading exams:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Sınavlar yüklenemedi.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (quizId: string) => {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        setQuizToDelete({ id: quizId, title: quiz.title });
        setActiveMenuId(null);
    };

    const confirmDelete = async () => {
        if (!quizToDelete) return;
        const quizId = quizToDelete.id;

        try {
            await deleteQuiz(quizId);
            setQuizzes(prev => prev.filter(q => q.id !== quizId));
            addToast({ type: 'success', title: 'Başarılı', message: 'Sınav silindi.' });
        } catch (error) {
            console.error('Error deleting exam:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Sınav silinemedi.' });
        } finally {
            setQuizToDelete(null);
        }
    };

    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesClass = !selectedClass || selectedClass === 'all' || quiz.classId === selectedClass;
        const matchesStatus = filterStatus === 'all'
            ? (quiz.status === 'published' || quiz.status === 'closed')
            : quiz.status === filterStatus;

        return matchesClass && matchesStatus;
    });

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.title}>Merhaba, {user?.displayName || 'Öğretmenim'}</h1>
                    <p className={styles.subtitle}>Yayınladığınız sınavları ve sonuçlarını buradan takip edebilirsiniz.</p>
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
                                ...(user?.assignedClasses?.map(cls => ({ value: cls, label: cls })) || [])
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
                                { value: 'published', label: 'Aktif Sınavlar' },
                                { value: 'closed', label: 'Sonuçlanan Sınavlar' },
                            ]}
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val as any)}
                        />
                    </div>

                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className={styles.emptyState}>
                    <Loader size="lg" />
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className={styles.emptyState}>
                    <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
                        <FileText size={48} strokeWidth={1} />
                    </div>
                    <h3>Yayında hiç sınav yok</h3>
                    <p>Tamamlanan ve yayınlanan sınavlarınız burada görünür.</p>
                </div>
            ) : (
                <div className={styles.quizList}>
                    {filteredQuizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            className={`${styles.quizItem} ${styles.itemPublished}`}
                            onClick={() => navigate(`${ROUTES.TEACHER.QUIZZES}/${quiz.id}`)}
                        >
                            <div className={styles.quizIcon}>
                                {quiz.status === 'published' ? <Zap size={20} /> : <CheckCircle size={20} />}
                            </div>

                            <div className={styles.quizInfo}>
                                <div className={styles.quizTitle}>
                                    {quiz.title.includes('-') ? quiz.title.split('-').slice(1).join('-').trim() : quiz.title}
                                </div>
                                <div className={styles.quizMeta}>
                                    {quiz.subject && (
                                        <>
                                            <span>{quiz.subject}</span>
                                            <span>•</span>
                                        </>
                                    )}
                                    <span>{quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                    <span>•</span>
                                    <span>{quiz.questions?.length || 0} Soru</span>
                                </div>
                                <div className={styles.statusWrapper}>
                                    {quiz.status === 'draft' && (
                                        <span className={`${styles.badge} ${styles.badgeDraft}`}>
                                            Onay Bekliyor
                                        </span>
                                    )}
                                    {quiz.status === 'approved' && (
                                        <span className={`${styles.badge} ${styles.badgeApproved}`}>
                                            Yayına Hazır
                                        </span>
                                    )}
                                    {quiz.status === 'published' && (
                                        <span className={`${styles.badge} ${styles.badgePublished}`}>
                                            Yayınlandı
                                        </span>
                                    )}
                                    {quiz.status === 'closed' && (
                                        <span className={`${styles.badge} ${styles.badgeDefault}`}>
                                            Tamamlandı
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.quizActions} onClick={e => e.stopPropagation()}>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className={styles.menuBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === quiz.id ? null : quiz.id);
                                        }}
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {activeMenuId === quiz.id && (
                                        <>
                                            <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                                onClick={() => setActiveMenuId(null)}
                                            />
                                            <div className={styles.menuDropdown}>
                                                <button className={styles.menuItem} onClick={() => navigate(`${ROUTES.TEACHER.QUIZZES}/${quiz.id}`)}>
                                                    Düzenle
                                                </button>
                                                <button
                                                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                                    onClick={() => handleDelete(quiz.id)}
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

            <ConfirmModal
                isOpen={!!quizToDelete}
                onClose={() => setQuizToDelete(null)}
                onConfirm={confirmDelete}
                title="Sınavı Sil"
                message={`"${quizToDelete?.title}" isimli sınavı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
                confirmText="Sınavı Sil"
                isLoading={isLoading}
            />
        </div>
    );
};

export default Quizzes;
