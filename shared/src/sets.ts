import { SET_DEFINITIONS } from './constants';
import type { SetId } from './types';

// Build a reverse lookup map: cardId → SetId
const cardToSet: Record<string, SetId> = {};
for (const [setId, def] of Object.entries(SET_DEFINITIONS)) {
  for (const cardId of def.cardIds) {
    cardToSet[cardId] = setId as SetId;
  }
}

export function getSetForCard(cardId: string): SetId {
  const setId = cardToSet[cardId];
  if (!setId) throw new Error(`Card "${cardId}" does not belong to any set.`);
  return setId;
}

export function getSetCards(setId: SetId): string[] {
  return SET_DEFINITIONS[setId].cardIds;
}

// Which sets does this hand have at least one card from?
export function getEligibleSets(hand: string[]): SetId[] {
  const sets = new Set<SetId>();
  for (const cardId of hand) {
    sets.add(getSetForCard(cardId));
  }
  return Array.from(sets);
}

// Can a player with `hand` legally ask for `cardId`?
export function canAskForCard(
  hand: string[],
  cardId: string
): { valid: boolean; reason?: string } {
  if (hand.includes(cardId)) {
    return { valid: false, reason: 'You already have that card.' };
  }
  const setId = getSetForCard(cardId);
  const hasSetCard = getSetCards(setId).some(c => hand.includes(c));
  if (!hasSetCard) {
    return { valid: false, reason: 'You must hold a card from the same set to ask for this card.' };
  }
  return { valid: true };
}
