import React from 'react';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { User } from '../../types';
import { LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentUserProfile: User | null;
  onNavigate: (page: string) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUserProfile, onNavigate, activeTab }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-xs dark:bg-slate-900 dark:border-slate-800">
      {/* Zone 1: Single Brand Wordmark */}
      <button 
        onClick={() => onNavigate('dashboard')} 
        className="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400 cursor-pointer select-none"
      >
        CBT Exam Engine
      </button>

      {/* Zone 2: Navigation Links based on active role */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        {currentUserProfile?.role === 'admin' && (
          <>
            <button 
              onClick={() => onNavigate('admin-overview')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'admin-overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Overview
            </button>
            <button 
              onClick={() => onNavigate('admin-teachers')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'admin-teachers' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Teachers
            </button>
            <button 
              onClick={() => onNavigate('admin-students')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'admin-students' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Students
            </button>
            <button 
              onClick={() => onNavigate('admin-subjects')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'admin-subjects' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Subjects
            </button>
            <button 
              onClick={() => onNavigate('admin-security')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'admin-security' ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' : ''}`}
            >
              Security Events
            </button>
          </>
        )}

        {currentUserProfile?.role === 'teacher' && (
          <>
            <button 
              onClick={() => onNavigate('teacher-dashboard')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'teacher-dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => onNavigate('teacher-questions')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'teacher-questions' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Question Bank
            </button>
            <button 
              onClick={() => onNavigate('teacher-exams')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'teacher-exams' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Exams
            </button>
            <button 
              onClick={() => onNavigate('teacher-results')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'teacher-results' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Results & Grading
            </button>
          </>
        )}

        {currentUserProfile?.role === 'student' && (
          <>
            <button 
              onClick={() => onNavigate('student-dashboard')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'student-dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              My Exams
            </button>
            <button 
              onClick={() => onNavigate('student-results')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'student-results' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              Exam Results
            </button>
            <button 
              onClick={() => onNavigate('student-profile')} 
              className={`hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 ${activeTab === 'student-profile' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}
            >
              My Profile
            </button>
          </>
        )}
      </nav>

      {/* Zone 3: Actions (PWA install, Connection Indicator, profile displays, Logout) */}
      <div className="flex items-center gap-4">
        <OfflineIndicator />
        <PWAInstallButton />
        
        {currentUserProfile && (
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {currentUserProfile.name}
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {currentUserProfile.role}
              </span>
            </div>
            <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0 whitespace-nowrap transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
