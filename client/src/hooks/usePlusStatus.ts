import { useAuthStore } from '../store/useAuthStore';

export function usePlusStatus(): boolean {
  return useAuthStore(s => s.isPlus);
}
