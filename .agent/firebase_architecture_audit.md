# 🔥 EnderunLala Firebase Mimari Denetim Raporu

**Tarih:** 2026-02-14  
**Durum:** Alfa Öncesi Kritik İnceleme  
**Kapsam:** Firebase Auth, Firestore, Storage, AI Service, Client-Side Logic

---

## 📋 ÖZET TABLO

| Kategori | Kritik | Yüksek | Orta | Düşük |
|---|---|---|---|---|
| 🔴 Güvenlik | 4 | 2 | 1 | - |
| 🟠 Veri Bütünlüğü | 2 | 3 | 2 | - |
| 🟡 Ses Kaydı & Upload | 2 | 3 | 1 | - |
| 🔵 Quiz Dağıtım | 1 | 2 | 2 | - |
| 🟣 Auth & Oturum | 1 | 2 | 1 | - |
| ⚪ Performans | - | 2 | 3 | 2 |
| **Toplam** | **10** | **14** | **10** | **2** |

---

## 🔴 KRİTİK #1: SIFIR Firebase Security Rules

**Dosya:** Proje kökünde `firebase.json`, `firestore.rules`, `storage.rules` yok  
**Ciddiyet:** 🔴🔴🔴 KRİTİK (Alpha blocker)

### Problem
Projede hiçbir Firestore Security Rules veya Storage Security Rules dosyası bulunmuyor. Bu demek oluyor ki:

1. **Firestore muhtemelen test modunda çalışıyor** — Herkes, herhangi bir koleksiyondaki her belgeyi okuyabilir, yazabilir, silebilir.
2. **Storage da muhtemelen açık** — Herkes ses dosyalarını indirebilir, başkalarının dosyalarını silebilir.

