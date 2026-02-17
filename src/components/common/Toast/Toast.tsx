import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../../../stores/uiStore';
import styles from './Toast.module.css';

interface ToastItemProps {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const ToastItem: React.FC<ToastItemProps> = ({ id, type, title, message, duration = 5000 }) => {
    const removeToast = useUIStore((state) => state.removeToast);
    const Icon = icons[type];

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                removeToast(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, removeToast]);

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <Icon className={styles.icon} size={20} />
            <div className={styles.content}>
                <p className={styles.title}>{title}</p>
                {message && <p className={styles.message}>{message}</p>}
            </div>
            <button className={styles.closeBtn} onClick={() => removeToast(id)}>
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const toasts = useUIStore((state) => state.toasts);

    if (toasts.length === 0) return null;

    return createPortal(
        <div className={styles.container}>
            {toasts.map((toast) => (
                <ToastItem key={toast.id} {...toast} />
            ))}
        </div>,
        document.body
    );
};

export default ToastContainer;
