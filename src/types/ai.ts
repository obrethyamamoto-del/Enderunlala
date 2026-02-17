export interface TranscriptSegment {
    startTime: number;
    endTime: number;
    text: string;
    speaker?: string;
    confidence?: number;
}

export interface TranscriptionResult {
    text: string;
    segments: TranscriptSegment[];
    language: string;
    confidence: number;
}

export interface KeyConcept {
    term: string;
    definition: string;
    importance: 'high' | 'medium' | 'low';
}

export interface LessonAnalysis {
    title: string;
    subject: string;
    summary: string;
    keyTopics: string[];
    keyConcepts: KeyConcept[];
    duration: number;
    gradeLevel?: string;
}

export interface QuizQuestion {
    id: string;
    type: 'multiple_choice' | 'true_false' | 'open_ended' | 'fill_blank';
    question: string;
    options?: string[];
    correctAnswer: string | number | boolean;
    explanation: string;
    points: number;
    relatedConcept?: string;

    // Fill Blank Specific
    textWithBlanks?: string;
    blanks?: { id: string; correctAnswer: string }[];
}

export interface GeneratedQuiz {
    questions: QuizQuestion[];
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: number; // minutes
}
