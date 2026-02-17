// Quiz Service - Firebase operations for quizzes

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    Quiz,
    Question,
    QuizSubmission,
    CreateQuizPayload,
} from '../types/quiz';
import {
    DEFAULT_QUIZ_SETTINGS,
    calculateTotalPoints,
    estimateQuizDuration,
    generateQuestionId,
} from '../types/quiz';

const QUIZZES_COLLECTION = 'quizzes';
const SUBMISSIONS_COLLECTION = 'quiz_submissions';

// Helper to handle Firestore timestamps safely
const toDate = (value: any): Date => {
    if (!value) return new Date();
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    if (value && typeof value.toDate === 'function') return value.toDate();
    return new Date();
};

// ============================================================
// QUIZ CRUD
// ============================================================

/**
 * Create a new quiz
 */
export const createQuiz = async (
    teacherId: string,
    payload: CreateQuizPayload
): Promise<Quiz> => {
    const questions: Question[] = (payload.questions || []).map((q, index) => ({
        ...q,
        id: generateQuestionId(),
        order: index,
        createdAt: new Date(),
        updatedAt: new Date(),
    })) as Question[];

    // Sanitize data (remove undefined recursively while preserving Dates)
    const settings = sanitizeForFirestore({
        ...DEFAULT_QUIZ_SETTINGS,
        ...payload.settings,
    });

    const quizData = {
        title: payload.title,
        description: payload.description || '',
        sessionId: payload.sessionId || null,
        classId: payload.classId || null,
        teacherId,
        questions: sanitizeForFirestore(questions),
        settings,
        status: 'draft',
        totalPoints: calculateTotalPoints(questions),
        estimatedDuration: estimateQuizDuration(questions),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), quizData);

    return {
        id: docRef.id,
        ...quizData,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as Quiz;
};

/**
 * Get a quiz by ID
 */
export const getQuiz = async (quizId: string): Promise<Quiz | null> => {
    const docRef = doc(db, QUIZZES_COLLECTION, quizId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        publishedAt: data.publishedAt ? toDate(data.publishedAt) : undefined,
        dueDate: data.dueDate ? toDate(data.dueDate) : undefined,
    } as Quiz;
};

/**
 * Deeply removes undefined values from an object
 * Preserves Dates and other special Firestore values
 */
const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Preserve Date objects
    if (obj instanceof Date) {
        return obj;
    }

    // Preserve Firestore special objects (Timestamp, FieldValue) if they exist
    if (obj.constructor && (obj.constructor.name === 'Timestamp' || obj.constructor.name === 'FieldValue' || obj._methodName)) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirestore(item));
    }

    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
            sanitized[key] = sanitizeForFirestore(value);
        }
    });
    return sanitized;
};

/**
 * Get all published quizzes
 */
export const getPublishedQuizzes = async (): Promise<Quiz[]> => {
    const q = query(
        collection(db, QUIZZES_COLLECTION),
        where('status', '==', 'published')
    );

    const snapshot = await getDocs(q);
    const quizzes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toDate(doc.data().createdAt),
        updatedAt: toDate(doc.data().updatedAt),
    })) as Quiz[];

    // Sort in memory to avoid index requirement
    return quizzes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

/**
 * Update a quiz
 */
export const updateQuiz = async (
    quizId: string,
    updates: Partial<Quiz>
): Promise<void> => {
    // Clean updates: remove undefined recursively
    const cleanUpdates = sanitizeForFirestore(updates);

    const updateData: any = {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
    };

    if (updates.questions) {
        updateData.totalPoints = calculateTotalPoints(updates.questions);
        updateData.estimatedDuration = estimateQuizDuration(updates.questions);
    }

    const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
    await updateDoc(quizRef, updateData);
};

/**
 * Delete a quiz
 */
export const deleteQuiz = async (quizId: string): Promise<void> => {
    const docRef = doc(db, QUIZZES_COLLECTION, quizId);
    await deleteDoc(docRef);
};

/**
 * Get quizzes by teacher
 */
export const getQuizzesByTeacher = async (teacherId: string): Promise<Quiz[]> => {
    const q = query(
        collection(db, QUIZZES_COLLECTION),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        };
    }) as Quiz[];
};

/**
 * Get quizzes by session
 */
