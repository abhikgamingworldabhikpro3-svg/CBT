import React, { useState, useEffect } from 'react';
import { User, ExamAttempt } from '../../types';
import { attemptService } from '../../services/attemptService';
import { Trophy, Award, Calendar, BookOpen, Clock, Activity, ShieldCheck, User as UserIcon } from 'lucide-react';

interface StudentProfileProps {
  currentUserProfile: User;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ currentUserProfile }) => {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptService.getAttemptsForStudent(currentUserProfile.uid)
      .then(res => {
        setAttempts(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [currentUserProfile.uid]);

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-slate-400 font-mono text-xs">
        Loading profile stats...
      </div>
    );
  }

  const completedAttempts = attempts.filter(a => a.status === 'submitted');
  const totalScore = completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const avgAccuracy = completedAttempts.length > 0 
    ? (completedAttempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / completedAttempts.length) 
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 font-sans text-slate-900 dark:text-slate-100 space-y-6">
      
      {/* Student credentials card */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
          <UserIcon className="h-8 w-8" />
        </div>
        
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{currentUserProfile.name}</h2>
          <p className="text-xs text-slate-500 font-mono">{currentUserProfile.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-[10px] font-mono">
            <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold">
              ROLE: CANDIDATE
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold">
              STUDENT ID: {currentUserProfile.studentId || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-center">
          <Award className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
          <span className="text-slate-400 font-bold block text-[10px] uppercase font-mono">Total Points</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-white mt-1 block">{totalScore.toFixed(1)} pts</span>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-center">
          <Trophy className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
          <span className="text-slate-400 font-bold block text-[10px] uppercase font-mono">Avg Accuracy</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-white mt-1 block">{avgAccuracy.toFixed(1)}%</span>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-center">
          <BookOpen className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
          <span className="text-slate-400 font-bold block text-[10px] uppercase font-mono">Papers Submitted</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-white mt-1 block">{completedAttempts.length} papers</span>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-center">
          <Activity className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
          <span className="text-slate-400 font-bold block text-[10px] uppercase font-mono">Active Sessions</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-white mt-1 block">{attempts.length - completedAttempts.length} active</span>
        </div>
      </div>

      {/* Topics for practice / stats list */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-xs space-y-4">
        <h3 className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-500" />
          <span>Completed Submissions Ledger</span>
        </h3>

        {completedAttempts.length === 0 ? (
          <div className="text-center py-6 text-slate-400 italic">
            No completed assessments in ledger.
          </div>
        ) : (
          <div className="space-y-3">
            {completedAttempts.map(att => (
              <div key={att.id} className="flex justify-between items-center p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{att.examId}</span>
                  <p className="font-semibold text-slate-800 dark:text-white">Examination Attempt #{att.id.substring(att.id.length - 4)}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Started: {new Date(att.startedAt).toLocaleString()}</p>
                </div>
                
                <div className="text-right space-y-1 font-mono">
                  <p className="font-bold text-indigo-600">{att.score} pts</p>
                  <p className="text-[10px] text-slate-400">Accuracy: {att.accuracy}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