### Etki
- Herhangi bir öğrenci, başka bir öğrencinin cevaplarını okuyabilir/değiştirebilir
- Herhangi biri tüm quiz cevap anahtarlarını görüntüleyebilir (sorular ve `isCorrect` bilgileri Firestore'da)
- Herhangi biri öğretmenin ses kayıtlarını dinleyebilir
- Herhangi biri veritabanındaki tüm verileri silebilir
- API key istemci tarafında açık olduğu için kötü niyetli kişi kolayca erişebilir

### Çözüm
```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users - yalnızca kendi profilini okuyabilir, admin hepsini
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && (request.auth.uid == userId || isAdmin());
    }
    
    // Sessions - sadece sahibi okuyabilir/yazabilir
    match /sessions/{sessionId} {
      allow read: if request.auth != null && 
        (resource.data.teacherId == request.auth.uid || isAdmin());
      allow create: if request.auth != null && isTeacher();
      allow update, delete: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
    }
    
    // Quizzes
    match /quizzes/{quizId} {
      // Öğretmen her şeyi yapabilir, öğrenci sadece published olanları okuyabilir
      allow read: if request.auth != null && (
        resource.data.teacherId == request.auth.uid || 
        resource.data.status == 'published' ||
        isAdmin()
      );
      allow create: if request.auth != null && isTeacher();
      allow update, delete: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
    }
    
    // Submissions
    match /quiz_submissions/{submissionId} {
      allow read: if request.auth != null && (
        resource.data.studentId == request.auth.uid ||
        isTeacherOfQuiz(resource.data.quizId) ||
        isAdmin()
      );
      allow create: if request.auth != null && isStudent();
      allow update: if request.auth != null && (
        resource.data.studentId == request.auth.uid ||
        isTeacherOfQuiz(resource.data.quizId)
      );
    }
    
    function isTeacher() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    function isStudent() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student';
    }
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 🔴 KRİTİK #2: Client-Side Quiz Grading — Kopya Çekme Cennet

**Dosya:** `src/services/quizService.ts` satır 390-498  
**Ciddiyet:** 🔴🔴🔴 KRİTİK

### Problem
Quiz puanlama tamamen istemci tarafında yapılıyor. `submitQuiz()` fonksiyonu:
1. Quiz'i Firestore'dan alıyor (doğru cevaplar dahil)
2. İstemcide puanlıyor
3. Puanlama sonucunu Firestore'a yazıyor

Öğrenci tarayıcı konsolundan veya network tab'dan:
- Tüm doğru cevapları görebilir (`getQuiz()` çağrısında `questions[].options[].isCorrect`, `correctAnswer`, `blanks[].correctAnswer` gibi alanlar client'a geliyor)
- Puanlama sonucunu değiştirebilir (`score`, `percentage`, `passed` alanlarını doğrudan Firestore'a yazabilir)

### Etki
- Öğrenciler tüm cevap anahtarına erişebilir
- %100 puan yazabilirler
- Güvenilir hiçbir not yoktur

### Çözüm
- **Kısa vadeli (alfa için):** Quiz'i getirirken doğru cevapları striplemek (client'a göndermemek). Ayrı bir `quiz_answers` koleksiyonu tutmak.
- **Uzun vadeli:** Cloud Functions ile server-side grading implementasyonu. `submitQuiz` sadece cevapları gönderir, puanlama Cloud Function'da yapılır.

---

## 🔴 KRİTİK #3: Published Quizlerin Öğrenciye Düşmemesi Riski

**Dosya:** `src/services/quizService.ts` satır 152-168, `src/pages/student/StudentQuizList.tsx`  
**Ciddiyet:** 🔴🔴 YÜKSEK-KRİTİK

### Problem
`getPublishedQuizzes()` fonksiyonu **TÜM** published quizleri çekiyor — hiçbir sınıf/kurum filtresi yok:

```typescript
const q = query(
    collection(db, QUIZZES_COLLECTION),
    where('status', '==', 'published')
);
```

Bu birden fazla sorun yaratır:
1. **Farklı sınıftaki/okuldaki quizler de görünür** — Tüm öğretmenlerin tüm published quizleri tüm öğrencilere düşer
2. **classId filtresi yok** — Quiz'de `classId` alanı opsiyonel ve hiçbir yerde filtrelenmiyor
3. **Sıralama in-memory** — Firestore composite index yerine memory'de sort yapılıyor, ölçeklenme problemi

### Ek Problem: Quiz Yayınlama Sonrası Gecikme
`publishQuiz()` `serverTimestamp()` kullanıyor ama `getPublishedQuizzes()` sadece anlık snapshot alıyor — `onSnapshot` dinleyicisi yok. Öğrenci quiz yayınlandığında sayfayı yenilemezse göremez.

### Çözüm
```typescript
// Öğrencinin sınıfına göre filtreli quiz çekme
export const getPublishedQuizzesForStudent = async (classId: string): Promise<Quiz[]> => {
    const q = query(
        collection(db, QUIZZES_COLLECTION),
        where('status', '==', 'published'),
        where('classId', '==', classId)
    );
    // ...
};

// Veya onSnapshot ile gerçek zamanlı:
export const subscribeToPublishedQuizzes = (classId: string, callback: (quizzes: Quiz[]) => void) => {
    return onSnapshot(
        query(collection(db, QUIZZES_COLLECTION), where('status', '==', 'published'), where('classId', '==', classId)),
        (snapshot) => {
            const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quiz[];
            callback(quizzes);
        }
    );
};
```

---

## 🔴 KRİTİK #4: Gemini API Key Client-Side'da Açık

**Dosya:** `src/services/aiService.ts` satır 11-12  
**Ciddiyet:** 🔴🔴🔴 KRİTİK

### Problem
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
```

`VITE_` prefix'li env değişkenleri Vite tarafından build edildiğinde client bundle'ına eklenir. Yani:
- API key tarayıcıda JavaScript bundle'ı inspect edilerek görülebilir
- Kötü niyetli biri bu key ile sınırsız Gemini API çağrısı yapabilir (maliyet)
- Rate limit aşılırsa tüm sistem çöker

### Çözüm
- Cloud Functions / Cloud Run ile proxy endpoint oluşturun
- AI isteklerini server-side'da yapın
- API key'i sadece sunucu ortamında tutun

---

## 🔴 KRİTİK #5: 45 Dakikalık Ses Kaydı — Memory Bombası

**Dosya:** `src/hooks/useAudioRecorder.ts`, `src/services/sessionService.ts`  
**Ciddiyet:** 🔴🔴🔴 KRİTİK

### Problem
45 dakikalık ders kaydı yaklaşık **50-100 MB** büyüklüğünde bir blob üretir:

1. **Tüm chunks bellekte tutuluyor** (satır 32: `audioChunksRef = useRef<Blob[]>([])`)
   - Her saniye bir chunk ekleniyor (satır 123: `mediaRecorder.start(1000)`)
   - 45 dakika = 2700 chunk → Hepsi bellekte
   
2. **Kayıt bitince tek Blob'a birleştiriliyor** (satır 105: `new Blob(audioChunksRef.current)`)
   - Bu anlık olarak bellek kullanımını 2x artırır (chunks + merged blob)
   - Düşük RAM'li telefonlarda crash riski çok yüksek

3. **Upload tek seferde yapılıyor** (satır 46: `uploadBytes(storageRef, audioBlob)`)
   - 100 MB'lık tek bir HTTP isteği
   - İnternet kesintisinde tüm yükleme başarısız olur, retry mekanizması yok

4. **Kayıt sırasında sayfa yenileme / kazara kapanma = TAMAMEN KAYBEDİLİR**
   - Hiçbir ara kaydetme (intermediate persistence) yok
   - IndexedDB veya benzeri bir yere periyodik yazma yapılmıyor

### Çözüm
```typescript
// 1. Chunked upload mekanizması
const CHUNK_INTERVAL = 30000; // Her 30 saniyede bir chunk'ı IndexedDB'ye yaz

// 2. Resumable upload kullanın
import { ref, uploadBytesResumable } from 'firebase/storage';

const uploadTask = uploadBytesResumable(storageRef, audioBlob);
uploadTask.on('state_changed',
  (snapshot) => { /* progress tracking */ },
  (error) => { /* retry logic */ },
  () => { /* complete */ }
);

// 3. İnternet kesintisinde otomatik retry
uploadTask.pause();
// Internet geldiğinde:
uploadTask.resume();

// 4. IndexedDB'ye periyodik chunk kaydetme
const saveChunkToIndexedDB = async (chunk: Blob, index: number) => {
    const db = await openDB('recordings', 1);
    await db.put('chunks', chunk, `chunk_${index}`);
};
```

---

## 🔴 KRİTİK #6: Upload Hatası = Ses Kaydı Sonsuza Kadar Kayıp

**Dosya:** `src/pages/teacher/sessions/NewSession.tsx` satır 53-84  
**Ciddiyet:** 🔴🔴 YÜKSEK

### Problem
`processAndUpload()` fonksiyonunda:
1. Önce Firestore'da session oluşturuluyor
2. Sonra ses yükleniyor
3. Upload başarısız olursa → Session Firestore'da kalır ama sesi yok (orphan document)
4. Kullanıcı hatayı alır ama ses kaydı (audioBlob) UI state'te kalmaya devam eder
5. **AMA** tekrar deneme butonu yok! Kullanıcı ya sayfayı yeniler (ve kaydı kaybeder) ya da stuck kalır

### Çözüm
- Retry mekanizması ekleyin
- Upload başarısız olursa blob'u saklamaya devam edin ve retry sunun
- Orphan session cleanup mekanizması (ör: 24 saat içinde audioUrl'si olmayan session'ları temizle)

---

## 🔴 KRİTİK #7: `resetStudentSubmissions` — Production'da Açık Kapı

**Dosya:** `src/services/quizService.ts` satır 569-579  
**Ciddiyet:** 🔴🔴 YÜKSEK

### Problem
```typescript
export const resetStudentSubmissions = async (studentId: string): Promise<void> => {
    // Bir öğrencinin TÜM submissionlarını siler — DEBUG ONLY yazıyor ama export ediliyor
};
```
Bu fonksiyon export edilmiş ve potansiyel olarak herhangi bir yerden çağrılabilir. Security rules olmadan herkes bunu çağırabilir.

### Çözüm
- Bu fonksiyonu production build'den kaldırın
- Veya en azından admin rolü kontrolü ekleyin
- Cloud Functions'a taşıyın

---

## 🔴 KRİTİK #8: Session Silme — Ses Dosyası Gerçekte Silinmiyor

**Dosya:** `src/services/sessionService.ts` satır 102-117  
**Ciddiyet:** 🟠 YÜKSEK

### Problem
```typescript
const audioRef = ref(storage, `sessions/${sessionId}`);
await deleteObject(audioRef);
```
Bu kod yanlış. Storage path `sessions/${sessionId}/audio_${Date.now()}.webm` formatında kaydediliyor (satır 42), ama silme işlemi `sessions/${sessionId}` referansını kullanıyor. Firebase Storage'da klasör silme yok — her dosya ayrı ayrı silinmeli.

### Etki
- Silinen session'ların ses dosyaları Storage'da kalır
- Storage maliyeti gereksiz artar
- Kişisel veri saklanmaya devam eder (KVKK riski)

### Çözüm
```typescript
// Session'ın audioUrl'sinden storage path'i çıkar
import { ref, deleteObject } from 'firebase/storage';

// audioUrl'den path elde etme
const getStoragePathFromUrl = (url: string): string | null => {
    try {
        const decodedUrl = decodeURIComponent(url);
        const match = decodedUrl.match(/\/o\/(.+?)\?/);
        return match ? match[1] : null;
    } catch { return null; }
};

// Doğru silme
if (session?.audioUrl) {
    const path = getStoragePathFromUrl(session.audioUrl);
    if (path) {
        await deleteObject(ref(storage, path));
    }
}
```

---

## 🟠 YÜKSEK #9: `getUsers()` — Firestore `in` Limiti Sessizce Veri Kesiyor

**Dosya:** `src/services/userService.ts` satır 34-49  
**Ciddiyet:** 🟠 YÜKSEK

### Problem
```typescript
where('id', 'in', ids.slice(0, 30))
```
1. Firestore `in` operatörü **max 30 öğe** destekler, fazlası sessizce kesilir
2. `where('id', 'in', ...)` kullanılıyor ama doküman ID'si Firestore'da `__name__` veya `documentId()` ile sorgulanmalı — `id` alanı doküman içinde olmayabilir

### Çözüm
```typescript
import { documentId } from 'firebase/firestore';

export const getUsers = async (ids: string[]): Promise<AppUser[]> => {
    const results: AppUser[] = [];
    const chunks = chunkArray(ids, 30); // 30'lu gruplara böl
    
    for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const snapshot = await getDocs(q);
        results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    }
    return results;
};
```

---

## 🟠 YÜKSEK #10: Race Condition — Çift Submission Oluşturma

**Dosya:** `src/services/quizService.ts` satır 279-314  
**Ciddiyet:** 🟠 YÜKSEK

### Problem
`startQuizSubmission()` fonksiyonunda:
1. Mevcut denemeleri kontrol ediyor
2. Yeni submission oluşturuyor

Bu iki adım arasında race condition var. Öğrenci çift tıklarsa veya sayfa hızlı yenilenirse, iki `in_progress` submission oluşabilir. Firestore atomik transaction kullanılmıyor.

### Ek Risk
`StudentQuizPlayer.tsx`'te `initializedRef` ile guard var ama bu sadece istemci tarafında, sunucu tarafında koruma yok.

### Çözüm
```typescript
import { runTransaction } from 'firebase/firestore';

export const startQuizSubmission = async (quizId: string, studentId: string) => {
    return runTransaction(db, async (transaction) => {
        // Transaction içinde mevcut submission kontrolü
        // Varsa oluşturma, yoksa yeni oluştur
    });
};
```

---

## 🟠 YÜKSEK #11: Auth State Persist — LocalStorage'da Hassas Veri

**Dosya:** `src/stores/authStore.ts` satır 47-54  
**Ciddiyet:** 🟠 YÜKSEK

### Problem
```typescript
persist(
    // ...
    {
        name: 'enderunlala-auth',
        partialize: (state) => ({
            user: state.user,
        }),
    }
)
```
Kullanıcı profil verisi (rol, email, isim, institutionId vb.) `localStorage`'a persist ediliyor. Bu:
1. XSS saldırısında hassas veri sızması riski yaratır
2. `user.role` localStorage'dan okunarak rol tespiti yapılabilir — kötü niyetli kullanıcı localStorage'ı değiştirerek öğretmen rolüne geçebilir

### Etki
Bir öğrenci tarayıcı konsolundan:
```javascript
const store = JSON.parse(localStorage.getItem('enderunlala-auth'));
store.state.user.role = 'teacher';
localStorage.setItem('enderunlala-auth', JSON.stringify(store));
// Sayfa yenileme → öğretmen paneline erişim
```

### Çözüm
- localStorage'daki rol bilgisini client-side yetkilendirme için kullanmayın
- Her sayfa yüklendiğinde Firestore'dan doğrulayın (zaten `App.tsx`'te yapılıyor ama race condition var)
- Security Rules'da gerçek yetkilendirme yapın

