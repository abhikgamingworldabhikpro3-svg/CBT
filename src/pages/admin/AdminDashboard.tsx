import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { examService } from '../../services/examService';
import { attemptService } from '../../services/attemptService';
import { proctoringService } from '../../services/proctoringService';
import { auditService } from '../../services/auditService';
import { User, Subject, Exam, ExamAttempt, ProctoringEvent, AuditLog } from '../../types';
import { Users, BookOpen, GraduationCap, ShieldAlert, Award, FileSpreadsheet, Lock, Activity, UserPlus, FileWarning, Search, Calendar, BadgeAlert, CheckCircle } from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'security'>('overview');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [securityEvents, setSecurityEvents] = useState<ProctoringEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');

  // Assign Subject to Teacher state
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [tList, sList, subList, examList, evts, logs] = await Promise.all([
        userService.getAllUsersByRole('teacher'),
        userService.getAllUsersByRole('student'),
        userService.getAllSubjects(),
        examService.getAllExams(),
        proctoringService.getAllProctoringEvents(),
        auditService.getAllAuditLogs()
      ]);

      setTeachers(tList);
      setStudents(sList);
      setSubjects(subList);
      setExams(examList);
      setSecurityEvents(evts);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActive = async (uid: string, currentStatus: boolean, role: 'teacher' | 'student') => {
    try {
      await userService.updateUserStatus(uid, !currentStatus);
      // Log event
      await auditService.logAudit({
        actorId: 'admin',
        actorEmail: 'admin@example.com',
        action: 'USER_DISABLED',
        targetId: uid,
        metadata: `Toggled user status of ${uid} to ${!currentStatus}`
      });
      // Refresh
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectId || !newSubjectName) return;
    try {
      await userService.createSubject(newSubjectId, newSubjectName, newSubjectDesc);
      // Log event
      await auditService.logAudit({
        actorId: 'admin',
        actorEmail: 'admin@example.com',
        action: 'EXAM_CREATED', // Closest match
        targetId: newSubjectId,
        metadata: `Created subject ${newSubjectName}`
      });
      setNewSubjectId('');
      setNewSubjectName('');
      setNewSubjectDesc('');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) return;
    try {
      await userService.updateTeacherSubjects(selectedTeacherId, teacherSubjects);
      await auditService.logAudit({
        actorId: 'admin',
        actorEmail: 'admin@example.com',
        action: 'EXAM_ASSIGNED',
        targetId: selectedTeacherId,
        metadata: `Assigned subjects ${teacherSubjects.join(', ')} to teacher ${selectedTeacherId}`
      });
      setSelectedTeacherId('');
      setTeacherSubjects([]);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="text-xs text-slate-500 font-mono">Securing Administrative Shell...</span>
        </div>
      </div>
    );
  }

  // Calculated Stats
  const totalExams = exams.length;
  const activeExams = exams.filter(e => e.status === 'active').length;
  const completedExams = exams.filter(e => e.status === 'ended').length;
  const totalEvents = securityEvents.length;
  const criticalEvents = securityEvents.filter(e => e.severity === 'CRITICAL').length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
        >
          <Activity className="h-4 w-4" />
          <span>System Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'teachers' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
        >
          <Users className="h-4 w-4" />
          <span>Manage Instructors</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Candidate Rosters</span>
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'subjects' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Course Subjects</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Security Audit Log</span>
        </button>
      </div>

      {/* OVERVIEW MODULE */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Bento Stat Matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-xs font-semibold">Total Students</span>
                <GraduationCap className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight font-mono">{students.length}</p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-xs font-semibold">Total Instructors</span>
                <Users className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight font-mono">{teachers.length}</p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-xs font-semibold">Curated Subjects</span>
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight font-mono">{subjects.length}</p>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-xs font-semibold">Total Exams</span>
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono">{totalExams}</span>
                <span className="text-[10px] font-mono text-slate-400">({activeExams} Active)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Security Incident Feed */}
            <div className="lg:col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
                  <h3 className="text-sm font-bold">Proctor Surveillance Incidents</h3>
                </div>
                <span className="text-[10px] font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                  {criticalEvents} Critical Blocks
                </span>
              </div>

              {securityEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                  <span>No proctoring or security events recorded.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {securityEvents.map((evt, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-start justify-between p-3 rounded-lg border text-xs ${evt.severity === 'CRITICAL' ? 'border-red-100 bg-red-50/20 text-red-900 dark:border-red-950 dark:text-red-400' : 'border-amber-100 bg-amber-50/20 text-amber-900 dark:border-amber-950 dark:text-amber-400'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className="font-mono">{evt.type}</span>
                          <span>·</span>
                          <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] opacity-80">Attempt: <span className="font-mono">{evt.attemptId.substring(0, 15)}...</span></p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${evt.severity === 'CRITICAL' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {evt.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Console */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-500" />
                <span>Quick Actions Console</span>
              </h3>
              
              <div className="space-y-3 text-xs">
                <button
                  onClick={() => setActiveTab('teachers')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 transition cursor-pointer"
                >
                  <span className="font-semibold">Review Instructor Status</span>
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                </button>

                <button
                  onClick={() => setActiveTab('subjects')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 transition cursor-pointer"
                >
                  <span className="font-semibold">Add Course Subjects</span>
                  <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 transition cursor-pointer"
                >
                  <span className="font-semibold">View Audit Trail Logs</span>
                  <Activity className="h-3.5 w-3.5 text-indigo-500" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TEACHERS MANAGE MODULE */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Subject allocation panel */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-indigo-500" />
                <span>Subject Allocation</span>
              </h3>

              <form onSubmit={handleAssignSubjects} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Select Instructor</label>
                  <select
                    value={selectedTeacherId}
                    required
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      const t = teachers.find(x => x.uid === e.target.value);
                      setTeacherSubjects(t?.subjects || []);
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="" className="dark:bg-slate-900">Select teacher...</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid} className="dark:bg-slate-900">{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>

                {selectedTeacherId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned Subject Scopes</label>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                      {subjects.map(s => {
                        const isChecked = teacherSubjects.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer font-medium p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeacherSubjects([...teacherSubjects, s.id]);
                                } else {
                                  setTeacherSubjects(teacherSubjects.filter(id => id !== s.id));
                                }
                              }}
                              className="accent-indigo-600"
                            />
                            <span>{s.name} ({s.id})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedTeacherId}
                  className="w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white shadow hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  Confirm Subject Scope
                </button>
              </form>
            </div>

            {/* Teacher Roster list */}
            <div className="lg:col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">Instructor Roster</h3>
              
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="py-2.5">Name</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Assigned Subjects</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.uid} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                        <td className="py-3 font-semibold">{t.name}</td>
                        <td className="py-3 text-slate-500 font-mono">{t.email}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                            {t.subjects && t.subjects.length > 0 ? (
                              t.subjects.map(subId => (
                                <span key={subId} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-semibold">{subId}</span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`font-semibold font-mono text-[10px] uppercase ${t.active ? 'text-emerald-600' : 'text-red-500'}`}>
                            {t.active ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => toggleUserActive(t.uid, t.active, 'teacher')}
                            className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer border ${t.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                          >
                            {t.active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STUDENTS MANAGE MODULE */}
      {activeTab === 'students' && (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold">Student Candidate Rosters</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent pl-8 pr-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 w-[200px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5">Candidate ID</th>
                  <th className="py-2.5">Full Name</th>
                  <th className="py-2.5">Email Address</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.studentId?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(s => (
                    <tr key={s.uid} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                      <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{s.studentId || 'N/A'}</td>
                      <td className="py-3 font-semibold">{s.name}</td>
                      <td className="py-3 text-slate-500 font-mono">{s.email}</td>
                      <td className="py-3">
                        <span className={`font-semibold font-mono text-[10px] uppercase ${s.active ? 'text-emerald-600' : 'text-red-500'}`}>
                          {s.active ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => toggleUserActive(s.uid, s.active, 'student')}
                          className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer border ${s.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {s.active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBJECTS COURSE MANAGE MODULE */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">Add Course Subject</h3>
            
            <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Code / ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MATH_101, PHYS_202"
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Mathematics I"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Description</label>
                <textarea
                  placeholder="Enter a brief overview of topics..."
                  rows={3}
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white shadow hover:bg-indigo-700 transition cursor-pointer"
              >
                Create Subject
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">Course Subject Codes</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {subjects.map(s => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.id}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{s.name}</h4>
                  <p className="mt-1 text-[11px] text-slate-400 leading-normal">{s.description || 'No description provided.'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECURITY AND AUDIT TRAIL LOGS MODULE */}
      {activeTab === 'security' && (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-xs">
          <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500 animate-pulse" />
            <span>Administrative Audit Log Trail</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Actor</th>
                  <th className="py-2.5">Action Event</th>
                  <th className="py-2.5">Target</th>
                  <th className="py-2.5">Message / Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                    <td className="py-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{log.actorEmail}</td>
                    <td className="py-3">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] tracking-tight text-slate-600 dark:text-slate-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-500">{log.targetId.substring(0, 10)}...</td>
                    <td className="py-3 text-slate-400 leading-normal">{log.metadata || 'No description.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
