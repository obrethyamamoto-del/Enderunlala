import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, AlertCircle, Upload, WifiOff, RefreshCw, Lightbulb, Sparkles, FileText } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { useAudioRecorder } from '../../../hooks';
import { createSession, uploadSessionAudio } from '../../../services/sessionService';
import type { UploadProgress, UploadController } from '../../../services/sessionService';
import { Button } from '../../../components/common';
import { RecordingControls, RecordingTimer } from '../../../components/recording';
import { ROUTES } from '../../../config/routes';
import styles from './NewSession.module.css';

export const NewSession: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const addToast = useUIStore((state) => state.addToast);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const uploadControllerRef = useRef<UploadController | null>(null);
    const retryBlobRef = useRef<Blob | null>(null);
    const retrySessionIdRef = useRef<string | null>(null);

    const {
        isRecording,
        isPaused,
        duration,
        audioBlob,
        audioUrl,
        error,
        hasRecovery,
        isRecovering,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        resetRecording,
        recoverRecording,
        dismissRecovery,
    } = useAudioRecorder();

    // ─── Online/Offline durumunu izle ────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Upload duraklıysa otomatik devam ettir
            if (uploadControllerRef.current && uploadProgress?.state === 'paused') {
                uploadControllerRef.current.resume();
                addToast({ type: 'info', title: 'Bağlantı Geldi', message: 'Yükleme devam ettiriliyor...' });
            }
        };
        const handleOffline = () => {
            setIsOnline(false);
            // Upload çalışıyorsa duraklat
            if (uploadControllerRef.current && uploadProgress?.state === 'running') {
                uploadControllerRef.current.pause();
                addToast({ type: 'warning', title: 'Bağlantı Kesildi', message: 'Yükleme duraklatıldı. Bağlantı gelince devam edecek.' });
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [uploadProgress?.state, addToast]);

    // ─── Upload ana fonksiyonu ───────────────────────────────
    const processAndUpload = async (blob: Blob, existingSessionId?: string) => {
        if (!user) return;

        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(null);
        retryBlobRef.current = blob;

        try {
            // Session oluştur (retry'da mevcut sessionId kullan)
            let sessionId = existingSessionId;
            if (!sessionId) {
                sessionId = await createSession(user.id, {
                    title: `Ders Kaydı - ${new Date().toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}`,
                    duration: duration || 0,
                    classId: 'default',
                });
                retrySessionIdRef.current = sessionId;
            }

            // Resumable upload
            const { controller } = await uploadSessionAudio(
                sessionId,
                blob,
                (progress) => {
                    setUploadProgress(progress);
                }
            );
            uploadControllerRef.current = controller;

            // Başarılı
            addToast({
                type: 'success',
                title: 'Kayıt Yüklendi!',
                message: 'AI şimdi ses kaydınızı analiz edecek.',
            });

            // Cleanup
            retryBlobRef.current = null;
            retrySessionIdRef.current = null;
            uploadControllerRef.current = null;

            navigate(`${ROUTES.TEACHER.SESSIONS}/${sessionId}`);
        } catch (error: any) {
            console.error('[NewSession] Upload error:', error);
            setUploadError(error.message || 'Yükleme başarısız. Lütfen tekrar deneyin.');
            // blob'u retry için sakla — ref'te zaten var
        } finally {
            setIsUploading(false);
        }
    };

    // ─── Kayıt sonrası kaydet ────────────────────────────────
    const handleSave = async () => {
        if (!audioBlob || !user) return;
        await processAndUpload(audioBlob);
    };

    // ─── Dosya yükleme ──────────────────────────────────────
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('audio/')) {
            addToast({ type: 'warning', title: 'Uyarı', message: 'Lütfen geçerli bir ses dosyası seçin.' });
            return;
        }

        await processAndUpload(file);
    };

    // ─── Retry ───────────────────────────────────────────────
    const handleRetry = async () => {
        const blob = retryBlobRef.current || audioBlob;
        if (!blob) {
            addToast({ type: 'error', title: 'Hata', message: 'Yeniden yüklenecek kayıt bulunamadı.' });
            return;
        }
        await processAndUpload(blob, retrySessionIdRef.current || undefined);
    };

    // ─── Upload iptal ────────────────────────────────────────
    const handleCancelUpload = () => {
        if (uploadControllerRef.current) {
            uploadControllerRef.current.cancel();
            uploadControllerRef.current = null;
        }
        setIsUploading(false);
        setUploadProgress(null);
        setUploadError(null);
    };

    // ─── Format helpers ──────────────────────────────────────
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.page}>
            <div className={styles.topNav}>
                <button
                    onClick={() => navigate(ROUTES.TEACHER.SESSIONS)}
                    className={styles.backBtn}
                >
                    <ArrowLeft size={20} /> Geri Dön
                </button>
                <h1 className={styles.pageTitle}>Yeni Ders Kaydı</h1>
                <div style={{ width: '100px' }}></div> {/* Spacer for symmetry */}
            </div>

            <div className={styles.contentGrid}>
                {/* Top Side: Recorder */}
                <div className={styles.recorderCard}>
                    {/* ─── Recovery Banner ───────────────────────── */}
                    {hasRecovery && !isRecording && !audioBlob && (
                        <div className={styles.recoveryBanner} style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                            <div className={styles.recoveryText}>
                                <strong style={{ color: '#0369A1' }}>Kaydedilmemiş kayıt bulundu!</strong>
                                <p style={{ fontSize: '13px', color: '#0C4A6E' }}>Önceki oturumdan kurtarılabilir bir ses kaydı var.</p>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <Button variant="primary" size="sm" onClick={recoverRecording} isLoading={isRecovering}>Kurtar</Button>
                                    <Button variant="ghost" size="sm" onClick={dismissRecovery}>Sil</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Offline Banner ────────────────────────── */}
                    {!isOnline && (
                        <div className={styles.offlineBanner} style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <WifiOff size={18} style={{ color: '#D97706' }} />
                            <span style={{ color: '#9A3412', fontSize: '14px' }}>İnternet bağlantısı yok. Kayıt yerel olarak korunuyor.</span>
                        </div>
                    )}

                    {/* ─── Errors ─── */}
                    {(error || uploadError) && (
                        <div className={styles.errorBox} style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '16px', borderRadius: '16px', width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <AlertCircle size={20} style={{ color: '#DC2626' }} />
                            <span style={{ color: '#991B1B', fontSize: '14px' }}>{error || uploadError}</span>
                            {!isUploading && uploadError && (
                                <Button size="sm" variant="ghost" onClick={handleRetry} style={{ marginLeft: 'auto' }}><RefreshCw size={14} /></Button>
                            )}
                        </div>
                    )}

                    <div className={styles.visualizerContainer}>
                        <div className={styles.pulseCircles}>
                            <div className={styles.pulse1}></div>
                            <div className={styles.pulse2}></div>
                        </div>
                        <div className={styles.micCircle}>
                            <Mic size={40} className={styles.mainMicIcon} />
                        </div>
                    </div>

                    <div className={styles.timerWrapper}>
                        <div className={styles.timerDisplay}>
                            <RecordingTimer
                                duration={duration}
                                isRecording={isRecording}
                                isPaused={isPaused}
                            />
                        </div>
                        <p className={styles.timerHint}>
                            {isRecording ? 'Kayıt devam ediyor...' : 'Başlamak için butona tıklayın'}
                        </p>
                    </div>

                    <div className={styles.actionsWrapper}>
                        {/* Audio Preview if finished */}
                        {audioUrl && !isRecording && (
                            <div style={{ width: '100%', marginBottom: '16px' }}>
                                <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} />
                                {audioBlob && (
                                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{formatBytes(audioBlob.size)}</span>
                                )}
                            </div>
                        )}

                        {/* Recording/Post-recording controls */}
                        {!isUploading && (
                            <div className={styles.controlsGroup} style={{ width: '100%' }}>
                                {!isRecording && !audioBlob ? (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className={styles.mainRecordBtn}
                                        onClick={startRecording}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className={styles.recordDot}></span>
                                            Kayda Başla
                                        </span>
                                    </Button>
                                ) : (
                                    <RecordingControls
                                        isRecording={isRecording}
                                        isPaused={isPaused}
                                        hasRecording={!!audioBlob}
                                        isUploading={isUploading}
                                        onStart={startRecording}
                                        onStop={stopRecording}
                                        onPause={pauseRecording}
                                        onResume={resumeRecording}
                                        onReset={resetRecording}
                                        onSave={handleSave}
                                    />
                                )}
                            </div>
                        )}

                        {/* Uploading State */}
                        {isUploading && uploadProgress && (
                            <div className={styles.uploadBox} style={{ width: '100%' }}>
                                <div className={styles.uploadHeader} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                                    <span>{uploadProgress.state === 'running' ? 'Yükleniyor...' : 'Yükleme Duraklatıldı'}</span>
                                    <span>%{uploadProgress.percent}</span>
                                </div>
                                <div className={styles.uploadBar} style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div className={styles.uploadBarFill} style={{ height: '100%', background: '#8B5CF6', width: `${uploadProgress.percent}%`, transition: 'width 0.3s' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748B' }}>
                                    <span>{formatBytes(uploadProgress.bytesTransferred)} / {formatBytes(uploadProgress.totalBytes)}</span>
                                    <button onClick={handleCancelUpload} style={{ border: 'none', background: 'none', color: '#EF4444', fontWeight: 600, cursor: 'pointer' }}>İptal</button>
                                </div>
                            </div>
                        )}

                        {/* Local File Upload Option */}
                        {!isRecording && !audioBlob && !isUploading && !hasRecovery && (
                            <>
                                <div className={styles.orDivider}>VEYA</div>
                                <div className={styles.uploadZone} onClick={() => document.getElementById('audio-upload')?.click()}>
                                    <input
                                        type="file"
                                        id="audio-upload"
                                        accept="audio/*"
                                        hidden
                                        onChange={handleFileUpload}
                                    />
                                    <div className={styles.uploadIconBox}>
                                        <Upload size={24} />
                                    </div>
                                    <div className={styles.uploadText}>
                                        <strong>Bilgisayardan Dosya Yükle</strong>
                                        <p>MP3, WAV veya WEBM formatlarını destekler</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom Side: How it Works */}
                <div className={styles.guideCard}>
                    <div className={styles.guideHeader}>
                        <div className={styles.iconCircle}>
                            <Lightbulb size={24} />
                        </div>
                        <h2 className={styles.guideTitle}>Nasıl Çalışır?</h2>
                    </div>

                    <div className={styles.steps}>
                        <div className={styles.step}>
                            <div className={`${styles.stepNumber} ${styles.purple}`}>1</div>
                            <div className={styles.stepContent}>
                                <h3 className={styles.stepTitle}>Dersinizi Kaydedin</h3>
                                <p className={styles.stepDesc}>
                                    Mikrofonunuzu açın ve dersi normal akışında anlatın. Biz arka planda her şeyi yüksek kalitede kaydedelim.
                                </p>
                                <div className={styles.badge}>
                                    <Mic size={14} /> Gerçek Zamanlı Kayıt
                                </div>
                            </div>
                        </div>

                        <div className={styles.step}>
                            <div className={`${styles.stepNumber} ${styles.pink}`}>2</div>
                            <div className={styles.stepContent}>
                                <h3 className={styles.stepTitle}>Yapay Zeka Analiz Etsin</h3>
                                <p className={styles.stepDesc}>
                                    Kayıt bittikten saniyeler sonra yapay zekamız şu işlemleri gerçekleştirir:
                                </p>
                                <div className={styles.featureGrid}>
                                    <div className={styles.featureItem}>
                                        <FileText size={18} className={styles.featureIcon} />
                                        <span>Konuşmayı Yazıya Dökme</span>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <Sparkles size={18} className={styles.featureIcon} />
                                        <span>Ders Özeti Çıkarma</span>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <Lightbulb size={18} className={styles.featureIcon} />
                                        <span>Önemli Kavramlar</span>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <FileText size={18} className={styles.featureIcon} />
                                        <span>Otomatik Quiz Oluşturma</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className={styles.pageFooter}>
                AI Destekli Akıllı Öğrenme Platformu
            </footer>
        </div>
    );
};

export default NewSession;
