import React from 'react';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { User } from '../../types';
import { LogOut, ShieldAlert, BookOpen, UserCheck, Settings, Users, FolderKanban, Sun, Moon } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentUserProfile: User;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  activeTab: string;
  theme: string;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentUserProfile, 
  onNavigate, 
  activeTab, 
  theme, 
  onToggleTheme 
}) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const role = currentUserProfile.role;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/90 transition-all duration-300">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate(role === 'admin' ? 'admin-overview' : role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard')}
            className="text-base font-bold tracking-tight text-slate-950 dark:text-white cursor-pointer select-none hover:opacity-85"
          >
            CBT Exam Room
          </button>
          
          <span className="hidden sm:inline font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            {role}
          </span>
        </div>

        {/* Zone 2: 4-6 clean text navigation links, depending on Role */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
          {role === 'admin' && (
            <>
              <button 
                onClick={() => onNavigate('admin-overview')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'admin-overview' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => onNavigate('admin-overview', { view: 'teachers' })}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'admin-teachers' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Teachers
              </button>
              <button 
                onClick={() => onNavigate('admin-overview', { view: 'students' })}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'admin-students' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Students
              </button>
              <button 
                onClick={() => onNavigate('admin-overview', { view: 'subjects' })}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'admin-subjects' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Subjects
              </button>
            </>
          )}

          {role === 'teacher' && (
            <>
              <button 
                onClick={() => onNavigate('teacher-dashboard')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'teacher-dashboard' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => onNavigate('teacher-dashboard', { view: 'questions' })}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'teacher-questions' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Question Bank
              </button>
              <button 
                onClick={() => onNavigate('teacher-dashboard', { view: 'exams' })}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'teacher-exams' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Manage Exams
              </button>
            </>
          )}

          {role === 'student' && (
            <>
              <button 
                onClick={() => onNavigate('student-dashboard')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'student-dashboard' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Exams
              </button>
              <button 
                onClick={() => onNavigate('student-profile')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'student-profile' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
              >
                Profile
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <PWAInstallButton />
          
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
          
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
              {currentUserProfile.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ID: {currentUserProfile.studentId || currentUserProfile.uid.substring(0, 6)}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out of Session"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
