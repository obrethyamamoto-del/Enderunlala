// AI Service - Gemini API Integration for transcription and analysis
import type { Question, QuestionType } from '../types/quiz';
import { generateQuestionId } from '../types/quiz';
import type {
    TranscriptionResult,
    TranscriptSegment,
    LessonAnalysis,
    GeneratedQuiz
} from '../types/ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Convert audio blob to base64
const audioToBase64 = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });
};

// Transcribe audio using Gemini 1.5 Pro (multimodal)
export const transcribeAudio = async (
    audioUrl: string
): Promise<TranscriptionResult> => {
    // Fetch audio from URL
    const response = await fetch(audioUrl);
    const audioBlob = await response.blob();
    const audioBase64 = await audioToBase64(audioBlob);

    const mimeType = audioBlob.type || 'audio/webm';

    const geminiResponse = await fetch(
        `${GEMINI_API_URL}/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: audioBase64
                            }
                        },
                        {
                            text: `Bu bir sınıf ortamında yapılmış ders kaydıdır. Lütfen bu ses kaydını Türkçe olarak yazıya dök.

Kurallar:
1. Öğretmenin anlattıklarını ana metin olarak yaz
2. Öğrenci soruları veya yorumları varsa [Öğrenci: ...] şeklinde belirt
3. Anlaşılmayan kısımları [anlaşılmıyor] olarak işaretle
4. Gürültü veya alakasız sesler için [gürültü] yaz
5. Konuşmacı değişikliklerini paragraflarla ayır

Sadece transkripti yaz, yorum ekleme.`
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    maxOutputTokens: 8192
                }
            })
        }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
        throw new Error(data.error?.message || `Transkripsiyon başarısız (Kod: ${geminiResponse.status})`);
    }

    const transcriptText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
        text: transcriptText,
        segments: parseTranscriptToSegments(transcriptText),
        language: 'tr',
        confidence: 0.85
    };
};

// Parse transcript text into segments
const parseTranscriptToSegments = (text: string): TranscriptSegment[] => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, index) => {
        const isStudent = paragraph.includes('[Öğrenci:');
        return {
            startTime: index * 30, // Approximate timing
            endTime: (index + 1) * 30,
            text: paragraph.trim(),
            speaker: isStudent ? 'student' : 'teacher'
        };
    });
};

// Analyze transcript and extract lesson metadata
export const analyzeLesson = async (
    transcript: string
): Promise<LessonAnalysis> => {
    const response = await fetch(
        `${GEMINI_API_URL}/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Aşağıdaki ders transkriptini analiz et ve JSON formatında yanıt ver.

TRANSKRIPT:
${transcript}

Şu bilgileri çıkar:
1. title: Dersin kısa ve açıklayıcı başlığı (max 60 karakter)
2. subject: Ders adı (Matematik, Fizik, Tarih, vb.)
3. summary: Derste anlatılanların 2-3 cümlelik özeti
4. keyTopics: Derste işlenen ana konular listesi (max 5 madde)
5. keyConcepts: Öğrencilerin öğrenmesi gereken kavramlar (her biri için term, definition, importance)
6. gradeLevel: Tahmini sınıf seviyesi (örn: "9. sınıf", "Lise")

SADECE JSON döndür, başka açıklama ekleme. Format:
{
  "title": "...",
  "subject": "...",
  "summary": "...",
  "keyTopics": ["...", "..."],
  "keyConcepts": [
    {"term": "...", "definition": "...", "importance": "high|medium|low"}
  ],
  "gradeLevel": "..."
}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.9,
                    maxOutputTokens: 2048
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || `Analiz başarısız (Kod: ${response.status})`);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const analysisData = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

    return {
        title: analysisData.title || 'İsimsiz Ders',
        subject: analysisData.subject || 'Genel',
        summary: analysisData.summary || '',
        keyTopics: analysisData.keyTopics || [],
        keyConcepts: analysisData.keyConcepts || [],
        duration: 0,
        gradeLevel: analysisData.gradeLevel
    };
};

