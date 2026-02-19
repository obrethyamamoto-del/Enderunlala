import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    ChevronRight,
    FileText,
    ArrowLeft,
    XCircle,
    Info,
    Calendar,
    CheckCircle2,
    X,
    Check,
    School,
    BarChart3,
    User2,
    ClipboardList,
    BarChart2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getQuizzesByTeacher, getQuizSubmissions } from '../../services/quizService';
import { getAllStudents } from '../../services/userService';
import { Loader, Card, Button, Select } from '../../components/common';
import type { Teacher, AppUser } from '../../types';
import type { Quiz, QuizSubmission } from '../../types/quiz';
import styles from './Reports.module.css';
import { DataGenerator } from '../../components/dev/DataGenerator';

type ViewType = 'classes' | 'class_detail' | 'quiz_detail' | 'student_detail';

export const Reports: React.FC = () => {
    const user = useAuthStore((state) => state.user) as Teacher;
    const addToast = useUIStore((state) => state.addToast);

    // Navigation State
    const [view, setView] = useState<ViewType>('classes');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [activeClassFilter, setActiveClassFilter] = useState<string>('all');

    const [isLoading, setIsLoading] = useState(true);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<QuizSubmission[]>([]);
    const [students, setStudents] = useState<AppUser[]>([]);

    // Interaction State
    const [rankingOpen, setRankingOpen] = useState(true);
    const [analysisOpen, setAnalysisOpen] = useState(true);

    // Data Fetching
    const fetchData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [fetchedQuizzes, fetchedStudents] = await Promise.all([
                getQuizzesByTeacher(user.id),
                getAllStudents()
            ]);

            setQuizzes(fetchedQuizzes);
            setStudents(fetchedStudents);

            const relevantQuizIds = fetchedQuizzes
                .filter(q => q.status === 'published' || q.status === 'closed')
                .map(q => q.id);

            const submissionsPromises = relevantQuizIds.map(id => getQuizSubmissions(id));
            const submissionsResults = await Promise.all(submissionsPromises);

            const combinedSubmissions = submissionsResults.flat();
            setAllSubmissions(combinedSubmissions);

        } catch (error) {
            console.error('Error fetching reports data:', error);
            addToast({ type: 'error', title: 'Hata', message: 'Rapor verileri yüklenemedi.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, addToast]);

    // --- Helper Functions ---
    const getScoreColor = (score: number) => {
        if (score >= 85) return '#10B981';
        if (score >= 60) return '#F59E0B';
        return '#EF4444';
    };

    const formatDate = (date: Date | any) => {
        if (!date) return '-';
        const d = date instanceof Date ? date : date.toDate();
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    };

    // --- VIEW 1: CLASS LIST ---
    const classListParams = useMemo(() => {
        const classes = user?.assignedClasses || [];
        const derivedClasses = Array.from(new Set(quizzes.map(q => q.classId || 'Genel')));
        let classList = classes.length > 0 ? classes : derivedClasses;

        if (activeClassFilter !== 'all') {
            classList = classList.filter(c => c === activeClassFilter);
        }

        return classList.map(cls => {
            const normC = cls.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

            const classQuizzes = quizzes.filter(q => {
                const normQ = q.classId?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
                const isMatch = q.classId === cls || (normQ && normQ === normC);
                return isMatch && (q.status === 'published' || q.status === 'closed');
            });

            const classSubmissions = allSubmissions.filter(s => {
                const quiz = quizzes.find(q => q.id === s.quizId);
                const normQ = quiz?.classId?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
                return quiz?.classId === cls || (normQ && normQ === normC);
            });

            const avgScore = classSubmissions.length > 0
                ? Math.round(classSubmissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / classSubmissions.length)
                : 0;

            const studentCount = students.filter(s => {
                const sAny = s as any;
                const studentClass = sAny.classId || sAny.class || '';
                if (studentClass === cls) return true;
                const normS = studentClass.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                return normS && normS === normC;
            }).length;

            return {
                name: cls,
                quizCount: classQuizzes.length,
                submissionCount: classSubmissions.length,
                avgScore,
                studentCount
            };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [user, quizzes, allSubmissions, students, activeClassFilter]);

    const renderClassesView = () => (
        <div className={styles.animateFadeIn}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.greeting}>Merhaba, <span className={styles.teacherName}>{user?.displayName || 'Öğretmenim'}</span></h1>
                    <p className={styles.subtitle}>İşte bugünkü durumunuz ve son aktiviteleriniz.</p>
                </div>

                <div className={styles.contextBar}>
                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>KURUM SEÇİN</label>
                        <Select
                            options={[{ value: 'enderun', label: 'Enderun Koleji Merkez' }]}
                            value="enderun"
                            onChange={() => { }}
                            icon={<School size={18} />}
                        />
                    </div>

                    <div className={styles.contextItem}>
                        <label className={styles.contextLabel}>AKTİF SINIF</label>
                        <Select
                            options={[
                                { value: 'all', label: 'Tüm Sınıflar' },
                                ...(user?.assignedClasses?.map(cls => ({ value: cls, label: cls })) || [])
                            ]}
                            value={activeClassFilter}
                            onChange={(val) => setActiveClassFilter(val)}
                            placeholder="Sınıf Seçin"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.gridContainer}>
                {classListParams.map((cls, idx) => (
                    <div
                        key={idx}
                        className={styles.classCard}
                        onClick={() => { setSelectedClassId(cls.name); setView('class_detail'); }}
                    >
                        <div className={styles.classCardTop}>
                            <h3 className={styles.className}>{cls.name}</h3>
                            <div className={styles.cardIconBox}>
                                <Users size={20} />
                            </div>
                        </div>

                        <div className={styles.cardStatsRow}>
                            <div className={styles.statBlock}>
                                <div className={styles.statHead}>
                                    <BarChart3 size={14} />
                                    <span>GENEL ORT.</span>
                                </div>
                                <div className={styles.statValue}>
                                    <span className={styles.scoreBadge} style={{
                                        backgroundColor: `${getScoreColor(cls.avgScore)}15`,
                                        color: getScoreColor(cls.avgScore)
                                    }}>
                                        %{cls.avgScore}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statBlock}>
                                <div className={styles.statHead}>
                                    <User2 size={14} />
                                    <span>MEVCUT</span>
                                </div>
                                <div className={styles.statValue}>
                                    {cls.studentCount} Öğr.
                                </div>
                            </div>
                            <div className={styles.statBlock}>
                                <div className={styles.statHead}>
                                    <ClipboardList size={14} />
                                    <span>SINAV</span>
                                </div>
                                <div className={styles.statValue}>
                                    {cls.quizCount} Adet
                                </div>
                            </div>
                        </div>

                        <button className={styles.viewDetailsBtn}>
                            DETAYLARI GÖRÜNTÜLE
                        </button>
                    </div>
                ))}
            </div>

            {classListParams.length === 0 && (
                <div className={styles.emptyState}>
                    <p>Henüz atanmış bir sınıfınız veya sınavınız bulunmuyor.</p>
                </div>
            )}

            <div style={{ marginTop: '40px' }}>
                <DataGenerator onDataGenerated={fetchData} />
            </div>
        </div>
    );

    // --- VIEW 2: CLASS DETAIL (QUIZ LIST) ---
    const classDetailParams = useMemo(() => {
        if (!selectedClassId) return null;

        const classQuizzes = quizzes.filter(q => {
            if (q.status !== 'published' && q.status !== 'closed') return false;
            const normQ = q.classId?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
            const normS = selectedClassId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

            if (q.classId === selectedClassId || (normQ && normQ === normS)) return true;

            const hasSubmissionFromClass = allSubmissions.some(s =>
                s.quizId === q.id &&
                (students.find(st => st.id === s.studentId) as any)?.classId === selectedClassId
            );
            return hasSubmissionFromClass;
        }).map(quiz => {
            const subs = allSubmissions.filter(s => s.quizId === quiz.id);
            const avg = subs.length > 0
                ? Math.round(subs.reduce((acc, s) => acc + (s.percentage || 0), 0) / subs.length)
                : 0;

            return {
                ...quiz,
                avgScore: avg,
                submissionCount: subs.length
            };
        });

        const overallAvg = classQuizzes.length > 0
            ? Math.round(classQuizzes.reduce((acc, q) => acc + q.avgScore, 0) / classQuizzes.length)
            : 0;

        return {
            className: selectedClassId,
            quizzes: classQuizzes,
            overallAvg,
            totalSubmissions: classQuizzes.reduce((acc, q) => acc + q.submissionCount, 0)
        };
    }, [selectedClassId, quizzes, allSubmissions, students]);

    const renderClassDetailView = () => {
        if (!classDetailParams) return null;

        return (
            <div className={styles.animateFadeIn}>
                <div className={styles.breadcrumb}>
                    <Button variant="ghost" size="sm" onClick={() => setView('classes')} leftIcon={<ArrowLeft size={16} />}>
                        Sınıflara Dön
                    </Button>
                </div>

                <div className={styles.detailHeader}>
                    <div>
                        <h1 className={styles.detailTitle}>{classDetailParams.className} Sınıfı</h1>
                        <p className={styles.detailSubtitle}>Sınav bazlı performans analizi</p>
                    </div>
                    <div className={styles.headerStats}>
                        <div className={styles.headerStatItem}>
                            <span className={styles.hLabel}>Genel Başarı</span>
                            <span className={styles.hValue} style={{ color: getScoreColor(classDetailParams.overallAvg) }}>
                                %{classDetailParams.overallAvg}
                            </span>
                        </div>
                        <div className={styles.headerStatItem}>
                            <span className={styles.hLabel}>Toplam Sınav</span>
                            <span className={styles.hValue}>{classDetailParams.quizzes.length}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.quizList}>
                    {classDetailParams.quizzes.length > 0 ? (
                        classDetailParams.quizzes.map(quiz => (
                            <div
                                key={quiz.id}
                                className={styles.quizCard}
                                onClick={() => { setSelectedQuizId(quiz.id); setView('quiz_detail'); }}
                            >
                                <div className={styles.quizIcon}>
                                    <FileText size={24} />
                                </div>
                                <div className={styles.quizContent}>
                                    <div className={styles.quizMainInfo}>
                                        <h3 className={styles.quizTitle}>
                                            {quiz.title.includes('-') ? quiz.title.split('-').slice(1).join('-').trim() : quiz.title}
                                        </h3>
                                        <span className={styles.quizDate}>
                                            <Calendar size={14} />
                                            {formatDate(quiz.createdAt)}
                                        </span>
                                    </div>
                                    <div className={styles.quizMeta}>
                                        <span className={styles.tag}>{quiz.subject}</span>
                                    </div>
                                </div>

                                <div className={styles.quizStats}>
                                    <div className={styles.qStat}>
                                        <span className={styles.qLabel}>Katılım</span>
                                        <span className={styles.qValue}>{quiz.submissionCount}</span>
                                    </div>
                                    <div className={styles.qStat}>
                                        <span className={styles.qLabel}>Ortalama</span>
                                        <div className={styles.scoreBadge} style={{
                                            backgroundColor: `${getScoreColor(quiz.avgScore)}15`,
                                            color: getScoreColor(quiz.avgScore)
                                        }}>
                                            %{quiz.avgScore}
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className={styles.arrow} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Bu sınıfa ait yayınlanmış sınav bulunamadı.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- VIEW 3: QUIZ DETAIL ---
    const quizDetailParams = useMemo(() => {
        if (!selectedQuizId) return null;
        const quiz = quizzes.find(q => q.id === selectedQuizId);
        const subs = allSubmissions.filter(s => s.quizId === selectedQuizId);

        if (!quiz) return null;

        const avgScore = subs.length > 0
            ? Math.round(subs.reduce((acc, s) => acc + (s.percentage || 0), 0) / subs.length)
            : 0;

        const studentList = subs.map(sub => {
            const student = students.find(s => s.id === sub.studentId);
            return {
                submission: sub,
                studentName: student?.displayName || 'Bilinmeyen Öğrenci',
                score: sub.percentage || 0
            };
        }).sort((a, b) => b.score - a.score);

        const questionAnalysis = quiz.questions.map((q, idx) => {
            let correctCount = 0;
            subs.forEach(s => {
                const ans = s.answers.find(a => a.questionId === q.id);
                if (ans?.isCorrect) correctCount++;
            });
            return {
                ...q,
                index: idx + 1,
                correctPercentage: subs.length > 0 ? Math.round((correctCount / subs.length) * 100) : 0
            };
        });

        const lowPerformanceParams = questionAnalysis.filter(q => q.correctPercentage < 50);

        return {
            quiz,
            avgScore,
            participation: subs.length,
            studentList,
            questionAnalysis,
            lowPerformanceParams
        };
    }, [selectedQuizId, quizzes, allSubmissions, students]);

    const renderQuizDetailView = () => {
        if (!quizDetailParams) return null;
        const { quiz, avgScore, studentList, questionAnalysis, lowPerformanceParams } = quizDetailParams;

        return (
            <div className={styles.animateFadeIn}>
                <div className={styles.breadcrumb}>
                    <Button variant="ghost" size="sm" onClick={() => setView('class_detail')} leftIcon={<ArrowLeft size={16} />}>
                        {selectedClassId} Sınavlarına Dön
                    </Button>
                </div>

                <div className={styles.detailHeader}>
                    <div>
                        <div className={styles.tagRow}>
                            <span className={styles.tag}>{quiz.subject}</span>
                            <span className={styles.dateTag}>{formatDate(quiz.createdAt)}</span>
                        </div>
                        <h1 className={styles.detailTitle}>
                            {quiz.title.includes('-') ? quiz.title.split('-').slice(1).join('-').trim() : quiz.title}
                        </h1>
                    </div>

                    <div className={styles.examScoreBig} style={{ color: getScoreColor(avgScore) }}>
                        <div className={styles.scoreCircle}>
                            %{avgScore}
                        </div>
                        <span>Sınıf Ortalaması</span>
                    </div>
                </div>

                <div className={styles.reportGrid}>
                    <div className={styles.colLeft}>
                        <Card className={styles.sectionCard}>
                            <div className={`${styles.cardHeader} ${styles.collapsibleHeader}`} onClick={() => setRankingOpen(!rankingOpen)}>
                                <div className={styles.headerLeft}>
                                    <Users size={20} />
                                    <h3>Öğrenci Sıralaması</h3>
                                </div>
                                <ChevronRight size={20} style={{ transform: rankingOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </div>
                            <div className={`${styles.collapsibleContent} ${rankingOpen ? styles.open : ''}`}>
                                <div className={styles.studentTable}>
                                    <div className={styles.tableHead}>
                                        <span>Öğrenci</span>
                                        <span>Puan</span>
                                        <span>Detay</span>
                                    </div>
                                    <div className={styles.tableBody}>
                                        {studentList.map((item, i) => (
                                            <div
                                                key={i}
                                                className={styles.tableRow}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => { setSelectedSubmissionId(item.submission.id); setView('student_detail'); }}
                                            >
                                                <div className={styles.stName}>
                                                    <div className={styles.avatar}>{item.studentName.charAt(0)}</div>
                                                    {item.studentName}
                                                </div>
                                                <div className={styles.stScore} style={{ color: getScoreColor(item.score) }}>
                                                    {item.score}
                                                </div>
                                                <div className={styles.stDetail}>
                                                    <ChevronRight size={16} color="#94a3b8" />
                                                </div>
                                            </div>
                                        ))}
                                        {studentList.length === 0 && (
                                            <div className={styles.emptyTable}>Henüz katılım yok.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className={styles.colRight}>
                        <Card className={styles.sectionCard}>
                            <div className={`${styles.cardHeader} ${styles.collapsibleHeader}`} onClick={() => setAnalysisOpen(!analysisOpen)}>
                                <div className={styles.headerLeft}>
                                    <BarChart2 size={20} />
                                    <h3>Soru Analizi</h3>
                                </div>
                                <ChevronRight size={20} style={{ transform: analysisOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </div>
                            <div className={`${styles.collapsibleContent} ${analysisOpen ? styles.open : ''}`}>

                                {lowPerformanceParams.length > 0 && (
                                    <div className={styles.warningBox}>
                                        <Info size={16} />
                                        <span>
                                            <strong>{lowPerformanceParams.length} soru</strong> sınıf genelinde %50'nin altında başarı aldı.
                                        </span>
                                    </div>
                                )}

                                <div className={styles.questionGrid}>
                                    {questionAnalysis.map((q) => (
                                        <div key={q.id} className={styles.qStatItem}>
                                            <div className={styles.qTop}>
                                                <span className={styles.qIdx}>Soru {q.index}</span>
                                                <span className={styles.qPrc} style={{ color: getScoreColor(q.correctPercentage) }}>%{q.correctPercentage}</span>
                                            </div>
                                            <div className={styles.qProg}>
                                                <div
                                                    className={styles.qFill}
                                                    style={{ width: `${q.correctPercentage}%`, backgroundColor: getScoreColor(q.correctPercentage) }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    };

    // --- VIEW 4: STUDENT DETAIL ---
    const studentDetailParams = useMemo(() => {
        if (!selectedSubmissionId || !selectedQuizId) return null;
        const submission = allSubmissions.find(s => s.id === selectedSubmissionId);
        const quiz = quizzes.find(q => q.id === selectedQuizId);
        const student = students.find(s => s.id === submission?.studentId);
        if (!submission || !quiz || !student) return null;
        return { quiz, submission, student };
    }, [selectedSubmissionId, selectedQuizId, allSubmissions, quizzes, students]);

    const renderStudentDetailView = () => {
        if (!studentDetailParams) return null;
        const { quiz, submission, student } = studentDetailParams;

        return (
            <div className={styles.animateFadeIn}>
                <div className={styles.breadcrumb}>
                    <Button variant="ghost" size="sm" onClick={() => setView('quiz_detail')} leftIcon={<ArrowLeft size={16} />}>
                        Genel Sonuçlara Dön
                    </Button>
                </div>

                <div className={styles.detailHeader}>
                    <div>
                        <h1 className={styles.detailTitle}>{student.displayName}</h1>
                        <p className={styles.detailSubtitle}>
                            {quiz.title.includes('-') ? quiz.title.split('-').slice(1).join('-').trim() : quiz.title}
                        </p>
                    </div>
                    <div className={styles.examScoreBig} style={{ color: getScoreColor(submission.percentage || 0) }}>
                        <div className={styles.scoreCircle}>
                            %{submission.percentage}
                        </div>
                        <span>Öğrenci Puanı</span>
                    </div>
                </div>

                <div className={styles.questionsContainer}>
                    {quiz.questions.map((q, idx) => {
                        const answer = submission.answers.find(a => a.questionId === q.id);
                        const isCorrect = answer?.isCorrect;

                        return (
                            <Card key={q.id} className={`${styles.questionResultCard} ${isCorrect ? styles.correctCard : styles.incorrectCard}`}>
                                <div className={styles.qResultHeader}>
                                    <span className={styles.qNumber}>Soru {idx + 1}</span>
                                    {isCorrect ? (
                                        <span className={styles.statusCorrect}><CheckCircle2 size={16} /> Doğru</span>
                                    ) : (
                                        <span className={styles.statusIncorrect}><XCircle size={16} /> Yanlış</span>
                                    )}
                                </div>
                                <div className={styles.qText}>{q.question}</div>

                                <div className={styles.optionsList}>
                                    {q.type === 'multiple_choice' && (q as any).options.map((opt: any) => {
                                        const isSelected = answer?.selectedOptionIds?.includes(opt.id);
                                        const isCorrectOpt = opt.isCorrect;

                                        let optionClass = styles.optionItem;
                                        if (isSelected && isCorrectOpt) optionClass += ` ${styles.optCorrectSelected}`;
                                        else if (isSelected && !isCorrectOpt) optionClass += ` ${styles.optWrongSelected}`;
                                        else if (!isSelected && isCorrectOpt) optionClass += ` ${styles.optCorrectMissed}`;

                                        return (
                                            <div key={opt.id} className={optionClass}>
                                                <div className={styles.optMarker}>
                                                    {isSelected && isCorrectOpt && <Check size={14} />}
                                                    {isSelected && !isCorrectOpt && <X size={14} />}
                                                    {!isSelected && isCorrectOpt && <Check size={14} />}
                                                </div>
                                                {opt.text}
                                            </div>
                                        );
                                    })}

                                    {q.type === 'true_false' && (
                                        <div className={styles.booleanResult}>
                                            <div className={`${styles.optionItem} ${answer?.booleanAnswer === true ? (isCorrect ? styles.optCorrectSelected : styles.optWrongSelected) : ((q as any).correctAnswer === true ? styles.optCorrectMissed : '')}`}>
                                                Doğru
                                            </div>
                                            <div className={`${styles.optionItem} ${answer?.booleanAnswer === false ? (isCorrect ? styles.optCorrectSelected : styles.optWrongSelected) : ((q as any).correctAnswer === false ? styles.optCorrectMissed : '')}`}>
                                                Yanlış
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (isLoading) return <div className={styles.page}><div className={styles.loadingState}><Loader size="lg" /></div></div>;

    return (
        <div className={styles.page}>
            {view === 'classes' && renderClassesView()}
            {view === 'class_detail' && renderClassDetailView()}
            {view === 'quiz_detail' && renderQuizDetailView()}
            {view === 'student_detail' && renderStudentDetailView()}
        </div>
    );
};

export default Reports;
