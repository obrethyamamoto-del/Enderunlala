import React, { useState, useEffect } from 'react';
import type { Question } from '../../../types/quiz';
import { QUESTION_TYPES } from '../../../types/quiz';
import styles from './QuestionViewer.module.css';
import { Check, X, Wand2, AlertTriangle } from 'lucide-react';
import { Button } from '../../common';
import { improveQuestion } from '../../../services/aiService';
import { useUIStore } from '../../../stores/uiStore';

// Error Boundary for individual questions
const QuestionErrorBoundary: React.FC<{
    children: React.ReactNode;
    onFix?: (prompt: string) => void;
    isUpdating?: boolean;
    questionId: string
}> = ({ children, onFix, isUpdating, questionId }) => {
    const [hasError, setHasError] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [prompt, setPrompt] = useState('');

    useEffect(() => {
        setHasError(false);
        setShowPrompt(false);
        setPrompt('');
    }, [questionId]);

    if (hasError) {
        return (
            <div className={styles.errorFallback}>
                <div className={styles.errorHeader}>
                    <AlertTriangle className={styles.errorIcon} size={32} />
                    <h3>Ooopps! Bu Soru Hatalı Üretilmiş</h3>
                </div>
                <div className={styles.errorBody}>
                    <p>Bu soru AI tarafından hatalı bir formatta üretildiği için görüntülenemiyor.</p>
                </div>
                {onFix && (
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        {showPrompt && (
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="AI'ya özel bir talimatınız var mı?..."
                                className={styles.textArea}
                            />
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {showPrompt && <Button variant="outline" onClick={() => setShowPrompt(false)}>İptal</Button>}
                            <Button
                                variant="primary"
                                leftIcon={<Wand2 size={18} />}
                                onClick={() => showPrompt ? onFix(prompt) : setShowPrompt(true)}
                                isLoading={isUpdating}
                            >
                                AI ile İyileştir
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
};

interface QuestionViewerProps {
    question: Question;
    answer: any;
    onAnswerChange: (answer: any) => void;
    onQuestionUpdate?: (updatedQuestion: Question) => void; // Support fixing from viewer
    readOnly?: boolean;
    showFeedback?: boolean;
}

export const QuestionViewer: React.FC<QuestionViewerProps> = (props) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const addToast = useUIStore((state) => state.addToast);

    const handleFix = async (customInstructions?: string) => {
        if (!props.onQuestionUpdate) return;
        setIsUpdating(true);
        try {
            const improved = await improveQuestion({
                question: props.question,
                instructions: customInstructions || 'Soru formatı bozuk. Lütfen geçerli ve kaliteli bir soru formatına dönüştür.'
            });
            props.onQuestionUpdate(improved);
            addToast({ type: 'success', title: 'Başarılı', message: 'Soru onarıldı ve güncellendi.' });
        } catch (error) {
            console.error('Fix error:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Soru onarılamadı.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <QuestionErrorBoundary
            questionId={props.question.id}
            onFix={props.onQuestionUpdate ? handleFix : undefined}
            isUpdating={isUpdating}
        >
            <QuestionViewerInternal {...props} />
        </QuestionErrorBoundary>
    );
};

const QuestionViewerInternal: React.FC<QuestionViewerProps> = ({
    question,
    answer,
    onAnswerChange,
    readOnly = false,
    showFeedback = false,
}) => {

    // Render Multiple Choice
    const renderMultipleChoice = () => {
        const q = question as any; // Type casting for simplicity
        if (!q.options) return null;

        return (
            <div className={styles.optionsList}>
                {q.options.map((option: any) => {
                    const isSelected = answer === option.id;
                    const isCorrect = option.isCorrect;

                    let className = `${styles.optionButton} ${isSelected ? styles.selected : ''}`;

                    if (showFeedback) {
                        if (isCorrect) className += ` ${styles.correct}`;
                        else if (isSelected && !isCorrect) className += ` ${styles.incorrect}`;
                    }

                    return (
                        <button
                            key={option.id}
                            className={className}
                            onClick={() => !readOnly && onAnswerChange(option.id)}
                            disabled={readOnly}
                        >
                            <div className={styles.radioCircle}>
                                {showFeedback && isCorrect && <Check size={14} strokeWidth={3} color="#22c55e" />}
                                {showFeedback && isSelected && !isCorrect && <X size={14} strokeWidth={3} color="#ef4444" />}
                            </div>
                            <span>{option.text}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    // Render True/False
    const renderTrueFalse = () => {
        const q = question as any;
        const options = [
            { id: 'true', text: 'Doğru', value: true },
            { id: 'false', text: 'Yanlış', value: false },
        ];

        return (
            <div className={styles.optionsList}>
                {options.map((option) => {
                    const isSelected = answer === option.value;
                    const isCorrect = q.correctAnswer === option.value;

                    let className = `${styles.optionButton} ${isSelected ? styles.selected : ''}`;

                    if (showFeedback) {
                        if (isCorrect) className += ` ${styles.correct}`;
                        else if (isSelected && !isCorrect) className += ` ${styles.incorrect}`;
                    }

                    return (
                        <button
                            key={option.id}
                            className={className}
                            onClick={() => !readOnly && onAnswerChange(option.value)}
                            disabled={readOnly}
                        >
                            <div className={styles.radioCircle}>
                                {showFeedback && isCorrect && <Check size={14} strokeWidth={3} color="#22c55e" />}
                                {showFeedback && isSelected && !isCorrect && <X size={14} strokeWidth={3} color="#ef4444" />}
                            </div>
                            <span>{option.text}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.card}>
            <div className={styles.questionText}>
                {question.question}
            </div>

            <div className={styles.answerArea}>
                {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && renderMultipleChoice()}
                {question.type === QUESTION_TYPES.TRUE_FALSE && renderTrueFalse()}
            </div>

            {showFeedback && question.explanation && (
                <div className={styles.explanation}>
                    <strong>Açıklama:</strong> {question.explanation}
                </div>
            )}
        </div>
    );
};
