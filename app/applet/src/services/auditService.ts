import { collection, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from './dbService';
import { AuditLog } from '../types';

export const auditService = {
  async log(action: string, targetId?: string, metadata?: Record<string, any>): Promise<void> {
    const user = auth.currentUser;
    const path = 'auditLogs';
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const logEntry: AuditLog = {
      id: logId,
      actorId: user?.uid || 'anonymous_system',
      actorEmail: user?.email || 'system',
      action,
      timestamp: new Date().toISOString(),
      targetId,
      metadata
    };

    try {
      await setDoc(doc(collection(db, path), logId), logEntry);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${logId}`);
    }
  }
};
