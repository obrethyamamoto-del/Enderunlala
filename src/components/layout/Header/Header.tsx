import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, Moon, Sun, User } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { ROUTES } from '../../../config/routes';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const user = useAuthStore((state) => state.user);

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
