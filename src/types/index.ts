// Re-export all types
export * from './user';
export * from './session';
export * from './assignment';
export * from './submission';
export * from './quiz';
export * from './ai';

// Common utility types
import type { Timestamp } from 'firebase/firestore';

// Firestore document with ID
export interface FirestoreDoc {
    id: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Pagination params
export interface PaginationParams {
    page: number;
    pageSize: number;
}

// Paginated response
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// API response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Notification types
export interface Notification {
    id: string;
    userId: string;
    type: 'assignment_new' | 'assignment_graded' | 'session_processed' | 'reminder' | 'system';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    createdAt: Timestamp;
}

// Performance record
export interface PerformanceRecord {
    id: string;
    userId: string;
    userRole: 'teacher' | 'student';
    institutionId: string;

    period: 'daily' | 'weekly' | 'monthly';
    periodStart: Timestamp;
    periodEnd: Timestamp;

    studentMetrics?: {
        assignmentsCompleted: number;
        assignmentsTotal: number;
        averageScore: number;
        totalPoints: number;
        timeSpent: number; // minutes
        strongSubjects: string[];
        weakSubjects: string[];
    };

    teacherMetrics?: {
        sessionsRecorded: number;
        totalRecordingMinutes: number;
        assignmentsCreated: number;
        assignmentsGraded: number;
        averageStudentScore: number;
        studentParticipationRate: number;
    };

    createdAt: Timestamp;
}

// Institution
export interface Institution {
    id: string;
    name: string;
    address: string;
    adminIds: string[];
    createdAt: Timestamp;
    settings: {
        workingHours: { start: string; end: string };
        timezone: string;
        language: string;
    };
}

// Class
export interface Class {
    id: string;
    institutionId: string;
    name: string;
    grade: number;
    teacherIds: string[];
    studentIds: string[];
    createdAt: Timestamp;
}
