import React from 'react';
import type { TrueFalseQuestion } from '../../../../types/quiz';
import styles from './TypeEditors.module.css';

interface TrueFalseEditorProps {
    question: TrueFalseQuestion;
    onChange: (updates: Partial<TrueFalseQuestion>) => void;
}

export const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({
    question,
    onChange,
}) => {
    return (
        <div className={styles.tfEditor}>
            <p className={styles.tfLabel}>Doğru cevabı seçin:</p>

            <div className={styles.tfOptions}>
                <button
                    type="button"
                    className={`${styles.tfButton} ${question.correctAnswer === true ? styles.selected : ''}`}
                    onClick={() => onChange({ correctAnswer: true })}
                >
                    <span className={styles.tfIcon}>✓</span>
                    Doğru
                </button>

                <button
                    type="button"
                    className={`${styles.tfButton} ${question.correctAnswer === false ? styles.selected : ''}`}
                    onClick={() => onChange({ correctAnswer: false })}
                >
                    <span className={styles.tfIcon}>✗</span>
                    Yanlış
                </button>
            </div>
        </div>
    );
};
