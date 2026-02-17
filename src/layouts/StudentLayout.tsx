import React from 'react';
import styles from './StudentLayout.module.css';
import { Clock, BookOpen } from 'lucide-react';

interface StudentLayoutProps {
    children: React.ReactNode;
    title?: string;
    totalQuestions?: number;
    currentQuestionIndex?: number;
    timeRemaining?: number; // seconds
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
    children,
    title = 'Sınav',
    totalQuestions = 0,
    currentQuestionIndex = 0,
    timeRemaining
}) => {
    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = totalQuestions > 0
        ? ((currentQuestionIndex + 1) / totalQuestions) * 100
        : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.brand}>
                    <BookOpen size={24} className="text-primary-600" />
                    <span>Enderun Lala</span>
                    <span style={{ fontWeight: 400, color: '#94a3b8', margin: '0 0.5rem' }}>|</span>
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>{title}</span>
                </div>

                <div className={styles.headerRight}>
                    {totalQuestions > 0 && (
                        <div className={styles.progressContainer}>
                            <div className={styles.progressLabel}>
                                <span>İlerleme</span>
                                <span>{currentQuestionIndex + 1} / {totalQuestions}</span>
                            </div>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {timeRemaining !== undefined && (
                        <div className={`${styles.timer} ${timeRemaining < 60 ? styles.warning : ''}`}>
                            <Clock size={16} />
                            <span>{formatTime(timeRemaining)}</span>
                        </div>
                    )}
                </div>
            </header>

            <main className={styles.content}>
                {children}
            </main>

            <footer className={styles.footer}>
                &copy; {new Date().getFullYear()} Enderun Lala - Öğrenci Portalı
            </footer>
        </div>
    );
};