export const getQuizzesBySession = async (sessionId: string): Promise<Quiz[]> => {
    const q = query(
        collection(db, QUIZZES_COLLECTION),
        where('sessionId', '==', sessionId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        };
    }) as Quiz[];
};

/**
 * Publish a quiz (make it available to students)
 */
export const publishQuiz = async (quizId: string, dueDate?: Date): Promise<void> => {
    const updateData: Record<string, unknown> = {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (dueDate) {
        updateData.dueDate = Timestamp.fromDate(dueDate);
    }

    await updateDoc(doc(db, QUIZZES_COLLECTION, quizId), updateData);
};

/**
 * Close a quiz (no more submissions)
 */
export const closeQuiz = async (quizId: string): Promise<void> => {
    await updateDoc(doc(db, QUIZZES_COLLECTION, quizId), {
        status: 'closed',
        updatedAt: serverTimestamp(),
    });
};

// ============================================================
// QUIZ SUBMISSIONS
// ============================================================

/**
 * Start a quiz submission
 */
export const startQuizSubmission = async (
    quizId: string,
    studentId: string
): Promise<QuizSubmission> => {
    // Check for existing attempts
    const existingAttempts = await getStudentSubmissions(quizId, studentId);
    const attemptNumber = existingAttempts.length + 1;

    // Get quiz to check max attempts
    const quiz = await getQuiz(quizId);
    if (!quiz) {
        throw new Error('Quiz not found');
    }

    if (quiz.settings.maxAttempts && attemptNumber > quiz.settings.maxAttempts) {
        throw new Error('Maximum attempts reached');
    }

    const submissionData = {
        quizId,
        studentId,
        answers: [],
        totalPoints: quiz.totalPoints,
        status: 'in_progress',
        attemptNumber,
        startedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), submissionData);

    return {
        id: docRef.id,
        ...submissionData,
        startedAt: new Date(),
    } as QuizSubmission;
};

/**
 * Get a single submission by ID
 */
export const getSubmission = async (submissionId: string): Promise<QuizSubmission | null> => {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        startedAt: toDate(data.startedAt),
        submittedAt: data.submittedAt ? toDate(data.submittedAt) : undefined,
        gradedAt: data.gradedAt ? toDate(data.gradedAt) : undefined,
    } as any as QuizSubmission;
};

/**
 * Get student's submissions for a quiz
 */
export const getStudentSubmissions = async (
    quizId: string,
    studentId: string
): Promise<QuizSubmission[]> => {
    const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('quizId', '==', quizId),
        where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: toDate(doc.data().startedAt),
        submittedAt: doc.data().submittedAt ? toDate(doc.data().submittedAt) : undefined,
    })) as any as QuizSubmission[];

    // Sort in memory to avoid index requirement
    return submissions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
};

/**
 * Get all submissions for a student (across all quizzes)
 */
export const getAllStudentSubmissions = async (studentId: string): Promise<QuizSubmission[]> => {
    const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: toDate(doc.data().startedAt),
        submittedAt: doc.data().submittedAt ? toDate(doc.data().submittedAt) : undefined,
    })) as any as QuizSubmission[];

    // Sort manually as Firestore composite index might not exist yet for every developer environment
    return submissions.sort((a, b) => {
        const dateA = a.submittedAt || a.startedAt;
        const dateB = b.submittedAt || b.startedAt;
        return dateB.getTime() - dateA.getTime();
    });
};

/**
 * Submit quiz answers
 */
