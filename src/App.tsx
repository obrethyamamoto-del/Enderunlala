import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { useAuthStore } from './stores/authStore';
import { ROUTES } from './config/routes';
import { ToastContainer } from './components/common';
import { AppLayout } from './components/layout';
import { ProtectedRoute } from './components/auth';
import type { AppUser } from './types';

// Pages
import { Login } from './pages/auth/Login';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { Sessions, NewSession, SessionDetail } from './pages/teacher/sessions';
import { QuizEdit, Quizzes } from './pages/teacher/quizzes';
import { QuizSubmissions } from './pages/teacher/quizzes/QuizSubmissions';
import { Reports } from './pages/teacher/Reports';
import { StudentDashboard } from './pages/student/Dashboard';
import StudentQuizPlayer from './pages/student/StudentQuizPlayer';
import { StudentQuizList } from './pages/student/StudentQuizList';
import { StudentQuizResult } from './pages/student/StudentQuizResult';
import { StudentResults } from './pages/student/StudentResults';

// Placeholder pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '2rem' }}>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{title}</h1>
    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Bu sayfa yakında eklenecek.</p>
  </div>
);

export const App: React.FC = () => {
  const { setFirebaseUser, setUser, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setUser, setLoading, setInitialized]);

  return (
    <HashRouter>
      <Routes>
        {/* Public routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.LOGIN} replace />} />
        <Route path={ROUTES.REGISTER} element={<PlaceholderPage title="Kayıt Ol" />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<PlaceholderPage title="Şifremi Unuttum" />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Teacher routes */}
          <Route
            path={ROUTES.TEACHER.DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.SESSIONS}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Sessions />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.NEW_SESSION}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <NewSession />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.SESSION_DETAIL}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <SessionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.QUIZZES}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Quizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.NEW_QUIZ}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.QUIZ_EDIT}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TEACHER.QUIZ_RESULTS}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizSubmissions />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.TEACHER.REPORTS}
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Student routes */}
          <Route
            path={ROUTES.STUDENT.DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT.QUIZZES}
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentQuizList />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT.QUIZ_PLAYER}
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentQuizPlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT.QUIZ_RESULT}
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentQuizResult />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.STUDENT.RESULTS}
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentResults />
              </ProtectedRoute>
            }
          />
          {/* Admin routes */}
          <Route
            path={ROUTES.ADMIN.DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PlaceholderPage title="Yönetici Paneli" />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
};

export default App;
