import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0lP82AEwRPy2B-_ME4UtM7zEeVCxzIyU",
  authDomain: "momo-4139d.firebaseapp.com",
  projectId: "momo-4139d",
  storageBucket: "momo-4139d.firebasestorage.app",
  messagingSenderId: "623171036700",
  appId: "1:623171036700:web:af5ef2d28d55d3aacb61d9",
  measurementId: "G-KKG67V00VM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore user-scoped collection and document reference helpers
export const getUserStatsRef = (uid) => doc(db, 'users', uid, 'gamification', 'stats');
export const getUserTasksCol = (uid) => collection(db, 'users', uid, 'tasks');
export const getUserPassesCol = (uid) => collection(db, 'users', uid, 'passes');
export const getUserMilestonesCol = (uid) => collection(db, 'users', uid, 'epic_milestones');
export const getUserJournalCol = (uid) => collection(db, 'users', uid, 'journal');

export const getUserType = (user) => {
  if (!user) return 'general';
  const email = (user.email || '').toLowerCase();
  const name = (user.displayName || '').toLowerCase();
  if (email.includes('poojitha') || email.includes('pooja') || name.includes('poojitha') || name.includes('pooja')) {
    return 'poojitha';
  }
  if (email.includes('praneeth') || name.includes('praneeth')) {
    return 'praneeth';
  }
  return 'general';
};

export const getUserFirstName = (user) => {
  if (!user) return 'MoMo';
  if (user.displayName) {
    return user.displayName.split(' ')[0];
  }
  const email = (user.email || '').toLowerCase();
  if (email.includes('poojitha') || email.includes('pooja')) return 'Poojitha';
  if (email.includes('praneeth')) return 'Praneeth';
  return 'User';
};

