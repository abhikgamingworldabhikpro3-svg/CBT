import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Question, QuestionAnswerKey, QuestionType, DifficultyType } from '../types';
import { handleFirestoreError, OperationType } from './dbService';
import { auditService } from './auditService';

export const questionService = {
  async getQuestion(id: string): Promise<Question | null> {
    const path = `questions/${id}`;
    try {
      const snap = await getDoc(doc(db, 'questions', id));
      if (snap.exists()) {
        return snap.data() as Question;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async getQuestionAnswerKey(id: string): Promise<QuestionAnswerKey | null> {
    const path = `questions/${id}/keys/answerKey`;
    try {
      const snap = await getDoc(doc(db, 'questions', id, 'keys', 'answerKey'));
      if (snap.exists()) {
        return snap.data() as QuestionAnswerKey;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async createQuestion(
    subjectId: string,
    topic: string,
    type: QuestionType,
    questionText: string,
    options: string[],
    correctAnswers: string[],
    marks: number,
    negativeMarks: number,
    difficulty: DifficultyType,
    explanation: string,
    createdBy: string
  ): Promise<Question> {
    const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const questionPath = `questions/${id}`;
    const keyPath = `questions/${id}/keys/answerKey`;

    // Separate the public text from the private key
    const questionDoc: Question = {
      id,
      subjectId,
      topic: topic || 'General',
      type,
      questionText,
      options: options || [],
      marks,
      negativeMarks,
      difficulty,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const keyDoc: QuestionAnswerKey = {
      questionId: id,
      correctAnswers,
      explanation: explanation || ''
    };

    try {
      // Save public details
      await setDoc(doc(db, 'questions', id), questionDoc);
      // Save private answer keys
      await setDoc(doc(db, 'questions', id, 'keys', 'answerKey'), keyDoc);

      await auditService.log('QUESTION_CREATED', id, { subjectId, type });
      return questionDoc;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, questionPath);
    }
  },

  async updateQuestion(
    id: string,
    fields: Partial<Question>,
    correctAnswers?: string[],
    explanation?: string
  ): Promise<void> {
    const questionPath = `questions/${id}`;
    const keyPath = `questions/${id}/keys/answerKey`;

    try {
      await updateDoc(doc(db, 'questions', id), {
        ...fields,
        updatedAt: new Date().toISOString()
      });

      if (correctAnswers !== undefined || explanation !== undefined) {
        const updateObj: Partial<QuestionAnswerKey> = {};
        if (correctAnswers !== undefined) updateObj.correctAnswers = correctAnswers;
        if (explanation !== undefined) updateObj.explanation = explanation;
        await setDoc(doc(db, 'questions', id, 'keys', 'answerKey'), updateObj, { merge: true });
      }

      await auditService.log('QUESTION_UPDATED', id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, questionPath);
    }
  },

  async deleteQuestion(id: string): Promise<void> {
    const questionPath = `questions/${id}`;
    try {
      await deleteDoc(doc(db, 'questions', id));
      await deleteDoc(doc(db, 'questions', id, 'keys', 'answerKey'));
      await auditService.log('QUESTION_DELETED', id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, questionPath);
    }
  },

  async getAllQuestions(): Promise<Question[]> {
    const path = 'questions';
    try {
      const snap = await getDocs(collection(db, 'questions'));
      const list: Question[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Question);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async importQuestionsCsv(csvText: string, subjectId: string, createdBy: string): Promise<{ success: number; errors: string[] }> {
    const lines = csvText.split('\n');
    let successCount = 0;
    const errors: string[] = [];

    // Header validation expected: QuestionText,Type,Options(comma-separated),CorrectAnswers(comma-separated),Marks,NegativeMarks,Difficulty,Topic,Explanation
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handling basic comma splitting or simplistic quotes)
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());

      if (parts.length < 7) {
        errors.push(`Row ${i}: Insufficient columns. Minimum required: 7 columns.`);
        continue;
      }

      const [questionText, typeStr, optionsStr, correctStr, marksStr, negMarksStr, difficultyStr, topicStr, explanationStr] = parts;

      const type = typeStr.toLowerCase() as QuestionType;
      if (!['single-choice', 'multiple-choice', 'true-false', 'numerical'].includes(type)) {
        errors.push(`Row ${i}: Invalid question type "${typeStr}".`);
        continue;
      }

      const options = optionsStr ? optionsStr.split('|').map(o => o.trim()) : [];
      const correctAnswers = correctStr ? correctStr.split('|').map(c => c.trim()) : [];
      const marks = parseFloat(marksStr) || 1;
      const negativeMarks = parseFloat(negMarksStr) || 0;
      const difficulty = (difficultyStr.toLowerCase() || 'medium') as DifficultyType;
      const topic = topicStr || 'Imported';
      const explanation = explanationStr || '';

      // Validate
      if (!questionText) {
        errors.push(`Row ${i}: Question text is empty.`);
        continue;
      }

      if ((type === 'single-choice' || type === 'multiple-choice') && options.length < 2) {
        errors.push(`Row ${i}: Multiple choice questions must have at least 2 options split by "|".`);
        continue;
      }

      if (correctAnswers.length === 0) {
        errors.push(`Row ${i}: Correct answers are empty.`);
        continue;
      }

      try {
        await this.createQuestion(
          subjectId,
          topic,
          type,
          questionText,
          options,
          correctAnswers,
          marks,
          negativeMarks,
          difficulty,
          explanation,
          createdBy
        );
        successCount++;
      } catch (err) {
        errors.push(`Row ${i}: Failed to save question: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { success: successCount, errors };
  }
};
