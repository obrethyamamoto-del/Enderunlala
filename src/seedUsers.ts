// Test kullanıcıları oluşturma scripti
// Tarayıcı konsolunda çalıştırın (localhost:5173 açıkken)

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './config/firebase';

const testUsers = [
    {
        email: 'ogretmen@test.com',
        password: 'test1234',
        displayName: 'Ahmet Öğretmen',
        role: 'teacher',
        subjects: ['Matematik', 'Fizik'],
        assignedClasses: ['9-A', '10-B'],
    },
    {
        email: 'ogrenci@test.com',
        password: 'test1234',
        displayName: 'Zeynep Öğrenci',
        role: 'student',
        classId: '9-A',
        studentNumber: '2024001',
    },
    {
        email: 'yonetici@test.com',
        password: 'test1234',
        displayName: 'Müdür Bey',
        role: 'admin',
    },
];

async function seedUsers() {
    for (const userData of testUsers) {
        try {
            const { email, password, ...profile } = userData;

            // Create auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Create Firestore document
            await setDoc(doc(db, 'users', uid), {
                ...profile,
                email,
                institutionId: 'test-institution',
                photoURL: null,
                phoneNumber: null,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            console.log(`✅ Created: ${email} (${profile.role})`);
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`⚠️ Already exists: ${userData.email}`);
            } else {
                console.error(`❌ Error creating ${userData.email}:`, error.message);
            }
        }
    }
    console.log('🎉 Seed complete!');
}

// Export for manual use
export { seedUsers, testUsers };
