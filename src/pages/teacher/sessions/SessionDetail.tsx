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
import type { LessonAnalysis, GeneratedQuiz, TranscriptionResult } from '../../../types';
import { Button, Loader } from '../../../components/common';
import { ROUTES, generatePath } from '../../../config/routes';
import type { Session, Question } from '../../../types';
import { generateQuestionId, QUESTION_TYPES, DEFAULT_QUIZ_SETTINGS, calculateTotalPoints, estimateQuizDuration } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
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

    // AI Results
    const [transcript, setTranscript] = useState<TranscriptionResult | null>(null);
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
                    setTranscript(data.analysisResults.transcript);
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

            setTranscript(results.transcript);
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
                message: 'Ders kaydınız analiz edildi ve quiz hazır.',
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
                } else if (q.type === 'open_ended') {
                    return {
                        ...baseQuestion,
                        type: QUESTION_TYPES.OPEN_ENDED,
                    } as Question;
                } else if (q.type === 'fill_blank') {
                    // Start filling logic if needed, for now just basic structure
                    return {
                        ...baseQuestion,
                        type: QUESTION_TYPES.FILL_BLANK,
                        textWithBlanks: q.textWithBlanks || q.question, // Use textWithBlanks if available
                        blanks: q.blanks?.map(b => ({
                            id: b.id,
                            correctAnswer: b.correctAnswer,
                            caseSensitive: false
                        })) || []
                    } as unknown as Question;
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

            addToast({ type: 'success', title: 'Başarılı', message: 'Quiz taslağı oluşturuldu.' });

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
    const renderResults = () => {
        if (!analysis || !quiz) return null;

        return (
            <div className={styles.results}>
                {/* Analysis Card — User Refined Design */}
                <div className={styles.analysisCard}>
                    {/* Header with Bulb Icon */}
                    <div className={styles.analysisHeader}>
                        <div style={{ width: '40px', height: '40px', background: '#F3E8FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Brain size={20} color="#9333EA" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111827' }}>Ders Analizi</h3>
                    </div>

                    {/* Title */}
                    <span className={styles.sectionLabel}>BAŞLIK</span>
                    <h4 className={styles.analysisTitle}>{analysis.title}</h4>

                    {/* Meta Grid (Ders & Seviye) */}
                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <span className={styles.sectionLabel}>DERS</span>
                            <span className={styles.badgePurple}>{analysis.subject}</span>
                        </div>
                        {analysis.gradeLevel && (
                            <div className={styles.metaItem}>
                                <span className={styles.sectionLabel}>SEVİYE</span>
                                <span className={styles.badgeTeal}>{analysis.gradeLevel}</span>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <span className={styles.sectionLabel}>ÖZET</span>
                    <p className={styles.summaryText}>{analysis.summary}</p>

                    {/* Topics */}
                    <span className={styles.sectionLabel}>ANAHTAR KONULAR</span>
                    <div className={styles.topicsList}>
                        {analysis.keyTopics.map((topic, i) => (
                            <span key={i} className={styles.topicTag}>{topic}</span>
                        ))}
                    </div>

                    {/* Concepts */}
                    <div style={{ marginTop: '40px' }}>
                        <span className={styles.sectionLabel}>ÖNEMLİ KAVRAMLAR ({analysis.keyConcepts.length})</span>
                        <div className={styles.conceptsGrid}>
                            {analysis.keyConcepts.slice(0, 4).map((concept, i) => (
                                <div key={i} className={styles.conceptItem}>
                                    <strong>{concept.term}</strong>
                                    <p>{concept.definition}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quiz Preview Card */}
                {/* Quiz Preview Card — Vibrant Gradient Design */}
                {/* Quiz Preview Card — Clean Design */}
                <div className={styles.quizCard}>
                    <div className={styles.quizHeader}>
                        <div style={{ width: '40px', height: '40px', background: '#F3E8FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={20} color="#9333EA" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111827' }}>Oluşturulan Quiz</h3>
                    </div>

                    {/* Stats Row */}
                    <div className={styles.quizStats}>
                        <div className={`${styles.statItem} ${styles.statPurple}`}>
                            <span className={styles.statValue}>{quiz.questions.length}</span>
                            <span className={styles.statLabel}>SORU SAYISI</span>
                        </div>
                        <div className={`${styles.statItem} ${styles.statTeal}`}>
                            <span className={styles.statValue}>{quiz.estimatedTime}</span>
                            <span className={styles.statLabel}>DAKİKA</span>
                        </div>
                        <div className={`${styles.statItem} ${styles.statOrange}`}>
                            <span className={styles.statValue}>
                                {quiz.difficulty === 'easy' ? 'Kolay' : quiz.difficulty === 'medium' ? 'Orta' : 'Zor'}
                            </span>
                            <span className={styles.statLabel}>ZORLUK SEVİYESİ</span>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className={styles.questionPreview}>
                        <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                            ÖRNEK SORULAR
                        </h4>
                        {quiz.questions.slice(0, 3).map((q, i) => (
                            <div key={q.id} className={styles.questionItem}>
                                <div className={styles.questionNumber}>{i + 1}</div>
                                <p>{q.question}</p>
                            </div>
                        ))}
                    </div>

                    {/* Action Button */}
                    <div className={styles.quizActions}>
                        <Button
                            className={styles.editQuizBtn}
                            leftIcon={<Edit3 size={18} color="white" />}
                            onClick={handleCreateQuiz}
                            disabled={isCreatingQuiz}
                            isLoading={isCreatingQuiz}
                        >
                            Soruları Düzenle ve Kaydet
                        </Button>
                    </div>
                </div>

                {/* Transcript Card — Clean Design */}
                {transcript && (
                    <div className={styles.transcriptCard}>
                        <div className={styles.transcriptHeader}>
                            <div style={{ width: '40px', height: '40px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                                <FileText size={20} color="#059669" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111827' }}>Transkript</h3>
                        </div>
                        <div className={styles.transcriptContent}>
                            {transcript.text && transcript.text.split('\n').map((para: string, i: number) => (
                                para.trim() && <p key={i} className={styles.transcriptParagraph}>{para}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleDeleteSession = async () => {
        if (!session) return;
        if (!window.confirm('Bu analizi silmek istediğinize emin misiniz?')) return;

        try {
            await deleteSession(session.id);
            addToast({ type: 'success', title: 'Başarılı', message: 'Analiz silindi.' });
            navigate(ROUTES.TEACHER.SESSIONS);
        } catch (error) {
            console.error('Error deleting session:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Analiz silinemedi.' });
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
                        session.status === 'transcribed' ? 'YAZIYA DÖKÜLDÜ' :
                            session.status === 'completed' ? 'TAMAMLANDI' : session.status}
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
        </div>
    );
};
