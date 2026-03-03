import type { CSSProperties } from 'react';
import type { CardBack } from './store/useSettingsStore';

export interface CardBackDef {
  label: string;
  container: CSSProperties;   // card body background
  pattern: CSSProperties;     // overlay div for texture
  borderColor: string;        // tailwind border class
  symbolColor: string;        // tailwind text class for ✦
  locked?: boolean;
}

export const CARD_BACK_DEFS: Record<string, CardBackDef> = {
  blue: {
    label: 'Classic',
    container: { background: 'linear-gradient(145deg, #1e3a8a 0%, #1e40af 45%, #1d4ed8 100%)' },
    pattern: {},
    borderColor: 'border-blue-500',
    symbolColor: 'text-blue-200',
  },

  green: {
    label: 'Forest',
    container: { background: 'linear-gradient(145deg, #052e16 0%, #065f46 55%, #047857 100%)' },
    pattern: {},
    borderColor: 'border-emerald-500',
    symbolColor: 'text-emerald-200',
  },

  crimson: {
    label: 'Royal',
    container: { background: 'linear-gradient(145deg, #4c0519 0%, #9f1239 50%, #881337 100%)' },
    pattern: {},
    borderColor: 'border-rose-500',
    symbolColor: 'text-rose-200',
  },

  midnight: {
    label: 'Midnight',
    container: { background: 'linear-gradient(145deg, #0f0c29 0%, #1e1b4b 45%, #312e81 100%)' },
    pattern: {
      backgroundImage: 'radial-gradient(circle, rgba(165,180,252,0.18) 1px, transparent 1px)',
      backgroundSize: '13px 15px',
    },
    borderColor: 'border-indigo-400',
    symbolColor: 'text-indigo-200',
    locked: true,
  },

  gold: {
    label: 'Gold',
    container: { background: 'linear-gradient(145deg, #78350f 0%, #b45309 35%, #d97706 65%, #92400e 100%)' },
    pattern: {
      backgroundImage: 'repeating-linear-gradient(60deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 11px)',
    },
    borderColor: 'border-amber-400',
    symbolColor: 'text-amber-100',
    locked: true,
  },

  obsidian: {
    label: 'Obsidian',
    container: { background: 'linear-gradient(145deg, #09090b 0%, #18181b 45%, #27272a 100%)' },
    pattern: {
      backgroundImage: [
        'repeating-linear-gradient(30deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 10px)',
        'repeating-linear-gradient(-30deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 10px)',
      ].join(', '),
    },
    borderColor: 'border-zinc-500',
    symbolColor: 'text-zinc-300',
    locked: true,
  },

  violet: {
    label: 'Violet',
    container: { background: 'linear-gradient(145deg, #2e1065 0%, #4c1d95 45%, #6d28d9 100%)' },
    pattern: {
      backgroundImage: [
        'repeating-linear-gradient(45deg, rgba(167,139,250,0.1) 0px, rgba(167,139,250,0.1) 1px, transparent 1px, transparent 11px)',
        'repeating-linear-gradient(-45deg, rgba(167,139,250,0.1) 0px, rgba(167,139,250,0.1) 1px, transparent 1px, transparent 11px)',
      ].join(', '),
    },
    borderColor: 'border-violet-400',
    symbolColor: 'text-violet-200',
    locked: true,
  },

  ocean: {
    label: 'Ocean',
    container: { background: 'linear-gradient(145deg, #083344 0%, #0c4a6e 40%, #0e7490 100%)' },
    pattern: {
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(103,232,249,0.08) 0px, rgba(103,232,249,0.08) 1px, transparent 1px, transparent 9px)',
    },
    borderColor: 'border-cyan-400',
    symbolColor: 'text-cyan-200',
    locked: true,
  },
};

export const UNLOCKED_BACKS: CardBack[] = ['blue', 'green', 'crimson'];
export const ALL_BACK_IDS = Object.keys(CARD_BACK_DEFS);
