import type { Timestamp } from 'firebase/firestore';
import type { SessionStatus } from '../config/constants';
import type { TranscriptionResult, LessonAnalysis, GeneratedQuiz, TranscriptSegment } from './ai';

// Session (recorded class)
export interface Session {
    id: string;
    teacherId: string;
    classId: string;
    institutionId?: string;
    subject?: string;
    title: string;
    description?: string;

    // Recording info
    audioUrl?: string;
    recordingUrl?: string;
    duration?: number; // seconds
    recordingDuration?: number; // seconds
    recordingSize?: number; // bytes

    // Status
    status: SessionStatus;

    // Timestamps
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;

    // AI Analysis Results
    analysisResults?: {
        transcript: TranscriptionResult;
        analysis: LessonAnalysis;
        quiz: GeneratedQuiz;
    };
}

// TranscriptSegment is now imported from ./ai

// Transcript document
export interface Transcript {
    id: string;
    sessionId: string;
    teacherId: string;

    // Content
    content: string;
    segments: TranscriptSegment[];

    // Metadata
    language: string;
    confidence: number;
    wordCount: number;

    // Status
    status: 'processing' | 'completed' | 'failed';
    isApproved: boolean;
    approvedAt?: Timestamp;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Session creation payload
export interface CreateSessionPayload {
    classId: string;
    subject?: string;
    title: string;
    description?: string;
    duration?: number;
}

// Session list item (for dashboard)
export interface SessionListItem {
    id: string;
    title: string;
    subject: string;
    status: SessionStatus;
    recordingDuration: number;
    createdAt: Timestamp;
}
