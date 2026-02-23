import { describe, it, expect } from 'vitest';
import { applyAsk, applyCallSet, checkWin } from '../gameLogic';
import type { GameState } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'test',
    phase: 'in_progress',
    difficulty: 'normal',
    players: [
      { id: 'p1', name: 'Player1', teamId: 'A', seatIndex: 0, isBot: false, cardCount: 3 },
      { id: 'p2', name: 'Player2', teamId: 'B', seatIndex: 1, isBot: false, cardCount: 3 },
      { id: 'p3', name: 'Player3', teamId: 'A', seatIndex: 2, isBot: false, cardCount: 3 },
      { id: 'p4', name: 'Player4', teamId: 'B', seatIndex: 3, isBot: false, cardCount: 3 },
    ],
    currentTurnPlayerId: 'p1',
    hands: {
      p1: ['hearts_2', 'hearts_3', 'hearts_4'],
      p2: ['hearts_5', 'hearts_6', 'hearts_7'],
      p3: ['clubs_2', 'clubs_3', 'clubs_4'],
      p4: ['clubs_5', 'clubs_6', 'clubs_7'],
    },
    claimedSets: [],
    scores: { A: 0, B: 0 },
    lastAction: null,
    turnNumber: 1,
    askHistory: [],
    ...overrides,
  };
}

describe('applyAsk', () => {
  it('transfers card and keeps turn on success', () => {
    const state = makeState();
    const { newState, result } = applyAsk(state, {
      type: 'ask',
      askingPlayerId: 'p1',
      targetPlayerId: 'p2',
      cardId: 'hearts_5',
    });

    expect(result.success).toBe(true);
    expect(result.cardTransferred).toBe(true);
    expect(result.newTurnPlayerId).toBe('p1');
    expect(newState.hands['p1']).toContain('hearts_5');
    expect(newState.hands['p2']).not.toContain('hearts_5');
    expect(newState.currentTurnPlayerId).toBe('p1');
  });

  it('passes turn to target on failure', () => {
    const state = makeState();
    const { newState, result } = applyAsk(state, {
      type: 'ask',
      askingPlayerId: 'p1',
      targetPlayerId: 'p2',
      cardId: 'clubs_9', // p2 doesn't have this
    });

    expect(result.success).toBe(false);
    expect(result.cardTransferred).toBe(false);
    expect(result.newTurnPlayerId).toBe('p2');
    expect(newState.currentTurnPlayerId).toBe('p2');
  });

  it('updates card counts correctly', () => {
    const state = makeState();
    const { newState } = applyAsk(state, {
      type: 'ask',
      askingPlayerId: 'p1',
      targetPlayerId: 'p2',
      cardId: 'hearts_5',
    });

    const p1 = newState.players.find(p => p.id === 'p1')!;
    const p2 = newState.players.find(p => p.id === 'p2')!;
    expect(p1.cardCount).toBe(4);
    expect(p2.cardCount).toBe(2);
  });

  it('appends to ask history', () => {
    const state = makeState();
    const { newState } = applyAsk(state, {
      type: 'ask',
      askingPlayerId: 'p1',
      targetPlayerId: 'p2',
      cardId: 'hearts_5',
    });
    expect(newState.askHistory).toHaveLength(1);
    expect(newState.askHistory[0].cardId).toBe('hearts_5');
  });
});

describe('applyCallSet', () => {
  it('awards set to caller team when correct', () => {
    const state = makeState();
    const assignment = {
      'hearts_2': 'p1',
      'hearts_3': 'p1',
      'hearts_4': 'p1',
      'hearts_5': 'p2', // wrong team but correct location test
      'hearts_6': 'p2',
      'hearts_7': 'p2',
    };
    // Call by p1 (Team A) — p1 has 2,3,4 and p2 has 5,6,7
    // Assignment correctly places cards with their actual holders
    // But p2 is on team B, so it should be considered wrong in validation
    // Here we test the logic layer: if assignment matches reality, caller wins
    const correctAssignment = {
      'hearts_2': 'p1',
      'hearts_3': 'p1',
      'hearts_4': 'p1',
      'hearts_5': 'p2',
      'hearts_6': 'p2',
      'hearts_7': 'p2',
    };
    // Note: validation (which player can be assigned) is in validateCallSet
    // applyCallSet just checks if the cards are actually where assigned
    const { newState, result } = applyCallSet(state, {
      type: 'call_set',
      callingPlayerId: 'p1',
      setId: 'low_hearts',
      assignment: correctAssignment,
    });

    // The assignment matches actual card locations, so p1's team (A) should win
    expect(result.success).toBe(true);
    expect(result.winningTeam).toBe('A');
    expect(newState.scores.A).toBe(1);
    expect(newState.claimedSets).toHaveLength(1);
  });

  it('awards set to opposing team when assignment is wrong', () => {
    const state = makeState();
    const wrongAssignment = {
      'hearts_2': 'p1',
      'hearts_3': 'p1',
      'hearts_4': 'p1',
      'hearts_5': 'p1', // wrong — p2 has this
      'hearts_6': 'p2',
      'hearts_7': 'p2',
    };

    const { newState, result } = applyCallSet(state, {
      type: 'call_set',
      callingPlayerId: 'p1',
      setId: 'low_hearts',
      assignment: wrongAssignment,
    });

    expect(result.success).toBe(false);
    expect(result.winningTeam).toBe('B'); // opponent team wins
    expect(newState.scores.B).toBe(1);
  });

  it('removes all set cards from play', () => {
    const state = makeState();
    const assignment = {
      'hearts_2': 'p1', 'hearts_3': 'p1', 'hearts_4': 'p1',
      'hearts_5': 'p2', 'hearts_6': 'p2', 'hearts_7': 'p2',
    };
    const { newState } = applyCallSet(state, {
      type: 'call_set',
      callingPlayerId: 'p1',
      setId: 'low_hearts',
      assignment,
    });

    const allCards = Object.values(newState.hands).flat();
    expect(allCards).not.toContain('hearts_2');
    expect(allCards).not.toContain('hearts_7');
  });
});

describe('checkWin', () => {
  it('returns null when no team has 5 sets', () => {
    const state = makeState({ scores: { A: 2, B: 2 }, claimedSets: [] });
    expect(checkWin(state)).toBeNull();
  });

  it('returns A when team A has 5 sets', () => {
    const state = makeState({ scores: { A: 5, B: 1 } });
    expect(checkWin(state)).toBe('A');
  });

  it('returns B when team B has 5 sets', () => {
    const state = makeState({ scores: { A: 0, B: 5 } });
    expect(checkWin(state)).toBe('B');
  });

  it('returns team with more sets when all 9 claimed', () => {
    const claimed = Array.from({ length: 9 }, (_, i) => ({
      setId: 'low_hearts' as const,
      wonByTeam: 'A' as const,
      calledBy: 'p1',
      wasCounter: false,
    }));
    const state = makeState({ scores: { A: 6, B: 3 }, claimedSets: claimed });
    expect(checkWin(state)).toBe('A');
  });
});
