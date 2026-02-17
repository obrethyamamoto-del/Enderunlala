import React, { useState } from 'react';
import { QuestionViewer } from '../QuizPlayer/QuestionViewer';
import { Button } from '../../common';
import { ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import styles from './QuizPreviewModal.module.css';

import type { Quiz, Question } from '../../../types/quiz';

interface QuizPreviewModalProps {
    quiz: Quiz;
    onClose: () => void;
    onQuestionUpdate?: (questionId: string, updatedQuestion: Question) => void;
}

export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({ quiz, onClose, onQuestionUpdate }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [showAnswers, setShowAnswers] = useState(false);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    const handleAnswerChange = (answer: any) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: answer
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        {quiz.title} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#718096' }}>(Önizleme)</span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <div className={styles.questionCounter}>
                        Soru {currentQuestionIndex + 1} / {quiz.questions.length}
                    </div>
                    <QuestionViewer
                        question={currentQuestion}
                        answer={answers[currentQuestion.id]}
                        onAnswerChange={handleAnswerChange}
                        onQuestionUpdate={(updated) => onQuestionUpdate?.(currentQuestion.id, updated)}
                        showFeedback={showAnswers}
                    />
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <Button
                        variant="ghost"
                        onClick={() => setShowAnswers(!showAnswers)}
                        leftIcon={<Eye size={16} />}
                    >
                        {showAnswers ? 'Cevapları Gizle' : 'Cevapları Göster'}
                    </Button>

                    <div className={styles.navButtons}>
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            leftIcon={<ChevronLeft size={16} />}
                        >
                            Önceki
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleNext}
                            disabled={currentQuestionIndex === quiz.questions.length - 1}
                            rightIcon={<ChevronRight size={16} />}
                        >
                            Sonraki
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
