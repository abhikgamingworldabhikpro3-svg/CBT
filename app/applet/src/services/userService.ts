import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { User, UserRole } from '../types';
import { handleFirestoreError, OperationType } from './dbService';
import { auditService } from './auditService';

export const userService = {
  async getUserProfile(uid: string): Promise<User | null> {
    const path = `users/${uid}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async createUserProfile(uid: string, name: string, email: string, role: UserRole, studentId?: string): Promise<User> {
    const path = `users/${uid}`;
    const userProfile: User = {
      uid,
      name,
      email,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(role === 'student' ? { studentId: studentId || `STU-${Date.now().toString().slice(-6)}` } : {}),
      ...(role === 'teacher' ? { subjects: [] } : {})
    };

    try {
      await setDoc(doc(db, 'users', uid), userProfile);
      await auditService.log('USER_CREATED', uid, { email, role });
      return userProfile;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async updateUserStatus(uid: string, active: boolean): Promise<void> {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        active,
        updatedAt: new Date().toISOString()
      });
      await auditService.log('USER_STATUS_UPDATED', uid, { active });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async updateTeacherSubjects(uid: string, subjects: string[]): Promise<void> {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        subjects,
        updatedAt: new Date().toISOString()
      });
      await auditService.log('TEACHER_SUBJECTS_ASSIGNED', uid, { subjects });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getAllUsersByRole(role: UserRole): Promise<User[]> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const querySnap = await getDocs(q);
      const results: User[] = [];
      querySnap.forEach(docSnap => {
        results.push(docSnap.data() as User);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async getAllUsers(): Promise<User[]> {
    const path = 'users';
    try {
      const querySnap = await getDocs(collection(db, 'users'));
      const results: User[] = [];
      querySnap.forEach(docSnap => {
        results.push(docSnap.data() as User);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  async createSubject(name: string, description?: string): Promise<any> {
    const subjectId = `sub_${Date.now()}`;
    const path = `subjects/${subjectId}`;
    const subData = {
      id: subjectId,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'subjects', subjectId), subData);
      await auditService.log('SUBJECT_CREATED', subjectId, { name });
      return subData;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async getAllSubjects(): Promise<any[]> {
    const path = 'subjects';
    try {
      const querySnap = await getDocs(collection(db, 'subjects'));
      const results: any[] = [];
      querySnap.forEach(docSnap => {
        results.push(docSnap.data());
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }
};
