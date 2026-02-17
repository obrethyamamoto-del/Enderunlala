// Quiz and Question Type Definitions

// ============================================================
// SORU TİPLERİ
// ============================================================

export const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
    OPEN_ENDED: 'open_ended',
    MATCHING: 'matching',
    FILL_BLANK: 'fill_blank',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

// ============================================================
// TEMEL SORU INTERFACE'LERİ
// ============================================================

// Tüm soru tiplerinin ortak özellikleri
export interface BaseQuestion {
    id: string;
    type: QuestionType;
    question: string;
    points: number;
    explanation?: string;
    hint?: string;
    tags?: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    order: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// ============================================================
// ÇOKTAN SEÇMELİ SORU
// ============================================================
export interface MultipleChoiceOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: typeof QUESTION_TYPES.MULTIPLE_CHOICE;
    options: MultipleChoiceOption[];
    allowMultiple?: boolean; // Birden fazla doğru cevap seçilebilir mi?
    shuffleOptions?: boolean; // Şıklar karıştırılsın mı?
}

// ============================================================
// DOĞRU/YANLIŞ SORU
// ============================================================
export interface TrueFalseQuestion extends BaseQuestion {
    type: typeof QUESTION_TYPES.TRUE_FALSE;
    correctAnswer: boolean;
}

// ============================================================
// AÇIK UÇLU SORU
// ============================================================
export interface OpenEndedQuestion extends BaseQuestion {
    type: typeof QUESTION_TYPES.OPEN_ENDED;
    sampleAnswer?: string; // Örnek/beklenen cevap
    minLength?: number; // Minimum karakter sayısı
    maxLength?: number; // Maximum karakter sayısı
    keywords?: string[]; // Otomatik değerlendirme için anahtar kelimeler
    gradingRubric?: GradingRubric[]; // Puanlama kriterleri
}

export interface GradingRubric {
    criterion: string;
    points: number;
    description: string;
}

// ============================================================
// EŞLEŞTİRME SORUSU
// ============================================================
export interface MatchingPair {
    id: string;
    left: string; // Sol taraf (kavram, terim vb.)
    right: string; // Sağ taraf (tanım, açıklama vb.)
}

export interface MatchingQuestion extends BaseQuestion {
    type: typeof QUESTION_TYPES.MATCHING;
    pairs: MatchingPair[];
    leftColumnTitle?: string; // Sol kolon başlığı
    rightColumnTitle?: string; // Sağ kolon başlığı
    shufflePairs?: boolean; // Eşleştirmeler karıştırılsın mı?
}

// ============================================================
// BOŞLUK DOLDURMA SORUSU
// ============================================================
export interface BlankSlot {
    id: string;
    correctAnswer: string;
    alternatives?: string[]; // Kabul edilebilir alternatif cevaplar
    caseSensitive?: boolean; // Büyük/küçük harf duyarlı mı?
}

export interface FillBlankQuestion extends BaseQuestion {
    type: typeof QUESTION_TYPES.FILL_BLANK;
    textWithBlanks: string; // "Türkiye'nin başkenti {{blank_1}} şehridir."
    blanks: BlankSlot[];
}

// ============================================================
// BİRLEŞİK SORU TİPİ
// ============================================================
export type Question =
    | MultipleChoiceQuestion
    | TrueFalseQuestion
    | OpenEndedQuestion
    | MatchingQuestion
    | FillBlankQuestion;

// ============================================================
// QUIZ INTERFACE'LERİ
// ============================================================
export interface Quiz {
    id: string;
    title: string;
    subject?: string;
    description?: string;
    instructions?: string;

    // Bağlantılar
    sessionId?: string;
    teacherId: string;
    classId?: string;

    // Sorular
    questions: Question[];

    // Ayarlar
    settings: QuizSettings;

    // Durum
    status: QuizStatus;

    // Meta
    totalPoints: number;
    estimatedDuration: number; // dakika
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    dueDate?: Date;
}

export type QuizStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface QuizSettings {
    // Zaman ayarları
    timeLimit?: number; // dakika, null = sınırsız
    showTimeRemaining?: boolean;

    // Görünüm ayarları
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showPoints?: boolean;
    showDifficulty?: boolean;

    // Geri bildirim ayarları
    showCorrectAnswers?: 'immediately' | 'after_submission' | 'after_deadline' | 'never';
    showExplanations?: 'immediately' | 'after_submission' | 'after_deadline' | 'never';
    showScore?: 'immediately' | 'after_submission' | 'after_deadline' | 'never';

    // Deneme ayarları
    allowRetake?: boolean;
    maxAttempts?: number;
    passingScore?: number; // yüzde

    // Navigasyon
    allowSkip?: boolean;
    allowGoBack?: boolean;
    requireAllQuestions?: boolean;
}

// ============================================================
// ÖĞRENCİ CEVAPLARI
// ============================================================
export interface QuizSubmission {
    id: string;
    quizId: string;
    studentId: string;

    answers: QuestionAnswer[];

    // Sonuçlar
    score?: number;
    totalPoints: number;
    percentage?: number;
    passed?: boolean;

    // Zaman
    startedAt: Date;
    submittedAt?: Date;
    duration?: number; // saniye

