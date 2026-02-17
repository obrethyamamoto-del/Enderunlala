import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Mic,
    BookOpen,
    ClipboardCheck,
    HelpCircle,
    BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { ROUTES } from '../../../config/routes';
import styles from './BottomTabBar.module.css';

interface TabItem {
    label: string;
    icon: React.ReactNode;
    activeIcon: React.ReactNode;
    path: string;
}

const teacherTabs: TabItem[] = [
    {
        label: 'Ana Sayfa',
        icon: <LayoutDashboard size={24} strokeWidth={1.5} />,
        activeIcon: <LayoutDashboard size={24} strokeWidth={2} />,
        path: ROUTES.TEACHER.DASHBOARD,
    },
    {
        label: 'AI Analiz',
        icon: <Mic size={24} strokeWidth={1.5} />,
        activeIcon: <Mic size={24} strokeWidth={2} />,
        path: ROUTES.TEACHER.SESSIONS,
    },
    {
        label: 'Quizler',
        icon: <HelpCircle size={24} strokeWidth={1.5} />,
        activeIcon: <HelpCircle size={24} strokeWidth={2} />,
        path: ROUTES.TEACHER.QUIZZES,
    },
    {
        label: 'Raporlar',
        icon: <BarChart3 size={24} strokeWidth={1.5} />,
        activeIcon: <BarChart3 size={24} strokeWidth={2} />,
        path: ROUTES.TEACHER.REPORTS,
    },
];

const studentTabs: TabItem[] = [
    {
        label: 'Ana Sayfa',
        icon: <LayoutDashboard size={24} strokeWidth={1.5} />,
        activeIcon: <LayoutDashboard size={24} strokeWidth={2} />,
        path: ROUTES.STUDENT.DASHBOARD,
    },
    {
        label: 'Sınavlar',
        icon: <BookOpen size={24} strokeWidth={1.5} />,
        activeIcon: <BookOpen size={24} strokeWidth={2} />,
        path: ROUTES.STUDENT.QUIZZES,
    },
    {
        label: 'Sonuçlar',
        icon: <ClipboardCheck size={24} strokeWidth={1.5} />,
        activeIcon: <ClipboardCheck size={24} strokeWidth={2} />,
        path: ROUTES.STUDENT.RESULTS,
    },
];

export const BottomTabBar: React.FC = () => {
    const user = useAuthStore((state) => state.user);

    const getTabs = (): TabItem[] => {
        switch (user?.role) {
            case 'teacher': return teacherTabs;
            case 'student': return studentTabs;
            default: return [];
        }
    };

    const tabs = getTabs();
    if (tabs.length === 0) return null;

    return (
        <nav className={styles.tabBar}>
            {tabs.map((tab) => (
                <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) =>
                        `${styles.tab} ${isActive ? styles.active : ''}`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <span className={styles.icon}>
                                {isActive ? tab.activeIcon : tab.icon}
                            </span>
                            <span className={styles.label}>{tab.label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomTabBar;
