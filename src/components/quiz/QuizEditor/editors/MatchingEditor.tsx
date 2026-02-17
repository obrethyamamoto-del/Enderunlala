import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button, Input } from '../../../common';
import type { MatchingQuestion, MatchingPair } from '../../../../types/quiz';
import styles from './TypeEditors.module.css';

interface MatchingEditorProps {
    question: MatchingQuestion;
    onChange: (updates: Partial<MatchingQuestion>) => void;
}

export const MatchingEditor: React.FC<MatchingEditorProps> = ({
    question,
    onChange,
}) => {
    const updatePair = (pairId: string, updates: Partial<MatchingPair>) => {
        const newPairs = question.pairs.map(pair =>
            pair.id === pairId ? { ...pair, ...updates } : pair
        );
        onChange({ pairs: newPairs });
    };

    const addPair = () => {
        const newPair: MatchingPair = {
            id: `pair_${Date.now()}`,
            left: '',
            right: '',
        };
        onChange({ pairs: [...question.pairs, newPair] });
    };

    const removePair = (pairId: string) => {
        if (question.pairs.length <= 2) return; // Minimum 2 eşleşme
        const newPairs = question.pairs.filter(pair => pair.id !== pairId);
        onChange({ pairs: newPairs });
    };
    // Drag & Drop for Pairs
    const [draggedPairIndex, setDraggedPairIndex] = React.useState<number | null>(null);
    const [dragOverPairIndex, setDragOverPairIndex] = React.useState<number | null>(null);
    const [isDraggingAllowed, setIsDraggingAllowed] = React.useState(false);

    const handlePairDragStart = (e: React.DragEvent, index: number) => {
        if (!isDraggingAllowed) {
            e.preventDefault();
            return;
        }

        e.stopPropagation(); // Parent QuizEditor'ın yakalamasını engelle
        setDraggedPairIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());

        const currentTarget = e.currentTarget as HTMLElement;
        setTimeout(() => {
            currentTarget.style.opacity = '0.4';
        }, 0);
    };

    const handlePairDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragOverPairIndex !== index) {
            setDragOverPairIndex(index);
        }
    };

    const handlePairDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedPairIndex === null || draggedPairIndex === targetIndex) return;

        const newPairs = [...question.pairs];
        const [movedItem] = newPairs.splice(draggedPairIndex, 1);
        newPairs.splice(targetIndex, 0, movedItem);

        onChange({ pairs: newPairs });
        setDraggedPairIndex(null);
        setDragOverPairIndex(null);
    };

    const handlePairDragEnd = (e: React.DragEvent) => {
        e.stopPropagation();
        const currentTarget = e.currentTarget as HTMLElement;
        currentTarget.style.opacity = '1';
        setDraggedPairIndex(null);
        setDragOverPairIndex(null);
        setIsDraggingAllowed(false);
    };

    return (
        <div className={styles.matchEditor}>
            {/* Kolon Başlıkları */}
            <div className={styles.matchHeaders}>
                <Input
                    value={question.leftColumnTitle || ''}
                    onChange={(e) => onChange({ leftColumnTitle: e.target.value })}
                    placeholder="Sol Kolon Başlığı"
                    className={styles.columnTitle}
                />
                <div className={styles.matchArrowHeader}>↔</div>
                <Input
                    value={question.rightColumnTitle || ''}
                    onChange={(e) => onChange({ rightColumnTitle: e.target.value })}
                    placeholder="Sağ Kolon Başlığı"
                    className={styles.columnTitle}
                />
                <div className={styles.matchPlaceholder} />
            </div>

            {/* Eşleşme Listesi */}
            <div className={styles.matchPairs}>
                {question.pairs.map((pair, index) => (
                    <div
                        key={pair.id}
                        className={`${styles.matchPairItem} ${dragOverPairIndex === index && draggedPairIndex !== index ? styles.pairDragOver : ''}`}
                        draggable
                        onDragStart={(e) => handlePairDragStart(e, index)}
                        onDragOver={(e) => handlePairDragOver(e, index)}
                        onDrop={(e) => handlePairDrop(e, index)}
                        onDragEnd={handlePairDragEnd}
                    >
                        <span
                            className={styles.pairHandle}
                            onMouseDown={() => setIsDraggingAllowed(true)}
                            onMouseUp={() => setIsDraggingAllowed(false)}
                            data-drag-handle="pair"
                        >
                            <GripVertical size={16} />
                        </span>
                        <span className={styles.pairNumber}>{index + 1}</span>
                        <Input
                            value={pair.left}
                            onChange={(e) => updatePair(pair.id, { left: e.target.value })}
                            placeholder="Kavram, terim..."
                            className={styles.pairInput}
                        />
                        <span className={styles.matchArrow}>→</span>
                        <Input
                            value={pair.right}
                            onChange={(e) => updatePair(pair.id, { right: e.target.value })}
                            placeholder="Tanım, açıklama..."
                            className={styles.pairInput}
                        />
                        <button
                            type="button"
                            onClick={() => removePair(pair.id)}
                            className={styles.removeButton}
                            disabled={question.pairs.length <= 2}
                            title="Eşleşmeyi sil"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Aksiyonlar */}
            <div className={styles.editorActions}>
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={addPair}
                    disabled={question.pairs.length >= 10}
                >
                    Eşleşme Ekle
                </Button>

                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={question.shufflePairs !== false}
                        onChange={(e) => onChange({ shufflePairs: e.target.checked })}
                    />
                    <span>Eşleşmeleri karıştır</span>
                </label>
            </div>
        </div>
    );
};
