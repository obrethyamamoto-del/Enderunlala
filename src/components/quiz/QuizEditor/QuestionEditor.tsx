import React, { useState } from 'react';
import { Input, Button } from '../../common';
import { Wand2 } from 'lucide-react';
import { MultipleChoiceEditor } from './editors/MultipleChoiceEditor';
import { TrueFalseEditor } from './editors/TrueFalseEditor';
import { OpenEndedEditor } from './editors/OpenEndedEditor';
import { MatchingEditor } from './editors/MatchingEditor';
import { FillBlankEditor } from './editors/FillBlankEditor';
import type { Question } from '../../../types/quiz';
import { QUESTION_TYPES, DIFFICULTY_LABELS } from '../../../types/quiz';
import { improveQuestion } from '../../../services/aiService';
import { useUIStore } from '../../../stores/uiStore';
import styles from './QuestionEditor.module.css';

interface QuestionEditorProps {
    question: Question;
    onChange: (updates: Partial<Question>) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
    question,
    onChange,
}) => {
    const [isImproving, setIsImproving] = useState(false);
    const [improvementPrompt, setImprovementPrompt] = useState('');
    const [showFixInput, setShowFixInput] = useState(false);
    const addToast = useUIStore((state) => state.addToast);

    const handleImprove = async () => {
        setIsImproving(true);
        try {
            const improved = await improveQuestion({
                question,
                instructions: improvementPrompt || 'Daha net, anlaşılır ve kaliteli hale getir.'
            });
            onChange(improved);
            setImprovementPrompt('');
            setShowFixInput(false);
            addToast({ type: 'success', title: 'Başarılı', message: 'Soru AI ile iyileştirildi.' });
        } catch (error) {
            console.error('Improve error:', error);
            addToast({ type: 'error', title: 'Hata', message: 'İyileştirme başarısız oldu.' });
        } finally {
            setIsImproving(false);
        }
    };

    // Render type-specific editor
    const renderTypeEditor = () => {
        switch (question.type) {
            case QUESTION_TYPES.MULTIPLE_CHOICE:
                return (
                    <MultipleChoiceEditor
                        question={question}
                        onChange={onChange}
                    />
                );
            case QUESTION_TYPES.TRUE_FALSE:
                return (
                    <TrueFalseEditor
                        question={question}
                        onChange={onChange}
                    />
                );
            case QUESTION_TYPES.OPEN_ENDED:
                return (
                    <OpenEndedEditor
                        question={question}
                        onChange={onChange}
                    />
                );
            case QUESTION_TYPES.MATCHING:
                return (
                    <MatchingEditor
                        question={question}
                        onChange={onChange}
                    />
                );
            case QUESTION_TYPES.FILL_BLANK:
                return (
                    <FillBlankEditor
                        question={question}
                        onChange={onChange}
                    />
                );
            default:
                return <div>Bilinmeyen soru tipi</div>;
        }
    };

    return (
        <div className={styles.editor}>
            {/* Soru Metni */}
            <div className={styles.field}>
                <div className={styles.fieldHeader}>
                    <label className={styles.label}>SORU METNİ *</label>
                    <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Wand2 size={14} />}
                        onClick={() => showFixInput ? handleImprove() : setShowFixInput(true)}
                        isLoading={isImproving}
                        disabled={isImproving}
                        className={styles.aiImproveBtn}
                    >
                        {showFixInput ? 'İyileştirmeyi Uygula' : 'AI ile İyileştir'}
                    </Button>
                </div>

                {showFixInput && (
                    <div className={styles.aiInputArea}>
                        <textarea
                            value={improvementPrompt}
                            onChange={(e) => setImprovementPrompt(e.target.value)}
                            placeholder="AI'ya ne yapması gerektiğini söyleyin (örn: 'Şıkları daha zor yap')..."
                            className={styles.noteTextarea}
                            rows={2}
                        />
                    </div>
                )}

                <textarea
                    value={question.question}
                    onChange={(e) => onChange({ question: e.target.value })}
                    placeholder="Sorunuzu buraya yazın..."
                    className={styles.questionInput}
                    rows={2}
                />
            </div>

            {/* Tip Bazlı Editör */}
            <div className={styles.typeEditor}>
                {renderTypeEditor()}
            </div>

            {/* Ortak Ayarlar Row */}
            <div className={styles.settingsRow}>
                <div className={styles.settingItem}>
                    <label className={styles.miniLabel}>PUAN</label>
                    <Input
                        type="number"
                        value={question.points}
                        onChange={(e) => onChange({ points: Number(e.target.value) })}
                        min={1}
                        max={100}
                        className={styles.miniInput}
                    />
                </div>

                <div className={styles.settingItem}>
                    <label className={styles.miniLabel}>ZORLUK</label>
                    <select
                        value={question.difficulty}
                        onChange={(e) => onChange({ difficulty: e.target.value as Question['difficulty'] })}
                        className={styles.miniSelect}
                    >
                        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Açıklama Kutusu */}
            <div className={`${styles.noteBox} ${styles.purple}`}>
                <label className={styles.label}>AÇIKLAMA (CEVAP SONRASI GÖSTERİLİR)</label>
                <textarea
                    value={question.explanation || ''}
                    onChange={(e) => onChange({ explanation: e.target.value })}
                    placeholder="Bu sorunun cevabını açıklayın..."
                    className={styles.noteTextarea}
                    rows={2}
                />
            </div>

            {/* İpucu Kutusu */}
            <div className={`${styles.noteBox} ${styles.amber}`}>
                <label className={styles.label}>İPUCU (OPSİYONEL)</label>
                <input
                    value={question.hint || ''}
                    onChange={(e) => onChange({ hint: e.target.value })}
                    placeholder="Öğrenciye yardımcı olacak bir ipucu..."
                    className={styles.noteInput}
                />
            </div>
        </div>
    );
};

export default QuestionEditor;
