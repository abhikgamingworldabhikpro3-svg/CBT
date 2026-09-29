export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  studentId?: string; // Only for student role
  subjects?: string[]; // Subject IDs, only for teacher role
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  createdAt: Date | any;
}

export type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'numerical';

export interface Question {
  id: string;
  subjectId: string;
  topic: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // A, B, C, D (for MCQ)
  correctAnswers: string[]; // Options indexes/values or ["True"]/["False"] or ["42"]
  tolerance?: number; // For numerical tolerance
  marks: number;
  negativeMarks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  imageUrl?: string;
  createdBy: string;
  createdAt: Date | any;
}

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  description: string;
  instructions: string;
  duration: number; // in minutes
  startAt: string; // ISO string
  endAt: string; // ISO string
  totalMarks: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  autoSubmit: boolean;
  resultRelease: 'immediate' | 'manual';
  status: ExamStatus;
  questionIds: string[];
  assignedStudentIds: string[]; // empty means all students
  createdBy: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: Date | any;
  deadline: Date | any;
  submittedAt?: Date | any;
  status: 'started' | 'submitted' | 'expired';
  answersSaved: Record<string, string[]>; // questionId -> response
  score?: number;
  percentage?: number;
  accuracy?: number; // percentage of correct questions out of attempted
  evaluated?: boolean;
}

export interface ProctoringEvent {
  id?: string;
  attemptId: string;
  studentId: string;
  examId: string;
  type: 'FULLSCREEN_EXIT' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'CAMERA_DISABLED' | 'MICROPHONE_DISABLED' | 'SUSPICIOUS_SHORTCUT' | 'NETWORK_INTERRUPTION' | 'EXAM_TIMEOUT';
  timestamp: Date | any;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: string;
}

export interface AuditLog {
  id?: string;
  actorId: string;
  actorEmail: string;
  action: 'ADMIN_LOGIN' | 'TEACHER_CREATED' | 'STUDENT_CREATED' | 'EXAM_CREATED' | 'EXAM_UPDATED' | 'EXAM_PUBLISHED' | 'EXAM_ASSIGNED' | 'ATTEMPT_STARTED' | 'ATTEMPT_SUBMITTED' | 'RESULT_GENERATED' | 'USER_DISABLED' | 'SECURITY_EVENT';
  timestamp: Date | any;
  targetId: string;
  metadata?: string;
}
