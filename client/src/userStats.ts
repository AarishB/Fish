import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';

export async function saveUserProfile(user: FirebaseUser): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    // Re-login: only refresh mutable profile fields, leave stats/isPlus/createdAt untouched
    await setDoc(ref, {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
    }, { merge: true });
  } else {
    // First login: create full document with default stats
    await setDoc(ref, {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      isPlus: false,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
      createdAt: serverTimestamp(),
    });
  }
}

export async function recordGameResult(uid: string, won: boolean): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    gamesPlayed: increment(1),
    ...(won ? { wins: increment(1) } : { losses: increment(1) }),
  });
}