// Generate quiz questions from transcript
export const generateQuiz = async (
    transcript: string,
    analysis: LessonAnalysis,
    options: {
        questionCount?: number;
        difficulty?: 'easy' | 'medium' | 'hard';
        questionTypes?: ('multiple_choice' | 'true_false' | 'open_ended' | 'fill_blank')[];
    } = {}
): Promise<GeneratedQuiz> => {
    const {
        questionCount = 10,
        difficulty = 'medium',
        questionTypes = ['multiple_choice', 'true_false']
    } = options;

    const response = await fetch(
        `${GEMINI_API_URL}/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Aşağıdaki ders içeriğine dayalı, ÖĞRENCİNİN KONUYU KAVRAMASINI SAĞLAYACAK pedagojik bir sınav oluştur.

DERS BİLGİSİ:
Konu: ${analysis.subject}
Başlık: ${analysis.title}
Özet: ${analysis.summary}
Anahtar Kavramlar: ${analysis.keyConcepts.map(c => c.term).join(', ')}

TRANSKRIPT:
${transcript.substring(0, 4000)}...

ÖNEMLİ KURALLAR:
1. Sen bir öğretmensin ve amacın öğrencinin konuyu öğrenip öğrenmediğini ölçmek.
2. ASLA "Bu derste ne anlatıldı?", "Öğretmenin amacı nedir?", "Derste hangi örnek verildi?" gibi derse dışarıdan bakan meta-sorular sorma.
3. Sorular doğrudan konunun kendisine, kavramlara ve uygulama alanlarına odaklanmalı (Örn: "Mitoz bölünmenin evreleri nelerdir?", "Verilen denklemde X kaçtır?").
4. Soruları 'Sen' diliyle veya doğrudan bilgi sorusu olarak sor.
5. Bloom taksonomisine göre "Bilgi", "Kavrama" ve "Uygulama" düzeyinde sorular üret.

SINAV GEREKSİNİMLERİ:
- Soru sayısı: ${questionCount}
- Zorluk: ${difficulty} (easy=kolay, medium=orta, hard=zor)
- Soru tipleri: ${questionTypes.join(', ')}

Her soru için format kuralları:
1. multiple_choice: 4 şık, 1 doğru cevap. Şıklar çeldirici ve mantıklı olmalı.
2. true_false: Kesin yargı bildiren cümleler kullan.

JSON formatında döndür:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice", (veya true_false)
      "question": "Soru metni...",
      "options": [{"id": "opt1", "text": "...", "isCorrect": true}], (Sadece çoktan seçmeli için)
      "correctAnswer": true, (Sadece doğru/yanlış için)
      "explanation": "Öğrenci yanlış yaparsa konuyu öğretecek açıklayıcı geri bildirim.",
      "points": 10,
      "relatedConcept": "İlgili anahtar kavram"
    }
  ],
  "difficulty": "${difficulty}",
  "estimatedTime": 15
}

SADECE JSON döndür.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 4096
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || `Quiz oluşturulamadı (Kod: ${response.status})`);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Extract JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const quizData = JSON.parse(jsonMatch ? jsonMatch[0] : '{"questions":[]}');

    // Post-process questions to ensure they match our internal format
    const processedQuestions = (quizData.questions || []).map((q: any) => {
        const id = generateQuestionId();
        const base = {
            ...q,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            points: q.points || 10,
            difficulty: q.difficulty || difficulty,
        };

        if (q.type === 'multiple_choice') {
            base.options = Array.isArray(q.options) ? q.options.map((opt: any, idx: number) => {
                if (typeof opt === 'string') {
                    return {
                        id: `opt_${idx}`,
                        text: opt,
                        isCorrect: idx === Number(q.correctAnswer)
                    };
                }
                return { ...opt, id: opt.id || `opt_${idx}` };
            }) : [];
        }

        return base;
    });

    return {
        questions: processedQuestions,
        difficulty: quizData.difficulty || difficulty,
        estimatedTime: quizData.estimatedTime || 15
    };
};

// Process complete session: transcribe, analyze, generate quiz
export const processSession = async (
    audioUrl: string,
    onProgress?: (step: string, progress: number) => void
): Promise<{
    transcript: TranscriptionResult;
    analysis: LessonAnalysis;
    quiz: GeneratedQuiz;
}> => {
    onProgress?.('Ses kaydı yazıya dökülüyor...', 10);

    const transcript = await transcribeAudio(audioUrl);
    onProgress?.('Transkript tamamlandı', 40);

    onProgress?.('Ders içeriği analiz ediliyor...', 50);
    const analysis = await analyzeLesson(transcript.text);
    onProgress?.('Analiz tamamlandı', 70);

    onProgress?.('Quiz soruları oluşturuluyor...', 80);
    const quiz = await generateQuiz(transcript.text, analysis);
    onProgress?.('İşlem tamamlandı!', 100);

    return { transcript, analysis, quiz };
};

export interface GenerateQuizParams {
    topic: string; // Konu veya metin
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    questionTypes: QuestionType[];
    additionalInstructions?: string;
}

export const generateQuizFromTopic = async (
    params: GenerateQuizParams
): Promise<Question[]> => {
    const { topic, questionCount, difficulty, questionTypes, additionalInstructions } = params;

    const prompt = `
    Aşağıdaki konu ve kriterlere göre, ÖĞRENCİNİN KONUYU KAVRAMASINI SAĞLAYACAK pedagojik bir sınav oluştur.
    
    KONU:
    ${topic}
    
    KRİTERLER:
    - Soru Sayısı: ${questionCount}
    - Zorluk Seviyesi: ${difficulty} (easy=kolay, medium=orta, hard=zor)
    - Soru Tipleri: ${questionTypes.join(', ')}
    ${additionalInstructions ? `- Ek Talimatlar: ${additionalInstructions}` : ''}

    ÖNEMLİ KURALLAR:
    1. Sen bir sınav hazırlayan öğretmensin. Meta-sorular (örn: "Bu konuda ne anlatılır?") sorma.
    2. Doğrudan konuyu, formülleri, tarihleri veya neden-sonuç ilişkilerini sor.
    3. Sorular net, anlaşılır ve eğitim müfredatına uygun olmalı.
    4. "multiple_choice" sorularında yanlış şıklar (çeldiriciler) mantıklı olmalı, bariz hatalı olmamalı.
    5. Sadece multiple_choice ve true_false tiplerini kullan.
    
    ÇIKTI FORMATI (JSON Array):
    Her soru aşağıdaki TypeScript arayüzüne uygun olmalıdır. "id" alanını boş bırakabilirsin, ben dolduracağım.
    
    TİPLER:
    1. multiple_choice:
       {
         type: "multiple_choice",
         question: "Soru metni",
         points: 10,
         difficulty: "${difficulty}",
         explanation: "Açıklama",
         options: [
           { id: "opt1", text: "Seçenek 1", isCorrect: false },
           { id: "opt2", text: "Seçenek 2", isCorrect: true },
           ...
         ]
       }
       
    2. true_false:
       {
         type: "true_false",
         question: "Soru metni",
         points: 10,
         difficulty: "${difficulty}",
         explanation: "Açıklama",
         correctAnswer: true // veya false
       }

    SADECE JSON ARRAY DÖNDÜR. Başka metin ekleme.
    `;

    try {
        const response = await fetch(
            `${GEMINI_API_URL}/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.9,
                        maxOutputTokens: 8192
                    }
                })
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error?.message || `AI servisi hata döndürdü (Kod: ${response.status})`);
        }
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        // JSON clean up
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        const rawQuestions = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');

        // Post-process: Add IDs and defaults
        return rawQuestions.map((q: any) => {
            const base = {
                ...q,
                id: generateQuestionId(),
                createdAt: new Date(),
                updatedAt: new Date(),
                points: q.points || 10,
            };

            if (q.type === 'multiple_choice' && q.options) {
                base.options = q.options.map((opt: any, idx: number) => ({ ...opt, id: opt.id || `opt_${idx}` }));
            }

            return base;
        }) as Question[];

    } catch (error) {
        console.error('AI Generation Error:', error);
        throw error;
    }
};

