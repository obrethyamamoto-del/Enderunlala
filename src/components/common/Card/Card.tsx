import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'elevated';
    hover?: boolean;
    onClick?: () => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    padding = 'md',
    variant = 'default',
    hover = false,
    onClick,
    draggable,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
}) => {
    const cardClasses = [
        styles.card,
        styles[`padding-${padding}`],
        styles[variant],
        hover && styles.hoverable,
        onClick && styles.clickable,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={cardClasses}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
        >
            {children}
        </div>
    );
};

export interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', action }) => (
    <div className={`${styles.header} ${className}`}>
        <div className={styles.headerContent}>{children}</div>
        {action && <div className={styles.headerAction}>{action}</div>}
    </div>
);

export interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
    subtitle?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', subtitle }) => (
    <div className={className}>
        <h3 className={styles.title}>{children}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
);

export interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
    <div className={`${styles.content} ${className}`}>{children}</div>
);

export interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
    <div className={`${styles.footer} ${className}`}>{children}</div>
);

export default Card;
