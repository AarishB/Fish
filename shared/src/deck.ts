import type { Card } from './types';
import { LOW_RANKS, HIGH_RANKS, SUITS } from './constants';

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of [...LOW_RANKS, '8' as const, ...HIGH_RANKS]) {
      cards.push({
        kind: 'regular',
        suit,
        rank,
        id: `${suit}_${rank}`,
      });
    }
  }

  cards.push({ kind: 'joker', rank: 'JOKER_1', id: 'JOKER_1' });
  cards.push({ kind: 'joker', rank: 'JOKER_2', id: 'JOKER_2' });

  return cards; // 54 cards total
}

// Fisher-Yates shuffle; accepts optional seeded RNG for deterministic tests
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distribute 54 cards to N players as evenly as possible.
// Returns a map of playerId → array of card IDs.
export function deal(
  playerIds: string[],
  rng?: () => number
): Record<string, string[]> {
  const n = playerIds.length;
  const deck = shuffle(createDeck(), rng);
  const hands: Record<string, string[]> = {};

  playerIds.forEach(id => (hands[id] = []));
  deck.forEach((card, i) => {
    hands[playerIds[i % n]].push(card.id);
  });

  return hands;
}
