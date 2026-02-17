import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Mic,
    BarChart3,
    Users,
    GraduationCap,
    Settings,
    LogOut,
    BookOpen,
    ClipboardCheck,
    HelpCircle,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { ROUTES } from '../../../config/routes';
import styles from './Sidebar.module.css';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
}

const teacherNav: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: ROUTES.TEACHER.DASHBOARD },
    { label: 'AI Analiz', icon: <Mic size={20} />, path: ROUTES.TEACHER.SESSIONS },
    { label: 'Quizlerim', icon: <HelpCircle size={20} />, path: ROUTES.TEACHER.QUIZZES },
    { label: 'Raporlar', icon: <BarChart3 size={20} />, path: ROUTES.TEACHER.REPORTS },
];

const studentNav: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: ROUTES.STUDENT.DASHBOARD },
    { label: 'Sınavlarım', icon: <BookOpen size={20} />, path: ROUTES.STUDENT.QUIZZES },
    { label: 'Sonuçlarım', icon: <ClipboardCheck size={20} />, path: ROUTES.STUDENT.RESULTS },
];

const adminNav: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: ROUTES.ADMIN.DASHBOARD },
    { label: 'Öğretmenler', icon: <Users size={20} />, path: ROUTES.ADMIN.TEACHERS },
    { label: 'Öğrenciler', icon: <GraduationCap size={20} />, path: ROUTES.ADMIN.STUDENTS },
    { label: 'Tüm AI Analizler', icon: <Mic size={20} />, path: ROUTES.ADMIN.SESSIONS },
    { label: 'Raporlar', icon: <BarChart3 size={20} />, path: ROUTES.ADMIN.REPORTS },
    { label: 'Ayarlar', icon: <Settings size={20} />, path: ROUTES.ADMIN.SETTINGS },
];

export const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const sidebarOpen = useUIStore((state) => state.sidebarOpen);
    const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

    // Close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, [location.pathname, setSidebarOpen]);

    // Handle resize: auto-open on desktop, auto-close on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setSidebarOpen]);

    const getNavItems = (): NavItem[] => {
        switch (user?.role) {
            case 'teacher': return teacherNav;
            case 'student': return studentNav;
            case 'admin': return adminNav;
            default: return [];
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            logout();
            navigate(ROUTES.LOGIN);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleBackdropClick = () => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const navItems = getNavItems();

    return (
        <>
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div className={styles.backdrop} onClick={handleBackdropClick} />
            )}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
                <nav className={styles.nav}>
                    <ul className={styles.navList}>
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `${styles.navItem} ${isActive ? styles.active : ''}`
                                    }
                                >
                                    <span className={styles.icon}>{item.icon}</span>
                                    <span className={styles.label}>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className={styles.footer}>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Çıkış Yap</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