---

## 🟠 YÜKSEK #12: Auth State — Stale Data Race Condition

**Dosya:** `src/App.tsx` satır 35-57, `src/stores/authStore.ts`  
**Ciddiyet:** 🟠 YÜKSEK

### Problem
```typescript
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setFirebaseUser(firebaseUser);
        if (firebaseUser) {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
                setUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
            }
        }
        setLoading(false);
        setInitialized(true);
    });
}, []);
```

Sorunlar:
1. `onAuthStateChanged` tetikleniyor → `setFirebaseUser` çağrılıyor → ProtectedRoute `firebaseUser !== null` görüyor → sayfaya erişim izni veriyor → AMA `user` henüz Firestore'dan yüklenmemiş → rol kontrolü çalışmıyor
2. LocalStorage'dan eski `user` persist ediliyor → stale data ile sayfa render oluyor
3. Firestore `getDoc` başarısız olursa (ağ sorunu) → `setUser` çağrılmıyor → eski persist edilen user kullanılmaya devam ediyor

### Çözüm
```typescript
if (firebaseUser) {
    try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
        } else {
            // User dokümanı yoksa logout et
            setUser(null);
            await auth.signOut();
        }
    } catch (error) {
        // Ağ hatası — localStorage cache'i KULLANMA, hata göster
        setUser(null);
        console.error('User fetch failed, clearing session');
    }
}
```