export const submitQuiz = async (
    submissionId: string,
    answers: QuizSubmission['answers']
): Promise<void> => {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionSnap = await getDoc(docRef);

    if (!submissionSnap.exists()) {
        throw new Error('Submission not found');
    }

    const submissionData = submissionSnap.data() as any;
    const quiz = await getQuiz(submissionData.quizId);
    if (!quiz) {
        throw new Error('Quiz not found');
    }

    // Auto-grading logic
    const gradedAnswers = answers.map(answer => {
        const question = quiz.questions.find(q => q.id === answer.questionId);
        if (!question) return answer;

        let isCorrect = false;
        let pointsEarned = 0;

        switch (question.type) {
            case 'multiple_choice': {
                const q = question as any;
                const correctOptionIds = (q.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.id);
                const selectedOptionIds = answer.selectedOptionIds || [];
                isCorrect = correctOptionIds.length === selectedOptionIds.length &&
                    correctOptionIds.every((id: string) => selectedOptionIds.includes(id));
                break;
            }
            case 'true_false': {
                const q = question as any;
                isCorrect = q.correctAnswer === answer.booleanAnswer;
                break;
            }
            case 'matching': {
                const q = question as any;
                if (answer.matchedPairs && q.pairs) {
                    const totalPairs = q.pairs.length;
                    let correctPairs = 0;
                    q.pairs.forEach((p: any) => {
                        const studentMatch = answer.matchedPairs?.find(m => m.leftId === `left_${p.id}` || m.leftId === p.id);
                        if (studentMatch && studentMatch.rightId === p.id) {
                            correctPairs++;
                        }
                    });
                    isCorrect = correctPairs === totalPairs;
                    // Partial points for matching
                    pointsEarned = Math.floor((correctPairs / totalPairs) * question.points);
                }
                break;
            }
            case 'fill_blank': {
                const q = question as any;
                if (answer.blankAnswers && q.blanks) {
                    const totalBlanks = q.blanks.length;
                    let correctBlanks = 0;
                    q.blanks.forEach((b: any) => {
                        const studentAns = answer.blankAnswers?.find(sa => sa.blankId === b.id)?.answer;
                        if (studentAns && studentAns.trim().toLowerCase() === b.correctAnswer.trim().toLowerCase()) {
                            correctBlanks++;
                        }
                    });
                    isCorrect = correctBlanks === totalBlanks;
                    // Partial points for blanks
                    pointsEarned = Math.floor((correctBlanks / totalBlanks) * question.points);
                }
                break;
            }
            case 'open_ended':
                // Open ended questions are always 0 until teacher grades
                isCorrect = false;
                break;
        }

        // Apply full points for simple corrected answers
        if (isCorrect && question.type !== 'matching' && question.type !== 'fill_blank') {
            pointsEarned = question.points;
        }

        return {
            ...answer,
            isCorrect,
            pointsEarned,
            answeredAt: new Date()
        };
    });

    const score = gradedAnswers.reduce((total, a) => total + (a.pointsEarned || 0), 0);
    const totalPoints = quiz.totalPoints || calculateTotalPoints(quiz.questions);
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passedStatus = quiz.settings?.passingScore ? percentage >= quiz.settings.passingScore : true;

    const startTime = toDate(submissionData.startedAt);
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

    await updateDoc(docRef, {
        answers: gradedAnswers,
        score,
        percentage,
        passed: passedStatus,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        duration,
    });
};

/**
 * Grade a submission (for auto-gradeable questions)
 */
export const gradeSubmission = async (
    submissionId: string,
    grades: { questionId: string; isCorrect: boolean; pointsEarned: number; feedback?: string }[]
): Promise<void> => {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionSnap = await getDoc(docRef);

    if (!submissionSnap.exists()) {
        throw new Error('Submission not found');
    }

    const submission = submissionSnap.data() as QuizSubmission;

    // Update answers with grades
    const gradedAnswers = submission.answers.map(answer => {
        const grade = grades.find(g => g.questionId === answer.questionId);
        if (grade) {
            return {
                ...answer,
                isCorrect: grade.isCorrect,
                pointsEarned: grade.pointsEarned,
                feedback: grade.feedback,
            };
        }
        return answer;
    });

    // Calculate total score
    const score = gradedAnswers.reduce((total, a) => total + (a.pointsEarned || 0), 0);
    const percentage = Math.round((score / submission.totalPoints) * 100);

    // Get quiz for passing score
    const quiz = await getQuiz(submission.quizId);
    const passed = quiz?.settings.passingScore ? percentage >= quiz.settings.passingScore : undefined;

    await updateDoc(docRef, {
        answers: gradedAnswers,
        score,
        percentage,
        passed,
        status: 'graded',
    });
};

/**
 * Get all submissions for a quiz (for teacher view)
 */
export const getQuizSubmissions = async (quizId: string): Promise<QuizSubmission[]> => {
    const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('quizId', '==', quizId),
        orderBy('submittedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate() || new Date(),
        submittedAt: doc.data().submittedAt?.toDate(),
    })) as QuizSubmission[];
};

/**
 * Reset all submissions for a student (DEBUG ONLY)
 */
export const resetStudentSubmissions = async (studentId: string): Promise<void> => {
    const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, SUBMISSIONS_COLLECTION, document.id)));
    await Promise.all(deletePromises);
};
