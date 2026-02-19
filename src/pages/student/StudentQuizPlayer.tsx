import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuestionViewer } from '../../components/quiz';
import { useQuizSession } from '../../hooks/useQuizSession';
import { getQuiz, startQuizSubmission, getStudentSubmissions, submitQuiz } from '../../services/quizService';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button, Loader } from '../../components/common';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, List } from 'lucide-react';
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

    useEffect(() => {
        const init = async () => {
            if (!id || !user || initializedRef.current) return;
            initializedRef.current = true;
            try {
                const fetchedQuiz = await getQuiz(id);
                if (!fetchedQuiz) {
                    setError('Quiz bulunamadı.');
                    setLoading(false);
                    return;
                }
                const submissions = await getStudentSubmissions(id, user.id);
                const activeSubmission = submissions.find(s => s.status === 'in_progress');
                if (activeSubmission) {
                    setSubmissionId(activeSubmission.id);
                } else {
                    try {
                        const newSubmission = await startQuizSubmission(id, user.id);
                        setSubmissionId(newSubmission.id);
                    } catch (err: any) {
                        if (err.message === 'Maximum attempts reached') {
                            setError('Bu sınav için maksimum deneme hakkınızı doldurdunuz.');
                        } else throw err;
                        setLoading(false);
                        return;
                    }
                }
                setQuiz(fetchedQuiz);
            } catch (err: any) {
                console.error('Quiz init error:', err);
                setError('Quiz yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };
        if (user) init();
    }, [id, user]);

    const {
        currentQuestionIndex,
        currentQuestion,
        answers,
        timeRemaining,
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
                const formattedAnswers: QuestionAnswer[] = Object.entries(results.answers).map(([qId, val]: [string, any]) => {
                    const question = quiz?.questions.find(q => q.id === qId);
                    if (!question) return null;
                    const base = { questionId: qId, questionType: question.type } as QuestionAnswer;
                    if (question.type === 'multiple_choice') base.selectedOptionIds = [val as string];
                    else if (question.type === 'true_false') base.booleanAnswer = val as boolean;
                    return base;
                }).filter(Boolean) as QuestionAnswer[];
                await submitQuiz(submissionId, formattedAnswers);
                addToast({ type: 'success', title: 'Başarılı', message: 'Sınav başarıyla gönderildi.' });
                navigate(`/student/quiz/result/${submissionId}`);
            } catch (err: any) {
                console.error('Submission error:', err);
                setIsSubmitting(false);
            }
        }
    });

    if (loading) return <div className={styles.loadingWrapper}><Loader size="lg" /><p>Sınav hazırlanıyor...</p></div>;
    if (error) return <div className={styles.errorWrapper}><h2>⚠️ Hata</h2><p>{error}</p><Button onClick={() => navigate('/student')}>Panele Dön</Button></div>;
    if (!quiz) return null;

    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    return (
        <div className={styles.page}>
            {/* Player Header */}
            <div className={styles.playerHeader}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBreadcrumb} onClick={() => navigate('/student')}>
                        <ArrowLeft size={16} />
                        <span>Geri</span>
                    </button>
                    <div className={styles.quizInfo}>
                        <h1 className={styles.quizTitle}>{quiz.title}</h1>
                        <div className={styles.quizBadge}>{quiz.subject}</div>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    {timeRemaining !== undefined && (
                        <div className={styles.timerBox}>
                            <Clock size={18} />
                            <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
                        </div>
                    )}
                    <div className={styles.progressBox}>
                        <div className={styles.progressLabel}>
                            <List size={16} />
                            <span>Soru {currentQuestionIndex + 1} / {quiz.questions.length}</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <main className={styles.mainContent}>
                <div className={styles.questionContainer}>
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
                            disabled={currentQuestionIndex === 0 || isSubmitting}
                            className={styles.navBtn}
                            leftIcon={<ArrowLeft size={18} />}
                        >
                            Önceki Soru
                        </Button>

                        {isLastQuestion ? (
                            <Button
                                variant="primary"
                                className={styles.finishBtn}
                                onClick={() => {
                                    const unansweredCount = quiz.questions.length - Object.keys(answers).length;
                                    if (unansweredCount > 0) {
                                        addToast({
                                            type: 'warning',
                                            title: 'Dikkat',
                                            message: `Henüz cevaplamadığınız ${unansweredCount} soru var. Lütfen tüm soruları yanıtlayın.`
                                        });
                                        return;
                                    }
                                    handleComplete();
                                }}
                                isLoading={isSubmitting}
                                leftIcon={<CheckCircle size={18} />}
                            >
                                Sınavı Tamamla
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className={styles.navBtn}
                                rightIcon={<ArrowRight size={18} />}
                            >
                                Sonraki Soru
                            </Button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentQuizPlayer;
