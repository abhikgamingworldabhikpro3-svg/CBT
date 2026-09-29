import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { userService } from './services/userService';
import { User } from './types';
import { Login } from './pages/Login';
import { Navbar } from './components/common/Navbar';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentProfile } from './pages/student/StudentProfile';
import { ExamInstructions } from './pages/exam/ExamInstructions';
import { ExamInterface } from './pages/exam/ExamInterface';
import { ExamReview } from './pages/exam/ExamReview';
import { attemptService } from './services/attemptService';
import { examService } from './services/examService';
import { ShieldAlert, BookOpen, User as UserIcon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple Router Navigation State
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setUser(authUser);
        try {
          // Fetch or initialize user profile
          let profile = await userService.getUserProfile(authUser.uid);
          
          if (!profile) {
            // Bootstrapped administrator checking
            const isBootstrappedAdmin = authUser.email === "abhikgamingworldabhikpro3@gmail.com";
            const role = isBootstrappedAdmin ? 'admin' : 'student';
            
            profile = await userService.createUserProfile(
              authUser.uid,
              authUser.displayName || 'Google Candidate',
              authUser.email || '',
              role
            );
          }
          setUserProfile(profile);
          
          // Route based on role
          if (profile.role === 'admin') setActivePage('admin-overview');
          else if (profile.role === 'teacher') setActivePage('teacher-dashboard');
          else setActivePage('student-dashboard');
          
        } catch (err) {
          console.error("Error matching profile:", err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setActivePage('dashboard');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleNavigate = (page: string, params: Record<string, string> = {}) => {
    setActivePage(page);
    setPageParams(params);
  };

  const handleStartExam = async (examId: string) => {
    if (!userProfile) return;
    try {
      const exam = await examService.getExam(examId);
      if (!exam) return;

      // Start attempt session in Firestore
      const newAttempt = await attemptService.startAttempt(userProfile.uid, exam);
      handleNavigate('exam-cbt-room', { examId, attemptId: newAttempt.id });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500 font-mono">Syncing Proctor Database...</span>
        </div>
      </div>
    );
  }

  // Not Authenticated Layout
  if (!user || !userProfile) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Handle active Exam room with zero margins or headers to prevent candidate distraction!
  if (activePage === 'exam-cbt-room' && pageParams.examId && pageParams.attemptId) {
    return (
      <ExamInterface 
        examId={pageParams.examId}
        attemptId={pageParams.attemptId}
        studentUser={{ uid: userProfile.uid, name: userProfile.name }}
        onSubmitFinished={() => handleNavigate('student-dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Standard Header Navigation following Top Bar Contract */}
      <Navbar 
        currentUserProfile={userProfile} 
        onNavigate={handleNavigate} 
        activeTab={activePage} 
      />

      {/* Main Pages orchestrator */}
      <main className="flex-1">
        {/* Admin Router views */}
        {userProfile.role === 'admin' && (
          <>
            {activePage === 'admin-overview' && <AdminDashboard onNavigate={handleNavigate} />}
            {activePage === 'admin-teachers' && <AdminDashboard onNavigate={handleNavigate} />}
            {activePage === 'admin-students' && <AdminDashboard onNavigate={handleNavigate} />}
            {activePage === 'admin-subjects' && <AdminDashboard onNavigate={handleNavigate} />}
            {activePage === 'admin-security' && <AdminDashboard onNavigate={handleNavigate} />}
          </>
        )}

        {/* Teacher Router views */}
        {userProfile.role === 'teacher' && (
          <>
            {activePage === 'teacher-dashboard' && (
              <TeacherDashboard currentUserProfile={userProfile} onNavigate={handleNavigate} />
            )}
            {activePage === 'teacher-questions' && (
              <TeacherDashboard currentUserProfile={userProfile} onNavigate={handleNavigate} />
            )}
            {activePage === 'teacher-exams' && (
              <TeacherDashboard currentUserProfile={userProfile} onNavigate={handleNavigate} />
            )}
            {activePage === 'teacher-results' && (
              <TeacherDashboard currentUserProfile={userProfile} onNavigate={handleNavigate} />
            )}
          </>
        )}

        {/* Student Router views */}
        {userProfile.role === 'student' && (
          <>
            {activePage === 'student-dashboard' && (
              <StudentDashboard currentUserProfile={userProfile} onNavigate={handleNavigate} />
            )}
            {activePage === 'student-results' && (
              <StudentDashboard currentUserProfile={userProfile} onNavigate={handleNavigate} />
            )}
            {activePage === 'student-profile' && (
              <StudentProfile currentUserProfile={userProfile} />
            )}
            {activePage === 'exam-instructions' && pageParams.examId && (
              <ExamInstructions 
                examId={pageParams.examId} 
                onStartExam={() => handleStartExam(pageParams.examId)} 
                onBack={() => handleNavigate('student-dashboard')}
              />
            )}
            {activePage === 'student-exam-review' && pageParams.examId && pageParams.attemptId && (
              <ExamReview 
                examId={pageParams.examId} 
                attemptId={pageParams.attemptId} 
                onBack={() => handleNavigate('student-dashboard')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