---

## 🟡 ORTA #13: Quiz Submission — `in_progress` Leaks

**Dosya:** `src/services/quizService.ts`  
**Ciddiyet:** 🟡 ORTA

### Problem
Öğrenci quiz'e başlıyor → `in_progress` submission oluşuyor → Sayfa kapatılıyor / browser crash → Submission sonsuza kadar `in_progress` kalıyor.

Sonraki girişte `StudentQuizPlayer` eski `in_progress` submission'ı buluyor ve devam ettirmeye çalışıyor. Ancak:
- `answers` alanı boş (henüz cevap verilmemiş)
- `startedAt` eski tarihli
- Timer zaten sıfırlanmış

### Çözüm
- Belirli bir süre (ör: 24 saat) geçmiş `in_progress` submission'ları expire edin
- Veya timeout: quiz süresi + 30 dakika sonra otomatik `expired` durumuna geçirin

---

## 🟡 ORTA #14: Quiz Sorularında Doğru Cevap Öğrenciye Açık

**Dosya:** `src/services/quizService.ts` — `getQuiz()`  
**Ciddiyet:** 🟡 ORTA (Security Rules ile birlikte KRİTİK)

### Problem
`getQuiz()` tüm quiz verisini döndürür: sorular, seçenekler, `isCorrect`, `correctAnswer`, `blanks[].correctAnswer` dahil. Öğrenci `StudentQuizPlayer`'da bu fonksiyonu çağırıyor.

