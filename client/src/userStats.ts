import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';

export async function saveUserProfile(user: FirebaseUser): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
    }, { merge: true });
    if (!snap.data()?.username) {
      await initializeUsername(user.uid, user.displayName ?? snap.data()?.displayName ?? 'user');
    }
  } else {
    await setDoc(ref, {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      gamesEndedEarly: 0,
      isPlus: false,
      stripeCustomerId: null,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
      age: null,
      country: '',
      createdAt: serverTimestamp(),
    });
    await initializeUsername(user.uid, user.displayName ?? 'user');
  }
}

export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; age?: number | null; country?: string }
): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, data);
}

export async function recordGameResult(uid: string, won: boolean, earlyEnd = false): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    gamesPlayed: increment(1),
    ...(won ? { wins: increment(1) } : { losses: increment(1) }),
    ...(earlyEnd ? { gamesEndedEarly: increment(1) } : {}),
  });
}

function generateHandle(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = (parts[0] ?? 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lastInitial = parts.length > 1
    ? (parts[parts.length - 1][0] ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
  const base = (first + lastInitial).slice(0, 20);
  return base || 'user' + Math.random().toString(36).slice(2, 6);
}

export async function initializeUsername(uid: string, displayName: string): Promise<string> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.data()?.username as string | undefined;
  if (existing) return existing;

  const base = generateHandle(displayName);
  let candidate = base;
  let attempt = 0;
  while (true) {
    const usernameRef = doc(db, 'usernames', candidate);
    const snap = await getDoc(usernameRef);
    if (!snap.exists()) {
      await setDoc(usernameRef, { uid, createdAt: serverTimestamp() });
      await updateDoc(userRef, { username: candidate });
      return candidate;
    }
    if ((snap.data()?.uid as string) === uid) {
      await updateDoc(userRef, { username: candidate });
      return candidate;
    }
    attempt++;
    candidate = attempt <= 9 ? base + attempt : base + Math.random().toString(36).slice(2, 5);
    if (attempt > 20) {
      candidate = base + Math.random().toString(36).slice(2, 6);
      break;
    }
  }
  // Last attempt — just write it
  await setDoc(doc(db, 'usernames', candidate), { uid, createdAt: serverTimestamp() });
  await updateDoc(userRef, { username: candidate });
  return candidate;
}

export async function checkUsernameAvailable(handle: string, uid: string): Promise<boolean> {
  if (!handle) return false;
  const snap = await getDoc(doc(db, 'usernames', handle.toLowerCase()));
  if (!snap.exists()) return true;
  return (snap.data()?.uid as string) === uid;
}

export async function claimUsername(uid: string, newHandle: string, oldHandle?: string): Promise<void> {
  const cleaned = newHandle.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (!cleaned || cleaned.length < 2) throw new Error('Username must be at least 2 characters.');

  const newRef = doc(db, 'usernames', cleaned);
  const snap = await getDoc(newRef);
  if (snap.exists() && (snap.data()?.uid as string) !== uid) throw new Error('Username already taken.');

  await setDoc(newRef, { uid, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'users', uid), { username: cleaned });
  if (oldHandle && oldHandle !== cleaned) {
    const oldRef = doc(db, 'usernames', oldHandle);
    const oldSnap = await getDoc(oldRef);
    if ((oldSnap.data()?.uid as string) === uid) await deleteDoc(oldRef);
  }
}
