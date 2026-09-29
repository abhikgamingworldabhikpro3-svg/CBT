import React, { useState, useEffect } from 'react';
import { User, Subject, Exam, Attempt, ProctoringEvent, AuditLog } from '../../types';
import { userService } from '../../services/userService';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { proctoringService } from '../../services/proctoringService';
import { auditService } from '../../services/auditService';
import { db, auth } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Users, BookOpen, FileText, AlertTriangle, PlayCircle, CheckCircle2, 
  UserCheck, UserX, Plus, ShieldAlert, History, KeyRound, CheckSquare 
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Form states
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'security' | 'audit'>('overview');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');

  const [showUserModal, setShowUserModal] = useState(false);
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('teacher');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState(''); // Simulated password
  const [studentIdInput, setStudentIdInput] = useState('');

  const [assignTeacherUid, setAssignTeacherUid] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');

  // Loaded state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listeners for all collections so admin analytics stay live!
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const userList: User[] = [];
      snap.forEach(d => userList.push(d.data() as User));
      setTeachers(userList.filter(u => u.role === 'teacher'));
      setStudents(userList.filter(u => u.role === 'student'));
    });

    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const subList: Subject[] = [];
      snap.forEach(d => subList.push(d.data() as Subject));
      setSubjects(subList);
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      const exList: Exam[] = [];
      snap.forEach(d => exList.push(d.data() as Exam));
      setExams(exList);
    });

    const unsubAttempts = onSnapshot(collection(db, 'attempts'), (snap) => {
      const attList: Attempt[] = [];
      snap.forEach(d => attList.push(d.data() as Attempt));
      setAttempts(attList);
    });

    const unsubEvents = onSnapshot(collection(db, 'proctoringEvents'), (snap) => {
      const evList: ProctoringEvent[] = [];
      snap.forEach(d => evList.push(d.data() as ProctoringEvent));
      setEvents(evList);
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const logList: AuditLog[] = [];
      snap.forEach(d => logList.push(d.data() as AuditLog));
      setLogs(logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubSubjects();
      unsubExams();
      unsubAttempts();
      unsubEvents();
      unsubLogs();
    };
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    try {
      await userService.createSubject(subjectName, subjectDesc);
      setSubjectName('');
      setSubjectDesc('');
      setShowSubjectModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;
    try {
      // Create a secure user uid or demo uid
      const demoUid = `user_demo_${Date.now()}`;
      await userService.createUserProfile(demoUid, userName, userEmail, userRole, studentIdInput);
      
      // Reset
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setStudentIdInput('');
      setShowUserModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (uid: string, currentStatus: boolean) => {
    try {
      await userService.updateUserStatus(uid, !currentStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherUid || !assignSubjectId) return;
    try {
      const teacher = teachers.find(t => t.uid === assignTeacherUid);
      const currentSubjects = teacher?.subjects || [];
      if (!currentSubjects.includes(assignSubjectId)) {
        await userService.updateTeacherSubjects(assignTeacherUid, [...currentSubjects, assignSubjectId]);
      }
      setAssignTeacherUid('');
      setAssignSubjectId('');
    } catch (err) {
      console.error(err);
    }
  };

  const activeExams = exams.filter(e => e.status === 'published');
  const completedAttempts = attempts.filter(a => a.status === 'submitted');
  const criticalViolations = events.filter(ev => ev.severity === 'CRITICAL' || ev.severity === 'WARNING');

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Overview Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {students.length}
            </div>
            <div className="text-xs text-slate-500">Total Students</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {teachers.length}
            </div>
            <div className="text-xs text-slate-500">Total Teachers</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {subjects.length}
            </div>
            <div className="text-xs text-slate-500">Total Subjects</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {exams.length}
            </div>
            <div className="text-xs text-slate-500">Total Exams ({activeExams.length} Active)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-lg">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {attempts.length}
            </div>
            <div className="text-xs text-slate-500">Total Exam Attempts</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {completedAttempts.length}
            </div>
            <div className="text-xs text-slate-500">Completed Submissions</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {criticalViolations.length}
            </div>
            <div className="text-xs text-slate-500">Security Violations</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {logs.length}
            </div>
            <div className="text-xs text-slate-500">Audit Logs (Recent)</div>
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Analytics & System Settings
        </button>
        <button 
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'teachers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Manage Teachers
        </button>
        <button 
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Manage Students
        </button>
        <button 
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'subjects' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Manage Subjects
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'security' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Proctoring Center
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer shrink-0 ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          Audit logs
        </button>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Participation Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Student Exam Submissions</h3>
              <div className="flex items-end justify-between h-48 gap-4 pt-6 select-none font-mono">
                {subjects.map((sub, index) => {
                  const count = completedAttempts.filter(att => {
                    const exam = exams.find(e => e.id === att.examId);
                    return exam?.subjectId === sub.id;
                  }).length;
                  const maxCount = Math.max(...subjects.map(s => {
                    return completedAttempts.filter(att => {
                      const exam = exams.find(e => e.id === att.examId);
                      return exam?.subjectId === s.id;
                    }).length;
                  })) || 1;
                  const heightPercent = count > 0 ? (count / maxCount) * 100 : 5;

                  return (
                    <div key={sub.id} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative h-32 flex items-end">
                        <div 
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-indigo-500 rounded-t-lg transition-all duration-500"
                        />
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {count}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans text-center truncate w-full" title={sub.name}>
                        {sub.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Security Events Overview */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Security Violation Trend</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-xs">Fullscreen Exits</div>
                  <div className="text-2xl font-bold text-rose-600 font-mono mt-1">
                    {events.filter(ev => ev.type === 'FULLSCREEN_EXIT').length}
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-xs">Tab Switches</div>
                  <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
                    {events.filter(ev => ev.type === 'TAB_SWITCH' || ev.type === 'WINDOW_BLUR').length}
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-xs">Face Not Present</div>
                  <div className="text-2xl font-bold text-red-600 font-mono mt-1">
                    {events.filter(ev => ev.type === 'FACE_NOT_DETECTED').length}
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-xs">Multiple Faces</div>
                  <div className="text-2xl font-bold text-purple-600 font-mono mt-1">
                    {events.filter(ev => ev.type === 'MULTIPLE_FACES').length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Config */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Environment Controls</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  userService.createSubject('Mathematics', 'Calculus, Algebra, and Geometry');
                  userService.createSubject('Physics', 'Kinematics, Thermodynamics, and Quantum Physics');
                  userService.createSubject('Chemistry', 'Organic Chemistry and Chemical Bonding');
                  auditService.log('SYSTEM_DEMO_DATA_SEEDED');
                }}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer"
              >
                Seed Default Subjects (Demo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teachers tab */}
      {activeTab === 'teachers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Subject-Specific Teachers</h3>
              <p className="text-xs text-slate-500">Create, enable, and map teachers to specific subject access domains.</p>
            </div>
            <button 
              onClick={() => { setUserRole('teacher'); setShowUserModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
            </button>
          </div>

          {/* Subject Assignor Form */}
          <form onSubmit={handleAssignSubject} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Select Teacher</label>
              <select 
                value={assignTeacherUid} 
                onChange={(e) => setAssignTeacherUid(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
              >
                <option value="">-- Choose Teacher --</option>
                {teachers.map(t => (
                  <option key={t.uid} value={t.uid}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Map Subject Domain</label>
              <select 
                value={assignSubjectId} 
                onChange={(e) => setAssignSubjectId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
              >
                <option value="">-- Choose Subject --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              disabled={!assignTeacherUid || !assignSubjectId}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer"
            >
              Map Subject Access Domain
            </button>
          </form>

          {/* Teachers table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Subjects</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {teachers.map(t => (
                  <tr key={t.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{t.email}</td>
                    <td className="py-3.5 px-4">
                      {t.subjects && t.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {t.subjects.map(subId => {
                            const sub = subjects.find(s => s.id === subId);
                            return (
                              <span key={subId} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-xs">
                                {sub?.name || subId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">No subjects mapped</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.active ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <UserCheck className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-500 text-xs font-semibold">
                          <UserX className="w-3.5 h-3.5" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleToggleActive(t.uid, t.active)}
                        className={`text-xs font-medium cursor-pointer ${t.active ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                      >
                        {t.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">No teachers found. Create a demo teacher to test subject limits.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students tab */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Individual Student Roster</h3>
              <p className="text-xs text-slate-500">Create, roster, and disable students.</p>
            </div>
            <button 
              onClick={() => { setUserRole('student'); setShowUserModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {students.map(s => (
                  <tr key={s.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{s.studentId}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{s.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{s.email}</td>
                    <td className="py-3.5 px-4">
                      {s.active ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <UserCheck className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-500 text-xs font-semibold">
                          <UserX className="w-3.5 h-3.5" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => handleToggleActive(s.uid, s.active)}
                        className={`text-xs font-medium cursor-pointer ${s.active ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                      >
                        {s.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">No students found. Add students to assign examinations.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subjects tab */}
      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Subjects Catalog</h3>
              <p className="text-xs text-slate-500">Define academic subject divisions for test templates and question banks.</p>
            </div>
            <button 
              onClick={() => setShowSubjectModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(s => (
              <div key={s.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-850/20">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</h4>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">{s.description || 'No description provided.'}</p>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>ID: {s.id}</span>
                  <span>Created: {new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No subjects defined yet. Use the button to seed or add a subject.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Events Monitoring */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Real-time Proctoring Center
            </h3>
            <p className="text-xs text-slate-500">Live surveillance log capture of client-side visibility blurs, face losses, and fullscreen exits.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Exam ID</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-mono">
                {events.map(ev => {
                  const student = students.find(s => s.uid === ev.studentId);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{ev.type}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-sans">{student?.name || ev.studentId}</td>
                      <td className="py-3 px-4 text-slate-500">{ev.examId}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700' :
                          ev.severity === 'WARNING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-sans truncate max-w-[200px]" title={JSON.stringify(ev.metadata)}>
                        {JSON.stringify(ev.metadata)}
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">No security events logged. Start a student test to record proctoring audits.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs tab */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Audit Trail Logs</h3>
            <p className="text-xs text-slate-500">Append-only administrative operations records for absolute tracking and accountability.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-mono">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-300">{log.actorEmail}</td>
                    <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{log.action}</td>
                    <td className="py-3 px-4 text-slate-500">{log.targetId || '-'}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-sans truncate max-w-[200px]" title={JSON.stringify(log.metadata)}>
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">No audit logs recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Academic Subject</h3>
            <form onSubmit={handleCreateSubject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Subject Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Mathematics, Calculus, English Literature"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description (Optional)</label>
                <textarea 
                  placeholder="Enter a brief course or topic scope description"
                  value={subjectDesc}
                  onChange={(e) => setSubjectDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Add Demo {userRole === 'teacher' ? 'Teacher' : 'Student'}
            </h3>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Jane Doe, Dr. Alistair"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. jane@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                />
              </div>

              {userRole === 'student' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Custom Student ID (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. STU-99212 (auto-generated if empty)"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
