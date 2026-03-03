import { create } from 'zustand';

export type CardBack = 'blue' | 'green' | 'crimson';

interface SettingsStore {
  cardBack: CardBack;
  setCardBack: (back: CardBack) => void;
}

const stored = localStorage.getItem('fish_card_back') as CardBack | null;
const validBacks: CardBack[] = ['blue', 'green', 'crimson'];

export const useSettingsStore = create<SettingsStore>()((set) => ({
  cardBack: validBacks.includes(stored!) ? stored! : 'blue',
  setCardBack: (cardBack) => {
    localStorage.setItem('fish_card_back', cardBack);
    set({ cardBack });
  },
}));
