import React from 'react';
import styles from './StudentLayout.module.css';
import { Clock, BookOpen, User } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

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
    const { user } = useAuthStore();

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
                <div className={styles.headerGlass}>
                    <div className={styles.brand}>
                        <div className={styles.logoBox}>
                            <BookOpen size={20} />
                        </div>
                        <div className={styles.brandText}>
                            <span className={styles.appName}>Enderun Lala</span>
                            <span className={styles.divider}>/</span>
                            <span className={styles.pageTitle}>{title}</span>
                        </div>
                    </div>

                    <div className={styles.headerRight}>
                        {totalQuestions > 0 && (
                            <div className={styles.progressSection}>
                                <div className={styles.progressHeader}>
                                    <span className={styles.progressLabel}>SORU {currentQuestionIndex + 1} / {totalQuestions}</span>
                                    <span className={styles.progressPercent}>%{Math.round(progressPercentage)}</span>
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
                                <div className={styles.timerIcon}>
                                    <Clock size={16} />
                                </div>
                                <span className={styles.timerValue}>{formatTime(timeRemaining)}</span>
                            </div>
                        )}

                        <div className={styles.userSection}>
                            <div className={styles.userAvatar}>
                                <User size={16} />
                            </div>
                            <span className={styles.userName}>{user?.displayName?.split(' ')[0]}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className={styles.content}>
                <div className={styles.contentWrapper}>
                    {children}
                </div>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    &copy; {new Date().getFullYear()} Enderun Lala • Başarılar Dileriz
                </div>
            </footer>
        </div>
    );
};
