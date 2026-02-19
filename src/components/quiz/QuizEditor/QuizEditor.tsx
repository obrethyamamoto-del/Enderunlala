import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Plus,
    Trash2,
    GripVertical,
    ArrowUp,
    ArrowDown,
    Save,
    Eye,
    Target,
    Clock,
    Send,
    ChevronDown,
    Sparkles,
    Type,
    Check,
} from 'lucide-react';
import { Button } from '../../common';
import { QuestionEditor } from './QuestionEditor';
import type {
    Quiz,
    Question,
    QuestionType,
} from '../../../types/quiz';
import {
    QUESTION_TYPES,
    QUESTION_TYPE_LABELS,
    createEmptyQuestion,
    calculateTotalPoints,
    estimateQuizDuration,
} from '../../../types/quiz';
import { generateQuizFromTopic } from '../../../services/aiService';
import { useUIStore } from '../../../stores/uiStore';
import styles from './QuizEditor.module.css';

interface QuizEditorProps {
    quiz: Quiz;
    onSave: (quiz: Quiz) => void;
    onGenerateWithAI?: () => void;
    onPreview?: (quiz: Quiz) => void;
    onPublish?: () => void;
    onApprove?: () => void;
    isLoading?: boolean;
    hideHeader?: boolean;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
    quiz: initialQuiz,
    onSave,
    onPreview,
    onPublish,
    onApprove,
    isLoading = false,
    hideHeader = false,
}) => {
    const [quiz, setQuiz] = useState<Quiz>(() => {
        const supportedTypes = Object.values(QUESTION_TYPES) as string[];
        return {
            ...initialQuiz,
            questions: initialQuiz.questions.filter(q => supportedTypes.includes(q.type))
        };
    });
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
        quiz.questions[0]?.id || null
    );
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [addMode, setAddMode] = useState<'decision' | 'manual' | 'ai'>('decision');
    const [aiTopic, setAiTopic] = useState('');
    const [aiQuestionType, setAiQuestionType] = useState<QuestionType>(QUESTION_TYPES.MULTIPLE_CHOICE);
    const [isGenerating, setIsGenerating] = useState(false);

    const [hasChanges, setHasChanges] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isQuestionDraggingAllowed, setIsQuestionDraggingAllowed] = useState(false);
    const addToast = useUIStore((state) => state.addToast);

    const addMenuRef = useRef<HTMLDivElement>(null);

    // Close add menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
                setAddMode('decision');
            }
        };

        if (showAddMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAddMenu]);

    // Sync state when prop changes
    React.useEffect(() => {
        const supportedTypes = Object.values(QUESTION_TYPES) as string[];
        setQuiz({
            ...initialQuiz,
            questions: initialQuiz.questions.filter(q => supportedTypes.includes(q.type))
        });
        setHasChanges(false); // Reset changes when a new state comes from parent (e.g. after save/approve)
    }, [initialQuiz]);

    // Quiz meta güncelle
    const updateQuizMeta = useCallback((updates: Partial<Quiz>) => {
        setQuiz(prev => ({ ...prev, ...updates, updatedAt: new Date() }));
        setHasChanges(true);
    }, []);

    // Soru ekle
    const addQuestion = useCallback((type: QuestionType) => {
        const newQuestion = createEmptyQuestion(type, quiz.questions.length);
        setQuiz(prev => ({
            ...prev,
            questions: [...prev.questions, newQuestion],
            totalPoints: calculateTotalPoints([...prev.questions, newQuestion]),
            estimatedDuration: estimateQuizDuration([...prev.questions, newQuestion]),
            updatedAt: new Date(),
        }));
        setExpandedQuestionId(newQuestion.id);
        setShowAddMenu(false);
        setHasChanges(true);
    }, [quiz.questions]);

    // Soru güncelle
    const updateQuestion = useCallback((questionId: string, updates: Partial<Question>) => {
        setQuiz(prev => {
            const updatedQuestions = prev.questions.map(q =>
                q.id === questionId ? { ...q, ...updates, updatedAt: new Date() } as Question : q
            );
            return {
                ...prev,
                questions: updatedQuestions,
                totalPoints: calculateTotalPoints(updatedQuestions),
                estimatedDuration: estimateQuizDuration(updatedQuestions),
                updatedAt: new Date(),
            };
        });
        setHasChanges(true);
    }, []);

    // Soru sil
    const deleteQuestion = useCallback((questionId: string) => {
        setQuiz(prev => {
            const updatedQuestions = prev.questions
                .filter(q => q.id !== questionId)
                .map((q, index) => ({ ...q, order: index }));
            return {
                ...prev,
                questions: updatedQuestions,
                totalPoints: calculateTotalPoints(updatedQuestions),
                estimatedDuration: estimateQuizDuration(updatedQuestions),
                updatedAt: new Date(),
            };
        });
        setHasChanges(true);
    }, []);

    // Sürükle-Bırak İşlemleri (Questions)
    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (!isQuestionDraggingAllowed) {
            e.preventDefault();
            return;
        }

        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());

        const currentTarget = e.currentTarget as HTMLElement;
        setTimeout(() => {
            currentTarget.classList.add(styles.dragging);
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.classList.remove(styles.dragging);
        setDraggedIndex(null);
        setDragOverIndex(null);
        setIsQuestionDraggingAllowed(false);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        setQuiz(prev => {
            const newQuestions = [...prev.questions];
            const [movedItem] = newQuestions.splice(draggedIndex, 1);
            newQuestions.splice(targetIndex, 0, movedItem);

            return {
                ...prev,
                questions: newQuestions.map((q, i) => ({ ...q, order: i })),
                updatedAt: new Date(),
            };
        });
        setHasChanges(true);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Soru sırasını değiştir
    const moveQuestion = useCallback((questionId: string, direction: 'up' | 'down') => {
        setQuiz(prev => {
            const index = prev.questions.findIndex(q => q.id === questionId);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.questions.length) return prev;

            const newQuestions = [...prev.questions];
            [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];

            return {
                ...prev,
                questions: newQuestions.map((q, i) => ({ ...q, order: i })),
                updatedAt: new Date(),
            };
        });
        setHasChanges(true);
    }, []);

    // Kaydet
    const handleSave = useCallback(() => {
        onSave(quiz);
        setHasChanges(false);
    }, [quiz, onSave]);

    // Önizle
    const handlePreview = useCallback(() => {
        if (onPreview) {
            onPreview(quiz);
        }
    }, [quiz, onPreview]);

    // AI ile soru üret
    const handleGenerateAI = async () => {
        if (!aiTopic.trim()) {
            addToast({ type: 'warning', title: 'Uyarı', message: 'Lütfen bir konu veya metin girin.' });
            return;
        }

        setIsGenerating(true);
        try {
            const newQuestions = await generateQuizFromTopic({
                topic: aiTopic,
                questionCount: 1,
                difficulty: 'medium',
                questionTypes: [aiQuestionType],
            });

            if (newQuestions.length > 0) {
                const question = newQuestions[0];
                question.order = quiz.questions.length;

                setQuiz(prev => ({
                    ...prev,
                    questions: [...prev.questions, question],
                    totalPoints: calculateTotalPoints([...prev.questions, question]),
                    estimatedDuration: estimateQuizDuration([...prev.questions, question]),
                    updatedAt: new Date(),
                }));
                setExpandedQuestionId(question.id);
                setAiTopic('');
                setShowAddMenu(false);
                setAddMode('decision');
                setHasChanges(true);
                addToast({ type: 'success', title: 'Başarılı', message: 'Soru AI tarafından üretildi.' });
            }
        } catch (error: any) {
            console.error('AI error:', error);
            addToast({
                type: 'error',
                title: 'Hata',
                message: error.message || 'Soru üretilirken bir hata oluştu.'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleAddMenu = () => {
        setShowAddMenu(!showAddMenu);
        setAddMode('decision');
    };

    return (
        <div className={styles.editor}>
            {!hideHeader && (
                <div className={styles.stickyHeader}>
                    <div className={styles.headerTop}>
                        <div className={styles.titleArea}>
                            <textarea
                                value={quiz.title}
                                onChange={(e) => updateQuizMeta({ title: e.target.value })}
                                placeholder="Quiz Başlığı"
                                className={styles.titleTextarea}
                                readOnly={quiz.status === 'published' || quiz.status === 'closed'}
                                rows={2}
                            />
                            <div className={styles.metaInfo}>
                                <span className={`${styles.statusBadge} ${styles[quiz.status]}`}>
                                    {quiz.status === 'draft' ? 'ONAY BEKLİYOR' :
                                        quiz.status === 'approved' ? 'YAYINA HAZIR' :
                                            quiz.status === 'published' ? 'YAYINLANDI' :
                                                quiz.status === 'closed' ? 'KAPALI' : 'ARŞİV'}
                                </span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.metaStat}><Target size={14} /> {quiz.totalPoints} Puan</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.metaStat}><Clock size={14} /> ~{quiz.estimatedDuration} dk</span>
                            </div>
                        </div>

                        <div className={styles.headerActions}>
                            <Button
                                variant="outline"
                                size="md"
                                leftIcon={<Eye size={18} />}
                                onClick={handlePreview}
                                className={styles.previewBtn}
                            >
                                Önizle
                            </Button>

                            {quiz.status !== 'published' && quiz.status !== 'closed' && (
                                <Button
                                    variant="primary"
                                    size="md"
                                    leftIcon={<Save size={18} />}
                                    onClick={handleSave}
                                    disabled={isLoading || !hasChanges}
                                    className={styles.saveActionBtn}
                                >
                                    Kaydet
                                </Button>
                            )}

                            {quiz.status === 'draft' && onApprove && (
                                <Button
                                    variant="primary"
                                    size="md"
                                    leftIcon={<Target size={18} />}
                                    onClick={onApprove}
                                    disabled={isLoading || hasChanges}
                                    className={styles.workflowBtn}
                                >
                                    Onayla
                                </Button>
                            )}

                            {quiz.status === 'approved' && onPublish && (
                                <Button
                                    variant="primary"
                                    size="md"
                                    leftIcon={<Send size={18} />}
                                    onClick={onPublish}
                                    disabled={isLoading || hasChanges}
                                    className={styles.workflowBtnPrimary}
                                >
                                    Yayınla
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className={styles.descriptionRow}>
                        <textarea
                            value={quiz.description || ''}
                            onChange={(e) => updateQuizMeta({ description: e.target.value })}
                            placeholder="Öğrencileriniz için kısa bir açıklama veya yönerge girin..."
                            className={styles.descTextarea}
                            rows={1}
                        />
                    </div>
                </div>
            )}

            <div className={styles.questionsList}>
                {quiz.questions.map((question, index) => (
                    <div
                        key={question.id}
                        draggable={!isLoading}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`
                            ${styles.questionCard} 
                            ${expandedQuestionId === question.id ? styles.expanded : ''}
                            ${dragOverIndex === index && draggedIndex !== index ? styles.dragOver : ''}
                        `}
                    >
                        <div
                            className={styles.questionHeader}
                            onClick={() => setExpandedQuestionId(
                                expandedQuestionId === question.id ? null : question.id
                            )}
                        >
                            <div className={styles.questionLeft}>
                                {quiz.status !== 'published' && quiz.status !== 'closed' && (
                                    <span
                                        className={styles.dragHandle}
                                        onMouseDown={() => setIsQuestionDraggingAllowed(true)}
                                        onMouseUp={() => setIsQuestionDraggingAllowed(false)}
                                    >
                                        <GripVertical size={16} />
                                    </span>
                                )}
                                <div className={styles.qIdentifier}>
                                    <span className={styles.qNumber}>{index + 1}</span>
                                    <span className={`${styles.qType} ${styles[question.type]}`}>
                                        {QUESTION_TYPE_LABELS[question.type]}
                                    </span>
                                </div>
                                <div className={styles.qMainContent}>
                                    <span className={styles.qTextPreview}>
                                        {question.question || 'Soru metni girilmedi...'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.questionRight}>
                                {quiz.status !== 'published' && quiz.status !== 'closed' && (
                                    <div className={styles.qActions}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'up'); }}
                                            disabled={index === 0}
                                            className={styles.qActionBtn}
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'down'); }}
                                            disabled={index === quiz.questions.length - 1}
                                            className={styles.qActionBtn}
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteQuestion(question.id); }}
                                            className={`${styles.qActionBtn} ${styles.delete}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className={`${styles.expandCircle} ${expandedQuestionId === question.id ? styles.active : ''}`}>
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        {expandedQuestionId === question.id && (
                            <div className={styles.questionContent}>
                                <QuestionEditor
                                    question={question}
                                    onChange={(updates) => updateQuestion(question.id, updates)}
                                    readOnly={quiz.status === 'published' || quiz.status === 'closed'}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {quiz.status !== 'published' && quiz.status !== 'closed' && (
                <div className={styles.addSection}>
                    <div className={styles.addBtnContainer} ref={addMenuRef}>
                        <Button
                            variant="outline"
                            leftIcon={<Plus size={20} />}
                            onClick={toggleAddMenu}
                            className={styles.mainAddBtn}
                        >
                            Yeni Soru Ekle
                        </Button>

                        {showAddMenu && (
                            <div className={styles.typeMenu}>
                                {addMode === 'decision' && (
                                    <div className={styles.decisionMenu}>
                                        <button
                                            className={styles.decisionItem}
                                            onClick={() => setAddMode('manual')}
                                        >
                                            <div className={styles.decisionIcon}><Type size={20} /></div>
                                            <div className={styles.decisionText}>
                                                <strong>Manuel Soru</strong>
                                                <span>Kendiniz yazın ve özelleştirin</span>
                                            </div>
                                        </button>
                                        <button
                                            className={styles.decisionItem}
                                            onClick={() => setAddMode('ai')}
                                        >
                                            <div className={`${styles.decisionIcon} ${styles.aiIcon}`}><Sparkles size={20} /></div>
                                            <div className={styles.decisionText}>
                                                <strong>AI ile Üret</strong>
                                                <span>Konu verin, GPT soruyu hazırlasın</span>
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {addMode === 'manual' && (
                                    <div className={styles.manualMenu}>
                                        <div className={styles.menuHeader}>
                                            <button onClick={() => setAddMode('decision')} className={styles.backBtn}>← Geri</button>
                                            <span>Soru Tipi Seçin</span>
                                        </div>
                                        {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
                                            <button
                                                key={type}
                                                className={styles.typeMenuItem}
                                                onClick={() => addQuestion(type as QuestionType)}
                                            >
                                                <span className={`${styles.typeDot} ${styles[type]}`} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {addMode === 'ai' && (
                                    <div className={styles.aiMenu}>
                                        <div className={styles.menuHeader}>
                                            <button onClick={() => setAddMode('decision')} className={styles.backBtn}>← Geri</button>
                                            <span>AI Soru Üretici</span>
                                        </div>
                                        <div className={styles.aiInputWrapper}>
                                            <div className={styles.aiTypeSelector}>
                                                <label className={styles.aiLabel}>Soru Tipi Seçin:</label>
                                                <div className={styles.aiTypeList}>
                                                    {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            className={`${styles.typeMenuItem} ${aiQuestionType === type ? styles.typeMenuItemActive : ''}`}
                                                            onClick={() => setAiQuestionType(type as QuestionType)}
                                                        >
                                                            <span className={`${styles.typeDot} ${styles[type]}`} />
                                                            <span style={{ flex: 1 }}>{label}</span>
                                                            {aiQuestionType === type && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <textarea
                                                value={aiTopic}
                                                onChange={(e) => setAiTopic(e.target.value)}
                                                placeholder="Soru ne hakkında olsun? (örn: 'Fotosentez evreleri bloğu')"
                                                className={styles.aiTopicInput}
                                                rows={3}
                                            />
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                fullWidth
                                                leftIcon={<Sparkles size={16} />}
                                                onClick={handleGenerateAI}
                                                isLoading={isGenerating}
                                                disabled={isGenerating}
                                                className={styles.aiGenerateBtn}
                                            >
                                                Soruyu Üret
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizEditor;
