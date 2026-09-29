import React, { useState, useEffect } from 'react';
import { User, Subject, Exam, Attempt, Question, QuestionType, DifficultyType, Assignment } from '../../types';
import { questionService } from '../../services/questionService';
import { examService } from '../../services/examService';
import { userService } from '../../services/userService';
import { attemptService } from '../../services/attemptService';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  BookOpen, Plus, FileText, CheckCircle2, AlertTriangle, Play, HelpCircle, 
  Trash2, Edit, Copy, Upload, Download, Search, CheckSquare, Eye, ArrowRight, ArrowLeft 
} from 'lucide-react';

interface TeacherDashboardProps {
  currentUserProfile: User;
  onNavigate: (page: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUserProfile, onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'bank' | 'exams' | 'attempts'>('overview');

  // Load States
  const [loading, setLoading] = useState(true);

  // Filter States
  const [subjectFilter, setSubjectFilter] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Question Creation Form State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qType, setQType] = useState<QuestionType>('single-choice');
  const [qSubjectId, setQSubjectId] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectAnswers, setQCorrectAnswers] = useState<string[]>(['0']);
  const [qMarks, setQMarks] = useState<number>(1);
  const [qNegMarks, setQNegMarks] = useState<number>(0.25);
  const [qDifficulty, setQDifficulty] = useState<DifficultyType>('medium');
  const [qExplanation, setQExplanation] = useState('');

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvSubjectId, setCsvSubjectId] = useState('');
  const [csvMessage, setCsvMessage] = useState('');

  // Exam Wizard State
  const [showExamWizard, setShowExamWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Wizard Fields
  const [wizardId, setWizardId] = useState('');
  const [wizardTitle, setWizardTitle] = useState('');
  const [wizardDesc, setWizardDesc] = useState('');
  const [wizardInstr, setWizardInstr] = useState('');
  const [wizardSubjectId, setWizardSubjectId] = useState('');
  const [wizardDuration, setWizardDuration] = useState(60);
  const [wizardStartAt, setWizardStartAt] = useState('');
  const [wizardEndAt, setWizardEndAt] = useState('');
  const [wizardRandomQ, setWizardRandomQ] = useState(true);
  const [wizardRandomO, setWizardRandomO] = useState(true);
  const [wizardAutoSubmit, setWizardAutoSubmit] = useState(true);
  const [wizardRelease, setWizardRelease] = useState<'immediate' | 'manual'>('immediate');
  const [wizardQIds, setWizardQIds] = useState<string[]>([]);
  const [wizardStudentIds, setWizardStudentIds] = useState<string[]>([]);

  // Subject Access limitation
  const assignedSubjects = subjects.filter(s => 
    currentUserProfile.role === 'admin' || currentUserProfile.subjects?.includes(s.id)
  );

  useEffect(() => {
    // Sync with DB
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const list: Subject[] = [];
      snap.forEach(d => list.push(d.data() as Subject));
      setSubjects(list);
    });

    const unsubQuestions = onSnapshot(collection(db, 'questions'), (snap) => {
      const list: Question[] = [];
      snap.forEach(d => list.push(d.data() as Question));
      setQuestions(list);
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      const list: Exam[] = [];
      snap.forEach(d => list.push(d.data() as Exam));
      setExams(list);
    });

    const unsubAttempts = onSnapshot(collection(db, 'attempts'), (snap) => {
      const list: Attempt[] = [];
      snap.forEach(d => list.push(d.data() as Attempt));
      setAttempts(list);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: User[] = [];
      snap.forEach(d => list.push(d.data() as User));
      setStudents(list.filter(u => u.role === 'student' && u.active));
      setLoading(false);
    });

    return () => {
      unsubSubjects();
      unsubQuestions();
      unsubExams();
      unsubAttempts();
      unsubUsers();
    };
  }, []);

  // Filter bank questions to only assigned subjects
  const filteredBank = questions.filter(q => {
    const isSubjectAssigned = currentUserProfile.role === 'admin' || currentUserProfile.subjects?.includes(q.subjectId);
    if (!isSubjectAssigned) return false;

    const matchesSubject = !subjectFilter || q.subjectId === subjectFilter;
    const matchesDifficulty = !difficultyFilter || q.difficulty === difficultyFilter;
    const matchesSearch = !bankSearch || q.questionText.toLowerCase().includes(bankSearch.toLowerCase()) || q.topic?.toLowerCase().includes(bankSearch.toLowerCase());

    return matchesSubject && matchesDifficulty && matchesSearch;
  });

  // Load question fields for editing
  const handleEditQuestion = async (q: Question) => {
    setEditingQuestionId(q.id);
    setQSubjectId(q.subjectId);
    setQType(q.type);
    setQTopic(q.topic || '');
    setQText(q.questionText);
    setQOptions(q.options || ['', '', '', '']);
    setQMarks(q.marks);
    setQNegMarks(q.negativeMarks);
    setQDifficulty(q.difficulty);

    // Retrieve private correctness answers
    const key = await questionService.getQuestionAnswerKey(q.id);
    if (key) {
      setQCorrectAnswers(key.correctAnswers);
      setQExplanation(key.explanation || '');
    }
    setShowQuestionModal(true);
  };

  const handleCreateOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qSubjectId || !qText.trim()) return;

    try {
      if (editingQuestionId) {
        await questionService.updateQuestion(
          editingQuestionId,
          {
            subjectId: qSubjectId,
            topic: qTopic,
            type: qType,
            questionText: qText,
            options: qType === 'true-false' ? ['True', 'False'] : qOptions,
            marks: qMarks,
            negativeMarks: qNegMarks,
            difficulty: qDifficulty,
          },
          qCorrectAnswers,
          qExplanation
        );
      } else {
        await questionService.createQuestion(
          qSubjectId,
          qTopic,
          qType,
          qText,
          qType === 'true-false' ? ['True', 'False'] : qOptions,
          qCorrectAnswers,
          qMarks,
          qNegMarks,
          qDifficulty,
          qExplanation,
          currentUserProfile.uid
        );
      }

      // Reset
      setEditingQuestionId(null);
      setQTopic('');
      setQText('');
      setQOptions(['', '', '', '']);
      setQCorrectAnswers(['0']);
      setQExplanation('');
      setShowQuestionModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      await questionService.deleteQuestion(id);
    }
  };

  const handleDuplicateQuestion = async (q: Question) => {
    const key = await questionService.getQuestionAnswerKey(q.id);
    await questionService.createQuestion(
      q.subjectId,
      `${q.topic || ''} Copy`,
      q.type,
      `[Copy] ${q.questionText}`,
      q.options || [],
      key?.correctAnswers || [],
      q.marks,
      q.negativeMarks,
      q.difficulty,
      key?.explanation || '',
      currentUserProfile.uid
    );
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvSubjectId || !csvText.trim()) return;
    try {
      const res = await questionService.importQuestionsCsv(csvText, csvSubjectId, currentUserProfile.uid);
      setCsvMessage(`Imported ${res.success} questions successfully. ${res.errors.length} errors.`);
      if (res.errors.length > 0) {
        setCsvMessage(prev => `${prev}\nErrors: ${res.errors.join('\n')}`);
      }
      setCsvText('');
    } catch (err) {
      setCsvMessage(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Exam Wizard Flow ---
  const startExamWizard = () => {
    setWizardId(`exam_${Date.now()}`);
    setWizardTitle('');
    setWizardDesc('');
    setWizardInstr('');
    setWizardSubjectId(assignedSubjects[0]?.id || '');
    setWizardDuration(60);
    setWizardStartAt(new Date().toISOString().slice(0, 16));
    setWizardEndAt(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setWizardQIds([]);
    setWizardStudentIds([]);
    setWizardStep(1);
    setShowExamWizard(true);
  };

  const handleWizardSubmit = async () => {
    // Total marks math
    let totalMarks = 0;
    wizardQIds.forEach(qId => {
      const q = questions.find(qu => qu.id === qId);
      if (q) totalMarks += q.marks;
    });

    const examData: Omit<Exam, 'createdAt' | 'updatedAt'> = {
      id: wizardId,
      title: wizardTitle,
      description: wizardDesc,
      instructions: wizardInstr,
      subjectId: wizardSubjectId,
      duration: wizardDuration,
      startAt: new Date(wizardStartAt).toISOString(),
      endAt: new Date(wizardEndAt).toISOString(),
      totalMarks,
      maxAttempts: 1,
      randomizeQuestions: wizardRandomQ,
      randomizeOptions: wizardRandomO,
      autoSubmit: wizardAutoSubmit,
      resultRelease: wizardRelease,
      status: 'draft',
      questionIds: wizardQIds,
      createdBy: currentUserProfile.uid
    };

    try {
      // 1. Create Exam
      await examService.createExam(examData);

      // 2. Publish & validate
      const pubRes = await examService.validateAndPublishExam(wizardId);
      if (!pubRes.isValid) {
        alert(`Validation errors: ${pubRes.errors.join(', ')}`);
        return;
      }

      // 3. Assign to students
      if (wizardStudentIds.length > 0) {
        await examService.assignExamToStudents(wizardId, wizardStudentIds);
      }

      setShowExamWizard(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWizardQuestion = (id: string) => {
    setWizardQIds(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const toggleWizardStudent = (id: string) => {
    setWizardStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Overview Cards for Teachers */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
              <div className="text-slate-500 text-xs font-semibold">Total Assigned Subjects</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums mt-1">
                {assignedSubjects.length}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
              <div className="text-slate-500 text-xs font-semibold">My Authored Exams</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
                {exams.filter(e => e.createdBy === currentUserProfile.uid).length}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
              <div className="text-slate-500 text-xs font-semibold">Student Attempts Graded</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                {attempts.filter(a => a.status === 'submitted' && exams.find(e => e.id === a.examId)?.createdBy === currentUserProfile.uid).length}
              </div>
            </div>
          </div>

          <div className="flex justify-start gap-4">
            <button 
              onClick={startExamWizard}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Launch CBT Exam Wizard
            </button>
            <button 
              onClick={() => { setCsvSubjectId(assignedSubjects[0]?.id || ''); setShowCsvModal(true); }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              <Upload className="w-4 h-4" />
              Import Questions (CSV)
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Triggers */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Teacher Console
        </button>
        <button 
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'bank' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Question Banks
        </button>
        <button 
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'exams' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          My Exams
        </button>
        <button 
          onClick={() => setActiveTab('attempts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'attempts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Student Attempts
        </button>
      </div>

      {/* Bank tab */}
      {activeTab === 'bank' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Author Question Bank</h3>
              <p className="text-xs text-slate-500">Edit, duplicate, and configure single/multiple choice MCQs, true-false, or numerical tolerances.</p>
            </div>
            <button 
              onClick={() => { setEditingQuestionId(null); setQSubjectId(assignedSubjects[0]?.id || ''); setShowQuestionModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Search question content or topic..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm dark:text-slate-100"
              />
            </div>
            <select 
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
            >
              <option value="">All My Subjects</option>
              {assignedSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            <select 
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {filteredBank.map((q, idx) => {
              const sub = subjects.find(s => s.id === q.subjectId);
              return (
                <div key={q.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-xl hover:shadow-xs transition bg-slate-50/20 dark:bg-slate-900/10">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>{idx + 1}. Q-ID: {q.id}</span>
                        <span>·</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-sans font-bold uppercase">{q.type.replace('-', ' ')}</span>
                        <span>·</span>
                        <span className="font-sans font-medium">{sub?.name}</span>
                        {q.topic && (
                          <>
                            <span>·</span>
                            <span className="font-sans bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{q.topic}</span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed pt-1">
                        {q.questionText}
                      </h4>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pl-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 uppercase">
                        {q.difficulty}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded">
                        +{q.marks} / -{q.negativeMarks} Marks
                      </span>
                      <button 
                        onClick={() => handleEditQuestion(q)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredBank.length === 0 && (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No questions found in bank. Click Add Question to create your first query.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exams catalog */}
      {activeTab === 'exams' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Assigned Test Exam Catalog</h3>
              <p className="text-xs text-slate-500">Exams published by you on mapped subject disciplines.</p>
            </div>
            <button 
              onClick={startExamWizard}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Launch Exam Wizard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.filter(e => e.createdBy === currentUserProfile.uid).map(e => {
              const sub = subjects.find(s => s.id === e.subjectId);
              return (
                <div key={e.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-850/20 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{sub?.name}</span>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{e.title}</h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded text-xs font-bold uppercase">
                      {e.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 font-medium">
                    <div>Duration: <span className="font-bold text-slate-700 dark:text-slate-300">{e.duration} mins</span></div>
                    <div>Questions: <span className="font-bold text-slate-700 dark:text-slate-300">{e.questionIds.length}</span></div>
                    <div>Max Marks: <span className="font-bold text-slate-700 dark:text-slate-300">{e.totalMarks} Marks</span></div>
                    <div>Release: <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{e.resultRelease}</span></div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Window: {new Date(e.startAt).toLocaleString()} - {new Date(e.endAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
            {exams.filter(e => e.createdBy === currentUserProfile.uid).length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No exams created yet. Use the CBT Exam Wizard to publish.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Attempts */}
      {activeTab === 'attempts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Active Student Test Attempts</h3>
            <p className="text-xs text-slate-500">Grading center and detailed security log analysis for your authored exams.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Violations Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {attempts.filter(a => {
                  const exam = exams.find(e => e.id === a.examId);
                  return exam?.createdBy === currentUserProfile.uid;
                }).map(a => {
                  const student = students.find(s => s.uid === a.studentId);
                  const exam = exams.find(e => e.id === a.examId);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 font-sans">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{student?.name || a.studentId}</td>
                      <td className="py-3.5 px-4 text-slate-500">{exam?.title || a.examId}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          a.status === 'submitted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 animate-pulse'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">{a.score !== undefined ? `${a.score} / ${exam?.totalMarks}` : '-'}</td>
                      <td className="py-3.5 px-4 font-mono">{a.accuracy !== undefined ? `${a.accuracy}%` : '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`flex items-center gap-1 font-mono font-bold text-xs ${a.violations > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {a.violations} Violations
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {attempts.filter(a => {
                  const exam = exams.find(e => e.id === a.examId);
                  return exam?.createdBy === currentUserProfile.uid;
                }).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">No attempts logged yet on your examinations.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Question Creator Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingQuestionId ? 'Modify Question' : 'Define New Question'}
            </h3>

            {/* Simple Question Type Section Cards */}
            {!editingQuestionId && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'single-choice', title: 'Single MCQ', desc: 'Select exactly 1 answer' },
                  { id: 'multiple-choice', title: 'Multiple MCQ', desc: 'Select more than 1' },
                  { id: 'true-false', title: 'True / False', desc: 'Binary Boolean choice' },
                  { id: 'numerical', title: 'Numerical Answer', desc: 'Input specific number' }
                ].map(card => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setQType(card.id as QuestionType);
                      // Clear answers to fit types
                      if (card.id === 'true-false') setQCorrectAnswers(['true']);
                      else if (card.id === 'numerical') setQCorrectAnswers(['0']);
                      else setQCorrectAnswers(['0']);
                    }}
                    className={`p-3 border rounded-xl text-left transition cursor-pointer select-none ${qType === card.id ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{card.title}</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-1">{card.desc}</div>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleCreateOrUpdateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Subject Domain</label>
                  <select 
                    value={qSubjectId} 
                    onChange={(e) => setQSubjectId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  >
                    {assignedSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Topic</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Algebra, Electrostatics"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Question Prompt Text</label>
                <textarea 
                  required
                  placeholder="Enter clear test question prompt..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                />
              </div>

              {/* Dynamic Option Input based on Question Type */}
              {(qType === 'single-choice' || qType === 'multiple-choice') && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Options Definition</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {qOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/20 p-2 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <span className="font-bold text-xs shrink-0">{String.fromCharCode(65 + idx)}.</span>
                        <input 
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...qOptions];
                            newOpts[idx] = e.target.value;
                            setQOptions(newOpts);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="w-full bg-transparent border-none outline-none text-xs dark:text-slate-100"
                        />
                        {/* Checkboxes / Radio for correctness answers */}
                        {qType === 'single-choice' ? (
                          <input 
                            type="radio" 
                            name="correctAnswerIndex"
                            checked={qCorrectAnswers[0] === String(idx)}
                            onChange={() => setQCorrectAnswers([String(idx)])}
                            className="w-4 h-4 text-indigo-600 shrink-0"
                          />
                        ) : (
                          <input 
                            type="checkbox"
                            checked={qCorrectAnswers.includes(String(idx))}
                            onChange={(e) => {
                              const sIdx = String(idx);
                              setQCorrectAnswers(prev => 
                                e.target.checked ? [...prev, sIdx] : prev.filter(c => c !== sIdx)
                              );
                            }}
                            className="w-4 h-4 text-indigo-600 shrink-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {qType === 'true-false' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Select Correct Answer</label>
                  <select 
                    value={qCorrectAnswers[0]}
                    onChange={(e) => setQCorrectAnswers([e.target.value])}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              {qType === 'numerical' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Correct Numeric Answer</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder="e.g. 24.5"
                      value={qCorrectAnswers[0]}
                      onChange={(e) => setQCorrectAnswers([e.target.value])}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Numerical Tolerance (Absolute)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0.05 (saved inside explanation)"
                      value={qExplanation.includes('tolerance:') ? qExplanation.match(/tolerance:\s*([\d.]+)/)?.[1] || '0.01' : '0.01'}
                      onChange={(e) => {
                        const tol = e.target.value || '0.01';
                        // append tolerance tag to explanation text dynamically
                        setQExplanation(prev => {
                          const base = prev.replace(/tolerance:\s*[\d.]+/i, '').trim();
                          return `${base}\ntolerance: ${tol}`.trim();
                        });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Marks and difficulty metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Positive Marks</label>
                  <input 
                    type="number" 
                    step="0.25"
                    required
                    value={qMarks}
                    onChange={(e) => setQMarks(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Negative Deduction Marks</label>
                  <input 
                    type="number" 
                    step="0.05"
                    required
                    value={qNegMarks}
                    onChange={(e) => setQNegMarks(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Difficulty Organize Tag</label>
                  <select 
                    value={qDifficulty} 
                    onChange={(e) => setQDifficulty(e.target.value as DifficultyType)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Explanation (Visible after release)</label>
                <textarea 
                  placeholder="Explain solution or key criteria details..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
                >
                  {editingQuestionId ? 'Save Edits' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Import Questions via CSV</h3>
            
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Destination Subject</label>
                <select 
                  value={csvSubjectId}
                  onChange={(e) => setCsvSubjectId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                >
                  {assignedSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Paste CSV Lines</label>
                <textarea 
                  required
                  placeholder='QuestionText,Type,Options(split by "|"),CorrectAnswers(split by "|"),Marks,NegativeMarks,Difficulty,Topic,Explanation&#10;"What is 2+2?","single-choice","3|4|5|6","1",1,0.25,"easy","Arithmetic","Standard addition"'
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono dark:text-slate-100"
                />
              </div>

              {csvMessage && (
                <div className="p-3 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 rounded-lg text-xs text-indigo-700 whitespace-pre-line max-h-32 overflow-y-auto font-mono">
                  {csvMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowCsvModal(false); setCsvMessage(''); }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
                >
                  Execute CSV Parse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Step Exam Wizard Modal */}
      {showExamWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">CBT Exam Setup Wizard</h3>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold uppercase">Step {wizardStep} of 6</span>
              </div>
              <button onClick={() => setShowExamWizard(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm">Cancel</button>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between gap-1 select-none text-[10px] text-slate-400 uppercase font-mono tracking-tight font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className={wizardStep >= 1 ? 'text-indigo-600' : ''}>1. Info</span>
              <span className={wizardStep >= 2 ? 'text-indigo-600' : ''}>2. Settings</span>
              <span className={wizardStep >= 3 ? 'text-indigo-600' : ''}>3. Questions</span>
              <span className={wizardStep >= 4 ? 'text-indigo-600' : ''}>4. Roster</span>
              <span className={wizardStep >= 5 ? 'text-indigo-600' : ''}>5. Preview</span>
              <span className={wizardStep >= 6 ? 'text-indigo-600' : ''}>6. Publish</span>
            </div>

            {/* Step Content */}
            <div className="min-h-[250px] py-2">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Exam Name / Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Midterm General Physics I"
                      value={wizardTitle}
                      onChange={(e) => setWizardTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Subject Category Domain</label>
                    <select 
                      value={wizardSubjectId}
                      onChange={(e) => setWizardSubjectId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                    >
                      {assignedSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
                    <textarea 
                      placeholder="Enter a brief summary of exam coverage topics..."
                      value={wizardDesc}
                      onChange={(e) => setWizardDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Student Guidelines / Instructions</label>
                    <textarea 
                      placeholder="Enter detailed guidelines (e.g. webcam, camera, mic and fullscreen specifications)"
                      value={wizardInstr}
                      onChange={(e) => setWizardInstr(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">CBT Duration (Minutes)</label>
                      <input 
                        type="number" 
                        required
                        value={wizardDuration}
                        onChange={(e) => setWizardDuration(parseInt(e.target.value) || 30)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Result Release Mode</label>
                      <select 
                        value={wizardRelease}
                        onChange={(e) => setWizardRelease(e.target.value as 'immediate' | 'manual')}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                      >
                        <option value="immediate">Immediate Release</option>
                        <option value="manual">Manual Release Later</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Window Starts On</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={wizardStartAt}
                        onChange={(e) => setWizardStartAt(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Window Ends On</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={wizardEndAt}
                        onChange={(e) => setWizardEndAt(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Randomize Question Order per Attempt</span>
                      <input 
                        type="checkbox" 
                        checked={wizardRandomQ}
                        onChange={(e) => setWizardRandomQ(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Randomize MCQ Options per Question</span>
                      <input 
                        type="checkbox" 
                        checked={wizardRandomO}
                        onChange={(e) => setWizardRandomO(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Force Auto-Submit when Timer Hits 0</span>
                      <input 
                        type="checkbox" 
                        checked={wizardAutoSubmit}
                        onChange={(e) => setWizardAutoSubmit(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 font-semibold mb-2">
                    Selected Questions ({wizardQIds.length} of {questions.filter(q => q.subjectId === wizardSubjectId).length} available for Subject)
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {questions.filter(q => q.subjectId === wizardSubjectId).map(q => (
                      <div key={q.id} className="p-3 flex items-start gap-3 text-xs">
                        <input 
                          type="checkbox" 
                          checked={wizardQIds.includes(q.id)}
                          onChange={() => toggleWizardQuestion(q.id)}
                          className="w-4 h-4 text-indigo-600 cursor-pointer shrink-0 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{q.questionText}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Topic: {q.topic} | Marks: +{q.marks} | Difficulty: {q.difficulty}</div>
                        </div>
                      </div>
                    ))}
                    {questions.filter(q => q.subjectId === wizardSubjectId).length === 0 && (
                      <div className="p-6 text-center text-slate-400">No questions found in the bank for this subject. Create questions in the question bank first.</div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 font-semibold mb-2">
                    Assign Students ({wizardStudentIds.length} Selected)
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {students.map(st => (
                      <div key={st.uid} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={wizardStudentIds.includes(st.uid)}
                            onChange={() => toggleWizardStudent(st.uid)}
                            className="w-4 h-4 text-indigo-600 cursor-pointer shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{st.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">ID: {st.studentId}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{st.email}</span>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <div className="p-6 text-center text-slate-400">No active students found in the roster.</div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="space-y-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">Review CBT Exam Template</h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 bg-slate-50 dark:bg-slate-850/20">
                    <div>Exam: <span className="font-bold text-slate-800 dark:text-slate-200">{wizardTitle || 'No Title'}</span></div>
                    <div>Subject: <span className="font-bold text-slate-800 dark:text-slate-200">{subjects.find(s => s.id === wizardSubjectId)?.name}</span></div>
                    <div>Duration: <span className="font-bold text-slate-800 dark:text-slate-200">{wizardDuration} Minutes</span></div>
                    <div>Window: <span className="font-mono text-slate-800 dark:text-slate-200">{new Date(wizardStartAt).toLocaleString()} - {new Date(wizardEndAt).toLocaleString()}</span></div>
                    <div>Questions Picked: <span className="font-bold text-indigo-600 dark:text-indigo-400">{wizardQIds.length} Questions</span></div>
                    <div>Students Targeted: <span className="font-bold text-indigo-600 dark:text-indigo-400">{wizardStudentIds.length} Students</span></div>
                  </div>
                </div>
              )}

              {wizardStep === 6 && (
                <div className="space-y-4 text-center py-6">
                  <CheckSquare className="w-12 h-12 text-indigo-600 mx-auto" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">CBT Exam Template Verified</h4>
                    <p className="text-xs text-slate-500 mt-2">Publishing will seal the exam configurations, trigger dynamic student assignments and render them accessible inside the student terminal window.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep(prev => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 disabled:opacity-50 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
              
              {wizardStep < 6 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 1 && !wizardTitle.trim()) { alert('Exam title required'); return; }
                    if (wizardStep === 3 && wizardQIds.length === 0) { alert('Select at least 1 question'); return; }
                    setWizardStep(prev => prev + 1);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition cursor-pointer"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleWizardSubmit}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                >
                  Verify & Publish Exam
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
