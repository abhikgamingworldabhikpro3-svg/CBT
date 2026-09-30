import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { User, UserRole, Subject } from '../types';

export const userService = {
  async getUserProfile(uid: string): Promise<User | null> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          uid: data.uid,
          name: data.name,
          email: data.email,
          role: data.role,
          active: data.active,
          studentId: data.studentId,
          subjects: data.subjects || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        } as User;
      }
      return null;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createUserProfile(uid: string, name: string, email: string, role: UserRole, extra: Partial<User> = {}): Promise<User> {
    const path = `users/${uid}`;
    try {
      const newUser: any = {
        uid,
        name,
        email,
        role,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...extra
      };
      
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, newUser);
      
      return {
        ...newUser,
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateUserStatus(uid: string, active: boolean): Promise<void> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, { active, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getAllUsersByRole(role: UserRole): Promise<User[]> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const querySnapshot = await getDocs(q);
      const list: User[] = [];
      querySnapshot.forEach((d) => {
        const data = d.data();
        list.push({
          uid: data.uid,
          name: data.name,
          email: data.email,
          role: data.role,
          active: data.active,
          studentId: data.studentId,
          subjects: data.subjects || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        } as User);
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // Subjects Management
  async createSubject(id: string, name: string, description: string): Promise<Subject> {
    const path = `subjects/${id}`;
    try {
      const sub = {
        id,
        name,
        description,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'subjects', id), sub);
      return sub as any;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getAllSubjects(): Promise<Subject[]> {
    const path = 'subjects';
    try {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const list: Subject[] = [];
      querySnapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id,
          name: data.name,
          description: data.description,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        });
      });
      return list;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateTeacherSubjects(teacherUid: string, subjects: string[]): Promise<void> {
    const path = `users/${teacherUid}`;
    try {
      const docRef = doc(db, 'users', teacherUid);
      await updateDoc(docRef, { subjects, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
