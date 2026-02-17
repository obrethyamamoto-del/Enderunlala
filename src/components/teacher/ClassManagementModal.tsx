import React, { useState } from 'react';
import { Modal, Input, Button } from '../common';
import { Pencil, Trash2, Plus, School } from 'lucide-react';
import styles from './ClassManagementModal.module.css';

interface ClassManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    institutionName: string;
    existingClasses: string[];
    onAddClass: (newClass: string) => void;
    onDeleteClass: (className: string) => void;
    onUpdateClass: (oldName: string, newName: string) => void;
}

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
    isOpen,
    onClose,
    institutionName,
    existingClasses,
    onAddClass,
    onDeleteClass,
    onUpdateClass,
}) => {
    const [classLevel, setClassLevel] = useState('');
    const [section, setSection] = useState('');
    const [editingClass, setEditingClass] = useState<string | null>(null);

    const handleAddOrUpdate = () => {
        if (!classLevel || !section) return;
        const className = `${classLevel}-${section.toUpperCase()}`;

        if (editingClass) {
            onUpdateClass(editingClass, className);
            setEditingClass(null);
        } else {
            onAddClass(className);
        }

        setClassLevel('');
        setSection('');
    };

    const startEditing = (fullName: string) => {
        const [level, sec] = fullName.split('-');
        setClassLevel(level || '');
        setSection(sec || '');
        setEditingClass(fullName);
    };

    const cancelEditing = () => {
        setEditingClass(null);
        setClassLevel('');
        setSection('');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sınıf Yönetimi"
            size="md"
        >
            <div className={styles.container}>
                <div className={styles.institutionInfo}>
                    <School size={20} className={styles.instIcon} />
                    <span className={styles.instLabel}>KURUM:</span>
                    <span className={styles.instName}>{institutionName}</span>
                </div>

                <div className={styles.formCard}>
                    <h3 className={styles.formTitle}>
                        {editingClass ? 'Sınıfı Düzenle' : 'Yeni Sınıf Ekle'}
                    </h3>
                    <div className={styles.inputGrid}>
                        <Input
                            label="Sınıf"
                            placeholder="Örn: 9, 10, 11"
                            value={classLevel}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassLevel(e.target.value)}
                        />
                        <Input
                            label="Şube"
                            placeholder="Örn: A, B, C"
                            value={section}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSection(e.target.value)}
                        />
                    </div>
                    <div className={styles.formActions}>
                        {editingClass && (
                            <Button variant="outline" onClick={cancelEditing}>İptal</Button>
                        )}
                        <Button
                            variant="primary"
                            fullWidth
                            leftIcon={editingClass ? <Pencil size={18} /> : <Plus size={18} />}
                            onClick={handleAddOrUpdate}
                            disabled={!classLevel || !section}
                        >
                            {editingClass ? 'Güncelle' : 'Sınıfı Kaydet'}
                        </Button>
                    </div>
                </div>

                <div className={styles.listSection}>
                    <h3 className={styles.listTitle}>Mevcut Sınıflar</h3>
                    <div className={styles.classList}>
                        {existingClasses.length > 0 ? (
                            existingClasses.map((cls) => (
                                <div key={cls} className={styles.classItem}>
                                    <div className={styles.className}>
                                        <div className={styles.classBadge}>{cls.split('-')[0]}</div>
                                        <span>{cls} Sınıfı</span>
                                    </div>
                                    <div className={styles.itemActions}>
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => startEditing(cls)}
                                            title="Düzenle"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className={`${styles.actionBtn} ${styles.delete}`}
                                            onClick={() => onDeleteClass(cls)}
                                            title="Sil"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                Henüz tanımlı bir sınıf bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ClassManagementModal;
