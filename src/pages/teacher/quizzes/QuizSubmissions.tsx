import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, getQuizSubmissions } from '../../../services/quizService';
import { getUser } from '../../../services/userService';
import { Button, Loader, Card } from '../../../components/common';
import { ArrowLeft, User, Calendar, Clock, BarChart2, ChevronRight, CheckCircle, Clock3 } from 'lucide-react';
import styles from './QuizSubmissions.module.css';
import type { Quiz, QuizSubmission } from '../../../types/quiz';
import type { User as UserType } from '../../../types/user';

export const QuizSubmissions: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
    const [students, setStudents] = useState<Record<string, UserType>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [quizData, subsData] = await Promise.all([
                    getQuiz(id),
                    getQuizSubmissions(id)
                ]);

                if (quizData) setQuiz(quizData);
                setSubmissions(subsData);

                // Fetch student names
                const studentIds = Array.from(new Set(subsData.map(s => s.studentId)));
                const studentMap: Record<string, UserType> = {};

                await Promise.all(studentIds.map(async (sId) => {
                    const studentUser = await getUser(sId);
                    if (studentUser) studentMap[sId] = studentUser;
                }));

                setStudents(studentMap);
            } catch (err) {
                console.error('Failed to fetch submissions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const formatDate = (date?: Date) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Loader size="lg" />
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className={styles.errorState}>
                <h2>Sınav bulunamadı.</h2>
                <Button onClick={() => navigate(-1)}>Geri Dön</Button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ArrowLeft size={18} />}
                        onClick={() => navigate(-1)}
                    >
                        Geri
                    </Button>
                    <div>
                        <h1 className={styles.title}>{quiz.title} - Sonuçlar</h1>
                        <p className={styles.subtitle}>Öğrenci katılımları ve puanlamaları</p>
                    </div>
                </div>

                <div className={styles.quizStats}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Katılım</span>
                        <span className={styles.statValue}>{submissions.length}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Ort. Puan</span>
                        <span className={styles.statValue}>
                            {submissions.length > 0
                                ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length)
                                : 0}%
                        </span>
                    </div>
                </div>

                {submissions.length === 0 ? (
                    <Card className={styles.emptyState}>
                        <BarChart2 size={48} color="#94a3b8" />
                        <h3>Henüz katılım yok</h3>
                        <p>Öğrencileriniz sınavı tamamladığında sonuçlar burada görünecektir.</p>
                    </Card>
                ) : (
                    <div className={styles.list}>
                        {submissions.map((sub) => {
                            const student = students[sub.studentId];
                            const isGraded = sub.status === 'graded';

                            return (
                                <div key={sub.id} className={styles.item} onClick={() => navigate(`/teacher/quizzes/${quiz.id}/submissions/${sub.id}`)}>
                                    <div className={styles.itemMain}>
                                        <div className={styles.avatar}>
                                            <User size={24} />
                                        </div>
                                        <div className={styles.info}>
                                            <h4 className={styles.studentName}>{student?.displayName || 'Bilinmeyen Öğrenci'}</h4>
                                            <div className={styles.meta}>
                                                <span className={styles.metaItem}>
                                                    <Calendar size={14} />
                                                    {formatDate(sub.submittedAt)}
                                                </span>
                                                <span className={styles.metaItem}>
                                                    <Clock size={14} />
                                                    {Math.floor((sub.duration || 0) / 60)} dk {(sub.duration || 0) % 60} sn
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.results}>
                                        <div className={styles.status}>
                                            {isGraded ? (
                                                <span className={styles.badgeGraded}>
                                                    <CheckCircle size={14} /> Puanlandı
                                                </span>
                                            ) : (
                                                <span className={styles.badgePending}>
                                                    <Clock3 size={14} /> Bekliyor
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.score}>
                                            <span className={styles.scoreValue}>{sub.score} / {sub.totalPoints}</span>
                                            <div className={styles.percentageBar}>
                                                <div
                                                    className={styles.percentageFill}
                                                    style={{ width: `${sub.percentage}%`, backgroundColor: sub.percentage && sub.percentage >= 60 ? '#22c55e' : '#f59e0b' }}
                                                />
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className={styles.arrow} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
