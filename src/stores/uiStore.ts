import { create } from 'zustand';
import type { Theme } from '../config/constants';

interface UIState {
    // Theme
    theme: Theme;

    // Sidebar
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;

    // Modal
    activeModal: string | null;
    modalData: Record<string, unknown> | null;

    // Toast notifications
    toasts: Toast[];

    // Actions
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    openModal: (modalId: string, data?: Record<string, unknown>) => void;
    closeModal: () => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>()((set) => ({
    theme: 'light',
    sidebarOpen: window.innerWidth >= 1024,
    sidebarCollapsed: false,
    activeModal: null,
    modalData: null,
    toasts: [],

    setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
    },

    toggleTheme: () =>
        set((state) => {
            const newTheme = state.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            return { theme: newTheme };
        }),

    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

    openModal: (modalId, data) => set({ activeModal: modalId, modalData: data ?? null }),

    closeModal: () => set({ activeModal: null, modalData: null }),

    addToast: (toast) =>
        set((state) => ({
            toasts: [
                ...state.toasts,
                { ...toast, id: `toast-${++toastIdCounter}` },
            ],
        })),

    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}));

// Selectors
export const selectTheme = (state: UIState) => state.theme;
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectToasts = (state: UIState) => state.toasts;
