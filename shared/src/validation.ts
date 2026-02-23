import type { GameState, AskAction, CallSetAction, CounterSetAction } from './types';
import { canAskForCard, getSetCards } from './sets';

export function validateAsk(
  state: GameState,
  action: AskAction
): { valid: boolean; reason?: string } {
  const { askingPlayerId, targetPlayerId, cardId } = action;

  if (state.currentTurnPlayerId !== askingPlayerId) {
    return { valid: false, reason: 'It is not your turn.' };
  }

  const asker = state.players.find(p => p.id === askingPlayerId);
  const target = state.players.find(p => p.id === targetPlayerId);

  if (!asker) return { valid: false, reason: 'Asking player not found.' };
  if (!target) return { valid: false, reason: 'Target player not found.' };

  if (asker.teamId === target.teamId) {
    return { valid: false, reason: 'You cannot ask a teammate for a card.' };
  }

  if (target.cardCount === 0) {
    return { valid: false, reason: 'That player has no cards left.' };
  }

  return canAskForCard(state.hands[askingPlayerId] ?? [], cardId);
}

export function validateCallSet(
  state: GameState,
  action: CallSetAction
): { valid: boolean; reason?: string } {
  const { callingPlayerId, setId, assignment } = action;

  const caller = state.players.find(p => p.id === callingPlayerId);
  if (!caller) return { valid: false, reason: 'Calling player not found.' };

  const alreadyClaimed = state.claimedSets.some(cs => cs.setId === setId);
  if (alreadyClaimed) return { valid: false, reason: 'That set has already been claimed.' };

  const setCards = getSetCards(setId);

  if (Object.keys(assignment).length !== setCards.length) {
    return { valid: false, reason: `Must assign all ${setCards.length} cards.` };
  }

  for (const cardId of setCards) {
    if (!(cardId in assignment)) {
      return { valid: false, reason: `Card ${cardId} is missing from the assignment.` };
    }
  }

  const teammates = state.players
    .filter(p => p.teamId === caller.teamId)
    .map(p => p.id);

  for (const assignedPid of Object.values(assignment)) {
    if (!teammates.includes(assignedPid)) {
      return { valid: false, reason: 'You can only assign cards to your own teammates.' };
    }
  }

  return { valid: true };
}

export function validateCounterSet(
  state: GameState,
  action: CounterSetAction
): { valid: boolean; reason?: string } {
  const { callingPlayerId, setId, assignment } = action;

  const caller = state.players.find(p => p.id === callingPlayerId);
  if (!caller) return { valid: false, reason: 'Calling player not found.' };

  const alreadyClaimed = state.claimedSets.some(cs => cs.setId === setId);
  if (alreadyClaimed) return { valid: false, reason: 'That set has already been claimed.' };

  const opposingTeamId = caller.teamId === 'A' ? 'B' : 'A';
  const opponents = state.players
    .filter(p => p.teamId === opposingTeamId)
    .map(p => p.id);

  const setCards = getSetCards(setId);

  // Verify all cards in the set actually belong to the opposing team
  for (const cardId of setCards) {
    const holder = state.players.find(p => state.hands[p.id]?.includes(cardId));
    if (!holder || holder.teamId !== opposingTeamId) {
      return {
        valid: false,
        reason: 'Not all cards in this set are held by the opposing team.',
      };
    }
  }

  if (Object.keys(assignment).length !== setCards.length) {
    return { valid: false, reason: `Must assign all ${setCards.length} cards.` };
  }

  for (const cardId of setCards) {
    if (!(cardId in assignment)) {
      return { valid: false, reason: `Card ${cardId} is missing from the assignment.` };
    }
  }

  for (const assignedPid of Object.values(assignment)) {
    if (!opponents.includes(assignedPid)) {
      return { valid: false, reason: 'Counter set assignments must reference opponents only.' };
    }
  }

  return { valid: true };
}
