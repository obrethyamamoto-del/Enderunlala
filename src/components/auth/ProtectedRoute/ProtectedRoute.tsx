import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { PageLoader } from '../../common';
import { ROUTES } from '../../../config/routes';
import type { UserRole } from '../../../config/constants';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const location = useLocation();
    const { user, firebaseUser, isLoading, isInitialized } = useAuthStore();

    // Still initializing auth
    if (!isInitialized || isLoading) {
        return <PageLoader message="Yükleniyor..." />;
    }

    // Not authenticated
    if (!firebaseUser) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    // Role check if allowedRoles specified
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = user.role === 'teacher'
            ? ROUTES.TEACHER.DASHBOARD
            : user.role === 'student'
                ? ROUTES.STUDENT.DASHBOARD
                : ROUTES.ADMIN.DASHBOARD;

        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
