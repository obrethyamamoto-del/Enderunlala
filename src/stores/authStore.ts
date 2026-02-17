import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AppUser } from '../types';

interface AuthState {
    // Firebase auth user
    firebaseUser: FirebaseUser | null;

    // Firestore user document
    user: AppUser | null;

    // Loading states
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    setFirebaseUser: (user: FirebaseUser | null) => void;
    setUser: (user: AppUser | null) => void;
    setLoading: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            firebaseUser: null,
            user: null,
            isLoading: true,
            isInitialized: false,

            setFirebaseUser: (firebaseUser) => set({ firebaseUser }),

            setUser: (user) => set({ user }),

            setLoading: (isLoading) => set({ isLoading }),

            setInitialized: (isInitialized) => set({ isInitialized }),

            logout: () => set({
                firebaseUser: null,
                user: null,
                isLoading: false,
            }),
        }),
        {
            name: 'enderunlala-auth',
            partialize: (state) => ({
                // Only persist user data, not loading states
                user: state.user,
            }),
        }
    )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectFirebaseUser = (state: AuthState) => state.firebaseUser;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
export const selectIsAuthenticated = (state: AuthState) => !!state.firebaseUser;
export const selectUserRole = (state: AuthState) => state.user?.role ?? null;
