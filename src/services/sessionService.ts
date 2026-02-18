import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Session, CreateSessionPayload } from '../types';

const COLLECTION = 'sessions';

// ============================================================
// Upload Progress Callback
// ============================================================

export interface UploadProgress {
    /** 0-100 arası yüzde */
    percent: number;
    /** Yüklenen byte */
    bytesTransferred: number;
    /** Toplam byte */
    totalBytes: number;
    /** Durum */
    state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface UploadController {
    /** Upload'u duraklat */
    pause: () => void;
    /** Duraklatılmış upload'u devam ettir */
    resume: () => void;
    /** Upload'u iptal et */
    cancel: () => void;
}

// ============================================================
// Session CRUD
// ============================================================

// Create a new session
export const createSession = async (
    teacherId: string,
    data: CreateSessionPayload
): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        teacherId,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
};

// ============================================================
// RESUMABLE Audio Upload
// ============================================================

/**
 * Ses dosyasını Firebase Storage'a resumable upload ile yükler.
 * Progress callback ve durdur/devam/iptal kontrolü sağlar.
 *
 * Özellikler:
 * - Resumable upload (bağlantı kopsa devam edebilir)
 * - Progress callback (yüzde, byte, durum)
 * - Durdur/devam/iptal kontrolleri
 * - Otomatik retry (Firebase SDK'nın kendi mekanizması)
 * - Session dokümanını audio URL ile günceller
 */
export const uploadSessionAudio = async (
    sessionId: string,
    audioBlob: Blob,
    onProgress?: (progress: UploadProgress) => void,
): Promise<{ downloadUrl: string; controller: UploadController }> => {
    // Dosya boyutu kontrolü (max 500MB)
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (audioBlob.size > MAX_FILE_SIZE) {
        throw new Error(`Dosya çok büyük (${formatBytes(audioBlob.size)}). Maksimum dosya boyutu 500MB.`);
    }

    const extension = getExtensionFromMimeType(audioBlob.type);
    const fileName = `sessions/${sessionId}/audio_${Date.now()}.${extension}`;
    const storageRef = ref(storage, fileName);

    // Metadata ekle
    const metadata = {
        contentType: audioBlob.type || 'audio/webm',
        customMetadata: {
            sessionId,
            uploadedAt: new Date().toISOString(),
            originalSize: audioBlob.size.toString(),
        },
    };

    // Resumable upload başlat
    const uploadTask = uploadBytesResumable(storageRef, audioBlob, metadata);

    // Controller (durdur/devam/iptal)
    const controller: UploadController = {
        pause: () => uploadTask.pause(),
        resume: () => uploadTask.resume(),
        cancel: () => uploadTask.cancel(),
    };

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            // Progress callback
            (snapshot) => {
                const percent = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                onProgress?.({
                    percent,
                    bytesTransferred: snapshot.bytesTransferred,
                    totalBytes: snapshot.totalBytes,
                    state: snapshot.state as UploadProgress['state'],
                });
            },
            // Error callback
            (error) => {
                console.error('[SessionService] Upload error:', error);

                let errorMessage: string;
                switch (error.code) {
                    case 'storage/canceled':
                        errorMessage = 'Yükleme iptal edildi.';
                        break;
                    case 'storage/retry-limit-exceeded':
                        errorMessage = 'İnternet bağlantısı çok zayıf. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
                        break;
                    case 'storage/quota-exceeded':
                        errorMessage = 'Depolama alanı doldu. Lütfen yöneticinize başvurun.';
                        break;
                    case 'storage/unauthenticated':
                    case 'storage/unauthorized':
                        errorMessage = 'Yetkilendirme hatası. Lütfen tekrar giriş yapın (Storage izin hatası).';
                        break;
                    default:
                        errorMessage = `Yükleme başarısız (Hata Kodu: ${error.code}): ${error.message}`;
                }

                onProgress?.({
                    percent: 0,
                    bytesTransferred: 0,
                    totalBytes: audioBlob.size,
                    state: 'error',
                });

                reject(new Error(errorMessage));
            },
            // Success callback
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                    // Session dokümanını güncelle
                    await updateDoc(doc(db, COLLECTION, sessionId), {
                        audioUrl: downloadUrl,
                        storagePath: fileName,  // Silme için path'i de sakla
                        recordingSize: audioBlob.size,
                        status: 'recorded',
                        updatedAt: serverTimestamp(),
                    });

                    onProgress?.({
                        percent: 100,
                        bytesTransferred: audioBlob.size,
                        totalBytes: audioBlob.size,
                        state: 'success',
                    });

                    resolve({ downloadUrl, controller });
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};

// ============================================================
// Session Read Operations
// ============================================================

// Get session by ID
export const getSession = async (sessionId: string): Promise<Session | null> => {
    const docSnap = await getDoc(doc(db, COLLECTION, sessionId));

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Session;
    }

    return null;
};

// Get sessions by teacher
export const getTeacherSessions = async (
    teacherId: string,
    limitCount: number = 20
): Promise<Session[]> => {
    const q = query(
        collection(db, COLLECTION),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Session[];
};

// ============================================================
// Session Update / Delete
// ============================================================

// Update session
export const updateSession = async (
    sessionId: string,
    data: Partial<Session>
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, sessionId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

// Delete session and its audio files
export const deleteSession = async (sessionId: string): Promise<void> => {
    const session = await getSession(sessionId);

    // Ses dosyalarını sil
    if (session) {
        await deleteSessionAudioFiles(sessionId, session);
    }

    // Firestore dokümanını sil
    await deleteDoc(doc(db, COLLECTION, sessionId));
};

/**
 * Session'a ait tüm ses dosyalarını Storage'dan siler.
 * Önce storagePath alanını dener, yoksa folder listing yapar.
 */
const deleteSessionAudioFiles = async (sessionId: string, session: any): Promise<void> => {
    try {
        // Yöntem 1: storagePath alanı varsa direkt sil
        if (session.storagePath) {
            try {
                await deleteObject(ref(storage, session.storagePath));
                return;
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.error('[SessionService] Delete by path error:', error);
                }
            }
        }

        // Yöntem 2: sessions/{sessionId}/ altındaki tüm dosyaları listele ve sil
        try {
            const folderRef = ref(storage, `sessions/${sessionId}`);
            const fileList = await listAll(folderRef);

            if (fileList.items.length > 0) {
                await Promise.all(
                    fileList.items.map(item => deleteObject(item).catch(err => {
                        console.warn('[SessionService] Could not delete:', item.fullPath, err);
                    }))
                );
            }
        } catch (error: any) {
            // Klasör yoksa veya erişim yoksa sessizce geç
            if (error.code !== 'storage/object-not-found') {
                console.error('[SessionService] Folder cleanup error:', error);
            }
        }
    } catch (error) {
        console.error('[SessionService] Audio deletion error:', error);
        // Ana silme işlemini engelleme
    }
};

// Update session status
export const updateSessionStatus = async (
    sessionId: string,
    status: Session['status']
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, sessionId), {
        status,
        updatedAt: serverTimestamp(),
    });
};

// ============================================================
// Helpers
// ============================================================

const getExtensionFromMimeType = (mimeType: string): string => {
    if (!mimeType) return 'webm';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
    return 'webm';
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
