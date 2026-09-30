import { doc, setDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { ProctoringEvent } from '../types';

export const proctoringService = {
  async logEvent(event: Omit<ProctoringEvent, 'id' | 'timestamp'>): Promise<ProctoringEvent> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const path = `proctoringEvents/${id}`;
    try {
      const fullEvent: ProctoringEvent = {
        ...event,
        id,
        timestamp: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'proctoringEvents', id), fullEvent);
      return fullEvent;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getEventsForAttempt(attemptId: string): Promise<ProctoringEvent[]> {
    const path = 'proctoringEvents';
    try {
      const q = query(collection(db, 'proctoringEvents'), where('attemptId', '==', attemptId));
      const snap = await getDocs(q);
      const list: ProctoringEvent[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ProctoringEvent);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getAllProctoringEvents(): Promise<ProctoringEvent[]> {
    const path = 'proctoringEvents';
    try {
      const snap = await getDocs(collection(db, 'proctoringEvents'));
      const list: ProctoringEvent[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ProctoringEvent);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};
