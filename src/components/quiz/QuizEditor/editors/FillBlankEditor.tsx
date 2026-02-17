import React, { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input } from '../../../common';
import type { FillBlankQuestion, BlankSlot } from '../../../../types/quiz';
import styles from './TypeEditors.module.css';

interface FillBlankEditorProps {
    question: FillBlankQuestion;
    onChange: (updates: Partial<FillBlankQuestion>) => void;
}

export const FillBlankEditor: React.FC<FillBlankEditorProps> = ({
    question,
    onChange,
}) => {
    // Önizleme metnini render et
    const renderPreview = () => {
        const text = question.textWithBlanks || '';
        const splitRegex = /(\{\{\s*[\w-]+\s*\}\})/;
        const parts = text.split(splitRegex);

        return parts.map((part, index) => {
            if (part.match(splitRegex)) {
                const blankId = part.replace(/[{}]/g, '').trim();
                const blank = question.blanks.find(b => b.id.trim() === blankId);
                const blankIndex = question.blanks.findIndex(b => b.id.trim() === blankId);

                return (
                    <span key={index} className={styles.previewBlank}>
                        {blank?.correctAnswer || (blankIndex !== -1 ? `${blankIndex + 1}. ___` : '___')}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    // Boşlukları metin içinden çıkar
    useEffect(() => {
        const text = question.textWithBlanks || '';
        const blanks = text.match(/\{\{\s*([\w-]+)\s*\}\}/g) || [];

        // Mevcut blanks'leri güncelle veya yenilerini oluştur
        const neededIds = blanks.map(b => b.replace(/[{}]/g, '').trim());

        // Yeni blank'leri ekle
        const newBlanks: BlankSlot[] = neededIds.map(id => {
            const existing = question.blanks.find(b => b.id.trim() === id);
            return existing || { id, correctAnswer: '', caseSensitive: false };
        });

        if (JSON.stringify(newBlanks.map(b => b.id)) !== JSON.stringify(question.blanks.map(b => b.id))) {
            onChange({ blanks: newBlanks });
        }
    }, [question.textWithBlanks]);

    const updateBlank = (blankId: string, updates: Partial<BlankSlot>) => {
        const newBlanks = question.blanks.map(blank =>
            blank.id === blankId ? { ...blank, ...updates } : blank
        );
        onChange({ blanks: newBlanks });
    };

    const insertBlank = () => {
        const newBlankId = `blank_${question.blanks.length + 1}`;
        const newText = `${question.textWithBlanks} {{${newBlankId}}}`;
        onChange({ textWithBlanks: newText });
    };

    const updateAlternatives = (blankId: string, value: string) => {
        const alternatives = value.split(',').map(a => a.trim()).filter(Boolean);
        updateBlank(blankId, { alternatives: alternatives.length > 0 ? alternatives : undefined });
    };

    return (
        <div className={styles.fbEditor}>
            {/* Metin Editörü */}
            <div className={styles.field}>
                <label className={styles.fieldLabel}>
                    Metin
                    <span className={styles.optional}>
                        {'{{blank_1}}'} şeklinde boşluk ekleyin
                    </span>
                </label>
                <div className={styles.fbTextWrapper}>
                    <textarea
                        value={question.textWithBlanks}
                        onChange={(e) => onChange({ textWithBlanks: e.target.value })}
                        placeholder="Cümlenin içinde {{blank_1}} boşluk bırakın..."
                        className={styles.textarea}
                        rows={4}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Plus size={16} />}
                        onClick={insertBlank}
                        className={styles.insertBlankBtn}
                    >
                        Boşluk Ekle
                    </Button>
                </div>
            </div>

            {/* Önizleme */}
            <div className={styles.fbPreview}>
                <label className={styles.fieldLabel}>Önizleme (Öğrenci Görünümü)</label>
                <p className={styles.previewText}>{renderPreview()}</p>
            </div>

            {/* Boşlukların Cevapları */}
            {question.blanks.length > 0 && (
                <div className={styles.blanksSection}>
                    <label className={styles.fieldLabel}>Boşlukların Cevapları</label>

                    {question.blanks.map((blank, index) => (
                        <div key={blank.id} className={styles.blankItem}>
                            <span className={styles.blankNumber}>{index + 1}</span>
                            <div className={styles.blankInputs}>
                                <Input
                                    value={blank.correctAnswer}
                                    onChange={(e) => updateBlank(blank.id, { correctAnswer: e.target.value })}
                                    placeholder="Doğru cevap"
                                />
                                <Input
                                    value={(blank.alternatives || []).join(', ')}
                                    onChange={(e) => updateAlternatives(blank.id, e.target.value)}
                                    placeholder="Alternatif cevaplar (virgülle ayırın)"
                                    className={styles.alternativesInput}
                                />
                            </div>
                            <label className={styles.checkboxSmall}>
                                <input
                                    type="checkbox"
                                    checked={blank.caseSensitive || false}
                                    onChange={(e) => updateBlank(blank.id, { caseSensitive: e.target.checked })}
                                />
                                <span>Büyük/küçük harf duyarlı</span>
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