Network tab'da veya browser DevTools'da tüm cevap anahtarı görülebilir.

### Çözüm
- Quiz'i öğrenci için getirirken doğru cevap bilgilerini strip edin
- Veya server-side'da (Cloud Functions) sanitized quiz endpoint oluşturun

---

## 🟡 ORTA #15: `seedUsers` — Production'da Açık

**Dosya:** `src/pages/auth/Login.tsx` satır 148-159, `src/seedUsers.ts`  
**Ciddiyet:** 🟡 ORTA

### Problem
Login sayfasında "Test Kullanıcıları Oluştur" butonu var ve `seedUsers` fonksiyonu import ediliyor. Production'da:
- Herkes test kullanıcıları oluşturabilir
- Bilinen şifrelerle (`test1234`) hesap oluşturulur
- Bu hesaplarla sisteme giriş yapılabilir

### Çözüm
```typescript
// Environment kontrolü ekle
{import.meta.env.DEV && (
    <div className={styles.devSection}>
        <Button onClick={handleSeed}>Test Kullanıcıları Oluştur</Button>
    </div>
)}
```

---

## 🟡 ORTA #16: Firestore Composite Index Eksikliği

**Dosya:** Çeşitli servis dosyaları  
**Ciddiyet:** 🟡 ORTA

