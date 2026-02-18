import React, { useState } from 'react';
import { Modal, Button, Input } from '../../common';
import { Wand2 } from 'lucide-react';
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from '../../../types/quiz';
import type { QuestionType } from '../../../types/quiz';
import styles from './AIGeneratorModal.module.css';

interface AIGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (params: {
        topic: string;
        count: number;
        difficulty: 'easy' | 'medium' | 'hard';
        questionTypes: QuestionType[];
    }) => void;
    initialTopic?: string;
    isLoading?: boolean;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
    isOpen,
    onClose,
    onGenerate,
    initialTopic = '',
    isLoading = false,
}) => {
    const [topic, setTopic] = useState(initialTopic);
    const [count, setCount] = useState(5);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
        QUESTION_TYPES.MULTIPLE_CHOICE,
        QUESTION_TYPES.TRUE_FALSE,
    ]);

    const handleToggleType = (type: QuestionType) => {
        if (selectedTypes.includes(type)) {
            setSelectedTypes(selectedTypes.filter(t => t !== type));
        } else {
            setSelectedTypes([...selectedTypes, type]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;
        if (selectedTypes.length === 0) return;

        onGenerate({
            topic,
            count,
            difficulty,
            questionTypes: selectedTypes,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="AI ile Soru Oluştur"
            size="lg"
        >
            <form onSubmit={handleSubmit} className={styles.container}>
                <div className={styles.field}>
                    <label className={styles.label}>Konu veya Anahtar Metin</label>
                    <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Örn: Mitoz Bölünme, 9. Sınıf Tarih Ünite 1, vb."
                        disabled={isLoading}
                        autoFocus
                    />
                </div>

                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Soru Sayısı</label>
                        <Input
                            type="number"
                            min={1}
                            max={20}
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value, 10) || 5)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Zorluk Seviyesi</label>
                        <select
                            className={styles.select}
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as any)}
                            disabled={isLoading}
                        >
                            <option value="easy">Kolay</option>
                            <option value="medium">Orta</option>
                            <option value="hard">Zor</option>
                        </select>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Soru Tipleri</label>
                    <div className={styles.typeGrid}>
                        {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
                            <div
                                key={type}
                                className={`${styles.typeItem} ${selectedTypes.includes(type as QuestionType) ? styles.active : ''}`}
                                onClick={() => !isLoading && handleToggleType(type as QuestionType)}
                            >
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={selectedTypes.includes(type as QuestionType)}
                                    onChange={() => { }} // Controlled via parent div click
                                    disabled={isLoading}
                                />
                                <span className={styles.typeName}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.footer}>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        type="button"
                    >
                        İptal
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<Wand2 size={18} />}
                        type="submit"
                        isLoading={isLoading}
                        disabled={!topic.trim() || selectedTypes.length === 0}
                    >
                        Soruları Oluştur
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
