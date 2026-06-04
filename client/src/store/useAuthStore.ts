import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthStore {
  user: FirebaseUser | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
