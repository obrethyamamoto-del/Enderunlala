import React, { useEffect, useRef } from 'react';
import styles from './AudioVisualizer.module.css';

interface AudioVisualizerProps {
    analyserNode: AnalyserNode | null;
    isRecording: boolean;
    isPaused: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    analyserNode,
    isRecording,
    isPaused,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyserNode || !isRecording || isPaused) {
            // Draw idle state
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'var(--color-bg-tertiary)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw flat line when idle
                    ctx.strokeStyle = 'var(--color-primary-400)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, canvas.height / 2);
                    ctx.lineTo(canvas.width, canvas.height / 2);
                    ctx.stroke();
                }
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyserNode.getByteFrequencyData(dataArray);

            // Clear canvas with gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

                // Create gradient for each bar
                const barGradient = ctx.createLinearGradient(x, canvas.height - barHeight, x, canvas.height);
                barGradient.addColorStop(0, '#3b82f6');
                barGradient.addColorStop(1, '#8b5cf6');

                ctx.fillStyle = barGradient;

                // Draw rounded bars
                const radius = barWidth / 2;
                ctx.beginPath();
                ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [radius, radius, 0, 0]);
                ctx.fill();

                x += barWidth;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyserNode, isRecording, isPaused]);

    return (
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={600}
                height={120}
            />
            {isPaused && (
                <div className={styles.pausedOverlay}>
                    <span>Duraklatıldı</span>
                </div>
            )}
        </div>
    );
};

export default AudioVisualizer;
