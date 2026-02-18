import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================
// IndexedDB Helpers — ses chunk'larını tarayıcı kapansa bile kurtarır
// ============================================================

const DB_NAME = 'enderunlala_recordings';
const DB_VERSION = 1;
const STORE_NAME = 'audio_chunks';
const META_STORE = 'recording_meta';

const openRecordingDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: 'key' });
            }
        };
    });
};

const saveChunksToIDB = async (chunks: Blob[]): Promise<void> => {
    if (chunks.length === 0) return;
    const db = await openRecordingDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const chunk of chunks) {
        store.add({ data: chunk, timestamp: Date.now() });
    }
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
};

const saveRecordingMeta = async (meta: RecordingMeta): Promise<void> => {
    const db = await openRecordingDB();
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({ key: 'current', ...meta });
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
};

const loadChunksFromIDB = async (): Promise<Blob[]> => {
    const db = await openRecordingDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            db.close();
            const records = request.result || [];
            resolve(records.map((r: any) => r.data));
        };
        request.onerror = () => { db.close(); reject(request.error); };
    });
};

const loadRecordingMeta = async (): Promise<RecordingMeta | null> => {
    const db = await openRecordingDB();
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const request = store.get('current');
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            db.close();
            resolve(request.result ? { duration: request.result.duration, startedAt: request.result.startedAt } : null);
        };
        request.onerror = () => { db.close(); reject(request.error); };
    });
};

const clearRecordingIDB = async (): Promise<void> => {
    const db = await openRecordingDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
};

const hasRecoveryData = async (): Promise<boolean> => {
    try {
        const meta = await loadRecordingMeta();
        if (!meta) return false;
        const chunks = await loadChunksFromIDB();
        return chunks.length > 0;
    } catch {
        return false;
    }
};

// ============================================================
// Types
// ============================================================

interface RecordingMeta {
    duration: number;
    startedAt: number;
}

export interface AudioRecorderState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    audioBlob: Blob | null;
    audioUrl: string | null;
    error: string | null;
    hasRecovery: boolean;        // IndexedDB'de kurtarılabilir kayıt var mı
    chunksSaved: number;         // IndexedDB'ye kaydedilen toplam chunk sayısı
    isRecovering: boolean;       // Kurtarma işlemi devam ediyor mu
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    resetRecording: () => void;
    recoverRecording: () => Promise<void>;
    dismissRecovery: () => Promise<void>;
    getAnalyserNode: () => AnalyserNode | null;
}

// ============================================================
// Constants
// ============================================================

const CHUNK_INTERVAL_MS = 1000;       // MediaRecorder veri toplama aralığı
const IDB_FLUSH_INTERVAL_MS = 30000;  // IndexedDB'ye yazma aralığı (30 sn)
const META_SAVE_INTERVAL_MS = 5000;   // Meta bilgi kaydetme aralığı (5 sn)

