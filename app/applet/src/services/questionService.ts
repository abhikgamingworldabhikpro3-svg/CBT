import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Question, QuestionType } from '../types';

export const questionService = {
  async createQuestion(question: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
    const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `questions/${id}`;
    try {
      const newQuestion: Question = {
        ...question,
        id,
        createdAt: serverTimestamp(),
      } as any;
      
      await setDoc(doc(db, 'questions', id), newQuestion);
      return {
        ...newQuestion,
        createdAt: new Date()
      } as Question;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    const path = `questions/${id}`;
    try {
      const docRef = doc(db, 'questions', id);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteQuestion(id: string): Promise<void> {
    const path = `questions/${id}`;
    try {
      await deleteDoc(doc(db, 'questions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getQuestion(id: string): Promise<Question | null> {
    const path = `questions/${id}`;
    try {
      const snapshot = await getDoc(doc(db, 'questions', id));
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        } as Question;
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getAllQuestions(): Promise<Question[]> {
    const path = 'questions';
    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      const list: Question[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        } as Question);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getQuestionsBySubject(subjectId: string): Promise<Question[]> {
    const path = 'questions';
    try {
      const q = query(collection(db, 'questions'), where('subjectId', '==', subjectId));
      const snapshot = await getDocs(q);
      const list: Question[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        } as Question);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // SECURITY ENFORCEMENT: Fetch questions for exam-taking by stripping correct answers!
  async getExamQuestionsForCandidate(questionIds: string[]): Promise<Omit<Question, 'correctAnswers' | 'explanation'>[]> {
    const path = 'questions';
    try {
      const list: Omit<Question, 'correctAnswers' | 'explanation'>[] = [];
      for (const qId of questionIds) {
        const qRef = doc(db, 'questions', qId);
        const qSnap = await getDoc(qRef);
        if (qSnap.exists()) {
          const data = qSnap.data();
          const { correctAnswers, explanation, ...stripped } = data;
          list.push({
            ...stripped,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          } as Omit<Question, 'correctAnswers' | 'explanation'>);
        }
      }
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, path);
    }
  }
};
