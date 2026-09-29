import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Exam, ExamStatus } from '../types';

export const examService = {
  async createExam(exam: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
    const id = `exam_${Date.now()}`;
    const path = `exams/${id}`;
    try {
      const newExam: Exam = {
        ...exam,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any;
      
      await setDoc(doc(db, 'exams', id), newExam);
      return {
        ...newExam,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Exam;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateExam(id: string, updates: Partial<Exam>): Promise<void> {
    const path = `exams/${id}`;
    try {
      const docRef = doc(db, 'exams', id);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getExam(id: string): Promise<Exam | null> {
    const path = `exams/${id}`;
    try {
      const snapshot = await getDoc(doc(db, 'exams', id));
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        } as Exam;
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getAllExams(): Promise<Exam[]> {
    const path = 'exams';
    try {
      const snapshot = await getDocs(collection(db, 'exams'));
      const list: Exam[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        } as Exam);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getExamsBySubject(subjectId: string): Promise<Exam[]> {
    const path = 'exams';
    try {
      const q = query(collection(db, 'exams'), where('subjectId', '==', subjectId));
      const snapshot = await getDocs(q);
      const list: Exam[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        } as Exam);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getAssignedExamsForStudent(studentUid: string): Promise<Exam[]> {
    const path = 'exams';
    try {
      const querySnapshot = await getDocs(collection(db, 'exams'));
      const list: Exam[] = [];
      querySnapshot.forEach((d) => {
        const data = d.data();
        // Return if scheduled/active/ended
        if (data.status !== 'draft') {
          // If assignedStudentIds is empty, it means assigned to everyone
          if (!data.assignedStudentIds || data.assignedStudentIds.length === 0 || data.assignedStudentIds.includes(studentUid)) {
            list.push({
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            } as Exam);
          }
        }
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};
