import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    GraduationCap,
    ChevronRight,
    TrendingUp,
    Award,
    FileText,
    Search,
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    XCircle,
    Info,
    BarChart2,
    Layers
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getQuizzesByTeacher, getQuizSubmissions, getQuiz } from '../../services/quizService';
import { getAllStudents } from '../../services/userService';
import { Loader, Input, Card, Button } from '../../components/common';
import type { Teacher, AppUser } from '../../types';
import type { Quiz, QuizSubmission } from '../../types/quiz';
import styles from './Reports.module.css';

type TabType = 'classes' | 'students' | 'subjects';
type ViewType = 'main' | 'class_detail' | 'quiz_detail';

export const Reports: React.FC = () => {
    const user = useAuthStore((state) => state.user) as Teacher;
    const addToast = useUIStore((state) => state.addToast);

    // Navigation State
    const [view, setView] = useState<ViewType>('main');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<QuizSubmission[]>([]);
    const [students, setStudents] = useState<AppUser[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('classes');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                const [fetchedQuizzes, fetchedStudents] = await Promise.all([
                    getQuizzesByTeacher(user.id),
                    getAllStudents()
                ]);

                setQuizzes(fetchedQuizzes);
                setStudents(fetchedStudents);

                const publishedQuizIds = fetchedQuizzes
                    .filter(q => q.status === 'published')
                    .map(q => q.id);

                const submissionsPromises = publishedQuizIds.map(id => getQuizSubmissions(id));
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

        fetchData();
    }, [user, addToast]);

    // --- Statistics Aggregation ---

    const stats = useMemo(() => {
        const totalQuizzes = quizzes.filter(q => q.status === 'published').length;
        const totalSubmissions = allSubmissions.length;

        const avgSuccess = totalSubmissions > 0
            ? Math.round(allSubmissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / totalSubmissions)
            : 0;

        const classStats: Record<string, { totalScore: number, count: number }> = {};
        allSubmissions.forEach(sub => {
            const quiz = quizzes.find(q => q.id === sub.quizId);
            const className = quiz?.classId || 'Genel';
            if (!classStats[className]) classStats[className] = { totalScore: 0, count: 0 };
            classStats[className].totalScore += (sub.percentage || 0);
            classStats[className].count += 1;
        });

        let topClass = '-';
        let maxAvg = -1;
        Object.entries(classStats).forEach(([className, data]) => {
            const avg = data.totalScore / data.count;
            if (avg > maxAvg) {
                maxAvg = avg;
                topClass = className;
            }
        });

        return [
            { label: 'Toplam Sınav', value: totalQuizzes.toString(), icon: <FileText size={24} />, color: 'primary' },
            { label: 'Ortalama Başarı', value: `%${avgSuccess}`, icon: <TrendingUp size={24} />, color: 'success' },
            { label: 'En Başarılı Sınıf', value: topClass, icon: <Award size={24} />, color: 'accent' },
            { label: 'Toplam Katılım', value: totalSubmissions.toString(), icon: <Users size={24} />, color: 'warning' }
        ];
    }, [quizzes, allSubmissions]);

    // --- Detail Data Logics ---

    const classReports = useMemo(() => {
        const reportMap: Record<string, { name: string, avgScore: number, totalSubmissions: number, quizCount: number }> = {};
        (user?.assignedClasses || []).forEach(cls => {
            reportMap[cls] = { name: cls, avgScore: 0, totalSubmissions: 0, quizCount: 0 };
        });
        allSubmissions.forEach(sub => {
            const quiz = quizzes.find(q => q.id === sub.quizId);
            const className = quiz?.classId || 'Genel';
            if (!reportMap[className]) reportMap[className] = { name: className, avgScore: 0, totalSubmissions: 0, quizCount: 0 };
            reportMap[className].avgScore += (sub.percentage || 0);
            reportMap[className].totalSubmissions += 1;
        });
        Object.keys(reportMap).forEach(key => {
            const item = reportMap[key];
            if (item.totalSubmissions > 0) item.avgScore = Math.round(item.avgScore / item.totalSubmissions);
            item.quizCount = quizzes.filter(q => q.classId === key && q.status === 'published').length;
        });
        return Object.values(reportMap).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => b.avgScore - a.avgScore);
    }, [allSubmissions, quizzes, user, searchTerm]);

    const studentReports = useMemo(() => {
        const reportMap: Record<string, { id: string, name: string, avgScore: number, totalSubmissions: number }> = {};
        allSubmissions.forEach(sub => {
            const studentId = sub.studentId;
            if (!reportMap[studentId]) {
                const student = students.find(s => s.id === studentId);
                reportMap[studentId] = { id: studentId, name: student?.displayName || 'Bilinmeyen Öğrenci', avgScore: 0, totalSubmissions: 0 };
            }
            reportMap[studentId].avgScore += (sub.percentage || 0);
            reportMap[studentId].totalSubmissions += 1;
        });
        return Object.values(reportMap).map(item => ({ ...item, avgScore: item.totalSubmissions > 0 ? Math.round(item.avgScore / item.totalSubmissions) : 0 })).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => b.avgScore - a.avgScore);
    }, [allSubmissions, students, searchTerm]);

    const subjectReports = useMemo(() => {
        const reportMap: Record<string, { name: string, avgScore: number, totalSubmissions: number, quizCount: number }> = {};
        allSubmissions.forEach(sub => {
            const quiz = quizzes.find(q => q.id === sub.quizId);
            const subject = quiz?.subject || (quiz?.title.includes('-') ? quiz?.title.split('-')[0].trim() : 'Genel');
            if (!reportMap[subject!]) reportMap[subject!] = { name: subject!, avgScore: 0, totalSubmissions: 0, quizCount: 0 };
            reportMap[subject!].avgScore += (sub.percentage || 0);
            reportMap[subject!].totalSubmissions += 1;
        });
        Object.keys(reportMap).forEach(key => {
            const item = reportMap[key];
            if (item.totalSubmissions > 0) item.avgScore = Math.round(item.avgScore / item.totalSubmissions);
            item.quizCount = new Set(quizzes.filter(q => (q.subject === key || (q.title.includes('-') && q.title.split('-')[0].trim() === key)) && q.status === 'published').map(q => q.id)).size;
        });
        return Object.values(reportMap).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => b.avgScore - a.avgScore);
    }, [allSubmissions, quizzes, searchTerm]);

    const quizzesInClass = useMemo(() => {
        if (!selectedClassId) return [];
        return quizzes.filter(q => q.classId === selectedClassId && q.status === 'published').map(quiz => {
            const subs = allSubmissions.filter(s => s.quizId === quiz.id);
            const avg = subs.length > 0 ? Math.round(subs.reduce((acc, s) => acc + (s.percentage || 0), 0) / subs.length) : 0;
            return { ...quiz, avgScore: avg, submissionCount: subs.length };
        });
    }, [quizzes, allSubmissions, selectedClassId]);

    const quizDetailStats = useMemo(() => {
        if (!selectedQuizId) return null;
        const quiz = quizzes.find(q => q.id === selectedQuizId);
        const subs = allSubmissions.filter(s => s.quizId === selectedQuizId);
        if (!quiz || subs.length === 0) return { quiz, submissions: subs, questionAnalysis: [] };

        const questionAnalysis = quiz.questions.map(question => {
            let correctCount = 0;
            subs.forEach(sub => {
                const answer = sub.answers.find(a => a.questionId === question.id);
                if (answer?.isCorrect) correctCount++;
            });
            return {
                id: question.id,
                text: question.text,
                correctPercentage: Math.round((correctCount / subs.length) * 100),
                total: subs.length,
                correct: correctCount
            };
        });

        return { quiz, submissions: subs, questionAnalysis };
    }, [quizzes, allSubmissions, selectedQuizId]);

    // --- Render Helpers ---

    const getScoreColor = (score: number) => {
        if (score >= 85) return '#10B981';
        if (score >= 60) return '#F59E0B';
        return '#EF4444';
    };

    if (isLoading) return <div className={styles.page}><div className={styles.loadingState}><Loader size="lg" /></div></div>;

    // --- Main Dashboard View ---
    const renderMainView = () => (
        <>
            <div className={styles.statsGrid}>
                {stats.map((stat, index) => (
                    <div key={index} className={`${styles.statCard} ${styles[stat.color]}`}>
                        <div className={styles.statIconWrapper}>{stat.icon}</div>
                        <div className={styles.statInfo}><span className={styles.statValue}>{stat.value}</span><span className={styles.statLabel}>{stat.label}</span></div>
                        <div className={styles.statBgIcon}>{stat.icon}</div>
                    </div>
                ))}
            </div>

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${activeTab === 'classes' ? styles.active : ''}`} onClick={() => setActiveTab('classes')}>Sınıf Bazlı Analiz</button>
                <button className={`${styles.tab} ${activeTab === 'subjects' ? styles.active : ''}`} onClick={() => setActiveTab('subjects')}>Branş Başarısı</button>
                <button className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`} onClick={() => setActiveTab('students')}>Genel Öğrenci Listesi</button>
            </div>

            <div style={{ marginBottom: '24px', maxWidth: '400px' }}><Input placeholder="Arama yapın..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search size={18} />} /></div>

            <div className={styles.listContainer}>
                {activeTab === 'classes' && classReports.map((report, idx) => (
                    <div key={idx} className={styles.reportItem} onClick={() => { setSelectedClassId(report.name); setView('class_detail'); setSearchTerm(''); }}>
                        <div className={styles.itemIcon}><GraduationCap size={24} /></div>
                        <div className={styles.itemMain}>
                            <h3 className={styles.itemName}>{report.name}</h3>
                            <div className={styles.itemMeta}><span>{report.quizCount} Aktif Sınav</span><span>•</span><span>{report.totalSubmissions} Katılım</span></div>
                        </div>
                        <div className={styles.scoreWrapper}>
                            <div className={styles.scoreValue}>%{report.avgScore} Başarı</div>
                            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${report.avgScore}%`, backgroundColor: getScoreColor(report.avgScore) }} /></div>
                        </div>
                        <ChevronRight size={20} className={styles.itemArrow} />
                    </div>
                ))}

                {activeTab === 'subjects' && subjectReports.map((report, idx) => (
                    <div key={idx} className={styles.reportItem}>
                        <div className={styles.itemIcon}><Layers size={24} /></div>
                        <div className={styles.itemMain}>
                            <h3 className={styles.itemName}>{report.name}</h3>
                            <div className={styles.itemMeta}><span>{report.quizCount} Branş Sınavı</span><span>•</span><span>{report.totalSubmissions} Toplam Çözüm</span></div>
                        </div>
                        <div className={styles.scoreWrapper}>
                            <div className={styles.scoreValue}>%{report.avgScore} Ortalama</div>
                            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${report.avgScore}%`, backgroundColor: getScoreColor(report.avgScore) }} /></div>
                        </div>
                        <ChevronRight size={20} className={styles.itemArrow} />
                    </div>
                ))}

                {activeTab === 'students' && studentReports.map((report) => (
                    <div key={report.id} className={styles.reportItem}>
                        <div className={styles.itemIcon}><Users size={24} /></div>
                        <div className={styles.itemMain}>
                            <h3 className={styles.itemName}>{report.name}</h3>
                            <div className={styles.itemMeta}><span>{report.totalSubmissions} Tamamlanan Sınav</span></div>
                        </div>
                        <div className={styles.scoreWrapper}>
                            <div className={styles.scoreValue}>%{report.avgScore} Başarı</div>
                            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${report.avgScore}%`, backgroundColor: getScoreColor(report.avgScore) }} /></div>
                        </div>
                        <ChevronRight size={20} className={styles.itemArrow} />
                    </div>
                ))}
            </div>
        </>
    );

    // --- Class Detail View (Quizzes in Class) ---
    const renderClassDetailView = () => (
        <div className={styles.detailView}>
            <div className={styles.viewHeader}>
                <Button variant="ghost" leftIcon={<ArrowLeft size={18} />} onClick={() => setView('main')}>Sınıflara Dön</Button>
                <div className={styles.viewHeaderText}>
                    <h2 className={styles.viewTitle}>{selectedClassId} Sınıfı Analizi</h2>
                    <p className={styles.viewSubtitle}>Bu sınıfa ait yayınlanmış sınavlar ve genel performans.</p>
                </div>
            </div>

            <div className={styles.listContainer}>
                {quizzesInClass.length > 0 ? quizzesInClass.map(quiz => (
                    <div key={quiz.id} className={styles.reportItem} onClick={() => { setSelectedQuizId(quiz.id); setView('quiz_detail'); }}>
                        <div className={styles.itemIcon}><BookOpen size={24} /></div>
                        <div className={styles.itemMain}>
                            <h3 className={styles.itemName}>{quiz.title.includes('-') ? quiz.title.split('-').slice(1).join('-').trim() : quiz.title}</h3>
                            <div className={styles.itemMeta}><span>{quiz.subject}</span><span>•</span><span>{quiz.submissionCount} Öğrenci Çözdü</span></div>
                        </div>
                        <div className={styles.scoreWrapper}>
                            <div className={styles.scoreValue}>%{quiz.avgScore} Sınıf Ort.</div>
                            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${quiz.avgScore}%`, backgroundColor: getScoreColor(quiz.avgScore) }} /></div>
                        </div>
                        <ChevronRight size={20} className={styles.itemArrow} />
                    </div>
                )) : (
                    <div className={styles.emptyState}><p>Bu sınıfa henüz bir sınav atanmamış.</p></div>
                )}
            </div>
        </div>
    );

    // --- Quiz Detail View (Question Analysis & Student List) ---
    const renderQuizDetailView = () => {
        if (!quizDetailStats) return null;
        const { quiz, submissions, questionAnalysis } = quizDetailStats;

        const avgPercentage = submissions.length > 0
            ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length)
            : 0;

        const lowPerformanceQuestions = questionAnalysis.filter(q => q.correctPercentage < 60);

        return (
            <div className={styles.detailView}>
                <div className={styles.viewHeader}>
                    <Button variant="ghost" leftIcon={<ArrowLeft size={18} />} onClick={() => setView('class_detail')}>Sınavlara Dön</Button>
                    <div className={styles.viewHeaderText}>
                        <h2 className={styles.viewTitle}>{quiz?.title} - Detaylı Analiz</h2>
                        <p className={styles.viewSubtitle}>{selectedClassId} sınıfının bu sınavdaki performansı.</p>
                    </div>
                </div>

                <div className={styles.summaryRow}>
                    <Card className={styles.summaryMiniCard}>
                        <div className={styles.miniLabel}>Sınıf Ortalaması</div>
                        <div className={styles.miniValue} style={{ color: getScoreColor(avgPercentage) }}>%{avgPercentage}</div>
                    </Card>
                    <Card className={styles.summaryMiniCard}>
                        <div className={styles.miniLabel}>Katılım Oranı</div>
                        <div className={styles.miniValue}>%{Math.round((submissions.length / students.filter(s => s.role === 'student').length) * 100)}</div>
                    </Card>
                    <Card className={styles.summaryMiniCard}>
                        <div className={styles.miniLabel}>Kritik Soru Sayısı</div>
                        <div className={styles.miniValue} style={{ color: lowPerformanceQuestions.length > 0 ? '#EF4444' : '#10B981' }}>{lowPerformanceQuestions.length}</div>
                    </Card>
                </div>

                <Card className={styles.assessmentCard}>
                    <div className={styles.cardHeader}>
                        <Info size={18} />
                        <h3>Genel Değerlendirme</h3>
                    </div>
                    <div className={styles.assessmentContent}>
                        <p>
                            Bu sınavda sınıf genelinde <strong>%{avgPercentage}</strong> başarı elde edilmiştir.
                            {avgPercentage >= 80
                                ? " Sınıfın konu hakimiyeti oldukça yüksektir. Tebrikler!"
                                : avgPercentage >= 60
                                    ? " Sınıf ortalama bir performans sergilemiştir, eksik kalınan noktalar üzerinde durulabilir."
                                    : " Sınıf genelinde konuyla ilgili ciddi anlamda eksikler bulunmaktadır. Tekrar yapılması önerilir."}
                        </p>
                        {lowPerformanceQuestions.length > 0 && (
                            <div className={styles.insightBox}>
                                <strong>Dikkat Edilmesi Gereken Sorular:</strong>
                                <span> {lowPerformanceQuestions.map((_, i) => `${i + 1}.`).join(', ')} numaralı sorularda başarı oranı düşük kalmıştır.</span>
                            </div>
                        )}
                    </div>
                </Card>

                <div className={styles.analysisGrid}>
                    {/* Question Analysis */}
                    <Card className={styles.analysisCard}>
                        <div className={styles.cardHeader}><BarChart2 size={18} /> <h3>Soru Analizi</h3></div>
                        <div className={styles.questionList}>
                            {questionAnalysis.map((q, idx) => (
                                <div key={q.id} className={styles.questionStatItem}>
                                    <div className={styles.qHeader}>
                                        <span className={styles.qIndex}>{idx + 1}. Soru</span>
                                        <span className={styles.qPercent}>%{q.correctPercentage} Doğru</span>
                                    </div>
                                    <div className={styles.qText}>{q.text}</div>
                                    <div className={styles.qBar}><div className={styles.qFill} style={{ width: `${q.correctPercentage}%`, backgroundColor: getScoreColor(q.correctPercentage) }} /></div>
                                    {q.correctPercentage < 40 && <div className={styles.qWarning}><XCircle size={14} /> Bu soru sınıfın çoğunluğu tarafından yanlış yapılmış. Sınıf içerisinde bu sorunun çözümünü tekrar anlatmanız faydalı olabilir.</div>}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Student List in this Quiz */}
                    <Card className={styles.analysisCard}>
                        <div className={styles.cardHeader}><Users size={18} /> <h3>Öğrenci Performansları</h3></div>
                        <div className={styles.studentSubList}>
                            {submissions.map(sub => {
                                const student = students.find(s => s.id === sub.studentId);
                                return (
                                    <div key={sub.id} className={styles.studentSubItem}>
                                        <div className={styles.sInfo}>
                                            <span className={styles.sName}>{student?.displayName || 'Bilinmeyen Öğrenci'}</span>
                                            <span className={styles.sScore}>%{sub.percentage}</span>
                                        </div>
                                        <div className={styles.sBar}><div className={styles.sFill} style={{ width: `${sub.percentage}%`, backgroundColor: getScoreColor(sub.percentage || 0) }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.greeting}>Akademik Raporlar ve Analizler</h1>
                    <p className={styles.subtitle}>Sınav performansı, branş başarısı ve öğrenci gelişim istatistikleri.</p>
                </div>
            </div>

            {view === 'main' && renderMainView()}
            {view === 'class_detail' && renderClassDetailView()}
            {view === 'quiz_detail' && renderQuizDetailView()}
        </div>
    );
};

export default Reports;
