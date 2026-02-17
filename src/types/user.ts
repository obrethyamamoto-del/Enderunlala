import type { Timestamp } from 'firebase/firestore';
import type { UserRole } from '../config/constants';

// Base user interface
export interface User {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    institutionId: string;
    photoURL?: string;
    phoneNumber?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
}

// Teacher-specific fields
export interface Teacher extends User {
    role: 'teacher';
    subjects: string[];
    assignedClasses: string[];
}

// Student-specific fields
export interface Student extends User {
    role: 'student';
    classId: string;
    studentNumber: string;
    parentEmail?: string;
}

// Admin-specific fields
export interface Admin extends User {
    role: 'admin';
}

// Union type for all user types
export type AppUser = Teacher | Student | Admin;

// Auth context user (simplified for auth state)
export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
}

// User creation payload
export interface CreateUserPayload {
    email: string;
    displayName: string;
    role: UserRole;
    institutionId: string;
    subjects?: string[];
    assignedClasses?: string[];
    classId?: string;
    studentNumber?: string;
    parentEmail?: string;
}

// User update payload
export interface UpdateUserPayload {
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
    subjects?: string[];
    assignedClasses?: string[];
    classId?: string;
    parentEmail?: string;
}