### Problem
Birçok sorgu composite index gerektirebilir ama bunlar tanımlı değil:
- `getQuizzesByTeacher`: `teacherId` + `createdAt desc` → composite index lazım
- `getQuizSubmissions`: `quizId` + `submittedAt desc` → composite index lazım
- `getTeacherSessions`: `teacherId` + `createdAt desc` + `limit` → composite index lazım

Bazı yerlerde "sort in memory to avoid index requirement" yorumu var — bu geçici çözüm ölçeklenme problemlerine yol açar.

### Çözüm
Firebase Console'dan composite index'leri oluşturun veya `firebase.json` ile deploy edin.

---

## 🟡 ORTA #17: `useQuizSession` — localStorage Manipulation

**Dosya:** `src/hooks/useQuizSession.ts`  
**Ciddiyet:** 🟡 ORTA

### Problem
Quiz session verisi localStorage'da tutulur: cevaplar, soru indeksi, kalan süre. Öğrenci:
1. `localStorage.getItem('quiz_session_QUIZID')` ile mevcut cevapları görebilir
2. Timer'ı manipüle edebilir (kalan süreyi artırabilir)
3. Cevapları önceden set edebilir

### Çözüm
- Timer'ı sunucu tarafında kontrol edin
- `startedAt` timestamp'ini submission oluşturulduğunda Firestore'a yazın (yapılıyor)
- Submit sırasında server-side süre kontrolü ekleyin

---

## 🟡 ORTA #18: Audio Transcription — 45 dk Ses İçin Base64 Encoding

**Dosya:** `src/services/aiService.ts` satır 14-25, 28-89  
**Ciddiyet:** 🟡 ORTA

### Problem
`transcribeAudio()` fonksiyonu:
1. Ses dosyasını URL'den fetch eder (100 MB download)
2. Base64'e çevirir (133 MB — base64 %33 büyütür)
3. Gemini API'ye JSON body olarak gönderir

Bu:
- İstemci tarafında 233+ MB bellek kullanır
- Base64 encoding CPU-intensive'dir ve UI thread'i bloklar
- Gemini API'nin `maxOutputTokens: 8192` limiti 45 dk'lık dersi tam yazıya dökmeye yetmez
- API timeout riski çok yüksek

