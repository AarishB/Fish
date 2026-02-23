import type {
  GameState,
  AskAction,
  CallSetAction,
  CounterSetAction,
  AskResult,
  CallSetResult,
  CounterSetResult,
  TeamId,
} from './types';
import { getSetCards } from './sets';
import { WINNING_SETS } from './constants';

function syncCardCounts(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      cardCount: state.hands[p.id]?.length ?? 0,
    })),
  };
}

export function applyAsk(
  state: GameState,
  action: AskAction
): { newState: GameState; result: AskResult } {
  const { askingPlayerId, targetPlayerId, cardId } = action;
  const targetHand = state.hands[targetPlayerId] ?? [];
  const hasCard = targetHand.includes(cardId);

  const askRecord = {
    askingPlayerId,
    targetPlayerId,
    cardId,
    success: hasCard,
    timestamp: Date.now(),
  };

  let newHands = { ...state.hands };

  if (hasCard) {
    newHands = {
      ...newHands,
      [targetPlayerId]: targetHand.filter(c => c !== cardId),
      [askingPlayerId]: [...(newHands[askingPlayerId] ?? []), cardId],
    };
  }

  let newState: GameState = {
    ...state,
    hands: newHands,
    currentTurnPlayerId: hasCard ? askingPlayerId : targetPlayerId,
    turnNumber: state.turnNumber + 1,
    askHistory: [...state.askHistory, askRecord],
  };
  newState = syncCardCounts(newState);

  return {
    newState,
    result: {
      type: 'ask_result',
      success: hasCard,
      newTurnPlayerId: hasCard ? askingPlayerId : targetPlayerId,
      cardTransferred: hasCard,
    },
  };
}

export function applyCallSet(
  state: GameState,
  action: CallSetAction
): { newState: GameState; result: CallSetResult } {
  const { callingPlayerId, setId, assignment } = action;
  const caller = state.players.find(p => p.id === callingPlayerId)!;
  const setCards = getSetCards(setId);

  // Check correctness: every card must actually be with the assigned player
  let correct = true;
  for (const [cardId, assignedPid] of Object.entries(assignment)) {
    if (!state.hands[assignedPid]?.includes(cardId)) {
      correct = false;
      break;
    }
  }

  const winningTeam: TeamId = correct
    ? caller.teamId
    : caller.teamId === 'A' ? 'B' : 'A';

  // Remove all set cards from all hands
  const newHands: Record<string, string[]> = {};
  for (const [pid, hand] of Object.entries(state.hands)) {
    newHands[pid] = hand.filter(c => !setCards.includes(c));
  }

  let newState: GameState = {
    ...state,
    hands: newHands,
    claimedSets: [
      ...state.claimedSets,
      { setId, wonByTeam: winningTeam, calledBy: callingPlayerId, wasCounter: false },
    ],
    scores: {
      ...state.scores,
      [winningTeam]: (state.scores[winningTeam] ?? 0) + 1,
    },
  };
  newState = syncCardCounts(newState);

  return {
    newState,
    result: { type: 'call_set_result', success: correct, winningTeam, setId },
  };
}

export function applyCounterSet(
  state: GameState,
  action: CounterSetAction
): { newState: GameState; result: CounterSetResult } {
  const { callingPlayerId, setId, assignment } = action;
  const caller = state.players.find(p => p.id === callingPlayerId)!;
  const setCards = getSetCards(setId);

  // Verify correctness
  let correct = true;
  for (const [cardId, assignedPid] of Object.entries(assignment)) {
    if (!state.hands[assignedPid]?.includes(cardId)) {
      correct = false;
      break;
    }
  }

  // For a counter-set, the caller's team steals if correct; otherwise the opposing team gets it normally
  const winningTeam: TeamId = correct
    ? caller.teamId
    : caller.teamId === 'A' ? 'B' : 'A';

  const newHands: Record<string, string[]> = {};
  for (const [pid, hand] of Object.entries(state.hands)) {
    newHands[pid] = hand.filter(c => !setCards.includes(c));
  }

  let newState: GameState = {
    ...state,
    hands: newHands,
    claimedSets: [
      ...state.claimedSets,
      { setId, wonByTeam: winningTeam, calledBy: callingPlayerId, wasCounter: true },
    ],
    scores: {
      ...state.scores,
      [winningTeam]: (state.scores[winningTeam] ?? 0) + 1,
    },
  };
  newState = syncCardCounts(newState);

  return {
    newState,
    result: { type: 'counter_set_result', success: correct, winningTeam, setId },
  };
}

export function checkWin(state: GameState): TeamId | null {
  if ((state.scores['A'] ?? 0) >= WINNING_SETS) return 'A';
  if ((state.scores['B'] ?? 0) >= WINNING_SETS) return 'B';
  if (state.claimedSets.length === 9) {
    return (state.scores['A'] ?? 0) >= (state.scores['B'] ?? 0) ? 'A' : 'B';
  }
  return null;
}
