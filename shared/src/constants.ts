import type { SetDefinition, SetId, GameDifficulty } from './types';

export const LOW_RANKS = ['2', '3', '4', '5', '6', '7'] as const;
export const HIGH_RANKS = ['9', '10', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['hearts', 'clubs', 'diamonds', 'spades'] as const;

export const SET_DEFINITIONS: Record<SetId, SetDefinition> = {
  low_hearts:    { id: 'low_hearts',    label: 'Low Hearts',    cardIds: LOW_RANKS.map(r => `hearts_${r}`)    },
  low_clubs:     { id: 'low_clubs',     label: 'Low Clubs',     cardIds: LOW_RANKS.map(r => `clubs_${r}`)     },
  low_diamonds:  { id: 'low_diamonds',  label: 'Low Diamonds',  cardIds: LOW_RANKS.map(r => `diamonds_${r}`)  },
  low_spades:    { id: 'low_spades',    label: 'Low Spades',    cardIds: LOW_RANKS.map(r => `spades_${r}`)    },
  high_hearts:   { id: 'high_hearts',   label: 'High Hearts',   cardIds: HIGH_RANKS.map(r => `hearts_${r}`)   },
  high_clubs:    { id: 'high_clubs',    label: 'High Clubs',    cardIds: HIGH_RANKS.map(r => `clubs_${r}`)    },
  high_diamonds: { id: 'high_diamonds', label: 'High Diamonds', cardIds: HIGH_RANKS.map(r => `diamonds_${r}`) },
  high_spades:   { id: 'high_spades',   label: 'High Spades',   cardIds: HIGH_RANKS.map(r => `spades_${r}`)   },
  middle: {
    id: 'middle',
    label: 'Middle (8s + Jokers)',
    cardIds: ['hearts_8', 'clubs_8', 'diamonds_8', 'spades_8', 'JOKER_1', 'JOKER_2'],
  },
};

export const ALL_SET_IDS = Object.keys(SET_DEFINITIONS) as SetId[];
export const WINNING_SETS = 5;
export const TOTAL_SETS = 9;
export const TOTAL_CARDS = 54;
export const REVEAL_CREDITS_PER_GAME = 3;

export function getRevealCredits(difficulty: GameDifficulty): number {
  if (difficulty === 'easy') return 99; // effectively infinite, shown as ∞ in UI
  if (difficulty === 'hard') return 0;
  return 3; // normal
}
