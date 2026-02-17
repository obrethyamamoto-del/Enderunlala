// Route definitions for the application
export const ROUTES = {
    // Public routes
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',

    // Teacher routes
    TEACHER: {
        DASHBOARD: '/teacher',
        SESSIONS: '/teacher/sessions',
        SESSION_DETAIL: '/teacher/sessions/:id',
        NEW_SESSION: '/teacher/sessions/new',
        QUIZZES: '/teacher/quizzes',
        QUIZ_EDIT: '/teacher/quizzes/:id',
        QUIZ_RESULTS: '/teacher/quizzes/:id/results',
        NEW_QUIZ: '/teacher/quizzes/new',
        REPORTS: '/teacher/reports',
        PROFILE: '/teacher/profile',
    },

    // Student routes
    STUDENT: {
        DASHBOARD: '/student',
        ASSIGNMENTS: '/student/assignments',
        ASSIGNMENT_SOLVE: '/student/assignments/:id',
        RESULTS: '/student/results',
        PROFILE: '/student/profile',
        QUIZZES: '/student/quizzes',
        QUIZ_PLAYER: '/student/quiz/:id',
        QUIZ_RESULT: '/student/quiz/result/:id',
    },

    // Admin routes
    ADMIN: {
        DASHBOARD: '/admin',
        USERS: '/admin/users',
        TEACHERS: '/admin/teachers',
        STUDENTS: '/admin/students',
        SESSIONS: '/admin/sessions',
        REPORTS: '/admin/reports',
        SETTINGS: '/admin/settings',
    },
} as const;

// Helper function to generate dynamic routes
export const generatePath = (path: string, params: Record<string, string>): string => {
    let result = path;
    Object.entries(params).forEach(([key, value]) => {
        result = result.replace(`:${key}`, value);
    });
    return result;
};
