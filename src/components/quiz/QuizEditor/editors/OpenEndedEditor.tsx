import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '../../../common';
import type { OpenEndedQuestion, GradingRubric } from '../../../../types/quiz';
import styles from './TypeEditors.module.css';

interface OpenEndedEditorProps {
    question: OpenEndedQuestion;
    onChange: (updates: Partial<OpenEndedQuestion>) => void;
}

export const OpenEndedEditor: React.FC<OpenEndedEditorProps> = ({
    question,
    onChange,
}) => {
    const addRubric = () => {
        const newRubric: GradingRubric = {
            criterion: '',
            points: 10,
            description: '',
        };
        onChange({
            gradingRubric: [...(question.gradingRubric || []), newRubric],
        });
    };

    const updateRubric = (index: number, updates: Partial<GradingRubric>) => {
        const newRubrics = [...(question.gradingRubric || [])];
        newRubrics[index] = { ...newRubrics[index], ...updates };
        onChange({ gradingRubric: newRubrics });
    };

    const removeRubric = (index: number) => {
        const newRubrics = (question.gradingRubric || []).filter((_, i) => i !== index);
        onChange({ gradingRubric: newRubrics });
    };

    const updateKeywords = (value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(Boolean);
        onChange({ keywords });
    };

    return (
        <div className={styles.oeEditor}>
            {/* Örnek Cevap */}
            <div className={styles.field}>
                <label className={styles.fieldLabel}>
                    Örnek/Beklenen Cevap
                    <span className={styles.optional}>(AI değerlendirme için)</span>
                </label>
                <textarea
                    value={question.sampleAnswer || ''}
                    onChange={(e) => onChange({ sampleAnswer: e.target.value })}
                    placeholder="İdeal cevabın nasıl olması gerektiğini yazın..."
                    className={styles.textarea}
                    rows={4}
                />
            </div>

            {/* Karakter Limitleri */}
            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Min. Karakter</label>
                    <Input
                        type="number"
                        value={question.minLength || ''}
                        onChange={(e) => onChange({ minLength: Number(e.target.value) || undefined })}
                        placeholder="0"
                        min={0}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Max. Karakter</label>
                    <Input
                        type="number"
                        value={question.maxLength || ''}
                        onChange={(e) => onChange({ maxLength: Number(e.target.value) || undefined })}
                        placeholder="Sınırsız"
                        min={0}
                    />
                </div>
            </div>

            {/* Anahtar Kelimeler */}
            <div className={styles.field}>
                <label className={styles.fieldLabel}>
                    Anahtar Kelimeler
                    <span className={styles.optional}>(virgülle ayırın)</span>
                </label>
                <Input
                    value={(question.keywords || []).join(', ')}
                    onChange={(e) => updateKeywords(e.target.value)}
                    placeholder="kavram1, kavram2, kavram3..."
                />
                <span className={styles.helpText}>
                    Otomatik değerlendirmede bu kelimeler aranacak
                </span>
            </div>

            {/* Puanlama Kriterleri */}
            <div className={styles.rubricSection}>
                <div className={styles.rubricHeader}>
                    <label className={styles.fieldLabel}>Puanlama Kriterleri</label>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Plus size={16} />}
                        onClick={addRubric}
                    >
                        Kriter Ekle
                    </Button>
                </div>

                {(question.gradingRubric || []).map((rubric, index) => (
                    <div key={index} className={styles.rubricItem}>
                        <Input
                            value={rubric.criterion}
                            onChange={(e) => updateRubric(index, { criterion: e.target.value })}
                            placeholder="Kriter adı"
                        />
                        <Input
                            type="number"
                            value={rubric.points}
                            onChange={(e) => updateRubric(index, { points: Number(e.target.value) })}
                            min={0}
                            className={styles.rubricPoints}
                        />
                        <button
                            type="button"
                            onClick={() => removeRubric(index)}
                            className={styles.removeButton}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
