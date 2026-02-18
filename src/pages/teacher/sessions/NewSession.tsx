import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, AlertCircle, Upload, WifiOff, RefreshCw, Lightbulb, Sparkles, FileText, Wand2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { useAudioRecorder } from '../../../hooks';
import { createSession, uploadSessionAudio } from '../../../services/sessionService';
import type { UploadProgress, UploadController } from '../../../services/sessionService';
import { Button, Select } from '../../../components/common';
import { RecordingControls, RecordingTimer } from '../../../components/recording';
import { ROUTES } from '../../../config/routes';
import type { Teacher } from '../../../types';
import styles from './NewSession.module.css';

export const NewSession: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user) as Teacher;
    const addToast = useUIStore((state) => state.addToast);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const uploadControllerRef = useRef<UploadController | null>(null);
    const retryBlobRef = useRef<Blob | null>(null);
    const retrySessionIdRef = useRef<string | null>(null);
    const [targetClass, setTargetClass] = useState<string>('all');

    useEffect(() => {
        if (user?.assignedClasses?.length > 0) {
            setTargetClass(user.assignedClasses[0]);
        }
    }, [user]);

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
                    classId: targetClass,
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
                    <ArrowLeft size={18} /> Geri Dön
                </button>
                <h1 className={styles.pageTitle}>Yeni Ders Kaydı</h1>
                <div className={styles.headerClassSelect}>
                    <label>SINIF:</label>
                    <Select
                        options={[
                            { value: 'all', label: 'Tüm Sınıflar' },
                            ...(user?.assignedClasses?.map((cls: string) => ({ value: cls, label: cls })) || [])
                        ]}
                        value={targetClass}
                        onChange={(val: string) => setTargetClass(val)}
                    />
                </div>
            </div>

            <main className={styles.mainContainer}>
                {/* ─── Recorder Section ───────────────────────── */}
                <section className={styles.recorderCard}>
                    {/* ─── Status Banners ─── */}
                    {hasRecovery && !isRecording && !audioBlob && (
                        <div className={styles.recoveryBanner}>
                            <AlertCircle size={20} color="#2563eb" />
                            <div className={styles.recoveryText}>
                                <strong>Kaydedilmemiş kayıt bulundu!</strong>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <Button variant="primary" size="sm" onClick={recoverRecording} isLoading={isRecovering}>Kurtar</Button>
                                    <Button variant="ghost" size="sm" onClick={dismissRecovery}>Sil</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isOnline && (
                        <div className={styles.offlineBanner}>
                            <WifiOff size={20} color="#d97706" />
                            <span>İnternet bağlantısı yok. Kayıt yerel olarak korunuyor.</span>
                        </div>
                    )}

                    {(error || uploadError) && (
                        <div className={styles.errorBox}>
                            <AlertCircle size={20} color="#dc2626" />
                            <span>{error || uploadError}</span>
                            {!isUploading && uploadError && (
                                <Button size="sm" variant="ghost" onClick={handleRetry} style={{ marginLeft: 'auto' }}><RefreshCw size={14} /></Button>
                            )}
                        </div>
                    )}

                    {/* ─── Visualizer Area ─── */}
                    <div className={`${styles.visualizerContainer} ${isRecording ? styles.recording : ''}`}>
                        <div className={styles.pulseCircles}>
                            <div className={styles.pulse1}></div>
                            <div className={styles.pulse2}></div>
                        </div>
                        <div className={`${styles.micCircle} ${isRecording ? styles.recording : ''}`}>
                            <Mic size={44} />
                        </div>
                    </div>

                    {/* ─── Timer Display ─── */}
                    <div className={styles.timerWrapper}>
                        <div className={styles.timerDisplay}>
                            <RecordingTimer
                                duration={duration}
                                isRecording={isRecording}
                                isPaused={isPaused}
                            />
                        </div>
                        <p className={styles.timerHint}>
                            {isRecording ? 'Kayıt Devam Ediyor' : isPaused ? 'Kayıt Durduruldu' : 'Başlamak için butona dokun'}
                        </p>
                    </div>

                    {/* ─── Controls Area ─── */}
                    <div className={styles.actionsWrapper}>
                        {/* Audio Preview if finished */}
                        {audioUrl && !isRecording && (
                            <div style={{ width: '100%', marginBottom: '4px' }}>
                                <audio controls src={audioUrl} style={{ width: '100%', height: '44px', borderRadius: '12px' }} />
                                {audioBlob && (
                                    <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', marginTop: '4px', fontWeight: 600 }}>
                                        Boyut: {formatBytes(audioBlob.size)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recording/Post-recording controls */}
                        {!isUploading && (
                            <div style={{ width: '100%' }}>
                                {!isRecording && !audioBlob ? (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className={styles.mainRecordBtn}
                                        onClick={startRecording}
                                    >
                                        <span className={styles.recordDot}></span>
                                        Kayda Başla
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', fontWeight: 800 }}>
                                    <span style={{ color: 'var(--color-primary)' }}>
                                        {uploadProgress.percent < 100 ? 'Buluta Aktarılıyor...' : 'Analiz Hazırlanıyor...'}
                                    </span>
                                    <span>%{uploadProgress.percent}</span>
                                </div>
                                <div style={{ height: '10px', background: 'var(--color-bg-light)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                    <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-primary) 0%, #ec4899 100%)', width: `${uploadProgress.percent}%`, transition: 'width 0.4s cubic-bezier(0.1, 0.7, 0.1, 1)' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                                    <span>{formatBytes(uploadProgress.bytesTransferred)} / {formatBytes(uploadProgress.totalBytes)}</span>
                                    <button onClick={handleCancelUpload} style={{ border: 'none', background: 'none', color: '#EF4444', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>İptali Durdur</button>
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
                                        <Upload size={22} />
                                    </div>
                                    <div className={styles.uploadText}>
                                        <strong>Dosya Yükle</strong>
                                        <p>Cihazınızdaki bir kaydı seçin</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ─── How it Works Section ─── */}
                <section className={styles.guideSection}>
                    <div className={styles.guideHeader}>
                        <h2 className={styles.guideTitle}>
                            <Lightbulb size={20} className={styles.iconCircle} /> Üretim Süreci Nasıl Çalışır?
                        </h2>
                    </div>

                    <div className={styles.steps}>
                        <div className={styles.step}>
                            <div className={styles.stepNumber}>01</div>
                            <div className={styles.stepContent}>
                                <h3 className={styles.stepTitle}>Dersinizi Kaydedin</h3>
                                <p className={styles.stepDesc}>
                                    Mikrofonunuzu açın ve dersi normal akışında anlatın. Biz arka planda her şeyi yüksek kalitede kaydedelim.
                                </p>
                            </div>
                        </div>

                        <div className={styles.step}>
                            <div className={styles.stepNumber}>02</div>
                            <div className={styles.stepContent}>
                                <h3 className={styles.stepTitle}>Yapay Zeka Dönüştürsün</h3>
                                <p className={styles.stepDesc}>
                                    Kayıt bittikten saniyeler sonra yapay zekamız şu işlemleri gerçekleştirir:
                                </p>
                                <div className={styles.featureGrid}>
                                    <div className={styles.featureItem}>
                                        <FileText size={14} className={styles.featureIcon} />
                                        <span>Yazıya Dökme</span>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <Wand2 size={14} className={styles.featureIcon} />
                                        <span>Ders Özeti</span>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <Lightbulb size={14} className={styles.featureIcon} />
                                        <span>Ana Başlıklar</span>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <Sparkles size={14} className={styles.featureIcon} />
                                        <span>Sınav Oluşturma</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className={styles.pageFooter}>
                Enderunlala AI • Akıllı Öğrenme Platformu
            </footer>
        </div>
    );
};

export default NewSession;
