import React, { useState, useEffect } from 'react';
import { questionService } from '../../services/questionService';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { userService } from '../../services/userService';
import { auditService } from '../../services/auditService';
import { User, Subject, Question, Exam, QuestionType, ExamStatus } from '../../types';
import { Plus, Search, HelpCircle, FileSpreadsheet, Calendar, BookOpen, Trash, Award, ShieldAlert, ArrowRight, UserCheck, RefreshCw, Upload, Copy } from 'lucide-react';

interface TeacherDashboardProps {
  currentUserProfile: User;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUserProfile, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'questions' | 'exams' | 'attempts'>('dashboard');
  
  // Data lists
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Actions
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState('');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvStatusMsg, setCsvStatusMsg] = useState('');

  // Question Creator Form state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [qType, setQType] = useState<QuestionType>('mcq_single');
  const [qSubjectId, setQSubjectId] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectChoices, setQCorrectChoices] = useState<string[]>([]);
  const [qTolerance, setQTolerance] = useState<number>(0);
  const [qMarks, setQMarks] = useState<number>(1);
  const [qNegMarks, setQNegMarks] = useState<number>(0.25);
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qExplanation, setQExplanation] = useState('');

  // Exam Creator Form state
  const [showExamModal, setShowExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examSubjectId, setExamSubjectId] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examInstructions, setExamInstructions] = useState('');
  const [examDuration, setExamDuration] = useState<number>(30);
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [examTotalMarks, setExamTotalMarks] = useState<number>(10);
  const [examMaxAttempts, setExamMaxAttempts] = useState<number>(1);
  const [examRandomQuestions, setExamRandomQuestions] = useState(true);
  const [examRandomOptions, setExamRandomOptions] = useState(false);
  const [examAutoSubmit, setExamAutoSubmit] = useState(true);
  const [examResultRelease, setExamResultRelease] = useState<'immediate' | 'manual'>('immediate');
  const [examQuestionsSelected, setExamQuestionsSelected] = useState<string[]>([]);
  const [examAssignedStudents, setExamAssignedStudents] = useState<string[]>([]);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const allSubs = await userService.getAllSubjects();
      // Filter subjects assigned to this teacher
      const assignedSubIds = currentUserProfile.subjects || [];
      const filteredSubs = allSubs.filter(s => assignedSubIds.includes(s.id));
      setMySubjects(filteredSubs);

      // Default question creation subject to first available assigned subject
      if (filteredSubs.length > 0) {
        setQSubjectId(filteredSubs[0].id);
        setExamSubjectId(filteredSubs[0].id);
      }

      // Load all questions and filter based on assigned subject access
      const allQuestions = await questionService.getAllQuestions();
      const teacherQuestions = allQuestions.filter(q => assignedSubIds.includes(q.subjectId));
      setQuestions(teacherQuestions);

      // Load exams matching assigned subjects
      const allExams = await examService.getAllExams();
      const teacherExams = allExams.filter(e => assignedSubIds.includes(e.subjectId));
      setExams(teacherExams);

      // Load Student list for exam assignment
      const students = await userService.getAllUsersByRole('student');
      setStudentsList(students);

      // Load all attempts for teacher's exams
      const allAttemptsList: any[] = [];
      for (const ex of teacherExams) {
        const atts = await attemptService.getAttemptsForExam(ex.id);
        atts.forEach(a => {
          const studentInfo = students.find(s => s.uid === a.studentId);
          allAttemptsList.push({
            ...a,
            examTitle: ex.title,
            studentName: studentInfo?.name || 'Unknown Student',
            studentIdCode: studentInfo?.studentId || 'N/A'
          });
        });
      }
      setAttempts(allAttemptsList);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Formulate MCQ Options & validation
    let finalOptions: string[] | undefined = undefined;
    let finalCorrectAnswers: string[] = [];

    if (qType === 'mcq_single') {
      finalOptions = qOptions.filter(o => o.trim() !== '');
      if (finalOptions.length < 2) {
        alert("Single MCQ must have at least 2 non-empty options.");
        setLoading(false);
        return;
      }
      if (qCorrectChoices.length !== 1) {
        alert("Must choose exactly 1 correct answer.");
        setLoading(false);
        return;
      }
      finalCorrectAnswers = [qCorrectChoices[0]];
    } else if (qType === 'mcq_multi') {
      finalOptions = qOptions.filter(o => o.trim() !== '');
      if (finalOptions.length < 2) {
        alert("Multiple MCQ must have at least 2 non-empty options.");
        setLoading(false);
        return;
      }
      if (qCorrectChoices.length < 1) {
        alert("Must select at least 1 correct answer.");
        setLoading(false);
        return;
      }
      finalCorrectAnswers = [...qCorrectChoices];
    } else if (qType === 'true_false') {
      finalOptions = ['True', 'False'];
      if (qCorrectChoices.length !== 1) {
        alert("Must select True or False.");
        setLoading(false);
        return;
      }
      finalCorrectAnswers = [qCorrectChoices[0]];
    } else if (qType === 'numerical') {
      if (qCorrectChoices.length !== 1 || isNaN(parseFloat(qCorrectChoices[0]))) {
        alert("Please specify a valid numerical correct answer.");
        setLoading(false);
        return;
      }
      finalCorrectAnswers = [qCorrectChoices[0]];
    }

    try {
      const qPayload = {
        subjectId: qSubjectId,
        topic: qTopic || 'General',
        type: qType,
        questionText: qText,
        options: finalOptions,
        correctAnswers: finalCorrectAnswers,
        tolerance: qType === 'numerical' ? qTolerance : undefined,
        marks: qMarks,
        negativeMarks: qNegMarks,
        difficulty: qDifficulty,
        explanation: qExplanation || undefined,
        createdBy: currentUserProfile.uid,
      };

      if (editingQuestion) {
        await questionService.updateQuestion(editingQuestion.id, qPayload);
      } else {
        await questionService.createQuestion(qPayload);
      }

      setShowQuestionModal(false);
      setEditingQuestion(null);
      resetQuestionForm();
      fetchTeacherData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examQuestionsSelected.length === 0) {
      alert("Must add at least 1 question to the Exam.");
      return;
    }
    setLoading(true);

    try {
      const examPayload = {
        title: examName,
        subjectId: examSubjectId,
        description: examDesc,
        instructions: examInstructions,
        duration: examDuration,
        startAt: examStart || new Date().toISOString(),
        endAt: examEnd || new Date(Date.now() + 86400000).toISOString(), // next day
        totalMarks: examTotalMarks,
        maxAttempts: examMaxAttempts,
        randomizeQuestions: examRandomQuestions,
        randomizeOptions: examRandomOptions,
        autoSubmit: examAutoSubmit,
        resultRelease: examResultRelease,
        status: 'active' as ExamStatus, // Auto-publish for simplicity
        questionIds: examQuestionsSelected,
        assignedStudentIds: examAssignedStudents,
        createdBy: currentUserProfile.uid,
      };

      await examService.createExam(examPayload);
      
      await auditService.logAudit({
        actorId: currentUserProfile.uid,
        actorEmail: currentUserProfile.email,
        action: 'EXAM_PUBLISHED',
        targetId: examSubjectId,
        metadata: `Published test: ${examName}`
      });

      setShowExamModal(false);
      resetExamForm();
      fetchTeacherData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question? This operation is permanent.")) return;
    try {
      await questionService.deleteQuestion(id);
      fetchTeacherData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateQuestion = async (q: Question) => {
    try {
      const copyPayload = {
        subjectId: q.subjectId,
        topic: `${q.topic} (Copy)`,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        correctAnswers: q.correctAnswers,
        tolerance: q.tolerance,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        explanation: q.explanation,
        createdBy: currentUserProfile.uid,
      };
      await questionService.createQuestion(copyPayload);
      fetchTeacherData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setCsvStatusMsg("Parsing lines...");

    const rows = csvText.split('\n');
    let importedCount = 0;
    try {
      for (const row of rows) {
        if (!row.trim()) continue;
        // Basic CSV splitting (format: Topic,Type,Text,Options(comma-split),CorrectAnswers(comma-split),Marks,NegMarks,Difficulty)
        const cols = row.split(';');
        if (cols.length < 8) continue;

        const [topic, type, text, optionsStr, correctsStr, marks, negMarks, diff] = cols;

        await questionService.createQuestion({
          subjectId: qSubjectId,
          topic: topic.trim(),
          type: type.trim() as QuestionType,
          questionText: text.trim(),
          options: optionsStr.split(',').map(o => o.trim()),
          correctAnswers: correctsStr.split(',').map(c => c.trim()),
          marks: parseFloat(marks) || 1,
          negativeMarks: parseFloat(negMarks) || 0.25,
          difficulty: diff.trim() as any,
          createdBy: currentUserProfile.uid,
        });
        importedCount++;
      }
      setCsvStatusMsg(`Successfully imported ${importedCount} questions.`);
      setCsvText('');
      setTimeout(() => {
        setShowCsvModal(false);
        setCsvStatusMsg('');
        fetchTeacherData();
      }, 1500);
    } catch (err: any) {
      setCsvStatusMsg(`Import failed: ${err.message}`);
    }
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQType(q.type);
    setQSubjectId(q.subjectId);
    setQTopic(q.topic);
    setQText(q.questionText);
    setQOptions(q.options || ['', '', '', '']);
    setQCorrectChoices(q.correctAnswers);
    setQTolerance(q.tolerance || 0);
    setQMarks(q.marks);
    setQNegMarks(q.negativeMarks);
    setQDifficulty(q.difficulty);
    setQExplanation(q.explanation || '');
    setShowQuestionModal(true);
  };

  const toggleExamStatus = async (examId: string, currentStatus: ExamStatus) => {
    const nextStatusMap: Record<ExamStatus, ExamStatus> = {
      draft: 'scheduled',
      scheduled: 'active',
      active: 'ended',
      ended: 'archived',
      archived: 'draft'
    };
    try {
      await examService.updateExam(examId, { status: nextStatusMap[currentStatus] });
      fetchTeacherData();
    } catch (err) {
      console.error(err);
    }
  };

  const resetQuestionForm = () => {
    setQTopic('');
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectChoices([]);
    setQTolerance(0);
    setQMarks(1);
    setQNegMarks(0.25);
    setQDifficulty('medium');
    setQExplanation('');
  };

  const resetExamForm = () => {
    setExamName('');
    setExamDesc('');
    setExamInstructions('');
    setExamDuration(30);
    setExamStart('');
    setExamEnd('');
    setExamTotalMarks(10);
    setExamMaxAttempts(1);
    setExamQuestionsSelected([]);
    setExamAssignedStudents([]);
  };

  // Filtering Logic
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) || q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter ? q.subjectId === selectedSubjectFilter : true;
    const matchesDiff = selectedDifficultyFilter ? q.difficulty === selectedDifficultyFilter : true;
    return matchesSearch && matchesSubject && matchesDiff;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Subject Check Lock */}
      {mySubjects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-slate-900 p-12 text-center border border-slate-100 dark:border-slate-800">
          <ShieldAlert className="h-10 w-10 text-red-500 animate-bounce mb-3" />
          <h2 className="text-base font-bold">Access Scope Restricted</h2>
          <p className="mt-1.5 text-xs text-slate-400 max-w-sm leading-normal">
            You do not currently have any assigned subjects. Please contact the administrator to assign subjects to your profile before attempting question bank or exam operations.
          </p>
        </div>
      )}

      {mySubjects.length > 0 && (
        <div className="space-y-6">
          
          {/* Main Navigation tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'}`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'questions' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Questions Bank</span>
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'exams' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'}`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Manage Exams</span>
            </button>
            <button
              onClick={() => setActiveTab('attempts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'attempts' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'}`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Student Attempts ({attempts.length})</span>
            </button>
          </div>

          {/* DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Stats Matrix */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Course Scope</span>
                  <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                    {mySubjects.map(s => s.name).join(', ')}
                  </p>
                </div>
                
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Questions</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{questions.length}</p>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Created Exams</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{exams.length}</p>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Assessments Taken</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{attempts.length}</p>
                </div>
              </div>

              {/* Recent Student Submissions table */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Student Submissions</h3>
                {attempts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    No examination attempt reports found.
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                          <th className="py-2">Student</th>
                          <th className="py-2">Exam Title</th>
                          <th className="py-2">Started At</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attempts.slice(0, 5).map(att => (
                          <tr key={att.id} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                            <td className="py-2.5 font-semibold">{att.studentName}</td>
                            <td className="py-2.5">{att.examTitle}</td>
                            <td className="py-2.5 font-mono text-[10px] text-slate-400">{new Date(att.startedAt).toLocaleString()}</td>
                            <td className="py-2.5">
                              <span className={`font-mono font-bold text-[9px] uppercase ${att.status === 'submitted' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                {att.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-indigo-600">
                              {att.score !== undefined ? `${att.score} pts` : 'Pending'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* QUESTIONS BANK MODULE */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              
              {/* Question list controls */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 text-xs focus:outline-none w-[180px] bg-transparent"
                    />
                  </div>

                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs bg-transparent"
                  >
                    <option value="">All Subjects</option>
                    {mySubjects.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>

                  <select
                    value={selectedDifficultyFilter}
                    onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs bg-transparent"
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      resetQuestionForm();
                      setEditingQuestion(null);
                      setShowQuestionModal(true);
                    }}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-2 rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Question</span>
                  </button>

                  <button
                    onClick={() => setShowCsvModal(true)}
                    className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 text-xs px-3 py-2 rounded-lg cursor-pointer font-semibold"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>CSV Import</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs italic">
                  No questions found matching active filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredQuestions.map(q => (
                    <div key={q.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm text-xs relative flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-semibold">
                          <span>{q.subjectId} · {q.topic}</span>
                          <span className="uppercase font-bold tracking-wider">{q.type.replace('_', ' ')}</span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm line-clamp-3">{q.questionText}</p>
                        
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {q.options.map((opt, oIdx) => {
                              const choiceLetter = String.fromCharCode(65 + oIdx);
                              const isCorrect = q.correctAnswers.includes(choiceLetter) || q.correctAnswers.includes(opt);
                              return (
                                <div key={oIdx} className={`p-2 rounded border text-[11px] leading-snug ${isCorrect ? 'border-emerald-200 bg-emerald-50/20 text-emerald-800 dark:text-emerald-400' : 'border-slate-100 bg-slate-50/40'}`}>
                                  <span className="font-bold mr-1">{choiceLetter}.</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'numerical' && (
                          <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-100 text-slate-500 font-mono text-[11px]">
                            <span className="font-semibold text-slate-700">Correct:</span> {q.correctAnswers[0]} (tol: ±{q.tolerance})
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-[10px]">
                        <span className="font-mono text-slate-400 font-bold">Marks: {q.marks} pts (Neg: -{q.negativeMarks})</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditQuestion(q)} className="text-indigo-600 font-semibold hover:underline cursor-pointer">Edit</button>
                          <button onClick={() => handleDuplicateQuestion(q)} className="text-emerald-600 font-semibold hover:underline cursor-pointer">Duplicate</button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 font-semibold hover:underline cursor-pointer">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* EXAM CREATION AND ASSIGNMENT */}
          {activeTab === 'exams' && (
            <div className="space-y-4 text-xs">
              
              <div className="flex justify-between items-center pb-2">
                <h3 className="font-bold text-sm">Subject Tests</h3>
                <button
                  onClick={() => {
                    resetExamForm();
                    setShowExamModal(true);
                  }}
                  className="flex items-center gap-1 bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Configure Exam</span>
                </button>
              </div>

              {exams.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 italic">
                  No exams created yet. Configure and publish an exam for assigned student candidates.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.map(exam => (
                    <div key={exam.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3 relative">
                      <div className="flex justify-between items-start text-slate-400 font-mono text-[10px]">
                        <span>{exam.subjectId}</span>
                        <span className={`font-bold px-2 py-0.5 rounded font-mono uppercase ${exam.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {exam.status}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{exam.title}</h4>
                        <p className="text-slate-400 text-[11px] mt-1 line-clamp-2 leading-relaxed">{exam.description || 'No description provided.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-y border-slate-100 dark:border-slate-800 py-3 text-[11px] text-slate-500 font-mono leading-tight">
                        <div>
                          <span className="font-bold text-slate-400 block uppercase text-[9px]">Duration</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{exam.duration} minutes</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 block uppercase text-[9px]">Questions</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{exam.questionIds?.length || 0} loaded</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 block uppercase text-[9px]">Total Score</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{exam.totalMarks} points</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 block uppercase text-[9px]">Randomization</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{exam.randomizeQuestions ? 'Active' : 'Disabled'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">Attempts Max: {exam.maxAttempts}</span>
                        <button
                          onClick={() => toggleExamStatus(exam.id, exam.status)}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Progress Status</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ATTEMPTS MODULE */}
          {activeTab === 'attempts' && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-xs">
              <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">Completed Exams Evaluator</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="py-2">Candidate ID</th>
                      <th className="py-2">Candidate Name</th>
                      <th className="py-2">Assigned Test</th>
                      <th className="py-2">Submitted At</th>
                      <th className="py-2 text-right">Achieved Score</th>
                      <th className="py-2 text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map(att => (
                      <tr key={att.id} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                        <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{att.studentIdCode}</td>
                        <td className="py-3 font-semibold">{att.studentName}</td>
                        <td className="py-3 font-semibold text-indigo-600">{att.examTitle}</td>
                        <td className="py-3 font-mono text-slate-400">{att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'Active session'}</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-850 dark:text-white">
                          {att.score !== undefined ? `${att.score} pts` : <span className="text-amber-500 italic">Evaluating...</span>}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-500">{att.accuracy ? `${att.accuracy}%` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* QUESTION MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 text-slate-800 dark:text-white font-sans">
              {editingQuestion ? 'Modify Question Parameters' : 'Create Subject Question'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Scope</label>
                  <select
                    value={qSubjectId}
                    onChange={(e) => setQSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2"
                  >
                    {mySubjects.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Topic / Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thermodynamics"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Question Type</label>
                <select
                  value={qType}
                  onChange={(e) => {
                    setQType(e.target.value as QuestionType);
                    setQCorrectChoices([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-semibold text-indigo-600"
                >
                  <option value="mcq_single" className="dark:bg-slate-900">MCQ Single Selection</option>
                  <option value="mcq_multi" className="dark:bg-slate-900">MCQ Multiple Selections</option>
                  <option value="true_false" className="dark:bg-slate-900">True / False</option>
                  <option value="numerical" className="dark:bg-slate-900">Numerical Input Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Question Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type examination question formulation here..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-medium"
                />
              </div>

              {/* Dynamic Answer Fields */}
              {(qType === 'mcq_single' || qType === 'mcq_multi') && (
                <div className="space-y-2.5">
                  <span className="block text-xs font-semibold text-slate-500">Option Formulations</span>
                  {qOptions.map((opt, oIdx) => {
                    const choiceLetter = String.fromCharCode(65 + oIdx);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 font-mono">{choiceLetter}.</span>
                        <input
                          type="text"
                          required
                          placeholder={`Enter option ${choiceLetter}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...qOptions];
                            updated[oIdx] = e.target.value;
                            setQOptions(updated);
                          }}
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1.5"
                        />
                        <input
                          type={qType === 'mcq_single' ? 'radio' : 'checkbox'}
                          name="correct_choice"
                          checked={qCorrectChoices.includes(choiceLetter)}
                          onChange={(e) => {
                            if (qType === 'mcq_single') {
                              setQCorrectChoices([choiceLetter]);
                            } else {
                              if (e.target.checked) {
                                setQCorrectChoices([...qCorrectChoices, choiceLetter]);
                              } else {
                                setQCorrectChoices(qCorrectChoices.filter(x => x !== choiceLetter));
                              }
                            }
                          }}
                          className="accent-indigo-600 h-4 w-4 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {qType === 'true_false' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select Correct Truth Value</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQCorrectChoices(['True'])}
                      className={`py-2 px-4 rounded-lg font-semibold border transition ${qCorrectChoices[0] === 'True' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' : 'border-slate-200 text-slate-600'}`}
                    >
                      True
                    </button>
                    <button
                      type="button"
                      onClick={() => setQCorrectChoices(['False'])}
                      className={`py-2 px-4 rounded-lg font-semibold border transition ${qCorrectChoices[0] === 'False' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' : 'border-slate-200 text-slate-600'}`}
                    >
                      False
                    </button>
                  </div>
                </div>
              )}

              {qType === 'numerical' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Required Number</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 42.15"
                      value={qCorrectChoices[0] || ''}
                      onChange={(e) => setQCorrectChoices([e.target.value])}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Allowed Tolerance (±)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 0.05"
                      value={qTolerance}
                      onChange={(e) => setQTolerance(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={qMarks}
                    onChange={(e) => setQMarks(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Negative Marking Deduct</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={qNegMarks}
                    onChange={(e) => setQNegMarks(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Difficulty</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-semibold"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Explanatory Solution (Optional)</label>
                <textarea
                  placeholder="Enter dynamic formulas or proof explanation here..."
                  rows={2}
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">Batch CSV Question Import</h3>
            
            <form onSubmit={handleCSVImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Select Subject Target</label>
                <select
                  value={qSubjectId}
                  onChange={(e) => setQSubjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-semibold text-indigo-600"
                >
                  {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">CSV Raw Data</label>
                <textarea
                  required
                  rows={8}
                  placeholder="Topic;Type;Text;Options(comma);CorrectAnswers(comma);Marks;NegMarks;Difficulty&#10;Physics;mcq_single;What is sound?;Wave,Solid,Light,None;Wave;1;0.25;easy"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent p-3 font-mono text-[10px] whitespace-pre"
                />
                <span className="block text-[10px] text-slate-400 mt-1 leading-normal">
                  Provide fields split by semicolons <strong>(;)</strong>. Options and answer choices split by commas <strong>(,)</strong>. Refer to placeholder for schema matching.
                </span>
              </div>

              {csvStatusMsg && (
                <div className="p-2.5 rounded bg-slate-50 font-mono text-[10px] font-semibold border text-indigo-600">
                  {csvStatusMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Execute Batch Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM CREATION MODAL */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">Configure CBT Assessment</h3>
            
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Subject</label>
                  <select
                    value={examSubjectId}
                    onChange={(e) => setExamSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-semibold"
                  >
                    {mySubjects.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assessment Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm General Physics"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Assessment Purpose</label>
                <textarea
                  rows={2}
                  placeholder="Brief exam summary..."
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Proctoring Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Candidates will have fullscreen locked..."
                  value={examInstructions}
                  onChange={(e) => setExamInstructions(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Time Limit (mins)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={examDuration}
                    onChange={(e) => setExamDuration(parseInt(e.target.value) || 30)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Total Score Pts</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={examTotalMarks}
                    onChange={(e) => setExamTotalMarks(parseInt(e.target.value) || 10)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Attempts Permitted</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={examMaxAttempts}
                    onChange={(e) => setExamMaxAttempts(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 font-mono text-center"
                  />
                </div>
              </div>

              {/* Select Question bank items */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Load Test Paper Questions ({examQuestionsSelected.length} loaded)</label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                  {questions
                    .filter(q => q.subjectId === examSubjectId)
                    .map(q => {
                      const isSelected = examQuestionsSelected.includes(q.id);
                      return (
                        <label key={q.id} className="flex items-start gap-2.5 cursor-pointer font-medium p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExamQuestionsSelected([...examQuestionsSelected, q.id]);
                              } else {
                                setExamQuestionsSelected(examQuestionsSelected.filter(id => id !== q.id));
                              }
                            }}
                            className="accent-indigo-600 mt-0.5"
                          />
                          <div className="leading-tight">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block line-clamp-1">{q.questionText}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">Topic: {q.topic} | Marks: {q.marks} pts</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Assignment Students selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assign Candidates (Optional - Leave blank for everyone)</label>
                <div className="space-y-2 max-h-[120px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                  {studentsList.map(s => {
                    const isSelected = examAssignedStudents.includes(s.uid);
                    return (
                      <label key={s.uid} className="flex items-center gap-2 cursor-pointer font-medium p-1 hover:bg-slate-50 rounded">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExamAssignedStudents([...examAssignedStudents, s.uid]);
                            } else {
                              setExamAssignedStudents(examAssignedStudents.filter(id => id !== s.uid));
                            }
                          }}
                          className="accent-indigo-600"
                        />
                        <span>{s.name} ({s.studentId || 'N/A'})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Publish and Open CBT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
