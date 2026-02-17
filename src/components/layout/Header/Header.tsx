import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, Moon, Sun, User } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { ROUTES } from '../../../config/routes';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const location = useLocation();
    const { theme, toggleTheme, toggleSidebar } = useUIStore();

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'teacher': return 'Öğretmen';
            case 'student': return 'Öğrenci';
            case 'admin': return 'Yönetici';
            default: return '';
        }
    };

    const getRoleColor = () => {
        switch (user?.role) {
            case 'teacher': return 'teacher';
            case 'student': return 'student';
            case 'admin': return 'admin';
            default: return '';
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Toggle menu">
                    <Menu size={22} />
                </button>
                <Link to={user?.role === 'teacher' ? ROUTES.TEACHER.DASHBOARD : ROUTES.HOME} className={styles.logo}>
                    <span className={styles.logoIcon}>🎓</span>
                    <span className={styles.logoText}>Lala</span>
                </Link>

                {user?.role === 'teacher' && (
                    <nav className={styles.desktopNav}>
                        <Link to={ROUTES.TEACHER.DASHBOARD} className={location.pathname === ROUTES.TEACHER.DASHBOARD ? styles.activeNavLink : styles.navLink}>Dashboard</Link>
                        <Link to={ROUTES.TEACHER.SESSIONS} className={location.pathname.startsWith('/teacher/sessions') ? styles.activeNavLink : styles.navLink}>AI Analiz</Link>
                        <Link to={ROUTES.TEACHER.QUIZZES} className={location.pathname.startsWith('/teacher/quizzes') ? styles.activeNavLink : styles.navLink}>Quizlerim</Link>
                        <Link to={ROUTES.TEACHER.REPORTS} className={location.pathname.startsWith('/teacher/reports') ? styles.activeNavLink : styles.navLink}>Raporlar</Link>
                    </nav>
                )}
            </div>

            <div className={styles.right}>
                <button className={styles.iconBtn} onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                <button className={styles.iconBtn} aria-label="Notifications">
                    <Bell size={20} />
                    <span className={styles.badge}>3</span>
                </button>

                <div className={styles.userMenu}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user?.displayName || 'Kullanıcı'}</span>
                        <span className={`${styles.userRole} ${styles[getRoleColor()]}`}>
                            {getRoleLabel()}
                        </span>
                    </div>
                    <div className={styles.avatar}>
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} />
                        ) : (
                            <User size={18} />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
