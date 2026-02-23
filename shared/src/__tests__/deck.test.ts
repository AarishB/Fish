import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from '../deck';
import { TOTAL_CARDS } from '../constants';

describe('createDeck', () => {
  it('creates exactly 54 cards', () => {
    expect(createDeck()).toHaveLength(TOTAL_CARDS);
  });

  it('has exactly 2 jokers', () => {
    const jokers = createDeck().filter(c => c.kind === 'joker');
    expect(jokers).toHaveLength(2);
  });

  it('has 13 cards per suit (2-7, 8, 9-A)', () => {
    const deck = createDeck();
    const suits = ['hearts', 'clubs', 'diamonds', 'spades'];
    for (const suit of suits) {
      const suitCards = deck.filter(c => c.kind === 'regular' && c.suit === suit);
      expect(suitCards).toHaveLength(13);
    }
  });

  it('has no duplicate card IDs', () => {
    const deck = createDeck();
    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('shuffle', () => {
  it('returns same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(5);
  });

  it('contains same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });
});

describe('deal', () => {
  it('distributes all 54 cards among 4 players', () => {
    const hands = deal(['p1', 'p2', 'p3', 'p4']);
    const total = Object.values(hands).reduce((s, h) => s + h.length, 0);
    expect(total).toBe(54);
  });

  it('gives 4-player game correct card counts (13 or 14)', () => {
    const hands = deal(['p1', 'p2', 'p3', 'p4']);
    const counts = Object.values(hands).map(h => h.length).sort();
    expect(counts).toEqual([13, 13, 14, 14]);
  });

  it('distributes all 54 cards among 6 players', () => {
    const hands = deal(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    const total = Object.values(hands).reduce((s, h) => s + h.length, 0);
    expect(total).toBe(54);
  });

  it('gives 6-player game correct card counts (9)', () => {
    const hands = deal(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    const counts = Object.values(hands).map(h => h.length).sort();
    expect(counts).toEqual([9, 9, 9, 9, 9, 9]);
  });

  it('produces no duplicate cards across hands', () => {
    const hands = deal(['p1', 'p2', 'p3', 'p4']);
    const allCards = Object.values(hands).flat();
    expect(new Set(allCards).size).toBe(allCards.length);
  });
});
