import React from 'react';
import { User } from '../../types';
import { Award, UserCheck, Mail, Shield } from 'lucide-react';

interface StudentProfileProps {
  currentUserProfile: User;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ currentUserProfile }) => {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-6 text-center">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
          {currentUserProfile.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{currentUserProfile.name}</h2>
          <div className="text-xs text-slate-500 font-mono">Student ID: {currentUserProfile.studentId}</div>
        </div>

        <div className="border-t border-b border-slate-100 dark:border-slate-800 py-4 grid grid-cols-2 gap-4 text-left text-xs font-semibold">
          <div className="space-y-1">
            <span className="text-slate-400 font-normal">Active Role</span>
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-bold">
              <Shield className="w-4 h-4" />
              {currentUserProfile.role}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-normal">Account Status</span>
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <UserCheck className="w-4 h-4" />
              Verified Active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-850/25 border rounded-xl text-xs text-slate-500 text-left">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Auth Email:</span> {currentUserProfile.email}
          </div>
        </div>
      </div>
    </div>
  );
};
