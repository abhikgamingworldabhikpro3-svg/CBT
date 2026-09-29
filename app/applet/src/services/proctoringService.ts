import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { ProctoringEvent, ProctoringEventType } from '../types';
import { handleFirestoreError, OperationType } from './dbService';
import { attemptService } from './attemptService';

export const proctoringService = {
  async logEvent(
    attemptId: string,
    examId: string,
    type: ProctoringEventType,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    metadata: Record<string, any> = {}
  ): Promise<ProctoringEvent> {
    const user = auth.currentUser;
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `proctoringEvents/${eventId}`;

    const event: ProctoringEvent = {
      id: eventId,
      attemptId,
      studentId: user?.uid || 'unknown',
      examId,
      type,
      timestamp: new Date().toISOString(),
      severity,
      metadata
    };

    try {
      // 1. Log to database proctoringEvents collection
      await setDoc(doc(collection(db, 'proctoringEvents'), eventId), event);

      // 2. Increment violation tally in active attempt if severity is warning/critical
      if (severity === 'WARNING' || severity === 'CRITICAL') {
        await attemptService.recordViolation(attemptId);
      }

      return event;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getEventsByAttempt(attemptId: string): Promise<ProctoringEvent[]> {
    const path = 'proctoringEvents';
    try {
      const q = query(collection(db, 'proctoringEvents'), where('attemptId', '==', attemptId));
      const snap = await getDocs(q);
      const list: ProctoringEvent[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as ProctoringEvent);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getAllEvents(): Promise<ProctoringEvent[]> {
    const path = 'proctoringEvents';
    try {
      const snap = await getDocs(collection(db, 'proctoringEvents'));
      const list: ProctoringEvent[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as ProctoringEvent);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }
};
