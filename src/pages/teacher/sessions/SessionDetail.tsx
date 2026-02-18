import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    Pause,
    FileText,
    Brain,
    BookOpen,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Edit3,
    Sparkles,
    Trash2,
    Calendar
} from 'lucide-react';
import { deleteSession } from '../../../services/sessionService';
import { useUIStore } from '../../../stores/uiStore';
import { getSession, updateSession } from '../../../services/sessionService';
import { createQuiz } from '../../../services/quizService';
import { processSession } from '../../../services/aiService';
import type { LessonAnalysis, GeneratedQuiz } from '../../../types';
import { Button, Loader } from '../../../components/common';
import { ROUTES, generatePath } from '../../../config/routes';
import type { Session, Question } from '../../../types';
import { generateQuestionId, QUESTION_TYPES, DEFAULT_QUIZ_SETTINGS, calculateTotalPoints, estimateQuizDuration } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { ConfirmModal } from '../../../components/common';
import styles from './SessionDetail.module.css';

type ProcessingStep = 'idle' | 'transcribing' | 'analyzing' | 'generating' | 'completed' | 'error';

export const SessionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const addToast = useUIStore((state) => state.addToast);
    const user = useAuthStore((state) => state.user);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processingMessage, setProcessingMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // AI Results

    const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
    const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);

    // Audio player
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Load session
    useEffect(() => {
        const loadSession = async () => {
            if (!id) return;

            try {
                const data = await getSession(id);
                setSession(data);

                // Check if already processed
                if (data?.analysisResults) {

                    setAnalysis(data.analysisResults.analysis);
                    setQuiz(data.analysisResults.quiz);
                    setProcessingStep('completed');
                } else if (data?.status === 'transcribed' || data?.status === 'completed') {
                    // Fallback for old data or subcollections if implemented later
                    setProcessingStep('completed');
                }
            } catch (error) {
                console.error('Error loading session:', error);
                addToast({ type: 'error', title: 'Hata', message: 'Analiz yüklenemedi.' });
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [id, addToast]);

    // Start AI processing
    const handleStartProcessing = useCallback(async () => {
        if (!session?.audioUrl) {
            addToast({ type: 'error', title: 'Hata', message: 'Ses kaydı bulunamadı.' });
            return;
        }

        setProcessingStep('transcribing');

        try {
            const results = await processSession(
                session.audioUrl,
                (message, progress) => {
                    setProcessingMessage(message);
                    setProcessingProgress(progress);

                    if (progress < 40) setProcessingStep('transcribing');
                    else if (progress < 70) setProcessingStep('analyzing');
                    else if (progress < 100) setProcessingStep('generating');
                }
            );


            setAnalysis(results.analysis);
            setQuiz(results.quiz);
            setProcessingStep('completed');

            // Update session with analysis results
            // Update session with analysis results
            await updateSession(session.id, {
                title: results.analysis.title,
                subject: results.analysis.subject,
                status: 'transcribed',
                analysisResults: {
                    transcript: results.transcript,
                    analysis: results.analysis,
                    quiz: results.quiz
                }
            });

            // Refresh session data
            const updatedSession = await getSession(session.id);
            setSession(updatedSession);

            addToast({
                type: 'success',
                title: 'İşlem Tamamlandı!',
                message: 'Ders kaydınız analiz edildi ve quiz taslağı oluşturuldu.',
            });

        } catch (error: any) {
            console.error('Processing error:', error);
            setProcessingStep('error');
            addToast({
                type: 'error',
                title: 'İşlem Başarısız',
                message: error.message || 'AI analizi sırasında bir hata oluştu.',
            });
        }
    }, [session, addToast]);

    // Save and Edit Quiz
    const handleCreateQuiz = async () => {
        if (!quiz || !user || !analysis) return;

        try {
            setIsCreatingQuiz(true);

            // Convert GeneratedQuiz questions to app Question type
            const questions: Question[] = quiz.questions.map(q => {
                const baseQuestion = {
                    id: generateQuestionId(),
                    question: q.question,
                    points: q.points,
                    explanation: q.explanation,
                    difficulty: 'medium', // Default to medium or map from q.difficulty if available per question
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // Map types
                if (q.type === 'multiple_choice') {
                    return {
                        ...baseQuestion,
                        type: QUESTION_TYPES.MULTIPLE_CHOICE,
                        options: q.options?.map((opt: any, idx: number) => ({
                            id: opt.id || `opt_${idx}`,
                            text: typeof opt === 'string' ? opt : (opt.text || ''),
                            isCorrect: typeof opt === 'object' ? opt.isCorrect : idx === Number(q.correctAnswer)
                        })) || []
                    } as Question;
                } else if (q.type === 'true_false') {
                    return {
                        ...baseQuestion,
                        type: QUESTION_TYPES.TRUE_FALSE,
                        correctAnswer: q.correctAnswer as boolean
                    } as Question;
                }

                return baseQuestion as Question;
            });

            const newQuiz: any = {
                title: `${analysis.subject} - ${analysis.title} Sınavı`,
                description: analysis.summary,
                questions: questions,
                settings: DEFAULT_QUIZ_SETTINGS,
                totalPoints: calculateTotalPoints(questions),
                estimatedDuration: estimateQuizDuration(questions),
                difficulty: quiz.difficulty,
                subject: analysis.subject,
                sessionId: session?.id,
                status: 'draft',
                isPublic: false
            };

            const createdQuiz = await createQuiz(user.id, newQuiz);

            addToast({ type: 'success', title: 'Başarılı', message: 'Quiz taslağı düzenleme için oluşturuldu.' });

            // Navigate to editor
            navigate(generatePath(ROUTES.TEACHER.QUIZ_EDIT, { id: createdQuiz.id }));

        } catch (error) {
            console.error('Error creating quiz:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Quiz oluşturulamadı.' });
        } finally {
            setIsCreatingQuiz(false);
        }
    };

    // Render processing status
    const renderProcessingStatus = () => {
        const steps = [
            { key: 'transcribing', label: 'Yazıya Dökme', icon: FileText },
            { key: 'analyzing', label: 'Analiz', icon: Brain },
            { key: 'generating', label: 'Quiz Oluşturma', icon: BookOpen },
        ];

        const currentIndex = steps.findIndex(s => s.key === processingStep);

        return (
            <div className={styles.processingStatus}>
                <div className={styles.processingHeader}>
                    <div className={styles.processingIconWrapper}>
                        <Sparkles size={32} color="#9333EA" />
                    </div>
                    <h3 className={styles.processingTitle}>AI Analiz Ediliyor</h3>
                </div>

                <div className={styles.progressContainer}>
                    <div className={styles.progressLabel}>
                        <span>{processingMessage}</span>
                        <span>%{processingProgress}</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${processingProgress}%` }}
                        />
                    </div>
                </div>

                <div className={styles.stepTimeline}>
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = step.key === processingStep;
                        const isCompleted = index < currentIndex || processingStep === 'completed';

                        return (
                            <div
                                key={step.key}
                                className={`${styles.stepItem} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                            >
                                <div className={styles.stepIcon}>
                                    {isCompleted ? <CheckCircle size={24} /> : <Icon size={24} />}
                                </div>
                                <span className={styles.stepLabel}>{step.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Render results
    // Render results
    const renderResults = () => {
        if (!analysis || !quiz) return null;

        return (
            <div className={styles.results}>
                <div className={styles.unifiedCard}>
                    {/* Header */}
                    <div className={styles.unifiedHeader}>
                        <div className={styles.headerIcon}>
                            <Sparkles size={24} color="#7C3AED" />
                        </div>
                        <div className={styles.headerText}>
                            <h2>Ders Analizi ve Sınav Planı</h2>
                            <p>Yapay zeka tarafından oluşturulan ders özeti ve sınav taslağı.</p>
                        </div>
                    </div>

                    <div className={styles.unifiedBody}>
                        {/* Left: Lesson Info */}
                        <div className={styles.analysisSection}>
                            <span className={styles.sectionTag}>DERS BİLGİLERİ</span>
                            <h3 className={styles.lessonTitle}>{analysis.title}</h3>

                            <div className={styles.tagsValues}>
                                <div className={styles.tagItem}>
                                    <span className={styles.tagLabel}>DERS</span>
                                    <span className={styles.tagValue}>{analysis.subject}</span>
                                </div>
                                {analysis.gradeLevel && (
                                    <div className={styles.tagItem}>
                                        <span className={styles.tagLabel}>SEVİYE</span>
                                        <span className={styles.tagValue}>{analysis.gradeLevel}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.summaryBlock}>
                                <span className={styles.label}>ÖZET</span>
                                <p>{analysis.summary}</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={styles.verticalDivider}></div>

                        {/* Right: Quiz Plan */}
                        <div className={styles.quizSection}>
                            <span className={styles.sectionTag}>SINAV TASLAĞI</span>

                            <div className={styles.quizStatsGrid}>
                                <div className={styles.quizStat}>
                                    <span className={styles.qValue}>{quiz.questions.length}</span>
                                    <span className={styles.qLabel}>SORU</span>
                                </div>
                                <div className={styles.quizStat}>
                                    <span className={styles.qValue}>{quiz.estimatedTime}</span>
                                    <span className={styles.qLabel}>DAKİKA</span>
                                </div>
                                <div className={styles.quizStat}>
                                    <span className={styles.qValue}>
                                        {quiz.difficulty === 'easy' ? 'Kolay' : quiz.difficulty === 'medium' ? 'Orta' : 'Zor'}
                                    </span>
                                    <span className={styles.qLabel}>ZORLUK</span>
                                </div>
                            </div>

                            <div className={styles.actionArea}>
                                <Button
                                    className={styles.primaryActionBtn}
                                    leftIcon={<Edit3 size={18} />}
                                    onClick={handleCreateQuiz}
                                    disabled={isCreatingQuiz}
                                    isLoading={isCreatingQuiz}
                                >
                                    Soruları Düzenle ve Sınav Oluştur
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handleDeleteSession = async () => {
        if (!session) return;
        setShowDeleteConfirm(true);
    };

    const confirmDeleteSession = async () => {
        if (!session) return;
        try {
            await deleteSession(session.id);
            addToast({ type: 'success', title: 'Başarılı', message: 'Analiz silindi.' });
            navigate(ROUTES.TEACHER.SESSIONS);
        } catch (error) {
            console.error('Error deleting session:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Analiz silinemedi.' });
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader size="lg" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.errorState}>
                <AlertCircle size={48} />
                <h2>Analiz Bulunamadı</h2>
                <Button variant="primary" onClick={() => navigate(ROUTES.TEACHER.SESSIONS)}>
                    AI Analizlere Dön
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.navRow}>
                <button
                    onClick={() => navigate(ROUTES.TEACHER.SESSIONS)}
                    className={styles.backLink}
                >
                    <ArrowLeft size={20} /> Geri Dön
                </button>
            </div>

            <div className={styles.titleRow}>
                <h1 className={styles.title}>
                    {analysis?.title || session.title || 'Ders Kaydı'}
                </h1>
                <button className={styles.deleteBtn} onClick={handleDeleteSession}>
                    <Trash2 size={20} />
                </button>
            </div>


            <div className={styles.metaRow}>
                {/* Status Badge */}
                <span className={`${styles.subjectBadge} ${session.status === 'recorded' ? styles.badgeRecorded :
                    session.status === 'transcribed' ? styles.badgeTranscribed :
                        session.status === 'completed' ? styles.badgeCompleted :
                            styles.badgeDefault
                    }`} style={{ marginRight: '8px' }}>
                    {session.status === 'recorded' ? 'KAYITLI' :
                        session.status === 'transcribed' ? 'ANALİZ EDİLDİ' :
                            session.status === 'completed' ? 'TAMAMLANDI' : session.status.toUpperCase()}
                </span>

                <span className={styles.subjectBadge}>
                    {analysis?.subject || session.subject || 'GENEL'}
                </span>
                <span className={styles.dateMeta}>
                    <Calendar size={16} />
                    {session.createdAt && new Date((session.createdAt as any).toDate ? (session.createdAt as any).toDate() : session.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>

            </div>

            {/* Audio Player — Custom UI */}
            {session.audioUrl && (
                <div className={styles.playerCard}>
                    <button className={styles.playButton} onClick={togglePlay}>
                        {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
                    </button>

                    <div className={styles.playerContent}>
                        <span className={styles.playerLabel}>DERS KAYDI</span>
                        <div className={styles.waveformContainer}>
                            {Array.from({ length: 40 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`${styles.waveformBar} ${isPlaying ? styles.active : ''} ${!isPlaying ? styles.paused : ''}`}
                                    style={{
                                        height: `${Math.max(30, Math.random() * 100)}%`,
                                        animationDelay: `${i * 0.05}s`
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.playerRight}>
                        <span style={{ minWidth: '100px', textAlign: 'right' }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Hidden Audio Element Logic */}
                    <audio
                        ref={audioRef}
                        src={session.audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        style={{ display: 'none' }}
                    />
                </div>
            )}

            {processingStep === 'idle' && session.status === 'recorded' && !analysis && (
                <div className={`${styles.startCard} ios-card`}>
                    <div className={styles.startContent}>
                        <div className={styles.startIcon}>
                            <Sparkles size={40} />
                        </div>
                        <h2>AI Analiz</h2>
                        <p>
                            Ses kaydınız yüklendi. Şimdi AI ile analiz ederek ders içeriğini,
                            anahtar kavramları ve quiz sorularını otomatik oluşturun.
                        </p>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleStartProcessing}
                            leftIcon={<Brain size={20} />}
                            style={{ width: '100%' }}
                        >
                            AI Analizi Başlat
                        </Button>
                    </div>
                </div>
            )}

            {(processingStep !== 'idle' && processingStep !== 'completed' && processingStep !== 'error') && (
                <div className={`${styles.processingCard} ios-card`}>
                    {renderProcessingStatus()}
                </div>
            )}

            {processingStep === 'error' && (
                <div className={`${styles.errorCard} ios-card`}>
                    <AlertCircle size={48} className={styles.errorIcon} />
                    <h2>İşlem Başarısız</h2>
                    <p>AI analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.</p>
                    <Button
                        variant="primary"
                        onClick={handleStartProcessing}
                        leftIcon={<RefreshCw size={18} />}
                    >
                        Tekrar Dene
                    </Button>
                </div>
            )}

            {(processingStep === 'completed' || analysis) && renderResults()}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDeleteSession}
                title="Analizi Sil"
                message="Bu analizi ve ilişkili tüm verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Sil"
                isLoading={isLoading}
            />
        </div>
    );
};
