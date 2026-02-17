import type { Timestamp } from 'firebase/firestore';
import type { SubmissionStatus, QuestionType } from '../config/constants';

// Answer for a single question
export interface Answer {
    questionId: string;
    questionType: QuestionType;
    response: unknown; // Varies by question type
    isCorrect?: boolean; // For auto-graded questions
    score: number;
    feedback?: string;
}

// Submission document
export interface Submission {
    id: string;
    assignmentId: string;
    studentId: string;

    // Answers
    answers: Answer[];

    // Scoring
    totalScore: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;

    // Status
    status: SubmissionStatus;

    // Timestamps
    startedAt: Timestamp;
    submittedAt?: Timestamp;
    gradedAt?: Timestamp;
    gradedBy?: string; // teacher ID for open-ended

    // Teacher feedback
    feedback?: string;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Submission list item (for dashboard)
export interface SubmissionListItem {
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    studentId: string;
    studentName: string;
    status: SubmissionStatus;
    percentage: number;
    isPassed: boolean;
    submittedAt?: Timestamp;
}

// Draft answer (for auto-save)
export interface DraftAnswer {
    questionId: string;
    response: unknown;
    updatedAt: number; // timestamp ms
}

// Submit answer payload
export interface SubmitAnswerPayload {
    questionId: string;
    response: unknown;
}