// ============================================================
// Hook
// ============================================================

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [state, setState] = useState<AudioRecorderState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
        hasRecovery: false,
        chunksSaved: 0,
        isRecovering: false,
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);          // Bellekteki yeni chunk'lar
    const pendingChunksRef = useRef<Blob[]>([]);         // IndexedDB'ye yazılmayı bekleyen chunk'lar
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const idbFlushRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const metaSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const totalChunksSavedRef = useRef(0);
    const durationRef = useRef(0); // Timer'dan bağımsız duration takibi

    // ─── Recovery kontrolü (mount'ta) ────────────────────────
    useEffect(() => {
        const checkRecovery = async () => {
            try {
                const has = await hasRecoveryData();
                if (has) {
                    setState(prev => ({ ...prev, hasRecovery: true }));
                }
            } catch {
                // IndexedDB desteklenmiyorsa sessizce geç
            }
        };
        checkRecovery();
    }, []);

    // ─── beforeunload — kayıt sırasında sayfayı kapatmayı engelle ─
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (state.isRecording || state.audioBlob) {
                e.preventDefault();
                // Modern tarayıcılar kendi mesajını gösterir
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [state.isRecording, state.audioBlob]);

    // ─── Cleanup on unmount ──────────────────────────────────
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (idbFlushRef.current) clearInterval(idbFlushRef.current);
            if (metaSaveRef.current) clearInterval(metaSaveRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
            }
        };
    }, []);

    // ─── IndexedDB'ye chunk flush ────────────────────────────
    const flushChunksToIDB = useCallback(async () => {
        if (pendingChunksRef.current.length === 0) return;

        const chunksToSave = [...pendingChunksRef.current];
        pendingChunksRef.current = [];

        try {
            await saveChunksToIDB(chunksToSave);
            totalChunksSavedRef.current += chunksToSave.length;
            setState(prev => ({ ...prev, chunksSaved: totalChunksSavedRef.current }));
        } catch (error) {
            console.error('[AudioRecorder] IndexedDB flush error:', error);
            // Başarısız chunk'ları geri koy
            pendingChunksRef.current = [...chunksToSave, ...pendingChunksRef.current];
        }
    }, []);

    // ─── Meta bilgi kaydetme ─────────────────────────────────
    const saveMetaToIDB = useCallback(async () => {
        try {
            await saveRecordingMeta({
                duration: durationRef.current,
                startedAt: Date.now() - (durationRef.current * 1000),
            });
        } catch (error) {
            console.error('[AudioRecorder] Meta save error:', error);
        }
    }, []);

    // ─── Timer ───────────────────────────────────────────────
    const startTimer = useCallback(() => {
        timerRef.current = setInterval(() => {
            durationRef.current += 1;
            setState(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ─── IDB periyodik flush timer'larını başlat/durdur ──────
    const startIDBTimers = useCallback(() => {
        // Her 30 saniyede IndexedDB'ye flush
        idbFlushRef.current = setInterval(() => {
            flushChunksToIDB();
        }, IDB_FLUSH_INTERVAL_MS);

        // Her 5 saniyede meta bilgiyi güncelle
        metaSaveRef.current = setInterval(() => {
            saveMetaToIDB();
        }, META_SAVE_INTERVAL_MS);
    }, [flushChunksToIDB, saveMetaToIDB]);

    const stopIDBTimers = useCallback(() => {
        if (idbFlushRef.current) {
            clearInterval(idbFlushRef.current);
            idbFlushRef.current = null;
        }
        if (metaSaveRef.current) {
            clearInterval(metaSaveRef.current);
            metaSaveRef.current = null;
        }
    }, []);

    // ─── KAYIT BAŞLAT ────────────────────────────────────────
    const startRecording = useCallback(async () => {
        try {
            // Eski kaydı temizle
            if (state.audioUrl) {
                URL.revokeObjectURL(state.audioUrl);
            }
            audioChunksRef.current = [];
            pendingChunksRef.current = [];
            totalChunksSavedRef.current = 0;
            durationRef.current = 0;

            // IndexedDB'yi temizle (yeni kayıt)
            await clearRecordingIDB().catch(() => { });

            // Mikrofon erişimi
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            });
            streamRef.current = stream;

            // Audio context (visualizer için)
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            // MediaRecorder — mimeType desteğini kontrol et
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = ''; // Tarayıcı default'unu kullansın
                }
            }

            const mediaRecorder = new MediaRecorder(stream, {
                ...(mimeType ? { mimeType } : {}),
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    pendingChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Son bekleyen chunk'ları IndexedDB'ye yaz
                await flushChunksToIDB().catch(() => { });
                await saveMetaToIDB().catch(() => { });

                // Tüm chunk'ları birleştir — IndexedDB'dekiler + bellektekiler
                let allChunks: Blob[];
                try {
                    const idbChunks = await loadChunksFromIDB();
                    allChunks = idbChunks.length > 0 ? idbChunks : audioChunksRef.current;
                } catch {
                    allChunks = audioChunksRef.current;
                }

                const audioBlob = new Blob(allChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);

                setState(prev => ({
                    ...prev,
                    isRecording: false,
                    isPaused: false,
                    audioBlob,
                    audioUrl,
                }));

                // Stream cleanup
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                // Bellekteki chunk'ları serbest bırak (blob zaten oluşturuldu)
                audioChunksRef.current = [];
                pendingChunksRef.current = [];
            };

            // Kaydı başlat
            mediaRecorder.start(CHUNK_INTERVAL_MS);
            startTimer();
            startIDBTimers();

            setState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                duration: 0,
                audioBlob: null,
                audioUrl: null,
                error: null,
                hasRecovery: false,
                chunksSaved: 0,
            }));

        } catch (error: any) {
            console.error('[AudioRecorder] Recording start error:', error);
            let errorMessage = 'Ses kaydı başlatılamadı.';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Mikrofon bulunamadı. Lütfen bir mikrofon bağlayın.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Mikrofon başka bir uygulama tarafından kullanılıyor.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Mikrofon istenen özellikleri desteklemiyor. Farklı bir mikrofon deneyin.';
            }

            setState(prev => ({ ...prev, error: `${errorMessage} (${error.name || error.message})` }));
        }
    }, [state.audioUrl, startTimer, startIDBTimers, flushChunksToIDB, saveMetaToIDB]);

    // ─── KAYIT DURDUR ────────────────────────────────────────
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            stopTimer();
            stopIDBTimers();
        }
    }, [stopTimer, stopIDBTimers]);

    // ─── DURAKLAT ────────────────────────────────────────────
    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
            mediaRecorderRef.current.pause();
            stopTimer();

            // Duraklatıldığında mevcut chunk'ları kaydet
            flushChunksToIDB().catch(() => { });
            saveMetaToIDB().catch(() => { });

            setState(prev => ({ ...prev, isPaused: true }));
        }
    }, [state.isRecording, state.isPaused, stopTimer, flushChunksToIDB, saveMetaToIDB]);

    // ─── DEVAM ET ────────────────────────────────────────────
    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
            mediaRecorderRef.current.resume();
            startTimer();
            setState(prev => ({ ...prev, isPaused: false }));
        }
    }, [state.isRecording, state.isPaused, startTimer]);

    // ─── SIFIRLA ─────────────────────────────────────────────
    const resetRecording = useCallback(async () => {
        if (state.audioUrl) {
            URL.revokeObjectURL(state.audioUrl);
        }

        // IndexedDB'yi de temizle
        await clearRecordingIDB().catch(() => { });

        audioChunksRef.current = [];
        pendingChunksRef.current = [];
        totalChunksSavedRef.current = 0;
        durationRef.current = 0;

        setState({
            isRecording: false,
            isPaused: false,
            duration: 0,
            audioBlob: null,
            audioUrl: null,
            error: null,
            hasRecovery: false,
            chunksSaved: 0,
            isRecovering: false,
        });
    }, [state.audioUrl]);

    // ─── KURTARMA — IndexedDB'den kayıt geri yükle ──────────
    const recoverRecording = useCallback(async () => {
        setState(prev => ({ ...prev, isRecovering: true, error: null }));

        try {
            const [chunks, meta] = await Promise.all([
                loadChunksFromIDB(),
                loadRecordingMeta(),
            ]);

            if (chunks.length === 0) {
                setState(prev => ({
                    ...prev,
                    isRecovering: false,
                    hasRecovery: false,
                    error: 'Kurtarılacak kayıt bulunamadı.',
                }));
                return;
            }

            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const recoveredDuration = meta?.duration || Math.floor(chunks.length); // Her chunk ~1sn

            setState(prev => ({
                ...prev,
                isRecovering: false,
                hasRecovery: false,
                audioBlob,
                audioUrl,
                duration: recoveredDuration,
                isRecording: false,
                isPaused: false,
            }));

            console.log(`[AudioRecorder] Recovered ${chunks.length} chunks, ~${recoveredDuration}s`);
        } catch (error) {
            console.error('[AudioRecorder] Recovery error:', error);
            setState(prev => ({
                ...prev,
                isRecovering: false,
                error: 'Kayıt kurtarılırken hata oluştu.',
            }));
        }
    }, []);

    // ─── Kurtarma verisini reddet (temizle) ──────────────────
    const dismissRecovery = useCallback(async () => {
        await clearRecordingIDB().catch(() => { });
        setState(prev => ({ ...prev, hasRecovery: false }));
    }, []);

    // ─── Analyser getter ─────────────────────────────────────
    const getAnalyserNode = useCallback(() => {
        return analyserRef.current;
    }, []);

    return {
        ...state,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        resetRecording,
        recoverRecording,
        dismissRecovery,
        getAnalyserNode,
    };
};

export default useAudioRecorder;
