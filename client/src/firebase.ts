import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDkd0NR59t4V6KIEpn47seMx9H2hZhSu8o',
  authDomain: 'fish-card-game-60d98.firebaseapp.com',
  projectId: 'fish-card-game-60d98',
  storageBucket: 'fish-card-game-60d98.firebasestorage.app',
  messagingSenderId: '1058947674365',
  appId: '1:1058947674365:web:671d9b283de4c7f1ea8e94',
  measurementId: 'G-9WE8KJBRPY',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}
