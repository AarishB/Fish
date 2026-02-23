import { describe, it, expect } from 'vitest';
import { getSetForCard, getSetCards, getEligibleSets, canAskForCard } from '../sets';

describe('getSetForCard', () => {
  it('maps low hearts cards correctly', () => {
    expect(getSetForCard('hearts_2')).toBe('low_hearts');
    expect(getSetForCard('hearts_7')).toBe('low_hearts');
  });

  it('maps high spades cards correctly', () => {
    expect(getSetForCard('spades_A')).toBe('high_spades');
    expect(getSetForCard('spades_9')).toBe('high_spades');
  });

  it('maps 8s to middle set', () => {
    expect(getSetForCard('hearts_8')).toBe('middle');
    expect(getSetForCard('clubs_8')).toBe('middle');
  });

  it('maps jokers to middle set', () => {
    expect(getSetForCard('JOKER_1')).toBe('middle');
    expect(getSetForCard('JOKER_2')).toBe('middle');
  });

  it('throws for unknown card', () => {
    expect(() => getSetForCard('hearts_8_bad')).toThrow();
  });
});

describe('getSetCards', () => {
  it('returns 6 cards per set', () => {
    expect(getSetCards('low_hearts')).toHaveLength(6);
    expect(getSetCards('high_clubs')).toHaveLength(6);
    expect(getSetCards('middle')).toHaveLength(6);
  });

  it('returns correct middle set', () => {
    const middle = getSetCards('middle');
    expect(middle).toContain('JOKER_1');
    expect(middle).toContain('JOKER_2');
    expect(middle).toContain('hearts_8');
  });
});

describe('getEligibleSets', () => {
  it('returns sets the hand has cards from', () => {
    const hand = ['hearts_5', 'clubs_9'];
    const eligible = getEligibleSets(hand);
    expect(eligible).toContain('low_hearts');
    expect(eligible).toContain('high_clubs');
    expect(eligible).toHaveLength(2);
  });

  it('deduplicates sets', () => {
    const hand = ['hearts_2', 'hearts_5', 'hearts_7'];
    const eligible = getEligibleSets(hand);
    expect(eligible).toHaveLength(1);
    expect(eligible[0]).toBe('low_hearts');
  });
});

describe('canAskForCard', () => {
  it('rejects if player already has the card', () => {
    const result = canAskForCard(['hearts_5'], 'hearts_5');
    expect(result.valid).toBe(false);
  });

  it('rejects if player has no card from that set', () => {
    const result = canAskForCard(['clubs_9'], 'hearts_5');
    expect(result.valid).toBe(false);
  });

  it('accepts a valid ask', () => {
    const result = canAskForCard(['hearts_3'], 'hearts_5');
    expect(result.valid).toBe(true);
  });

  it('accepts asking for joker if holding an 8', () => {
    const result = canAskForCard(['hearts_8'], 'JOKER_1');
    expect(result.valid).toBe(true);
  });
});