export interface ImproveQuestionParams {
    question: any;
    errorMessage?: string; // If this exists, it's a "fix" request
    instructions?: string; // If this exists, it's an "improve" request
}

export const improveQuestion = async (params: ImproveQuestionParams): Promise<any> => {
    const { question, errorMessage, instructions } = params;

    const prompt = `
    Aşağıdaki soru verisini incele ve belirtilen yönergelere göre DÜZELT veya İYİLEŞTİR.

    GİRDİ SORUSU (JSON):
    ${JSON.stringify(question, null, 2)}

    ${errorMessage ? `HATA MESAJI (Bunu düzelt): ${errorMessage}` : ''}
    ${instructions ? `YÖNERGE (Buna göre iyileştir): ${instructions}` : 'Bu soruyu daha net, anlaşılır ve pedagojik olarak daha kaliteli hale getir. Şıkları güçlendir, açıklamayı detaylandır.'}

    GÖREVLER:
    1. Eğer JSON yapısı bozuksa veya hatalıysa (örn: options string gelmişse), düzelt.
    2. Eğer "multiple_choice" ise ve "options" string dizisi ise, nesne dizisine ({id, text, isCorrect}) çevir.
    3. Eğer veriler eksikse (örn: puan, zorluk), mantıklı varsayılanlarla doldur.
    4. Soru metnini ve şıkları dilbilgisi açısından düzelt.
    5. "explanation" (açıklama) alanını eğitici ve detaylı hale getir.

    ÇIKTI FORMATI (JSON):
    SADECE düzeltilmiş/iyileştirilmiş soru objesini (JSON) döndür. Başka hiçbir metin ekleme.
    {
      "id": "...",
      "type": "...",
      "question": "...",
      ...
    }
    `;

    try {
        const response = await fetch(
            `${GEMINI_API_URL}/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3, // Lower temperature for fixes
                        topP: 0.8,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error?.message || `AI iyileştirme başarısız (Kod: ${response.status})`);
        }
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // JSON clean up
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const improvedQuestion = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

        // Preserve IDs if they exist to avoid breaking React lists
        return {
            ...improvedQuestion,
            id: question.id || improvedQuestion.id || generateQuestionId(),
            // Ensure types are correct
            points: Number(improvedQuestion.points) || 10,
        };

    } catch (error) {
        console.error('AI Improvement Error:', error);
        throw error;
    }
};
