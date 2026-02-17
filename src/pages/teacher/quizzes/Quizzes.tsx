import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MoreVertical,
    FileText,
    School,
    Radio
} from 'lucide-react';
import { Button, Loader, Select } from '../../../components/common';
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
    const [searchTerm] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');

    useEffect(() => {
        loadQuizzes();
    }, [user]);

    useEffect(() => {
        if (user?.assignedClasses?.length > 0) {
            setSelectedClass(user.assignedClasses[0]);
        }
    }, [user]);

    const loadQuizzes = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const data = await getQuizzesByTeacher(user.id);
            setQuizzes(data);
        } catch (error) {
            console.error('Error loading quizzes:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Quizler yüklenemedi.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (quizId: string) => {
        if (!window.confirm('Bu quizi silmek istediğinize emin misiniz?')) return;

        try {
            await deleteQuiz(quizId);
            setQuizzes(prev => prev.filter(q => q.id !== quizId));
            addToast({ type: 'success', title: 'Başarılı', message: 'Quiz silindi.' });
        } catch (error) {
            console.error('Error deleting quiz:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Quiz silinemedi.' });
        }
        setActiveMenuId(null);
    };

    const filteredQuizzes = quizzes.filter(quiz =>
        quiz.status === 'published' && (
            quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

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
                    <p className={styles.subtitle}>Yayınladığınız quizleri ve sonuçlarını buradan takip edebilirsiniz.</p>
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
                    <h3>Yayında hiç quiz yok</h3>
                    <p>Tamamlanan ve yayınlanan quizleriniz burada görünür.</p>
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
                                <FileText size={20} />
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
                                    <span className={`${styles.badge} ${styles.badgePublished}`}>
                                        Yayında
                                    </span>
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
                                                <button className={styles.menuItem} onClick={() => navigate(`${ROUTES.TEACHER.QUIZZES}/${quiz.id}/results`)}>
                                                    Sonuçlar
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
        </div>
    );
};

export default Quizzes;
