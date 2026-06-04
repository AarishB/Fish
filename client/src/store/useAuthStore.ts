import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthStore {
  user: FirebaseUser | null;
  isPlus: boolean;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setIsPlus: (v: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isPlus: false,
  loading: true,
  setUser: (user) => set({ user }),
  setIsPlus: (isPlus) => set({ isPlus }),
  setLoading: (loading) => set({ loading }),
}));
