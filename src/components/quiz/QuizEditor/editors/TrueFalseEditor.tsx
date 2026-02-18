import React from 'react';
import type { TrueFalseQuestion } from '../../../../types/quiz';
import styles from './TypeEditors.module.css';

interface TrueFalseEditorProps {
    question: TrueFalseQuestion;
    onChange: (updates: Partial<TrueFalseQuestion>) => void;
    readOnly?: boolean;
}

export const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({
    question,
    onChange,
    readOnly = false,
}) => {
    const handleChange = (correctAnswer: boolean) => {
        if (readOnly) return;
        onChange({ correctAnswer });
    };

    return (
        <div className={styles.tfEditor}>
            {!readOnly && <p className={styles.tfLabel}>Doğru cevabı seçin:</p>}

            <div className={styles.tfOptions}>
                <button
                    type="button"
                    className={`${styles.tfButton} ${question.correctAnswer === true ? styles.selected : ''}`}
                    onClick={() => handleChange(true)}
                    disabled={readOnly}
                >
                    <span className={styles.tfIcon}>✓</span>
                    DOĞRU
                </button>

                <button
                    type="button"
                    className={`${styles.tfButton} ${question.correctAnswer === false ? styles.selected : ''}`}
                    onClick={() => handleChange(false)}
                    disabled={readOnly}
                >
                    <span className={styles.tfIcon}>✗</span>
                    YANLIŞ
                </button>
            </div>
        </div>
    );
};
