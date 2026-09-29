import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Exam, Assignment } from '../types';
import { handleFirestoreError, OperationType } from './dbService';
import { auditService } from './auditService';

export const examService = {
  async getExam(id: string): Promise<Exam | null> {
    const path = `exams/${id}`;
    try {
      const snap = await getDoc(doc(db, 'exams', id));
      if (snap.exists()) {
        return snap.data() as Exam;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async createExam(exam: Omit<Exam, 'createdAt' | 'updatedAt'>): Promise<Exam> {
    const path = `exams/${exam.id}`;
    const fullExam: Exam = {
      ...exam,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'exams', exam.id), fullExam);
      await auditService.log('EXAM_CREATED', exam.id, { title: exam.title, subjectId: exam.subjectId });
      return fullExam;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async updateExam(id: string, fields: Partial<Exam>): Promise<void> {
    const path = `exams/${id}`;
    try {
      await updateDoc(doc(db, 'exams', id), {
        ...fields,
        updatedAt: new Date().toISOString()
      });
      await auditService.log('EXAM_UPDATED', id, fields);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async deleteExam(id: string): Promise<void> {
    const path = `exams/${id}`;
    try {
      await deleteDoc(doc(db, 'exams', id));
      await auditService.log('EXAM_DELETED', id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getAllExams(): Promise<Exam[]> {
    const path = 'exams';
    try {
      const snap = await getDocs(collection(db, 'exams'));
      const list: Exam[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Exam);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async validateAndPublishExam(id: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const exam = await this.getExam(id);
    if (!exam) {
      return { isValid: false, errors: ['Exam does not exist'] };
    }

    if (!exam.title || exam.title.trim().length < 2) {
      errors.push('Exam title must be at least 2 characters.');
    }
    if (exam.duration <= 0) {
      errors.push('Duration must be greater than 0 minutes.');
    }
    if (exam.questionIds.length === 0) {
      errors.push('The exam must contain at least 1 question before publishing.');
    }
    if (new Date(exam.startAt).getTime() >= new Date(exam.endAt).getTime()) {
      errors.push('Exam end date/time must be after the start date/time.');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    await this.updateExam(id, { status: 'published' });
    await auditService.log('EXAM_PUBLISHED', id);
    return { isValid: true, errors: [] };
  },

  async assignExamToStudents(examId: string, studentIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const studentId of studentIds) {
      const assignmentId = `${studentId}_${examId}`;
      const assignmentRef = doc(db, 'assignments', assignmentId);
      
      const assignment: Assignment = {
        id: assignmentId,
        examId,
        studentId,
        status: 'assigned',
        assignedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      batch.set(assignmentRef, assignment);
    }

    try {
      await batch.commit();
      await auditService.log('EXAM_ASSIGNED', examId, { count: studentIds.length });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'assignments_batch');
    }
  },

  async getAssignmentsForStudent(studentId: string): Promise<Assignment[]> {
    const path = 'assignments';
    try {
      const q = query(collection(db, 'assignments'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      const list: Assignment[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Assignment);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getAllAssignments(): Promise<Assignment[]> {
    const path = 'assignments';
    try {
      const snap = await getDocs(collection(db, 'assignments'));
      const list: Assignment[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Assignment);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }
};
