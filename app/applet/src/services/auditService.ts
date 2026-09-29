import { doc, setDoc, collection, getDocs, query, orderBy, limit, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { AuditLog } from '../types';

export const auditService = {
  async logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const path = `auditLogs/${id}`;
    try {
      const fullLog: AuditLog = {
        ...log,
        id,
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(db, 'auditLogs', id), fullLog);
      return fullLog;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getAllAuditLogs(): Promise<AuditLog[]> {
    const path = 'auditLogs';
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      const list: AuditLog[] = [];
      snap.forEach((d) => {
        list.push(d.data() as AuditLog);
      });
      // Sort by timestamp desc
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};
