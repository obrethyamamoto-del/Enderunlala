import React from 'react';
import { AlertCircle, Trash2, HelpCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import styles from './ConfirmModal.module.css';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Evet, Eminim',
    cancelText = 'İptal Et',
    variant = 'danger',
    isLoading = false,
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <Trash2 size={32} className={styles.iconDanger} />;
            case 'warning':
                return <AlertCircle size={32} className={styles.iconWarning} />;
            default:
                return <HelpCircle size={32} className={styles.iconInfo} />;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showCloseButton={false}
        >
            <div className={styles.container}>
                <div className={styles.iconWrapper}>
                    {getIcon()}
                </div>

                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>

                <div className={styles.actions}>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className={styles.cancelBtn}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        isLoading={isLoading}
                        className={styles.confirmBtn}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
