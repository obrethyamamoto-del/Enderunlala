import React from 'react';
import { Mic, Square, Pause, Play, RotateCcw, Save } from 'lucide-react';
import { Button } from '../../common';
import styles from './RecordingControls.module.css';

interface RecordingControlsProps {
    isRecording: boolean;
    isPaused: boolean;
    hasRecording: boolean;
    isUploading?: boolean;
    onStart: () => void;
    onStop: () => void;
    onPause: () => void;
    onResume: () => void;
    onReset: () => void;
    onSave: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
    isRecording,
    isPaused,
    hasRecording,
    isUploading = false,
    onStart,
    onStop,
    onPause,
    onResume,
    onReset,
    onSave,
}) => {
    return (
        <div className={styles.controls}>
            {!isRecording && !hasRecording && (
                <Button
                    variant="primary"
                    size="lg"
                    onClick={onStart}
                    leftIcon={<Mic size={20} />}
                    className={styles.recordBtn}
                >
                    Kayda Başla
                </Button>
            )}

            {isRecording && (
                <div className={styles.recordingControls}>
                    {isPaused ? (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={onResume}
                            leftIcon={<Play size={20} />}
                        >
                            Devam Et
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={onPause}
                            leftIcon={<Pause size={20} />}
                        >
                            Duraklat
                        </Button>
                    )}

                    <Button
                        variant="danger"
                        size="lg"
                        onClick={onStop}
                        leftIcon={<Square size={20} />}
                    >
                        Durdur
                    </Button>
                </div>
            )}

            {hasRecording && !isRecording && (
                <div className={styles.postRecordingControls}>
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={onReset}
                        leftIcon={<RotateCcw size={20} />}
                    >
                        Yeniden Kaydet
                    </Button>

                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onSave}
                        leftIcon={<Save size={20} />}
                        isLoading={isUploading}
                    >
                        Kaydet
                    </Button>
                </div>
            )}
        </div>
    );
};

export default RecordingControls;
