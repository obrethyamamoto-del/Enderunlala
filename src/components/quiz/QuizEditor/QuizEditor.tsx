import React, { useState, useCallback } from 'react';
import {
    Plus,
    Trash2,
    GripVertical,
    Copy,
    ChevronDown,
    ChevronUp,
    Wand2,
    Save,
    Eye,
    Settings,
    List,
    Target,
    Clock,
    Send,
} from 'lucide-react';
import { Button, Input } from '../../common';
import { QuestionEditor } from './QuestionEditor';
import { AIGeneratorModal } from '../AIGeneratorModal';
import { useUIStore } from '../../../stores/uiStore';
import type {
    Quiz,
    Question,
    QuestionType,
} from '../../../types/quiz';
import {
    QUESTION_TYPE_LABELS,
    createEmptyQuestion,
    calculateTotalPoints,
    estimateQuizDuration,
    generateQuestionId,
} from '../../../types/quiz';
import styles from './QuizEditor.module.css';

interface QuizEditorProps {
    quiz: Quiz;
    onSave: (quiz: Quiz) => void;
    onGenerateWithAI?: () => void;
    onPreview?: (quiz: Quiz) => void;
    onPublish?: () => void;
    isLoading?: boolean;
    hideHeader?: boolean;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
    quiz: initialQuiz,
    onSave,
    onGenerateWithAI,
    onPreview,
    onPublish,
    isLoading = false,
    hideHeader = false,
}) => {
    const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
        quiz.questions[0]?.id || null
    );
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isAIGenOpen, setIsAIGenOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isQuestionDraggingAllowed, setIsQuestionDraggingAllowed] = useState(false);
    const { addToast } = useUIStore();

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

    // Soru kopyala
    const duplicateQuestion = useCallback((questionId: string) => {
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question) return;

        const newQuestion: Question = {
            ...question,
            id: generateQuestionId(),
            order: quiz.questions.length,
        };

        setQuiz(prev => ({
            ...prev,
            questions: [...prev.questions, newQuestion],
            totalPoints: calculateTotalPoints([...prev.questions, newQuestion]),
            estimatedDuration: estimateQuizDuration([...prev.questions, newQuestion]),
            updatedAt: new Date(),
        }));
        setExpandedQuestionId(newQuestion.id);
        setHasChanges(true);
    }, [quiz.questions]);

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

    // AI ile Soru Oluşturma
    const handleAIGeneration = useCallback(async (params: {
        topic: string;
        count: number;
        difficulty: 'easy' | 'medium' | 'hard';
        questionTypes: QuestionType[];
    }) => {
        setIsGenerating(true);
        try {
            const { generateQuizFromTopic } = await import('../../../services/aiService');

            const newQuestions = await generateQuizFromTopic({
                topic: params.topic,
                questionCount: params.count,
                difficulty: params.difficulty,
                questionTypes: params.questionTypes,
            });

            if (newQuestions.length > 0) {
                setQuiz(prev => {
                    const updatedQuestions = [...prev.questions, ...newQuestions];
                    return {
                        ...prev,
                        questions: updatedQuestions,
                        totalPoints: calculateTotalPoints(updatedQuestions),
                        estimatedDuration: estimateQuizDuration(updatedQuestions),
                        updatedAt: new Date(),
                    };
                });
                setExpandedQuestionId(newQuestions[0].id);
                setHasChanges(true);
                setIsAIGenOpen(false);
                addToast({ type: 'success', title: 'Başarılı', message: `${newQuestions.length} soru eklendi.` });
            } else {
                addToast({ type: 'warning', title: 'Uyarı', message: 'Soru üretilemedi.' });
            }
        } catch (error) {
            console.error('AI Gen Error:', error);
            addToast({ type: 'error', title: 'Hata', message: 'AI servisi ile iletişim kurulamadı.' });
        } finally {
            setIsGenerating(false);
        }
    }, [addToast]);

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


    return (
        <div className={styles.editor}>
            {/* Header and Description - Hidden if hideHeader is true */}
            {!hideHeader && (
                <>
                    <div className={styles.topHeader}>
                        <div className={styles.titleInfo}>
                            <div className={styles.titleWrapper}>
                                <Input
                                    value={quiz.title}
                                    onChange={(e) => updateQuizMeta({ title: e.target.value })}
                                    placeholder="Quiz Başlığı"
                                    className={styles.titleInput}
                                />
                            </div>

                            <div className={styles.metaRow}>
                                <span className={`${styles.statusBadge} ${styles[quiz.status]}`}>
                                    {quiz.status === 'draft' ? 'SORULAR ONAYLANDI' :
                                        quiz.status === 'published' ? 'YAYINDA' :
                                            quiz.status === 'closed' ? 'KAPALI' : 'ARŞİV'}
                                </span>
                                <div className={styles.statsIcons}>
                                    <span className={styles.statItem}><List size={14} /> {quiz.questions.length} Soru</span>
                                    <span className={styles.separator}>•</span>
                                    <span className={styles.statItem}><Target size={14} /> {quiz.totalPoints} Puan</span>
                                    <span className={styles.separator}>•</span>
                                    <span className={styles.statItem}><Clock size={14} /> ~{quiz.estimatedDuration} Dakika</span>
                                </div>
                            </div>
                        </div>

                        {onPublish && quiz.status === 'draft' && (
                            <Button
                                variant="primary"
                                leftIcon={<Send size={18} />}
                                onClick={onPublish}
                                className={styles.publishMainBtn}
                            >
                                Yayınla
                            </Button>
                        )}
                    </div>

                    <div className={styles.actionsBar}>
                        <div className={styles.leftActions}>
                            {onGenerateWithAI && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Wand2 size={16} color="#8B5CF6" />}
                                    onClick={() => setIsAIGenOpen(true)}
                                    disabled={isLoading}
                                    className={styles.whiteActionBtn}
                                >
                                    AI ile Oluştur
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Eye size={16} />}
                                onClick={handlePreview}
                                disabled={isLoading}
                                className={styles.whiteActionBtn}
                            >
                                Önizle
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Settings size={16} />}
                                className={styles.whiteActionBtn}
                            >
                                Ayarlar
                            </Button>
                        </div>

                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Save size={16} />}
                            onClick={handleSave}
                            disabled={isLoading || !hasChanges}
                            className={styles.saveBtn}
                        >
                            Kaydet
                        </Button>
                    </div>

                    <div className={styles.descriptionCard}>
                        <textarea
                            value={quiz.description || ''}
                            onChange={(e) => updateQuizMeta({ description: e.target.value })}
                            placeholder="Dersle ilgili açıklama..."
                            className={styles.descriptionTextarea}
                            rows={2}
                        />
                    </div>
                </>
            )}

            {/* Questions List */}
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
                        {/* Question Header */}
                        <div
                            className={styles.questionHeader}
                            onClick={() => setExpandedQuestionId(
                                expandedQuestionId === question.id ? null : question.id
                            )}
                        >
                            <div className={styles.questionLeft}>
                                <span
                                    className={styles.dragHandle}
                                    onMouseDown={() => setIsQuestionDraggingAllowed(true)}
                                    onMouseUp={() => setIsQuestionDraggingAllowed(false)}
                                    data-drag-handle="question"
                                >
                                    <GripVertical size={16} />
                                </span>
                                <span className={styles.questionNumber}>{index + 1}</span>
                                <span className={`${styles.questionType} ${styles[question.type]}`}>
                                    {QUESTION_TYPE_LABELS[question.type]}
                                </span>
                                <span className={styles.questionPreview}>
                                    {question.question || 'Soru metni girilmedi...'}
                                </span>
                            </div>

                            <div className={styles.questionRight}>
                                <span className={styles.pointsBadge}>{question.points} puan</span>
                                <div className={styles.questionActions}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'up'); }}
                                        disabled={index === 0}
                                        className={styles.iconButton}
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'down'); }}
                                        disabled={index === quiz.questions.length - 1}
                                        className={styles.iconButton}
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); duplicateQuestion(question.id); }}
                                        className={styles.iconButton}
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteQuestion(question.id); }}
                                        className={`${styles.iconButton} ${styles.danger}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <ChevronDown
                                    size={20}
                                    className={`${styles.expandIcon} ${expandedQuestionId === question.id ? styles.rotated : ''}`}
                                />
                            </div>
                        </div>

                        {/* Question Editor */}
                        {expandedQuestionId === question.id && (
                            <div className={styles.questionContent}>
                                <QuestionEditor
                                    question={question}
                                    onChange={(updates) => updateQuestion(question.id, updates)}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Question Button */}
            <div className={styles.addSection}>
                <div className={styles.addButtonWrapper}>
                    <Button
                        variant="outline"
                        leftIcon={
                            <div className={styles.plusIconCircle}>
                                <Plus size={18} />
                            </div>
                        }
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className={styles.addButton}
                    >
                        Soru Ekle
                    </Button>

                    {showAddMenu && (
                        <div className={styles.addMenu}>
                            {/* @ts-ignore */}
                            {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
                                <button
                                    key={type}
                                    className={styles.addMenuItem}
                                    onClick={() => addQuestion(type as QuestionType)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AIGeneratorModal
                isOpen={isAIGenOpen}
                onClose={() => setIsAIGenOpen(false)}
                onGenerate={handleAIGeneration}
                initialTopic={quiz.title}
                isLoading={isGenerating}
            />
        </div>
    );
};

export default QuizEditor;