    // Durum
    status: 'in_progress' | 'submitted' | 'graded';
    attemptNumber: number;
}

export interface QuestionAnswer {
    questionId: string;
    questionType: QuestionType;

    // Cevap (tip bazlı)
    selectedOptionIds?: string[]; // multiple_choice
    booleanAnswer?: boolean; // true_false
    textAnswer?: string; // open_ended
    matchedPairs?: { leftId: string; rightId: string }[]; // matching
    blankAnswers?: { blankId: string; answer: string }[]; // fill_blank

    // Değerlendirme
    isCorrect?: boolean;
    pointsEarned?: number;
    feedback?: string;

    // Meta
    answeredAt?: Date;
    timeSpent?: number; // saniye
}

// ============================================================
// YARDIMCI TİPLER
// ============================================================

// Soru oluşturma için payload
export type CreateQuestionPayload = Omit<Question, 'id' | 'order' | 'createdAt' | 'updatedAt'>;

// Quiz oluşturma için payload
export interface CreateQuizPayload {
    title: string;
    description?: string;
    sessionId?: string;
    classId?: string;
    questions?: CreateQuestionPayload[];
    settings?: Partial<QuizSettings>;
}

// Soru tipi etiketleri
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    multiple_choice: 'Çoktan Seçmeli',
    true_false: 'Doğru/Yanlış',
    open_ended: 'Açık Uçlu',
    matching: 'Eşleştirme',
    fill_blank: 'Boşluk Doldurma',
};

// Zorluk etiketleri
export const DIFFICULTY_LABELS: Record<Question['difficulty'], string> = {
    easy: 'Kolay',
    medium: 'Orta',
    hard: 'Zor',
};

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

// Benzersiz ID üretici
export const generateQuestionId = (): string => {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Boş soru şablonları
export const createEmptyQuestion = (type: QuestionType, order: number): Question => {
    const baseProps: Omit<BaseQuestion, 'type'> = {
        id: generateQuestionId(),
        question: '',
        points: 10,
        difficulty: 'medium',
        order,
    };

    switch (type) {
        case QUESTION_TYPES.MULTIPLE_CHOICE:
            return {
                ...baseProps,
                type: QUESTION_TYPES.MULTIPLE_CHOICE,
                options: [
                    { id: 'opt_1', text: '', isCorrect: true },
                    { id: 'opt_2', text: '', isCorrect: false },
                    { id: 'opt_3', text: '', isCorrect: false },
                    { id: 'opt_4', text: '', isCorrect: false },
                ],
                shuffleOptions: true,
            };

        case QUESTION_TYPES.TRUE_FALSE:
            return {
                ...baseProps,
                type: QUESTION_TYPES.TRUE_FALSE,
                correctAnswer: true,
            };

        case QUESTION_TYPES.OPEN_ENDED:
            return {
                ...baseProps,
                type: QUESTION_TYPES.OPEN_ENDED,
                sampleAnswer: '',
                minLength: 50,
                maxLength: 1000,
            };

        case QUESTION_TYPES.MATCHING:
            return {
                ...baseProps,
                type: QUESTION_TYPES.MATCHING,
                pairs: [
                    { id: 'pair_1', left: '', right: '' },
                    { id: 'pair_2', left: '', right: '' },
                    { id: 'pair_3', left: '', right: '' },
                ],
                leftColumnTitle: 'Kavram',
                rightColumnTitle: 'Tanım',
                shufflePairs: true,
            };

        case QUESTION_TYPES.FILL_BLANK:
            return {
                ...baseProps,
                type: QUESTION_TYPES.FILL_BLANK,
                textWithBlanks: 'Cümlenin içinde {{blank_1}} ve {{blank_2}} boşlukları doldurun.',
                blanks: [
                    { id: 'blank_1', correctAnswer: '', caseSensitive: false },
                    { id: 'blank_2', correctAnswer: '', caseSensitive: false },
                ],
            };

        default:
            throw new Error(`Unknown question type: ${type}`);
    }
};

// Varsayılan quiz ayarları
export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
    timeLimit: undefined,
    showTimeRemaining: true,
    shuffleQuestions: false,
    shuffleOptions: true,
    showPoints: true,
    showDifficulty: false,
    showCorrectAnswers: 'after_submission',
    showExplanations: 'after_submission',
    showScore: 'immediately',
    allowRetake: false,
    maxAttempts: 1,
    passingScore: 60,
    allowSkip: true,
    allowGoBack: true,
    requireAllQuestions: true,
};

// Quiz toplam puan hesaplama
export const calculateTotalPoints = (questions: Question[]): number => {
    return questions.reduce((total, q) => total + q.points, 0);
};

// Tahmini süre hesaplama (soru başına ortalama)
export const estimateQuizDuration = (questions: Question[]): number => {
    const timePerQuestion: Record<QuestionType, number> = {
        multiple_choice: 1,
        true_false: 0.5,
        open_ended: 3,
        matching: 2,
        fill_blank: 1.5,
    };

    return Math.ceil(
        questions.reduce((total, q) => total + (timePerQuestion[q.type] || 1), 0)
    );
};
