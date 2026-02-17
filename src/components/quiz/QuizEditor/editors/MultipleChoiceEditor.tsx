import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Button } from '../../../common';
import type { MultipleChoiceQuestion, MultipleChoiceOption } from '../../../../types/quiz';
import styles from './TypeEditors.module.css';

interface MultipleChoiceEditorProps {
    question: MultipleChoiceQuestion;
    onChange: (updates: Partial<MultipleChoiceQuestion>) => void;
}

export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
    question,
    onChange,
}) => {
    const updateOption = (optionId: string, updates: Partial<MultipleChoiceOption>) => {
        const newOptions = question.options.map(opt =>
            opt.id === optionId ? { ...opt, ...updates } : opt
        );
        onChange({ options: newOptions });
    };

    const setCorrectAnswer = (optionId: string) => {
        if (question.allowMultiple) {
            // Toggle for multiple correct answers
            const newOptions = question.options.map(opt =>
                opt.id === optionId ? { ...opt, isCorrect: !opt.isCorrect } : opt
            );
            onChange({ options: newOptions });
        } else {
            // Single correct answer
            const newOptions = question.options.map(opt => ({
                ...opt,
                isCorrect: opt.id === optionId,
            }));
            onChange({ options: newOptions });
        }
    };

    const addOption = () => {
        const newOption: MultipleChoiceOption = {
            id: `opt_${Date.now()}`,
            text: '',
            isCorrect: false,
        };
        onChange({ options: [...question.options, newOption] });
    };

    const removeOption = (optionId: string) => {
        if (question.options.length <= 2) return; // Minimum 2 şık
        const newOptions = question.options.filter(opt => opt.id !== optionId);
        onChange({ options: newOptions });
    };

    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    return (
        <div className={styles.mcEditor}>
            <div className={styles.optionsList}>
                {question.options.map((option, index) => (
                    <div
                        key={option.id}
                        className={`${styles.optionItem} ${option.isCorrect ? styles.correct : ''}`}
                    >
                        <button
                            type="button"
                            className={`${styles.optionLabel} ${option.isCorrect ? styles.selected : ''}`}
                            onClick={() => setCorrectAnswer(option.id)}
                            title={option.isCorrect ? 'Doğru cevap' : 'Doğru cevap olarak işaretle'}
                        >
                            {option.isCorrect ? <Check size={18} /> : optionLabels[index]}
                        </button>

                        <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(option.id, { text: e.target.value })}
                            placeholder={`${optionLabels[index]} şıkkı...`}
                            className={styles.optionInput}
                        />

                        <button
                            type="button"
                            onClick={() => removeOption(option.id)}
                            className={styles.removeButton}
                            disabled={question.options.length <= 2}
                            title="Şıkkı sil"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.editorActions}>
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus size={18} />}
                    onClick={addOption}
                    disabled={question.options.length >= 8}
                    className={styles.addOptionBtn}
                >
                    Şık Ekle
                </Button>

                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={question.allowMultiple || false}
                        onChange={(e) => onChange({ allowMultiple: e.target.checked })}
                    />
                    <span>Birden fazla doğru cevap</span>
                </label>

                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={question.shuffleOptions !== false}
                        onChange={(e) => onChange({ shuffleOptions: e.target.checked })}
                    />
                    <span>Şıkları karıştır</span>
                </label>
            </div>
        </div>
    );
};
