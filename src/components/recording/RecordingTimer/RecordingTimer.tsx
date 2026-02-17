import React from 'react';
import { Clock } from 'lucide-react';
import styles from './RecordingTimer.module.css';

interface RecordingTimerProps {
    duration: number;
    isRecording: boolean;
    isPaused: boolean;
}

export const RecordingTimer: React.FC<RecordingTimerProps> = ({
    duration,
    isRecording,
    isPaused,
}) => {
    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`${styles.timer} ${isRecording ? styles.recording : ''} ${isPaused ? styles.paused : ''}`}>
            <div className={styles.indicator}>
                {isRecording && !isPaused && <span className={styles.dot} />}
                <Clock size={20} />
            </div>
            <span className={styles.time}>{formatTime(duration)}</span>
            {isRecording && (
                <span className={styles.status}>
                    {isPaused ? 'Duraklatıldı' : 'Kayıt yapılıyor...'}
                </span>
            )}
        </div>
    );
};

export default RecordingTimer;
