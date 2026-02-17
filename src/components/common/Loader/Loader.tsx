import React from 'react';
import styles from './Loader.module.css';

export interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'white' | 'gray';
    className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
    size = 'md',
    color = 'primary',
    className = '',
}) => {
    return (
        <div className={`${styles.loader} ${styles[size]} ${styles[color]} ${className}`}>
            <div className={styles.spinner} />
        </div>
    );
};

export interface PageLoaderProps {
    message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message }) => (
    <div className={styles.pageLoader}>
        <Loader size="lg" />
        {message && <p className={styles.message}>{message}</p>}
    </div>
);

export default Loader;
