export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  studentId?: string; // only for students
  subjects?: string[]; // only for teachers (subject IDs)
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'single-choice' | 'multiple-choice' | 'true-false' | 'numerical';
export type DifficultyType = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  subjectId: string;
  topic?: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // MCQs option list
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyType;
  explanation?: string;
  imageUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Separate answer key interface so we don't expose keys to students
export interface QuestionAnswerKey {
  questionId: string;
  correctAnswers: string[]; // Options index e.g. ["0"] or multiple for multiple choice, ["true"] / ["false"] for true/false, or string number for numerical
  explanation?: string;
}

export type ExamStatus = 'draft' | 'published';
export type ResultReleaseType = 'immediate' | 'manual';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  subjectId: string;
  duration: number; // in minutes
  startAt: string; // ISO date
  endAt: string; // ISO date
  totalMarks: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  autoSubmit: boolean;
  resultRelease: ResultReleaseType;
  status: ExamStatus;
  questionIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string; // studentId_examId
  examId: string;
  studentId: string;
  status: 'assigned' | 'started' | 'completed';
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type AttemptStatus = 'started' | 'submitted';

export interface Attempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  deadline: string;
  submittedAt?: string;
  status: AttemptStatus;
  score?: number;
  percentage?: number;
  accuracy?: number; // percentage of correct answers
  violations: number; // violation count
  resultStatus: 'pending' | 'released';
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  attemptId: string;
  studentId: string;
  examId: string;
  questionId: string;
  answer: string[]; // answers saved as array of strings
  savedAt: string;
}

export type ProctoringEventType =
  | 'FULLSCREEN_EXIT'
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FACE_NOT_DETECTED'
  | 'MULTIPLE_FACES'
  | 'CAMERA_DISABLED'
  | 'MICROPHONE_DISABLED'
  | 'SUSPICIOUS_SHORTCUT'
  | 'NETWORK_INTERRUPTION'
  | 'EXAM_TIMEOUT';

export interface ProctoringEvent {
  id: string;
  attemptId: string;
  studentId: string;
  examId: string;
  type: ProctoringEventType;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata: Record<string, any>;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  timestamp: string;
  targetId?: string;
  metadata?: Record<string, any>;
}
