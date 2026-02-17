import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Question } from '../../../types/quiz';
import { QUESTION_TYPES } from '../../../types/quiz';
import styles from './QuestionViewer.module.css';
import { Check, X, Wand2, AlertTriangle } from 'lucide-react';
import { Button } from '../../common';
import { improveQuestion } from '../../../services/aiService';
import { useUIStore } from '../../../stores/uiStore';

// Error Boundary for individual questions
class QuestionErrorBoundary extends React.Component<
    {
        children: React.ReactNode;
        onFix?: (prompt: string) => void;
        isUpdating?: boolean;
        questionId: string
    },
    { hasError: boolean; lastQuestionId: string; showPrompt: boolean; prompt: string }
> {
    constructor(props: any) {
        super(props);
        this.state = {
            hasError: false,
            lastQuestionId: this.props.questionId,
            showPrompt: false,
            prompt: ''
        };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Question rendering error:", error, errorInfo);
    }

    componentDidUpdate(prevProps: any) {
        if (prevProps.questionId !== this.props.questionId) {
            this.setState({
                hasError: false,
                lastQuestionId: this.props.questionId,
                showPrompt: false,
                prompt: ''
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.errorFallback}>
                    <div className={styles.errorHeader}>
                        <AlertTriangle className={styles.errorIcon} size={32} />
                        <h3>Ooopps! Bu Soru Hatalı Üretilmiş</h3>
                    </div>
                    <div className={styles.errorBody}>
                        <p>Bu soru AI tarafından hatalı bir formatta üretildiği için görüntülenemiyor. Bu durum bazen teknik kısıtlamalar nedeniyle yaşanabiliyor.</p>
                        {this.props.onFix && (
                            <p>Hiç dert değil! Aşağıdaki butona basarak AI'ın bu soruyu anında onarmasını sağlayabilirsiniz.</p>
                        )}
                    </div>

                    {this.state.showPrompt && (
                        <div style={{ width: '100%', marginBottom: '16px', animation: 'fadeIn 0.2s ease-out' }}>
                            <textarea
                                value={this.state.prompt}
                                onChange={(e) => this.setState({ prompt: e.target.value })}
                                placeholder="AI'ya özel bir talimatınız var mı? (Boş bırakabilirsiniz)..."
                                className={styles.textArea}
                                style={{ minHeight: '60px', fontSize: '0.9rem' }}
                            />
                        </div>
                    )}

                    {this.props.onFix && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {this.state.showPrompt && (
                                <Button
                                    variant="outline"
                                    onClick={() => this.setState({ showPrompt: false })}
                                >
                                    İptal
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                leftIcon={<Wand2 size={18} />}
                                onClick={() => {
                                    if (this.state.showPrompt) {
                                        this.props.onFix?.(this.state.prompt);
                                    } else {
                                        this.setState({ showPrompt: true });
                                    }
                                }}
                                isLoading={this.props.isUpdating}
                            >
                                AI ile İyileştir
                            </Button>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

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
    const q = question as any;

    // Shuffled items for UI randomization - Moved to top level to follow Rules of Hooks
    const { shuffledLeft, shuffledRight } = useMemo(() => {
        if (question.type !== QUESTION_TYPES.MATCHING || !q.pairs) {
            return { shuffledLeft: [], shuffledRight: [] };
        }

        const left = q.pairs.map((p: any) => ({
            id: `left_${p.id}`,
            text: p.left,
            originalId: p.id
        }));

        const right = q.pairs.map((p: any) => ({
            text: p.right,
            id: p.id
        }));

        // Pure shuffle function
        const shuffle = <T,>(array: T[]): T[] => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        return {
            shuffledLeft: shuffle(left),
            shuffledRight: shuffle(right)
        };
    }, [question.id, question.type, q.pairs]);
    // Local state for matching question interactions
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    // Refs for matching lines
    const matchingContainerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [matchLines, setMatchLines] = useState<{ x1: number, y1: number, x2: number, y2: number, color: string }[]>([]);

    // Helper to generate consistent colors for pairs
    const getPairColor = (index: number) => {
        const colors = [
            { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' }, // Indigo
            { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' }, // Green
            { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C' }, // Red
            { bg: '#FFF7ED', border: '#F97316', text: '#C2410C' }, // Orange
            { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' }, // Purple
            { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' }, // Blue
            { bg: '#FDF4FF', border: '#EC4899', text: '#BE185D' }, // Pink
            { bg: '#ECFEFF', border: '#06B6D4', text: '#0E7490' }, // Cyan
        ];
        return colors[index % colors.length];
    };

    // Calculate matching lines
    const calculateLines = useCallback(() => {
        if (question.type !== QUESTION_TYPES.MATCHING || !matchingContainerRef.current) return;

        const containerRect = matchingContainerRef.current.getBoundingClientRect();
        const lines: typeof matchLines = [];
        const q = question as any;

        // Determine which matches to show
        let displayMatches = answer || {};
        if (showFeedback && q.pairs) {
            displayMatches = q.pairs.reduce((acc: any, p: any) => {
                acc[`left_${p.id}`] = p.id;
                return acc;
            }, {});
        }

        Object.entries(displayMatches).forEach(([leftId, rightId]) => {
            const leftEl = itemRefs.current[leftId];
            const rightEl = itemRefs.current[rightId as string];

            if (leftEl && rightEl) {
                const leftRect = leftEl.getBoundingClientRect();
                const rightRect = rightEl.getBoundingClientRect();

                // Get color
                const pairIndex = q.pairs.findIndex((p: any) => p.id === rightId);
                const colorObj = getPairColor(pairIndex);

                // Add small overlap (5px) to prevent gaps
                lines.push({
                    x1: (leftRect.right - containerRect.left) - 5,
                    y1: leftRect.top + leftRect.height / 2 - containerRect.top,
                    x2: (rightRect.left - containerRect.left) + 5,
                    y2: rightRect.top + rightRect.height / 2 - containerRect.top,
                    color: colorObj.border
                });
            }
        });

        setMatchLines(lines);
    }, [question, answer, showFeedback]);

    // Update lines on resize or answer change
    useEffect(() => {
        if (question.type === QUESTION_TYPES.MATCHING) {
            let rafId: number;

            const handleUpdate = () => {
                calculateLines();
                rafId = requestAnimationFrame(handleUpdate);
            };

            // Initial call
            calculateLines();

            // Continuous update for stability
            rafId = requestAnimationFrame(handleUpdate);

            window.addEventListener('resize', calculateLines);
            // Use capture to catch scroll events on any parent
            window.addEventListener('scroll', calculateLines, true);

            return () => {
                cancelAnimationFrame(rafId);
                window.removeEventListener('resize', calculateLines);
                window.removeEventListener('scroll', calculateLines, true);
            };
        }
    }, [calculateLines, question.type]);

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

                    type ButtonClass = string;
                    let className: ButtonClass = `${styles.optionButton} ${isSelected ? styles.selected : ''}`;

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

    // Render Open Ended
    const renderOpenEnded = () => {
        const q = question as any;
        return (
            <div className={styles.inputWrapper}>
                <textarea
                    className={styles.textArea}
                    value={answer || ''}
                    onChange={(e) => !readOnly && onAnswerChange(e.target.value)}
                    placeholder="Cevabınızı buraya yazın..."
                    disabled={readOnly}
                />
                {showFeedback && (
                    <div className={styles.feedback}>
                        <strong>Beklenen Cevap Özeti:</strong> {q.explanation}
                    </div>
                )}
            </div>
        );
    };

    // Render Fill Blank
    const renderFillBlank = () => {
        const q = question as any;
        const text = q.textWithBlanks || q.question || '';
        if (!text) return null;

        const splitRegex = /({{\s*[\w-]+\s*}}|___)/;
        const parts = text.split(splitRegex);
        const blankRegex = /{{\s*[\w-]+\s*}}|___/;

        let blankCounter = 0;

        return (
            <div className={styles.fillBlankWrapper}>
                <div className={styles.fillBlankSentence}>
                    {parts.map((part: string, index: number) => {
                        if (blankRegex.test(part)) {
                            const blankIdFromPart = part.includes('{{') ? part.replace(/{{|}}/g, '').trim() : null;
                            const blankId = blankIdFromPart || (q.blanks?.[blankCounter]?.id) || `blank_${blankCounter + 1}`;
                            blankCounter++;

                            // Find the correct answer by ID or fallback to current counter index
                            // Extremely robust answer extraction
                            const trimmedBlankId = blankId.trim();
                            const blankFromBlanks = q.blanks?.find((b: any) => b.id.trim() === trimmedBlankId)
                                || q.blanks?.[blankCounter - 1];

                            const correctVal =
                                blankFromBlanks?.correctAnswer ||
                                blankFromBlanks?.correct_answer ||
                                blankFromBlanks?.correctAnswers?.[0] ||
                                blankFromBlanks?.answer ||
                                blankFromBlanks?.value ||
                                blankFromBlanks?.rightAnswer ||
                                (typeof blankFromBlanks === 'string' ? blankFromBlanks : '') ||
                                (!trimmedBlankId.toLowerCase().includes('blank') ? trimmedBlankId : ''); // If ID is a word like {{Paris}}, use it as fallback

                            return (
                                <input
                                    key={`blank-${blankId}-${index}`}
                                    type="text"
                                    className={`${styles.blankInputInline} ${showFeedback ? styles.feedbackInput : ''}`}
                                    value={showFeedback ? (correctVal || answer?.[blankId] || '') : (answer?.[blankId] ?? '')}
                                    onChange={(e) => {
                                        if (readOnly || showFeedback) return;
                                        const newAnswer = { ...(answer || {}), [blankId]: e.target.value };
                                        onAnswerChange(newAnswer);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={readOnly || showFeedback}
                                    autoComplete="off"
                                />
                            );
                        } else {
                            return <span key={`text-${index}`}>{part}</span>;
                        }
                    })}
                </div>
                <div className={styles.fillBlankInstruction}>
                    Lütfen yukarıdaki cümledeki boşluğu/boşlukları doğru biçimde doldurun.
                </div>
            </div>
        );
    };

    // Render Matching
    const renderMatching = () => {
        const q = question as any;
        if (!q.pairs) return null;

        // Determine which matches to show
        let currentMatches = answer || {};
        if (showFeedback && q.pairs) {
            currentMatches = q.pairs.reduce((acc: any, p: any) => {
                acc[`left_${p.id}`] = p.id;
                return acc;
            }, {});
        }

        const handleLeftClick = (leftId: string) => {
            if (readOnly) return;

            // If already matched, remove match
            if (currentMatches[leftId]) {
                const newMatches = { ...currentMatches };
                delete newMatches[leftId];
                onAnswerChange(newMatches);
                return;
            }

            setSelectedLeft(leftId === selectedLeft ? null : leftId);
        };

        const handleRightClick = (rightPairId: string) => {
            if (readOnly || !selectedLeft) return;

            // Check if this right item is already matched to another left item
            const existingLeftForItem = Object.keys(currentMatches).find(key => currentMatches[key] === rightPairId);

            const newMatches = { ...currentMatches };
            if (existingLeftForItem) {
                delete newMatches[existingLeftForItem];
            }

            newMatches[selectedLeft] = rightPairId;
            onAnswerChange(newMatches);
            setSelectedLeft(null);
        };

        const leftItems = shuffledLeft;
        const rightItems = shuffledRight;

        return (
            <div className={styles.matchingContainer} ref={matchingContainerRef} style={{ position: 'relative' }}>
                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 0
                    }}
                >
                    {matchLines.map((line, i) => (
                        <line
                            key={i}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={line.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>

                {/* Left Column */}
                <div className={styles.matchColumn}>
                    <div className={styles.matchHeader}>{q.leftColumnTitle || 'Kavram'}</div>
                    {leftItems.map((item: any) => {
                        const matchedPairId = currentMatches[item.id];
                        const isMatched = !!matchedPairId;
                        const isSelected = selectedLeft === item.id;

                        let style = {};
                        if (isMatched) {
                            const pairIndex = q.pairs.findIndex((p: any) => p.id === matchedPairId);
                            const color = getPairColor(pairIndex);
                            style = {
                                backgroundColor: color.bg,
                                borderColor: color.border,
                                color: color.text,
                                zIndex: 1
                            };
                        }

                        return (
                            <div
                                key={item.id}
                                ref={el => { if (el) itemRefs.current[item.id] = el; }}
                                className={`${styles.matchItem} ${isSelected ? styles.active : ''} ${isMatched ? styles.matched : ''}`}
                                onClick={() => handleLeftClick(item.id)}
                                style={style}
                            >
                                <span className={styles.matchText}>{item.text}</span>
                                {isMatched && <Check size={16} />}
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className={styles.matchColumn}>
                    <div className={styles.matchHeader}>{q.rightColumnTitle || 'Tanım'}</div>
                    {rightItems.map((item: any) => {
                        const matchedLeftId = Object.keys(currentMatches).find(key => currentMatches[key] === item.id);
                        const isMatched = !!matchedLeftId;

                        let style = {};
                        if (isMatched) {
                            const pairIndex = q.pairs.findIndex((p: any) => p.id === item.id);
                            const color = getPairColor(pairIndex);
                            style = {
                                backgroundColor: color.bg,
                                borderColor: color.border,
                                color: color.text,
                                zIndex: 1
                            };
                        }

                        return (
                            <div
                                key={item.id}
                                ref={el => { if (el) itemRefs.current[item.id] = el; }}
                                className={`${styles.matchItem} ${isMatched ? styles.matched : ''} ${!isMatched && selectedLeft ? styles.selectable : ''}`}
                                onClick={() => handleRightClick(item.id)}
                                style={style}
                            >
                                <span className={styles.matchText}>{item.text}</span>
                                {isMatched && <Check size={16} />}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.card}>
            {/* If it's a fill_blank question, we handle the text rendering inside the answerArea to avoid duplication */}
            {question.type !== QUESTION_TYPES.FILL_BLANK && (
                <div className={styles.questionText}>
                    {question.question}
                </div>
            )}

            <div className={styles.answerArea}>
                {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && renderMultipleChoice()}
                {question.type === QUESTION_TYPES.TRUE_FALSE && renderTrueFalse()}
                {question.type === QUESTION_TYPES.OPEN_ENDED && renderOpenEnded()}
                {question.type === QUESTION_TYPES.FILL_BLANK && renderFillBlank()}
                {question.type === QUESTION_TYPES.MATCHING && renderMatching()}
            </div>

            {showFeedback && question.explanation && (
                <div className={styles.explanation}>
                    <strong>Açıklama:</strong> {question.explanation}
                </div>
            )}
        </div>
    );
};
