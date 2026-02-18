import React, { useRef, useLayoutEffect } from 'react';
import { MultipleChoiceEditor } from './editors/MultipleChoiceEditor';
import { TrueFalseEditor } from './editors/TrueFalseEditor';
import type { Question } from '../../../types/quiz';
import { QUESTION_TYPES } from '../../../types/quiz';
import styles from './QuestionEditor.module.css';

interface QuestionEditorProps {
    question: Question;
    onChange: (updates: Partial<Question>) => void;
    readOnly?: boolean;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
    question,
    onChange,
    readOnly = false,
}) => {
    const questionRef = useRef<HTMLTextAreaElement>(null);
    const explanationRef = useRef<HTMLTextAreaElement>(null);

    const autoResize = (target: HTMLTextAreaElement | null) => {
        if (target) {
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
        }
    };

    useLayoutEffect(() => {
        autoResize(questionRef.current);
        autoResize(explanationRef.current);
    }, [question.question, question.explanation]);

    // Render type-specific editor
    const renderTypeEditor = () => {
        switch (question.type) {
            case QUESTION_TYPES.MULTIPLE_CHOICE:
                return (
                    <MultipleChoiceEditor
                        question={question as any}
                        onChange={onChange as any}
                        readOnly={readOnly}
                    />
                );
            case QUESTION_TYPES.TRUE_FALSE:
                return (
                    <TrueFalseEditor
                        question={question as any}
                        onChange={onChange as any}
                        readOnly={readOnly}
                    />
                );
            default:
                return <div>Bilinmeyen soru tipi</div>;
        }
    };

    return (
        <div className={`${styles.editor} ${readOnly ? styles.readOnly : ''}`}>
            {/* Soru Metni */}
            <div className={styles.field}>
                <div className={styles.fieldHeader}>
                    <label className={styles.label}>SORU METNİ *</label>
                </div>

                {readOnly ? (
                    <div className={styles.questionInput} style={{ whiteSpace: 'pre-wrap', border: 'none', padding: 0 }}>
                        {question.question || 'Soru metni belirtilmemiş.'}
                    </div>
                ) : (
                    <textarea
                        ref={questionRef}
                        value={question.question}
                        onChange={(e) => onChange({ question: e.target.value })}
                        placeholder="Sorunuzu buraya yazın..."
                        className={styles.questionInput}
                        rows={1}
                    />
                )}
            </div>

            {/* Tip Bazlı Editör */}
            <div className={styles.typeEditor}>
                {renderTypeEditor()}
            </div>

            {/* Açıklama Kutusu */}
            <div className={`${styles.noteBox} ${styles.purple}`}>
                <label className={styles.label}>AÇIKLAMA (CEVAP SONRASI GÖSTERİLİR)</label>
                {readOnly ? (
                    <div className={styles.noteTextarea} style={{ whiteSpace: 'pre-wrap', border: 'none', padding: 0 }}>
                        {question.explanation || 'Açıklama belirtilmemiş.'}
                    </div>
                ) : (
                    <textarea
                        ref={explanationRef}
                        value={question.explanation || ''}
                        onChange={(e) => onChange({ explanation: e.target.value })}
                        placeholder="Bu sorunun cevabını açıklayın..."
                        className={styles.noteTextarea}
                        rows={1}
                    />
                )}
            </div>
        </div>
    );
};

export default QuestionEditor;
