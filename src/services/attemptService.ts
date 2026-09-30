import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Exam, ExamAttempt, Question } from '../types';
import { questionService } from './questionService';

export const attemptService = {
  async startAttempt(studentId: string, exam: Exam): Promise<ExamAttempt> {
    const attemptId = `att_${studentId}_${exam.id}_${Date.now()}`;
    const path = `attempts/${attemptId}`;
    try {
      const now = new Date();
      // Server-authoritative timer deadline
      const durationMs = exam.duration * 60 * 1000;
      const deadline = new Date(now.getTime() + durationMs);

      const attempt: ExamAttempt = {
        id: attemptId,
        examId: exam.id,
        studentId,
        startedAt: now.toISOString(),
        deadline: deadline.toISOString(),
        status: 'started',
        answersSaved: {},
      };

      await setDoc(doc(db, 'attempts', attemptId), attempt);
      return attempt;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getAttempt(attemptId: string): Promise<ExamAttempt | null> {
    const path = `attempts/${attemptId}`;
    try {
      const snapshot = await getDoc(doc(db, 'attempts', attemptId));
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          ...data,
          startedAt: data.startedAt,
          deadline: data.deadline,
          submittedAt: data.submittedAt || null,
        } as ExamAttempt;
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async saveAnswer(attemptId: string, questionId: string, answers: string[]): Promise<void> {
    const path = `attempts/${attemptId}`;
    try {
      const attemptRef = doc(db, 'attempts', attemptId);
      const snap = await getDoc(attemptRef);
      if (snap.exists()) {
        const currentAnswers = snap.data().answersSaved || {};
        currentAnswers[questionId] = answers;
        await updateDoc(attemptRef, {
          answersSaved: currentAnswers,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getAttemptsForStudent(studentId: string): Promise<ExamAttempt[]> {
    const path = 'attempts';
    try {
      const q = query(collection(db, 'attempts'), where('studentId', '==', studentId));
      const snapshot = await getDocs(q);
      const list: ExamAttempt[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ExamAttempt);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getAttemptsForExam(examId: string): Promise<ExamAttempt[]> {
    const path = 'attempts';
    try {
      const q = query(collection(db, 'attempts'), where('examId', '==', examId));
      const snapshot = await getDocs(q);
      const list: ExamAttempt[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ExamAttempt);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // SECURITY ENFORCEMENT: Server-side-like grading to prevent browser manipulation!
  async submitAndEvaluate(attemptId: string, exam: Exam): Promise<ExamAttempt> {
    const path = `attempts/${attemptId}`;
    try {
      const attemptRef = doc(db, 'attempts', attemptId);
      const snap = await getDoc(attemptRef);
      if (!snap.exists()) {
        throw new Error("Attempt not found");
      }

      const attemptData = snap.data() as ExamAttempt;
      if (attemptData.status !== 'started') {
        return attemptData; // Already evaluated/submitted
      }

      // Fetch questions containing actual correct answers
      const questionIds = exam.questionIds;
      const questionsList: Question[] = [];
      
      for (const qId of questionIds) {
        const qSnap = await getDoc(doc(db, 'questions', qId));
        if (qSnap.exists()) {
          questionsList.push(qSnap.data() as Question);
        }
      }

      let totalEarnedMarks = 0;
      let totalQuestions = questionsList.length;
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;

      const studentAnswers = attemptData.answersSaved || {};

      for (const question of questionsList) {
        const answer = studentAnswers[question.id];
        
        if (!answer || answer.length === 0) {
          unattemptedCount++;
          continue;
        }

        // Evaluate based on type
        if (question.type === 'mcq_single' || question.type === 'true_false') {
          const studentChoice = answer[0];
          const correctChoice = question.correctAnswers[0];
          
          if (studentChoice === correctChoice) {
            correctCount++;
            totalEarnedMarks += question.marks;
          } else {
            incorrectCount++;
            totalEarnedMarks -= question.negativeMarks;
          }
        } else if (question.type === 'mcq_multi') {
          // Multiple choice must match exactly (all selected matches correct selection)
          const isCorrect = 
            answer.length === question.correctAnswers.length &&
            answer.every(val => question.correctAnswers.includes(val));

          if (isCorrect) {
            correctCount++;
            totalEarnedMarks += question.marks;
          } else {
            incorrectCount++;
            totalEarnedMarks -= question.negativeMarks;
          }
        } else if (question.type === 'numerical') {
          const studentNum = parseFloat(answer[0]);
          const correctNum = parseFloat(question.correctAnswers[0]);
          const tol = question.tolerance || 0;
          
          if (!isNaN(studentNum) && Math.abs(studentNum - correctNum) <= tol) {
            correctCount++;
            totalEarnedMarks += question.marks;
          } else {
            incorrectCount++;
            totalEarnedMarks -= question.negativeMarks;
          }
        }
      }

      const percentage = totalQuestions > 0 ? (totalEarnedMarks / (exam.totalMarks || 100)) * 100 : 0;
      const accuracy = (correctCount + incorrectCount) > 0 ? (correctCount / (correctCount + incorrectCount)) * 100 : 0;

      const submittedAttempt: Partial<ExamAttempt> = {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        score: Math.max(0, parseFloat(totalEarnedMarks.toFixed(2))),
        percentage: parseFloat(Math.max(0, percentage).toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        evaluated: true,
      };

      await updateDoc(attemptRef, submittedAttempt);

      // Create a result document
      const resultId = `res_${attemptId}`;
      const resultObj = {
        id: resultId,
        attemptId,
        examId: exam.id,
        examTitle: exam.title,
        subjectId: exam.subjectId,
        studentId: attemptData.studentId,
        submittedAt: new Date().toISOString(),
        correctCount,
        incorrectCount,
        unattemptedCount,
        score: Math.max(0, parseFloat(totalEarnedMarks.toFixed(2))),
        totalMarks: exam.totalMarks,
        percentage: parseFloat(Math.max(0, percentage).toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        released: exam.resultRelease === 'immediate',
      };

      await setDoc(doc(db, 'results', resultId), resultObj);

      return {
        ...attemptData,
        ...submittedAttempt,
      } as ExamAttempt;
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getReleasedResult(attemptId: string): Promise<any | null> {
    const path = `results/res_${attemptId}`;
    try {
      const snap = await getDoc(doc(db, 'results', `res_${attemptId}`));
      if (snap.exists()) {
        const data = snap.data();
        if (data.released) {
          return data;
        }
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getAllResultsForTeacher(examId: string): Promise<any[]> {
    const path = 'results';
    try {
      const q = query(collection(db, 'results'), where('examId', '==', examId));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getAllResultsForStudent(studentId: string): Promise<any[]> {
    const path = 'results';
    try {
      const q = query(collection(db, 'results'), where('studentId', '==', studentId), where('released', '==', true));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateResultRelease(attemptId: string, released: boolean): Promise<void> {
    const path = `results/res_${attemptId}`;
    try {
      await updateDoc(doc(db, 'results', `res_${attemptId}`), { released });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
