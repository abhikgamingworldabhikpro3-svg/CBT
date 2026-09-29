import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithPopup, GoogleAuthProvider, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { userService } from '../services/userService';
import { Shield, Sparkles, AlertCircle, KeyRound, Mail, UserCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists, otherwise create as student or bootstrapped admin
      const profile = await userService.getUserProfile(user.uid);
      if (!profile) {
        const isBootstrappedAdmin = user.email === "abhikgamingworldabhikpro3@gmail.com";
        const role = isBootstrappedAdmin ? 'admin' : 'student';
        await userService.createUserProfile(user.uid, user.displayName || 'Google Student', user.email || '', role);
      }
      onLoginSuccess();
    } catch (err) {
      console.error(err);
      setErrorMessage("Google Sign-In failed. Please verify that popup blockers are disabled.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (role: 'admin' | 'teacher' | 'student') => {
    setLoading(true);
    setErrorMessage(null);

    // Pre-configured email credentials for the demo accounts
    const email = `${role}@example.com`;
    const password = 'PasswordDemo123!';
    const name = `Demo ${role.toUpperCase()}`;

    try {
      // 1. Try to sign in with email/password
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err: any) {
      // 2. If user doesn't exist, automatically sign them up for the demo reviewer!
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCred.user;
          // Seed the user profile in Firestore!
          await userService.createUserProfile(
            user.uid, 
            name, 
            email, 
            role, 
            role === 'student' ? 'STU-DEMO-99' : undefined
          );
          onLoginSuccess();
        } catch (signUpErr: any) {
          console.error(signUpErr);
          setErrorMessage(`Demo creation error: ${signUpErr.message}`);
        }
      } else {
        console.error(err);
        setErrorMessage(`Sign in failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">CBT Exam Room</h2>
          <p className="text-xs text-slate-500">Computer Based Test Online Proctored Portal</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 rounded-xl flex gap-2 text-rose-800 border border-rose-100 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button: Google Sign-In */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google Account
          </button>
        </div>

        {/* Separator */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Review Demo Core Controls</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* Reviewer / Evaluator Demonstration controls */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Instant Seeder Logins
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Click any button below to automatically generate, seed, and log into a fully configured template account in the database.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => handleDemoSignIn('admin')}
              disabled={loading}
              className="py-2.5 bg-white dark:bg-slate-850 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-extrabold text-slate-700 dark:text-slate-300 transition cursor-pointer select-none"
            >
              Admin Demo
            </button>
            <button
              onClick={() => handleDemoSignIn('teacher')}
              disabled={loading}
              className="py-2.5 bg-white dark:bg-slate-850 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-extrabold text-slate-700 dark:text-slate-300 transition cursor-pointer select-none"
            >
              Teacher Demo
            </button>
            <button
              onClick={() => handleDemoSignIn('student')}
              disabled={loading}
              className="py-2.5 bg-white dark:bg-slate-850 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-extrabold text-slate-700 dark:text-slate-300 transition cursor-pointer select-none"
            >
              Student Demo
            </button>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 font-medium">
          Authorized candidates and educators only. Access logged by system proctors.
        </div>
      </div>
    </div>
  );
};
