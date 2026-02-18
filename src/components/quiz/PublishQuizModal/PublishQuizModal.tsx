import React, { useState } from 'react';
import { Send, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../../common/Modal/Modal';
import { Button } from '../../common/Button/Button';
import styles from './PublishQuizModal.module.css';

interface PublishQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (classIds: string[]) => void;
    assignedClasses: string[];
    quizTitle: string;
    isLoading?: boolean;
}

export const PublishQuizModal: React.FC<PublishQuizModalProps> = ({
    isOpen,
    onClose,
    onPublish,
    assignedClasses,
    quizTitle,
    isLoading = false,
}) => {
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    const toggleClass = (classId: string) => {
        setSelectedClasses((prev) =>
            prev.includes(classId)
                ? prev.filter((id) => id !== classId)
                : [...prev, classId]
        );
    };

    const handleSelectAll = () => {
        if (selectedClasses.length === assignedClasses.length) {
            setSelectedClasses([]);
        } else {
            setSelectedClasses(assignedClasses);
        }
    };

    const handleSubmit = () => {
        if (selectedClasses.length > 0) {
            onPublish(selectedClasses);
        }
    };

    if (!assignedClasses || assignedClasses.length === 0) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Sınavı Yayınla" size="md">
                <div className={styles.emptyState}>
                    <AlertCircle size={48} className={styles.warningIcon} />
                    <h3>Sınıf Bulunamadı</h3>
                    <p>Sınavı yayınlamak için önce dashboard üzerinden sınıf eklemelisiniz.</p>
                    <Button variant="outline" onClick={onClose} className={styles.closeBtn}>Kapat</Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sınavı Yayınla"
            size="md"
            footer={
                <div className={styles.modalFooter}>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Vazgeç
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={selectedClasses.length === 0 || isLoading}
                        leftIcon={<Send size={18} />}
                        className={styles.submitBtn}
                    >
                        {isLoading ? 'Gönderiliyor...' : 'Öğrencilere Gönder'}
                    </Button>
                </div>
            }
        >
            <div className={styles.modalContent}>
                <div className={styles.infoBox}>
                    <CheckCircle size={20} className={styles.infoIcon} />
                    <div className={styles.infoText}>
                        <strong>{quizTitle}</strong> adlı sınav artık yayına hazır. Öğrencilerin erişebilmesi için lütfen hedef sınıfları seçin.
                    </div>
                </div>

                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>
                        <Users size={18} />
                        <span>Hedef Sınıfları Seçin</span>
                    </div>
                    <button className={styles.selectAllBtn} onClick={handleSelectAll}>
                        {selectedClasses.length === assignedClasses.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                    </button>
                </div>

                <div className={styles.classList}>
                    {assignedClasses.map((className) => (
                        <div
                            key={className}
                            className={`${styles.classItem} ${selectedClasses.includes(className) ? styles.selected : ''}`}
                            onClick={() => toggleClass(className)}
                        >
                            <div className={styles.checkbox}>
                                {selectedClasses.includes(className) && <CheckCircle size={16} />}
                            </div>
                            <span className={styles.className}>{className}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};