### Çözüm
- File API veya Cloud Storage URI ile Gemini'ye gönderme
- Cloud Functions'da yapma
- Uzun kayıtları bölümlere ayırma (5'er dk)

---

## 🔵 YÜKSEK #19: Quiz'e Sınıf/Kurum Bazlı Erişim Kontrolü Yok

**Dosya:** `src/types/quiz.ts`, `src/services/quizService.ts`  
**Ciddiyet:** 🔵 YÜKSEK

### Problem
- Quiz'de `classId` ve `sessionId` opsiyonel alanlar var ama hiçbir yerde kullanılmıyor
- Öğretmen quiz'i hangi sınıfa yayınladığını belirleyemiyor
- Tüm published quizler tüm öğrencilere görünüyor
- Farklı okulların öğrencileri birbirinin quizlerini görebiliyor

### Çözüm
- Quiz yayınlarken hedef sınıf seçimini zorunlu kılın
- `getPublishedQuizzes` yerine `getPublishedQuizzesForClass(classId)` kullanın
- `institutionId` filtresi ekleyin

---

## 🔵 ORTA #20: Öğrencinin Dashboard'u Placeholder

**Dosya:** `src/App.tsx` satır 158-165  
**Ciddiyet:** 🔵 ORTA

### Problem
Öğrenci giriş yaptığında `/student` dashboard'a yönlendiriliyor ama bu sayfa sadece bir placeholder:
```tsx
<PlaceholderPage title="Öğrenci Paneli" />
```
Öğrenci login olduktan sonra boş bir sayfa görüyor. Quizlere ulaşmak için sidebar'dan gezinmesi gerekiyor.

### Çözüm
- Öğrenci dashboard'unu implement edin
- Veya geçici olarak `/student/quizzes`'e yönlendirin

---

## 🟣 YÜKSEK #21: Oturum Persistence Eksikliği — Firebase Auth Token Yönetimi

**Dosya:** `src/config/firebase.ts`, `src/App.tsx`  
**Ciddiyet:** 🟣 YÜKSEK

### Problem
Firebase Auth varsayılan olarak `browserLocalPersistence` kullanır — bu genelde sorun çıkarmaz. ANCAK:

1. **Birden fazla sekme** açık olduğunda `onAuthStateChanged` her sekmede bağımsız tetiklenir
2. **Token yenileme** sırasında kısa bir süre `firebaseUser` null olabilir → kullanıcı login sayfasına yönlendirilir → token yenilenince tekrar dashboard'a döner (flash)
3. **IndexedDB Storage** sakatlanırsa (private browsing, storage quota) auth state kaybolur

### Çözüm
```typescript
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

// App başlangıcında
await setPersistence(auth, browserLocalPersistence);
```
Ve `ProtectedRoute`'ta flash'ı önlemek için kısa delay/debounce ekleyin.

---

## 🟣 ORTA #22: Offline Desteği Yok — İnternet Kesintisi = Veri Kaybı

**Dosya:** Tüm servis dosyaları  
**Ciddiyet:** 🟣 ORTA

### Problem
Firestore offline persistence aktifleştirilmemiş:
```typescript
// Bu satır yok:
import { enableIndexedDbPersistence } from 'firebase/firestore';
enableIndexedDbPersistence(db);
```

Bu demek oluyor ki:
- İnternet kesintisinde hiçbir okuma/yazma çalışmaz
- Öğrenci quiz çözerken internet koparsa cevapları kaybolur (localStorage'a yazılıyor ama Firestore'a gitmez)
- Öğretmen kayıt yaparken internet koparsa kayıt sonrası upload başarısız olur

### Çözüm (Alfa için minimum):
```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// firebase.ts'ye ekle:
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Offline persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Offline persistence not available');
    }
});
```

---

## ⚪ PERFORMANS #23: Quiz Dokümanları Çok Büyük

**Dosya:** `src/services/quizService.ts`  
**Ciddiyet:** ⚪ ORTA

### Problem
Tüm quiz soruları (questions array) tek bir Firestore dokümanına gömülü. 50+ soruluk bir quiz:
- Doküman boyutu büyür (Firestore max 1 MB)
- Her quiz listeleme isteğinde TÜM sorular indirilir (sadece başlık gerekirken)
- Bandwidth israfı

### Çözüm
- Quiz listesi için sadece metadata dönen lightweight query kullanın
- Veya soruları sub-collection'a taşıyın

---

## ⚪ PERFORMANS #24: Gereksiz Re-render ve Data Fetch

**Dosya:** Çeşitli component dosyaları  
**Ciddiyet:** ⚪ DÜŞÜK

### Problem
- `useAuthStore` selector kullanılmadan doğrudan destructure ediliyor: `const { user } = useAuthStore()` — bu tüm store değişikliklerinde re-render tetikler
- Quiz listesi her mount'ta yeniden fetch ediliyor — SWR/React Query gibi cache mekanizması yok

---

## 📊 ALFA ÖNCESİ ÖNCELİK SIRASI

### 🚨 HEMEN YAPILMASI GEREKENLER (Alpha Blockers)

1. **Firestore Security Rules yazın ve deploy edin** (#1)
2. **Storage Security Rules yazın** (#1)
3. **Gemini API Key'i server-side'a taşıyın** (#4) — veya en azından Firebase App Check ile koruyun
4. **Quiz cevap anahtarını öğrenciden gizleyin** (#2, #14)
5. **seedUsers'ı production'dan kaldırın** (#15)
6. **resetStudentSubmissions'ı kaldırın veya koruyun** (#7)

### ⚠️ ALFA SÜRECINDE YAPILMASI GEREKENLER

7. **Audio upload'ı resumable yapın** (#5)
8. **Upload retry mekanizması ekleyin** (#6)
9. **Quiz'lere sınıf filtresi ekleyin** (#3, #19)
10. **Firestore offline persistence aktifleştirin** (#22)
11. **Auth state race condition'ı düzeltin** (#11, #12)
12. **in_progress submission cleanup** (#13)

### 📋 İYİLEŞTİRME (Post-Alpha)

13. **Server-side grading (Cloud Functions)** (#2)
14. **Real-time quiz notifications (onSnapshot)** (#3)
15. **Composite Firestore indexes** (#16)
16. **AI processing'i server-side'a taşıyın** (#18)
17. **Session silme storage cleanup** (#8)
18. **getUsers chunk fix** (#9)
19. **startQuizSubmission transaction** (#10)
20. **Öğrenci Dashboard implementasyonu** (#20)
