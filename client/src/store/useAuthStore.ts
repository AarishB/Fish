import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthStore {
  user: FirebaseUser | null;
  isPlus: boolean;
  loading: boolean;
  photoURL: string;
  username: string;
  setUser: (user: FirebaseUser | null) => void;
  setIsPlus: (v: boolean) => void;
  setLoading: (loading: boolean) => void;
  setPhotoURL: (v: string) => void;
  setUsername: (v: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isPlus: false,
  loading: true,
  photoURL: '',
  username: '',
  setUser: (user) => set({ user }),
  setIsPlus: (isPlus) => set({ isPlus }),
  setLoading: (loading) => set({ loading }),
  setPhotoURL: (photoURL) => set({ photoURL }),
  setUsername: (username) => set({ username }),
}));
