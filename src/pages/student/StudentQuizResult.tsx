import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuestionViewer } from '../../components/quiz';
import { getQuiz, getSubmission } from '../../services/quizService';
import { Button, Loader } from '../../components/common';
import {
    Check,
    X,
    ArrowLeft,
    BarChart3,
    Clock,
    Target,
    RotateCcw,
    ChevronRight,
    Award
} from 'lucide-react';
import styles from './StudentQuizResult.module.css';
import type { Quiz, QuizSubmission, QuestionAnswer } from '../../types/quiz';

export const StudentQuizResult: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<QuizSubmission | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const sub = await getSubmission(id);
                if (!sub) { setError('Sonuç bulunamadı.'); setLoading(false); return; }
                setSubmission(sub);
                const q = await getQuiz(sub.quizId);
                if (q) setQuiz(q);
                else setError('İlgili sınav bilgisi bulunamadı.');
            } catch (err) {
                setError('Veriler yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const formatDuration = (seconds?: number) => {
        if (!seconds || seconds === 0) return '0 dk';
        // Handle if data is accidentally passed in milliseconds (unlikely but safe)
        const totalSeconds = seconds > 100000 ? Math.floor(seconds / 1000) : seconds;

        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hrs > 0) return `${hrs} sa ${mins} dk`;
        return mins > 0 ? `${mins} dk` : `${secs} sn`;
    };

    const getUIAnswer = (qa: QuestionAnswer) => {
        if (qa.questionType === 'multiple_choice') return qa.selectedOptionIds?.[0];
        if (qa.questionType === 'true_false') return qa.booleanAnswer;
        return null;
    };

    if (loading) return <div className={styles.loadingWrapper}><Loader size="lg" /><p>Sonuçlar hazırlanıyor...</p></div>;
    if (error || !submission || !quiz) return <div className={styles.errorWrapper}><h2>⚠️ Hata</h2><p>{error || 'Veriye ulaşılamadı'}</p><Button onClick={() => navigate('/student')}>Panele Dön</Button></div>;

    const { percentage = 0, score = 0, totalPoints } = submission;

    return (
        <div className={styles.page}>
            <div className={styles.breadcrumbArea}>
                <button className={styles.backBtn} onClick={() => navigate('/student')}>
                    <ArrowLeft size={16} />
                    <span>Geri Dön</span>
                </button>
            </div>

            {/* Header / Summary */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.title}>{quiz.title}</h1>
                        <p className={styles.subtitle}>PERFORMANS ANALİZ RAPORU</p>
                    </div>
                </div>

                <div className={styles.summaryGrid}>
                    <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                            <Award className={styles.statIcon} size={20} />
                            <div className={styles.statInfo}>
                                <span className={styles.statVal}>%{percentage}</span>
                                <span className={styles.statLabel}>Başarı</span>
                            </div>
                        </div>
                        <div className={styles.statItem}>
                            <Target className={styles.statIcon} size={20} />
                            <div className={styles.statInfo}>
                                <span className={styles.statVal}>{score} / {totalPoints}</span>
                                <span className={styles.statLabel}>Toplam Puan</span>
                            </div>
                        </div>
                        <div className={styles.statItem}>
                            <Clock className={styles.statIcon} size={20} />
                            <div className={styles.statInfo}>
                                <span className={styles.statVal}>{formatDuration(submission.duration)}</span>
                                <span className={styles.statLabel}>Süre</span>
                            </div>
                        </div>
                        <div className={styles.statItem}>
                            <RotateCcw className={styles.statIcon} size={20} />
                            <div className={styles.statInfo}>
                                <span className={styles.statVal}>{submission.attemptNumber}.</span>
                                <span className={styles.statLabel}>Deneme</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.sectionHeader}>
                    <BarChart3 size={20} />
                    <h2>Soru Detayları ve Yanıtlar</h2>
                </div>

                <div className={styles.questionList}>
                    {quiz.questions.map((question, index) => {
                        const qa = submission.answers.find(a => a.questionId === question.id);
                        const isCorrect = qa?.isCorrect;

                        return (
                            <div key={question.id} className={`${styles.questionItem} ${isCorrect ? styles.qCorrect : styles.qIncorrect}`}>
                                <div className={styles.qHeader}>
                                    <div className={styles.qMeta}>
                                        <span className={styles.qNum}>SORU {index + 1}</span>
                                        <span className={styles.qPoints}>{question.points} Puan</span>
                                    </div>
                                    <div className={styles.statusBadge}>
                                        {isCorrect ? (
                                            <div className={styles.correctBadge}><Check size={14} /> DOĞRU</div>
                                        ) : (
                                            <div className={styles.incorrectBadge}><X size={14} /> YANLIŞ</div>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.qViewerBox}>
                                    <QuestionViewer
                                        question={question}
                                        answer={qa ? getUIAnswer(qa) : null}
                                        onAnswerChange={() => { }}
                                        readOnly={true}
                                        showFeedback={true}
                                    />
                                </div>
                                {qa?.feedback && (
                                    <div className={styles.teacherNote}>
                                        <Award size={16} />
                                        <p><strong>Değerlendirme Notu:</strong> {qa.feedback}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.footerActions}>
                    <Button variant="ghost" onClick={() => navigate('/student/results')} leftIcon={<ChevronRight size={18} />}>
                        Tüm Geçmişi Görüntüle
                    </Button>
                    <Button variant="primary" className={styles.vibrantBtn} onClick={() => navigate('/student')}>
                        Panele Dön
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default StudentQuizResult;
