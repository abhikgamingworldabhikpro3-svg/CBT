import React, { useState, useEffect } from 'react';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { userService } from '../../services/userService';
import { User, Exam, ExamAttempt } from '../../types';
import { CheckCircle, AlertTriangle, Play, Calendar, ClipboardList, HelpCircle, FileSpreadsheet, Trophy, ShieldCheck } from 'lucide-react';

interface StudentDashboardProps {
  currentUserProfile: User;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUserProfile, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'results'>('assigned');
  const [assignedExams, setAssignedExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [examsList, attemptsList, resultsList, subsList] = await Promise.all([
        examService.getAssignedExamsForStudent(currentUserProfile.uid),
        attemptService.getAttemptsForStudent(currentUserProfile.uid),
        attemptService.getAllResultsForStudent(currentUserProfile.uid),
        userService.getAllSubjects()
      ]);

      setAssignedExams(examsList);
      setAttempts(attemptsList);
      setResults(resultsList);

      // Create lookup dictionary for subjects
      const subDict: Record<string, string> = {};
      subsList.forEach(s => {
        subDict[s.id] = s.name;
      });
      setSubjects(subDict);

    } catch (err) {
      console.error("Error loading candidate dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="text-xs text-slate-500 font-mono">Syncing Candidate Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-indigo-100/40 bg-gradient-to-tr from-indigo-50/40 to-indigo-500/5 dark:from-indigo-950/20 dark:to-transparent p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Welcome back, {currentUserProfile.name}!</h2>
          <p className="text-xs text-slate-500 leading-normal">
            Your credentials are validated. Always verify stable network connection and secure proctor clearances before launching active examinations.
          </p>
        </div>
        
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 border border-emerald-100 dark:border-emerald-950 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-emerald-800 dark:text-emerald-400 font-mono">Surveillance Portal Ready</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'assigned' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'}`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>My Assigned Exams</span>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'results' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'}`}
        >
          <Trophy className="h-3.5 w-3.5" />
          <span>Completed Results ({results.length})</span>
        </button>
      </div>

      {/* ASSIGNED EXAMS VIEW */}
      {activeTab === 'assigned' && (
        <div>
          {assignedExams.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs italic">
              No examination papers assigned to you. Contact your teacher or supervisor to enroll.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedExams.map(exam => {
                const pastAttempt = attempts.find(a => a.examId === exam.id);
                const isCompleted = pastAttempt && pastAttempt.status === 'submitted';
                const subjectTitle = subjects[exam.subjectId] || exam.subjectId;

                return (
                  <div key={exam.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 text-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span className="font-semibold">{exam.subjectId} · {subjectTitle}</span>
                        {isCompleted ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">COMPLETED</span>
                        ) : (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded">ACTIVE</span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{exam.title}</h4>
                      <p className="text-slate-400 leading-normal text-[11px] line-clamp-2">{exam.description || 'Instructions inside exam room.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-y border-slate-100 dark:border-slate-800 py-3 text-[11px] text-slate-500 font-mono leading-tight">
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[9px]">Duration</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{exam.duration} minutes</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[9px]">Questions</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{exam.questionIds?.length || 0} items</span>
                      </div>
                    </div>

                    {isCompleted ? (
                      <button
                        onClick={() => onNavigate('student-exam-review', { examId: exam.id, attemptId: pastAttempt.id })}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 text-indigo-600 py-2 font-semibold hover:bg-indigo-50 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Review My Paper</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate('exam-instructions', { examId: exam.id })}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white py-2 font-semibold hover:bg-indigo-700 shadow transition cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        <span>Start Examination</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RESULTS ARCHIVE VIEW */}
      {activeTab === 'results' && (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-xs">
          <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">Official Released Assessment Results</h3>
          
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic">
              No results have been officially released by your supervisor yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-2.5">Course/Exam</th>
                    <th className="py-2.5">Date Submitted</th>
                    <th className="py-2.5 text-right">Correct</th>
                    <th className="py-2.5 text-right">Score</th>
                    <th className="py-2.5 text-right">Accuracy</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(res => (
                    <tr key={res.id} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                      <td className="py-3 font-semibold text-indigo-600">{res.examTitle} ({res.subjectId})</td>
                      <td className="py-3 font-mono text-slate-400">{new Date(res.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 text-right font-mono">{res.correctCount} / {res.correctCount + res.incorrectCount + res.unattemptedCount}</td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600">{res.score} pts ({res.percentage}%)</td>
                      <td className="py-3 text-right font-mono text-slate-500">{res.accuracy}%</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigate('student-exam-review', { examId: res.examId, attemptId: res.attemptId })}
                          className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                        >
                          Review details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
