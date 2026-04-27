import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  updateProfile as updateProfileInAuth,
  updatePassword as updatePasswordInAuth
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function ensureUserProfile(user: any) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      username: user.email?.split('@')[0] || user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Житель Саваны',
      photoURL: user.photoURL,
      bio: 'Добро пожаловать в джунгли!',
      lastSeen: new Date().toISOString(),
      status: 'online'
    });
  } else {
    await updateDoc(userRef, {
      lastSeen: new Date().toISOString(),
      status: 'online'
    });
  }
}

export async function signUpWithEmail(email: string, pass: string) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await ensureUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error('Signup Error:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, pass: string) {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await ensureUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error('Signin Email Error:', error);
    throw error;
  }
}

export async function signOut() {
  if (auth.currentUser) {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      status: 'offline',
      lastSeen: new Date().toISOString()
    });
  }
  return auth.signOut();
}

// Error handling helper as per instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export { updateProfileInAuth, updatePasswordInAuth };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
