import type { Timestamp } from 'firebase/firestore';
import type { AssignmentStatus } from '../config/constants';
// Re-use quiz question types for assignments
import type { Question } from './quiz';

// Re-export Question from quiz for backward compatibility
export type { Question } from './quiz';

// Assignment document
export interface Assignment {
    id: string;
    sessionId: string;
    transcriptId: string;
    teacherId: string;
    classId: string;
    institutionId: string;

    // Content
    title: string;
    description: string;
    instructions?: string;
    questions: Question[];

    // Settings
    totalPoints: number;
    passingScore: number;
    timeLimit?: number; // minutes
    shuffleQuestions: boolean;
    showResults: boolean;

    // Assignment
    assignedTo: string[]; // student IDs
    dueDate: Timestamp;

    // Status
    status: AssignmentStatus;

    // AI metadata
    aiGenerated: boolean;
    aiPromptUsed?: string;

    createdAt: Timestamp;
    updatedAt: Timestamp;
    publishedAt?: Timestamp;
}

// Assignment list item (for dashboard)
export interface AssignmentListItem {
    id: string;
    title: string;
    subject: string;
    status: AssignmentStatus;
    totalPoints: number;
    questionCount: number;
    dueDate: Timestamp;
    submissionCount: number;
    createdAt: Timestamp;
}

// Assignment creation payload (from AI)
export interface AIGeneratedAssignment {
    title: string;
    description: string;
    questions: Question[];
    totalPoints: number;
}
