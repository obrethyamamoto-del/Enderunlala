import { useState, useEffect, useCallback } from 'react';
import type { Question } from '../types/quiz';

interface UseQuizSessionProps {
    quizId: string;
    questions: Question[];
    timeLimit?: number; // minutes
    onComplete?: (results: any) => void;
}

export const useQuizSession = ({
    quizId,
    questions,
    timeLimit,
    onComplete
}: UseQuizSessionProps) => {
    // State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [timeRemaining, setTimeRemaining] = useState<number | undefined>(
        timeLimit ? timeLimit * 60 : undefined
    );
    const [isCompleted, setIsCompleted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Storage Key
    const STORAGE_KEY = `quiz_session_${quizId}`;

    // Load from local storage
    useEffect(() => {
        if (!quizId) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setAnswers(parsed.answers || {});
                setCurrentQuestionIndex(parsed.currentIndex || 0);
                if (parsed.timeRemaining) {
                    setTimeRemaining(parsed.timeRemaining);
                }
            } catch (e) {
                console.error('Failed to load quiz session', e);
            }
        }
        setIsInitialized(true);
    }, [quizId]);

    // Save to local storage
    useEffect(() => {
        // Only save if initialized and we have questions to avoid overwriting with empty state
        if (!isInitialized || !quizId || questions.length === 0) return;

        if (isCompleted) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        const stateToSave = {
            answers,
            currentIndex: currentQuestionIndex,
            timeRemaining,
            updatedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [answers, currentQuestionIndex, timeRemaining, isCompleted, quizId, isInitialized, questions.length]);

    // Timer Logic
    useEffect(() => {
        if (timeRemaining === undefined || isCompleted || !isInitialized) return;

        if (timeRemaining <= 0) {
            handleComplete(true); // Force complete on timeout
            return;
        }

        const timer = setInterval(() => {
            setTimeRemaining((prev) => (prev !== undefined ? prev - 1 : undefined));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, isCompleted, isInitialized]);

    // Handlers
    const handleAnswerChange = (answer: any) => {
        if (isCompleted) return;
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return;

        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: answer
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    const handleComplete = useCallback(async (force = false) => {
        // Validation: Check if at least one question is answered (unless forced by timeout)
        const answeredCount = Object.keys(answers).length;
        if (!force && answeredCount === 0) {
            throw new Error('Hiçbir soruya cevap vermediniz. Lütfen en az bir soruyu yanıtlayın.');
        }

        try {
            // Calculate basic score (if possible client-side, otherwise just submit)
            // Here we just pass the answers
            if (onComplete) {
                await onComplete({
                    quizId,
                    answers,
                    completedAt: new Date(),
                    timeSpent: timeLimit ? (timeLimit * 60) - (timeRemaining || 0) : 0
                });
            }

            // Only clear storage and set completed if onComplete succeeded
            localStorage.removeItem(STORAGE_KEY);
            setIsCompleted(true);
        } catch (error) {
            console.error('Completion error:', error);
            // Re-throw to let the caller handle UI feedback
            throw error;
        }
    }, [answers, quizId, timeLimit, timeRemaining, onComplete]);

    return {
        currentQuestionIndex,
        currentQuestion: questions[currentQuestionIndex],
        answers,
        timeRemaining,
        isCompleted,
        handleAnswerChange,
        handleNext,
        handlePrevious,
        handleComplete,
        progress: ((currentQuestionIndex + 1) / questions.length) * 100
    };
};
