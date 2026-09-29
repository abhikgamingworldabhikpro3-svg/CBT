import React, { useState, useEffect } from 'react';
import { User, Subject, Exam, Attempt, Assignment } from '../../types';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Calendar, Clock, Award, PlayCircle, Eye, AlertCircle, BookOpen } from 'lucide-react';

interface StudentDashboardProps {
  currentUserProfile: User;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUserProfile, onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'results'>('assigned');

  useEffect(() => {
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const list: Subject[] = [];
      snap.forEach(d => list.push(d.data() as Subject));
      setSubjects(list);
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      const list: Exam[] = [];
      snap.forEach(d => list.push(d.data() as Exam));
      setExams(list);
    });

    // Load assignments specifically targeting this student
    const qAssign = query(collection(db, 'assignments'), where('studentId', '==', currentUserProfile.uid));
    const unsubAssignments = onSnapshot(qAssign, (snap) => {
      const list: Assignment[] = [];
      snap.forEach(d => list.push(d.data() as Assignment));
      setAssignments(list);
    });

    // Load attempts specifically targeting this student
    const qAttempts = query(collection(db, 'attempts'), where('studentId', '==', currentUserProfile.uid));
    const unsubAttempts = onSnapshot(qAttempts, (snap) => {
      const list: Attempt[] = [];
      snap.forEach(d => list.push(d.data() as Attempt));
      setAttempts(list);
      setLoading(false);
    });

    return () => {
      unsubSubjects();
      unsubExams();
      unsubAssignments();
      unsubAttempts();
    };
  }, [currentUserProfile.uid]);

  const getExamStatus = (exam: Exam, assignment: Assignment | undefined, attempt: Attempt | undefined) => {
    const now = new Date().getTime();
    const start = new Date(exam.startAt).getTime();
    const end = new Date(exam.endAt).getTime();

    if (attempt && attempt.status === 'submitted') {
      return 'completed';
    }
    if (now < start) {
      return 'upcoming';
    }
    if (now > end) {
      return 'ended';
    }
    return 'active';
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
      {/* Welcome header with Zero-Pill name display */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Welcome, {currentUserProfile.name}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
            <span>Student ID: {currentUserProfile.studentId}</span>
            <span>·</span>
            <span>Active Exams Assigned: {assignments.filter(a => a.status !== 'completed').length}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400">
          <Award className="w-4 h-4" />
          <span>Roster Verified</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button 
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeTab === 'assigned' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          My Assigned Exams
        </button>
        <button 
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeTab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Released Results
        </button>
      </div>

      {/* Tab Contents: Assigned Exams */}
      {activeTab === 'assigned' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(assign => {
            const exam = exams.find(e => e.id === assign.examId);
            if (!exam) return null;

            const sub = subjects.find(s => s.id === exam.subjectId);
            const attempt = attempts.find(a => a.examId === exam.id);
            const status = getExamStatus(exam, assign, attempt);

            return (
              <div key={assign.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-xl bg-white dark:bg-slate-900 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{sub?.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'active' ? 'bg-indigo-50 text-indigo-700 animate-pulse' :
                      status === 'upcoming' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {status}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base line-clamp-1">{exam.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">{exam.description || 'No exam description provided.'}</p>
                </div>

                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.duration} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.questionIds.length} Questions</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono flex flex-col gap-0.5">
                    <span>Window Start: {new Date(exam.startAt).toLocaleString()}</span>
                    <span>Window End: {new Date(exam.endAt).toLocaleString()}</span>
                  </div>

                  {status === 'active' && attempt?.status !== 'submitted' && (
                    <button
                      onClick={() => onNavigate('exam-instructions', { examId: exam.id })}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Enter Examination Room
                    </button>
                  )}

                  {status === 'upcoming' && (
                    <div className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800">
                      <Calendar className="w-3.5 h-3.5" />
                      Locked (Window not open yet)
                    </div>
                  )}

                  {status === 'completed' && (
                    <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/10 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1 border border-emerald-100 dark:border-emerald-950/20">
                      <Award className="w-3.5 h-3.5" />
                      Exam Already Submitted
                    </div>
                  )}

                  {status === 'ended' && attempt?.status !== 'submitted' && (
                    <div className="w-full text-center py-2 bg-rose-50 dark:bg-rose-950/10 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1 border border-rose-100 dark:border-rose-950/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Exam Window Expired
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {assignments.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No exams assigned yet. Ask your subject teacher to map your credentials to an exam roster.
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Released Results */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Exam Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Score Obtained</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Review Answers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                {attempts.filter(a => a.status === 'submitted' && a.resultStatus === 'released').map(a => {
                  const exam = exams.find(e => e.id === a.examId);
                  const sub = subjects.find(s => s.id === exam?.subjectId);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-100">{exam?.title || a.examId}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-normal">{sub?.name || '-'}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{a.score} / {exam?.totalMarks}</td>
                      <td className="py-3.5 px-4 font-mono">{a.percentage}%</td>
                      <td className="py-3.5 px-4 font-mono">{a.accuracy}%</td>
                      <td className="py-3.5 px-4 text-slate-400 font-normal">{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onNavigate('student-exam-review', { attemptId: a.id, examId: a.examId })}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 justify-end cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Paper
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {attempts.filter(a => a.status === 'submitted' && a.resultStatus === 'released').length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-normal">No released test papers available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
