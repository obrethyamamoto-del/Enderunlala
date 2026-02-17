import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AppUser } from '../types/user';

const USERS_COLLECTION = 'users';

export const getUser = async (userId: string): Promise<AppUser | null> => {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    return {
        id: docSnap.id,
        ...docSnap.data()
    } as AppUser;
};

export const getAllStudents = async (): Promise<AppUser[]> => {
    const q = query(
        collection(db, USERS_COLLECTION),
        where('role', '==', 'student')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as AppUser[];
};

export const getUsers = async (ids: string[]): Promise<AppUser[]> => {
    if (ids.length === 0) return [];

    // Firestore doesn't support 'in' with more than 10-30 items easily,
    // but for most quizes this is fine. For better scale, we'd fetch in chunks.
    const q = query(
        collection(db, USERS_COLLECTION),
        where('id', 'in', ids.slice(0, 30))
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as AppUser[];
};
