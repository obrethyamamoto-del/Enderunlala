// Application constants

export const APP_NAME = 'EnderunLala';
export const APP_VERSION = '1.0.0';

// User roles
export const USER_ROLES = {
    TEACHER: 'teacher',
    STUDENT: 'student',
    ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Session statuses
export const SESSION_STATUS = {
    DRAFT: 'draft',
    RECORDED: 'recorded',
    RECORDING: 'recording',
    TRANSCRIBING: 'transcribing',
    PROCESSING: 'processing',
    TRANSCRIBED: 'transcribed',
    ASSIGNMENT_GENERATED: 'assignment_generated',
    COMPLETED: 'completed',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// Assignment statuses
export const ASSIGNMENT_STATUS = {
    DRAFT: 'draft',
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    PUBLISHED: 'published',
    CLOSED: 'closed',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

// Submission statuses
export const SUBMISSION_STATUS = {
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    GRADED: 'graded',
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

// Question types
export const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

// Recording settings
export const RECORDING_CONFIG = {
    MIME_TYPE: 'audio/webm;codecs=opus',
    FALLBACK_MIME_TYPE: 'audio/webm',
    AUDIO_BITS_PER_SECOND: 128000,
    TIME_SLICE_MS: 1000, // Collect data every second
} as const;

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
} as const;

// Toast durations (ms)
export const TOAST_DURATION = {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000,
} as const;

// Theme
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];
