import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Attempt, Answer, Question, QuestionAnswerKey, Exam, Assignment } from '../types';
import { handleFirestoreError, OperationType } from './dbService';
import { auditService } from './auditService';
import { questionService } from './questionService';

export const attemptService = {
  async getAttempt(attemptId: string): Promise<Attempt | null> {
    const path = `attempts/${attemptId}`;
    try {
      const snap = await getDoc(doc(db, 'attempts', attemptId));
      if (snap.exists()) {
        return snap.data() as Attempt;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async getStudentAttempts(studentId: string): Promise<Attempt[]> {
    const path = 'attempts';
    try {
      const q = query(collection(db, 'attempts'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      const list: Attempt[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Attempt);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getAllAttempts(): Promise<Attempt[]> {
    const path = 'attempts';
    try {
      const snap = await getDocs(collection(db, 'attempts'));
      const list: Attempt[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Attempt);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async startAttempt(studentId: string, exam: Exam): Promise<Attempt> {
    const attemptId = `att_${studentId}_${exam.id}_${Date.now()}`;
    const path = `attempts/${attemptId}`;
    
    const startTime = new Date();
    const deadline = new Date(startTime.getTime() + exam.duration * 60 * 1000);

    const attempt: Attempt = {
      id: attemptId,
      examId: exam.id,
      studentId,
      startedAt: startTime.toISOString(),
      deadline: deadline.toISOString(),
      status: 'started',
      violations: 0,
      resultStatus: 'pending',
      createdAt: startTime.toISOString(),
      updatedAt: startTime.toISOString()
    };

    try {
      // Save attempt state
      await setDoc(doc(db, 'attempts', attemptId), attempt);
      
      // Update assignment status
      const assignmentId = `${studentId}_${exam.id}`;
      await updateDoc(doc(db, 'assignments', assignmentId), {
        status: 'started',
        updatedAt: startTime.toISOString()
      });

      await auditService.log('ATTEMPT_STARTED', attemptId, { examId: exam.id, studentId });
      return attempt;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async saveAnswer(attemptId: string, studentId: string, examId: string, questionId: string, answer: string[]): Promise<void> {
    const path = `attempts/${attemptId}/answers/${questionId}`;
    const answerData: Answer = {
      attemptId,
      studentId,
      examId,
      questionId,
      answer,
      savedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'attempts', attemptId, 'answers', questionId), answerData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getSavedAnswers(attemptId: string): Promise<Answer[]> {
    const path = `attempts/${attemptId}/answers`;
    try {
      const snap = await getDocs(collection(db, 'attempts', attemptId, 'answers'));
      const list: Answer[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Answer);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async recordViolation(attemptId: string): Promise<number> {
    const path = `attempts/${attemptId}`;
    try {
      const snap = await getDoc(doc(db, 'attempts', attemptId));
      if (!snap.exists()) return 0;
      const data = snap.data() as Attempt;
      const newViolations = (data.violations || 0) + 1;
      
      await updateDoc(doc(db, 'attempts', attemptId), {
        violations: newViolations,
        updatedAt: new Date().toISOString()
      });

      return newViolations;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async evaluateAndSubmitAttempt(attemptId: string, exam: Exam): Promise<Attempt> {
    const path = `attempts/${attemptId}`;
    
    try {
      // 1. Load attempt and student saved answers
      const attemptSnap = await getDoc(doc(db, 'attempts', attemptId));
      if (!attemptSnap.exists()) {
        throw new Error("Attempt not found");
      }
      const attempt = attemptSnap.data() as Attempt;
      if (attempt.status === 'submitted') {
        return attempt; // Already submitted
      }

      const savedAnswers = await this.getSavedAnswers(attemptId);
      const answerMap = new Map<string, string[]>();
      savedAnswers.forEach(ans => {
        answerMap.set(ans.questionId, ans.answer);
      });

      // 2. Load questions public specifications and evaluations private key
      let totalScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      for (const questionId of exam.questionIds) {
        const question = await questionService.getQuestion(questionId);
        const answerKey = await questionService.getQuestionAnswerKey(questionId);

        if (!question || !answerKey) continue;

        const studentAnswer = answerMap.get(questionId);

        if (!studentAnswer || studentAnswer.length === 0) {
          unansweredCount++;
          continue; // Unanswered questions score 0
        }

        // Evaluate based on question type
        let isCorrect = false;

        if (question.type === 'single-choice' || question.type === 'true-false') {
          // Exactly one match required
          isCorrect = studentAnswer.length === 1 && studentAnswer[0] === answerKey.correctAnswers[0];
        } else if (question.type === 'multiple-choice') {
          // Must match all correct answers exactly and contain no extras
          const correctSet = new Set(answerKey.correctAnswers);
          const studentSet = new Set(studentAnswer);
          
          if (correctSet.size === studentSet.size) {
            isCorrect = [...correctSet].every(item => studentSet.has(item));
          }
        } else if (question.type === 'numerical') {
          // Compare numerical string with tolerance
          const studentNum = parseFloat(studentAnswer[0]);
          const correctNum = parseFloat(answerKey.correctAnswers[0]);
          const explanationText = answerKey.explanation || '';
          
          // Try to extract tolerance from explanation or metadata (default 0.01)
          let tolerance = 0.01;
          const toleranceMatch = explanationText.match(/tolerance:\s*([\d.]+)/i);
          if (toleranceMatch) {
            tolerance = parseFloat(toleranceMatch[1]);
          }

          if (!isNaN(studentNum) && !isNaN(correctNum)) {
            isCorrect = Math.abs(studentNum - correctNum) <= tolerance;
          }
        }

        if (isCorrect) {
          correctCount++;
          totalScore += question.marks;
        } else {
          incorrectCount++;
          totalScore -= question.negativeMarks;
        }
      }

      // Percentage and accuracy math
      const maxPossibleMarks = exam.totalMarks || 1;
      const percentage = Math.round((totalScore / maxPossibleMarks) * 100);
      const accuracy = exam.questionIds.length > 0 
        ? Math.round((correctCount / (correctCount + incorrectCount || 1)) * 100)
        : 0;

      const submittedAt = new Date().toISOString();
      const updatedAttempt: Attempt = {
        ...attempt,
        status: 'submitted',
        submittedAt,
        score: parseFloat(totalScore.toFixed(2)),
        percentage: Math.max(0, percentage),
        accuracy,
        resultStatus: exam.resultRelease === 'immediate' ? 'released' : 'pending',
        updatedAt: submittedAt
      };

      // 3. Save evaluated attempt in attempts collection
      await setDoc(doc(db, 'attempts', attemptId), updatedAttempt);

      // 4. Update student's assignment state to completed
      const assignmentId = `${attempt.studentId}_${exam.id}`;
      await updateDoc(doc(db, 'assignments', assignmentId), {
        status: 'completed',
        updatedAt: submittedAt
      });

      await auditService.log('ATTEMPT_SUBMITTED', attemptId, { 
        examId: exam.id, 
        score: updatedAttempt.score,
        violations: updatedAttempt.violations 
      });

      return updatedAttempt;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
};
