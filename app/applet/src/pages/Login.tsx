import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { userService } from '../services/userService';
import { Shield, Lock, Mail, Users, CheckCircle, GraduationCap } from 'lucide-react';
import { auditService } from '../services/auditService';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerRole, setRegisterRole] = useState<'teacher' | 'student'>('student');
  const [registerName, setRegisterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegisterMode) {
        // Enforce validations
        if (!registerName) throw new Error("Full Name is required.");
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Generate additional fields
        const extraFields: any = {};
        if (registerRole === 'student') {
          extraFields.studentId = `STU_${Math.floor(100000 + Math.random() * 900000)}`;
        } else {
          extraFields.subjects = [];
        }

        await userService.createUserProfile(userCred.user.uid, registerName, email, registerRole, extraFields);
        await auditService.logAudit({
          actorId: userCred.user.uid,
          actorEmail: email,
          action: registerRole === 'student' ? 'STUDENT_CREATED' : 'TEACHER_CREATED',
          targetId: userCred.user.uid,
          metadata: `Created user with email ${email}`
        });
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await auditService.logAudit({
          actorId: userCred.user.uid,
          actorEmail: email,
          action: 'ADMIN_LOGIN',
          targetId: userCred.user.uid,
          metadata: `User logged in with email ${email}`
        });
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google Login pop-up was interrupted.');
    } finally {
      setLoading(false);
    }
  };

  // IMMEDIATE TEST EVALUATOR SEED CARD PRESETS
  const handleLoadDemoUser = async (role: 'admin' | 'teacher' | 'student') => {
    setLoading(true);
    setErrorMsg('');
    
    // Preset addresses
    const demoEmail = `${role}@example.com`;
    const demoPassword = `demo_${role}_123`;
    const demoName = role === 'admin' ? 'Super Admin' : role === 'teacher' ? 'Physics Tutor A' : 'Candidate John';

    try {
      // 1. Try signing in
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (e) {
        // 2. If user doesn't exist, register them immediately
        userCred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        
        const extraFields: any = {};
        if (role === 'student') {
          extraFields.studentId = 'STU_100204';
        } else if (role === 'teacher') {
          extraFields.subjects = ['PHYS_101', 'MATH_101'];
        }

        await userService.createUserProfile(
          userCred.user.uid, 
          demoName, 
          demoEmail, 
          role,
          extraFields
        );
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed seeding user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl p-8">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg mb-4">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">CBT Examination Portal</h2>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tracking-tight">Active Proctor Surveillance & AI Grading Room</p>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950">
            {errorMsg}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
              <div className="relative mt-1">
                <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Role Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterRole('student')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${registerRole === 'student' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' : 'border-slate-200 dark:border-slate-800 text-slate-600'}`}
                >
                  Student Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('teacher')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${registerRole === 'teacher' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' : 'border-slate-200 dark:border-slate-800 text-slate-600'}`}
                >
                  Subject Instructor
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : isRegisterMode ? 'Create Account' : 'Secure Login'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
          <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-mono text-slate-400">Instant Test Evaluators</span>
        </div>

        {/* DEMO ACCOUNTS QUICK DIRECT LOG-INS */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadDemoUser('student')}
            className="flex flex-col items-center py-2 px-1 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">STUDENT</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Demo Candidate</span>
          </button>
          
          <button
            onClick={() => handleLoadDemoUser('teacher')}
            className="flex flex-col items-center py-2 px-1 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">TEACHER</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Demo Instructor</span>
          </button>

          <button
            onClick={() => handleLoadDemoUser('admin')}
            className="flex flex-col items-center py-2 px-1 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 font-mono">ADMIN</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Super Admin</span>
          </button>
        </div>

        {/* Toggle sign in mode */}
        <div className="mt-6 text-center text-xs">
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {isRegisterMode ? 'Already have credentials? Sign In' : "Don't have credentials? Create Account"}
          </button>
        </div>

      </div>
    </div>
  );
};
