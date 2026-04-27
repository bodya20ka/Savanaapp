import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Add some reasonable defaults for the provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signIn() {
  try {
    // Explicitly set persistence to local to be safe
    await setPersistence(auth, browserLocalPersistence);
    
    console.log('Attempting sign in with popup...');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (!user) throw new Error('No user returned from sign in');
    console.log('Sign in successful:', user.uid);
    
    // Create or update user profile
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        username: user.email?.split('@')[0] || user.uid,
        displayName: user.displayName || 'Житель Саваны',
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
  } catch (error: any) {
    console.error('Detailed SignIn Error:', {
      code: error.code,
      message: error.message,
      customData: error.customData,
      stack: error.stack
    });
    // Re-throw for UI feedback if needed
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
