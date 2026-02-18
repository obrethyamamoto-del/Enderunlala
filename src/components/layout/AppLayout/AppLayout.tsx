import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';

import { useUIStore } from '../../../stores/uiStore';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
    const sidebarOpen = useUIStore((state) => state.sidebarOpen);

    return (
        <div className={styles.layout}>
            <Header />
            <Sidebar />
            <main className={`${styles.main} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </main>

        </div>
    );
};

export default AppLayout;
