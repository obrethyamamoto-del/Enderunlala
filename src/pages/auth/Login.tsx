import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, Users } from 'lucide-react';
import { auth, db } from '../../config/firebase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ROUTES } from '../../config/routes';
import { Button, Input } from '../../components/common';
import { seedUsers } from '../../seedUsers';
import type { AppUser } from '../../types';
import styles from './Login.module.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);
    const addToast = useUIStore((state) => state.addToast);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [error, setError] = useState('');

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            await seedUsers();
            addToast({ type: 'success', title: 'Test kullanıcıları oluşturuldu!' });
        } catch (err) {
            addToast({ type: 'error', title: 'Hata', message: 'Kullanıcılar oluşturulamadı' });
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Fetch user document from Firestore
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

            if (userDoc.exists()) {
                const userData = { id: userDoc.id, ...userDoc.data() } as AppUser;
                setUser(userData);

                addToast({
                    type: 'success',
                    title: 'Hoş geldiniz!',
                    message: `${userData.displayName} olarak giriş yaptınız.`,
                });

                // Redirect based on role
                const redirectPath = userData.role === 'teacher'
                    ? ROUTES.TEACHER.DASHBOARD
                    : userData.role === 'student'
                        ? ROUTES.STUDENT.DASHBOARD
                        : ROUTES.ADMIN.DASHBOARD;

                navigate(redirectPath, { replace: true });
            } else {
                setError('Kullanıcı bilgileri bulunamadı.');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('E-posta veya şifre hatalı.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.');
            } else {
                setError('Giriş yapılırken bir hata oluştu.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>🎓</div>
                    <h1 className={styles.title}>EnderunLala</h1>
                    <p className={styles.subtitle}>Eğitim platformuna hoş geldiniz</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorBanner}>{error}</div>
                    )}

                    <Input
                        type="email"
                        label="E-posta"
                        placeholder="ornek@okul.edu.tr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail size={18} />}
                        required
                        autoComplete="email"
                    />

                    <Input
                        type={showPassword ? 'text' : 'password'}
                        label="Şifre"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        leftIcon={<Lock size={18} />}
                        rightIcon={
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.eyeBtn}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        }
                        required
                        autoComplete="current-password"
                    />

                    <Link to={ROUTES.FORGOT_PASSWORD} className={styles.forgotLink}>
                        Şifremi unuttum
                    </Link>

                    <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                        Giriş Yap
                    </Button>
                </form>

                <div className={styles.footer}>
                    <p>
                        Hesabınız yok mu?{' '}
                        <Link to={ROUTES.REGISTER} className={styles.link}>
                            Kayıt olun
                        </Link>
                    </p>
                </div>

                {/* Development only - seed users */}
                <div className={styles.devSection}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSeed}
                        isLoading={isSeeding}
                        leftIcon={<Users size={16} />}
                    >
                        Test Kullanıcıları Oluştur
                    </Button>
                </div>
            </div>

            <div className={styles.decoration}>
                <div className={styles.circle1} />
                <div className={styles.circle2} />
                <div className={styles.circle3} />
            </div>
        </div>
    );
};

export default Login;
