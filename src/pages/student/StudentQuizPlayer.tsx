import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { QuestionViewer } from '../../components/quiz';
import { useQuizSession } from '../../hooks/useQuizSession';
import { getQuiz, startQuizSubmission, getStudentSubmissions, submitQuiz } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button, Loader } from '../../components/common';
import { ArrowLeft, ArrowRight, CheckCircle, Flag } from 'lucide-react';
import styles from './StudentQuizPlayer.module.css';
import type { Quiz, QuestionAnswer } from '../../types/quiz';

const StudentQuizPlayer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { addToast } = useUIStore();
    const initializedRef = React.useRef(false);

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize Quiz & Submission
    useEffect(() => {
        const init = async () => {
            if (!id || !user || initializedRef.current) return;
            initializedRef.current = true;

            try {
                // 1. Fetch Quiz
                const fetchedQuiz = await getQuiz(id);
                if (!fetchedQuiz) {
                    setError('Quiz bulunamadı.');
                    setLoading(false);
                    return;
                }

                // 2. Check for existing active submission
                const submissions = await getStudentSubmissions(id, user.id);
                const activeSubmission = submissions.find(s => s.status === 'in_progress');

                if (activeSubmission) {
                    console.log('Resuming active submission:', activeSubmission.id);
                    setSubmissionId(activeSubmission.id);
                } else {
                    // 3. Start new submission
                    console.log('Starting new submission for quiz:', id);
                    try {
                        const newSubmission = await startQuizSubmission(id, user.id);
                        setSubmissionId(newSubmission.id);
                    } catch (err: any) {
                        if (err.message === 'Maximum attempts reached') {
                            setError('Bu sınav için maksimum deneme hakkınızı doldurdunuz.');
                        } else {
                            throw err;
                        }
                        setLoading(false);
                        return;
                    }
                }

                setQuiz(fetchedQuiz);
            } catch (err: any) {
                console.error('Quiz init error:', err);
                setError('Quiz yüklenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            init();
        }
    }, [id, user]);

    const {
        currentQuestionIndex,
        currentQuestion,
        answers,
        timeRemaining,
        isCompleted,
        handleAnswerChange,
        handleNext,
        handlePrevious,
        handleComplete
    } = useQuizSession({
        quizId: id || '',
        questions: quiz?.questions || [],
        timeLimit: quiz?.settings?.timeLimit,
        onComplete: async (results) => {
            if (!submissionId || isSubmitting) return;

            setIsSubmitting(true);
            try {
                console.log('Submitting results:', results);

                // Convert simple answer format to Backend QuestionAnswer format
                const formattedAnswers: QuestionAnswer[] = Object.entries(results.answers).map(([qId, val]: [string, any]) => {
                    const question = quiz?.questions.find(q => q.id === qId);
                    if (!question) return null;

                    const base = {
                        questionId: qId,
                        questionType: question.type,
                    } as QuestionAnswer;

                    // Fill specific fields based on type
                    if (question.type === 'multiple_choice') {
                        base.selectedOptionIds = [val as string];
                    } else if (question.type === 'true_false') {
                        base.booleanAnswer = val as boolean;
                    }

                    return base;
                }).filter(Boolean) as QuestionAnswer[];

                await submitQuiz(submissionId, formattedAnswers);
                addToast({ type: 'success', title: 'Başarılı', message: 'Sınav başarıyla gönderildi.' });
                navigate(`/student/quiz/result/${submissionId}`);
            } catch (err: any) {
                console.error('Submission error:', err);
                throw new Error('Sınav gönderilirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
            } finally {
                setIsSubmitting(false);
            }
        }
    });

    const onFinishClick = async () => {
        try {
            await handleComplete();
        } catch (err: any) {
            addToast({
                type: 'error',
                title: 'Hata',
                message: err.message || 'Lütfen testi bitirmeden önce soruları yanıtlayın.'
            });
        }
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className={styles.loadingContainer}>
                    <Loader size="lg" />
                    <p>Sınav yükleniyor...</p>
                </div>
            </StudentLayout>
        );
    }

    if (error) {
        return (
            <StudentLayout>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2>⚠️ Hata</h2>
                    <p>{error}</p>
                    <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
                        Panele Dön
                    </Button>
                </div>
            </StudentLayout>
        );
    }

    if (!quiz) return null;

    if (isCompleted || isSubmitting) {
        return (
            <StudentLayout title={quiz.title}>
                <div className={styles.completedContainer}>
                    {isSubmitting ? (
                        <div className={styles.loadingContainer}>
                            <Loader size="lg" />
                            <p>Cevaplar gönderiliyor...</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.completedIcon}>
                                <CheckCircle size={48} strokeWidth={2.5} />
                            </div>
                            <h2 className={styles.completedTitle}>Sınav Tamamlandı!</h2>
                            <p className={styles.completedText}>
                                Yanıtlarınız başarıyla kaydedildi. Katılımınız için teşekkürler.
                            </p>

                            <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Toplam Soru</span>
                                    <span className={styles.statValue}>{quiz.questions.length}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Durum</span>
                                    <span className={styles.statValue} style={{ color: '#16a34a' }}>Gönderildi</span>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                fullWidth
                                onClick={() => navigate('/student/dashboard')}
                            >
                                Ana Sayfaya Dön
                            </Button>
                        </>
                    )}
                </div>
            </StudentLayout>
        );
    }

    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
    const isFirstQuestion = currentQuestionIndex === 0;

    return (
        <StudentLayout
            title={quiz.title}
            totalQuestions={quiz.questions.length}
            currentQuestionIndex={currentQuestionIndex}
            timeRemaining={timeRemaining}
        >
            <div className={styles.container}>
                <div className={styles.questionCard}>
                    <QuestionViewer
                        question={currentQuestion}
                        answer={answers[currentQuestion.id]}
                        onAnswerChange={handleAnswerChange}
                        readOnly={isSubmitting}
                    />
                </div>

                <div className={styles.navigation}>
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={isFirstQuestion || isSubmitting}
                        leftIcon={<ArrowLeft size={18} />}
                    >
                        Önceki Soru
                    </Button>

                    {isLastQuestion ? (
                        <Button
                            variant="primary"
                            onClick={onFinishClick}
                            disabled={isSubmitting}
                            leftIcon={<Flag size={18} />}
                            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                        >
                            {isSubmitting ? 'Gönderiliyor...' : 'Sınavı Bitir'}
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleNext}
                            disabled={isSubmitting}
                            rightIcon={<ArrowRight size={18} />}
                        >
                            Sonraki Soru
                        </Button>
                    )}
                </div>
            </div>
        </StudentLayout>
    );
};

export default StudentQuizPlayer;
