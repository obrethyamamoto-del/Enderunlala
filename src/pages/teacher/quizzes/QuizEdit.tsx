import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Loader } from '../../../components/common';
import { QuizEditor, QuizPreviewModal, PublishQuizModal } from '../../../components/quiz';
import { getQuiz, updateQuiz, createQuiz, publishQuiz } from '../../../services/quizService';
import { getSession } from '../../../services/sessionService';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { ROUTES } from '../../../config/routes';
import type { Quiz } from '../../../types/quiz';
import { DEFAULT_QUIZ_SETTINGS } from '../../../types/quiz';
import styles from './QuizEdit.module.css';

export const QuizEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const sessionId = searchParams.get('sessionId');
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const isAuthInitialized = useAuthStore((state) => state.isInitialized);
    const { addToast } = useUIStore();

    // State
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Yeni quiz mi yoksa mevcut mu? (pathname ile kontrol et çünkü /new route'u :id içermiyor)
    const isNewQuiz = location.pathname.endsWith('/new') || !id;

    // Load quiz or create new
    useEffect(() => {
        // Auth henüz hazır değil
        if (!isAuthInitialized || !user) {
            return;
        }

        const loadData = async () => {
            setIsLoading(true);

            try {
                if (isNewQuiz) {
                    // Create empty quiz
                    let title = 'Yeni Quiz';

                    // Session'dan bilgi al
                    if (sessionId) {
                        try {
                            const session = await getSession(sessionId);
                            if (session?.title) {
                                title = `${session.title} - Quiz`;
                            }
                        } catch {
                            // Session bulunamadı, varsayılan başlık kullan
                        }
                    }

                    const newQuiz: Quiz = {
                        id: '',
                        title,
                        description: '',
                        sessionId: sessionId || undefined,
                        teacherId: user.id,
                        questions: [],
                        settings: DEFAULT_QUIZ_SETTINGS,
                        status: 'draft',
                        totalPoints: 0,
                        estimatedDuration: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };

                    setQuiz(newQuiz);
                    setIsLoading(false);
                } else if (id) {
                    // Load existing quiz
                    const existingQuiz = await getQuiz(id);
                    if (!existingQuiz) {
                        addToast({ type: 'error', title: 'Hata', message: 'Quiz bulunamadı.' });
                        navigate(ROUTES.TEACHER.SESSIONS);
                        return;
                    }
                    setQuiz(existingQuiz);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error loading quiz:', error);
                addToast({ type: 'error', title: 'Hata', message: 'Quiz yüklenirken bir hata oluştu.' });
                setIsLoading(false);
            }
        };

        loadData();
    }, [id, sessionId, user, isNewQuiz, isAuthInitialized, addToast, navigate]);

    // Save quiz
    const handleSave = useCallback(async (updatedQuiz: Quiz) => {
        if (!user) return;

        try {
            if (isNewQuiz) {
                // Create new quiz
                const created = await createQuiz(user.id, {
                    title: updatedQuiz.title,
                    description: updatedQuiz.description,
                    sessionId: sessionId || undefined,
                    questions: updatedQuiz.questions,
                    settings: updatedQuiz.settings,
                    classIds: updatedQuiz.classIds,
                });

                setQuiz(created);
                addToast({ type: 'success', title: 'Başarılı', message: 'Quiz oluşturuldu.' });

                // Redirect to edit page with new ID
                navigate(`/teacher/quizzes/${created.id}`, { replace: true });
            } else if (id) {
                // Update existing quiz
                await updateQuiz(id, {
                    title: updatedQuiz.title,
                    description: updatedQuiz.description,
                    questions: updatedQuiz.questions,
                    settings: updatedQuiz.settings,
                    classIds: updatedQuiz.classIds,
                });

                setQuiz(updatedQuiz);
                addToast({ type: 'success', title: 'Başarılı', message: 'Quiz kaydedildi.' });
            }
        } catch (error) {
            console.error('Error saving quiz:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Quiz kaydedilemedi.' });
        } finally {
            // Nothing to do
        }
    }, [user, isNewQuiz, id, sessionId, addToast, navigate]);

    // Publish quiz
    const handlePublish = useCallback(async (classIds: string[]) => {
        if (!quiz || isNewQuiz || !id) {
            addToast({ type: 'warning', title: 'Uyarı', message: 'Önce quiz\'i kaydedin.' });
            return;
        }

        try {
            setIsPublishing(true);
            // Burada API'nin classIds bilgisini de aldığını varsayıyoruz
            // Eğer mevcut publishQuiz sadece ID alıyorsa, updateQuiz ile sınıfları güncelleyip sonra publish edebiliriz
            await updateQuiz(id, { classIds });
            await publishQuiz(id);

            setQuiz(prev => prev ? { ...prev, status: 'published', publishedAt: new Date(), classIds } : null);
            addToast({ type: 'success', title: 'Yayınlandı!', message: 'Quiz seçilen sınıflara gönderildi.' });
            setIsPublishModalOpen(false);
        } catch (error) {
            console.error('Error publishing quiz:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Quiz yayınlanamadı.' });
        } finally {
            setIsPublishing(false);
        }
    }, [quiz, isNewQuiz, id, addToast]);

    // Approve quiz
    const handleApprove = useCallback(async () => {
        if (!quiz || !id) {
            addToast({ type: 'warning', title: 'Uyarı', message: 'Önce quiz\'i kaydedin.' });
            return;
        }

        if (quiz.questions.length === 0) {
            addToast({ type: 'warning', title: 'Uyarı', message: 'Quiz\'e en az bir soru ekleyin.' });
            return;
        }

        try {
            await updateQuiz(id, { status: 'approved' });
            setQuiz(prev => prev ? { ...prev, status: 'approved' } : null);
            addToast({ type: 'success', title: 'Onaylandı', message: 'Quiz onaylandı, yayınlamaya hazır.' });
        } catch (error) {
            console.error('Error approving quiz:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Quiz onaylanamadı.' });
        }
    }, [quiz, id, addToast]);

    // Auth veya quiz yüklenirken spinner göster
    if (!isAuthInitialized || !user || isLoading && !quiz) {
        return (
            <div className={styles.loading}>
                <Loader size="lg" />
            </div>
        );
    }
    if (!quiz) {
        return (
            <div className={styles.error}>
                <p>Quiz yüklenemedi.</p>
                <Button variant="primary" onClick={() => navigate(-1)}>
                    Geri Dön
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Header Structure matching SessionDetail */}
            <div className={styles.navRow}>
                <button
                    className={styles.backLink}
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={18} /> Geri Dön
                </button>
            </div>



            {/* Editor */}
            <div className={styles.content}>
                <QuizEditor
                    quiz={quiz}
                    onSave={handleSave}
                    onPublish={() => setIsPublishModalOpen(true)}
                    onApprove={handleApprove}
                    onGenerateWithAI={() => { }} // Internally handled by QuizEditor now
                    isLoading={isLoading}
                    onPreview={(currentQuiz) => {
                        setPreviewQuiz(currentQuiz);
                        setIsPreviewOpen(true);
                    }}
                />
            </div>

            {isPreviewOpen && previewQuiz && (
                <QuizPreviewModal
                    quiz={previewQuiz}
                    onClose={() => {
                        setIsPreviewOpen(false);
                        setPreviewQuiz(null);
                    }}
                    onQuestionUpdate={(questionId, updatedQuestion) => {
                        // Update the local quiz state
                        setQuiz(prev => {
                            if (!prev) return null;
                            const updatedQuestions = prev.questions.map(q =>
                                q.id === questionId ? updatedQuestion : q
                            );
                            return { ...prev, questions: updatedQuestions };
                        });
                        // Also update the preview state so the UI reflects the change
                        setPreviewQuiz(prev => {
                            if (!prev) return null;
                            const updatedQuestions = prev.questions.map(q =>
                                q.id === questionId ? updatedQuestion : q
                            );
                            return { ...prev, questions: updatedQuestions };
                        });
                    }}
                />
            )}
            {isPublishModalOpen && quiz && (
                <PublishQuizModal
                    isOpen={isPublishModalOpen}
                    onClose={() => setIsPublishModalOpen(false)}
                    onPublish={handlePublish}
                    quizTitle={quiz.title}
                    assignedClasses={(user as any)?.assignedClasses || []}
                    isLoading={isPublishing}
                />
            )}
        </div>
    );
};

export default QuizEdit;
