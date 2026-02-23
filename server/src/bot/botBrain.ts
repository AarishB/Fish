import type {
  GameState,
  PlayerId,
  SetId,
  AskAction,
  CallSetAction,
  CounterSetAction,
  AskRecord,
} from 'shared';
import { getSetForCard, getSetCards, getEligibleSets, canAskForCard, ALL_SET_IDS, SET_DEFINITIONS } from 'shared';

// ============================================================
// Inference Model
// ============================================================

type CardLocation =
  | { known: true; holder: PlayerId }
  | { known: false; possibleHolders: Set<PlayerId>; eliminatedHolders: Set<PlayerId> };

export interface BotState {
  botId: PlayerId;
  cardLocations: Map<string, CardLocation>;
  // Which sets does each teammate definitely have a card in?
  teammateSetMembership: Map<PlayerId, Set<SetId>>;
}

export function createBotState(botId: PlayerId, hand: string[], allPlayerIds: PlayerId[]): BotState {
  const otherPlayers = allPlayerIds.filter(id => id !== botId);
  const cardLocations = new Map<string, CardLocation>();

  // All cards in deck
  for (const def of Object.values(SET_DEFINITIONS)) {
    for (const cardId of def.cardIds) {
      if (hand.includes(cardId)) {
        cardLocations.set(cardId, { known: true, holder: botId });
      } else {
        cardLocations.set(cardId, {
          known: false,
          possibleHolders: new Set(otherPlayers),
          eliminatedHolders: new Set([botId]),
        });
      }
    }
  }

  return {
    botId,
    cardLocations,
    teammateSetMembership: new Map(allPlayerIds.map(id => [id, new Set<SetId>()])),
  };
}

// Update inference table based on a completed ask
export function updateBotState(botState: BotState, record: AskRecord, gameState: GameState): void {
  const { askingPlayerId, targetPlayerId, cardId, success } = record;

  if (success) {
    // Card is now definitely with the asker
    botState.cardLocations.set(cardId, { known: true, holder: askingPlayerId });
    // Update set membership
    const setId = getSetForCard(cardId);
    botState.teammateSetMembership.get(askingPlayerId)?.add(setId);
  } else {
    // Target does NOT have this card
    const loc = botState.cardLocations.get(cardId);
    if (loc && !loc.known) {
      loc.eliminatedHolders.add(targetPlayerId);
      loc.possibleHolders.delete(targetPlayerId);

      // If only 1 possible holder left, it's known
      if (loc.possibleHolders.size === 1) {
        const [holder] = loc.possibleHolders;
        botState.cardLocations.set(cardId, { known: true, holder });
      }
    }

    // Infer: asker has at least one card from that set (otherwise it was an illegal ask)
    const setId = getSetForCard(cardId);
    botState.teammateSetMembership.get(askingPlayerId)?.add(setId);
  }
}

// After a set is claimed, remove its cards from inference
export function removeSetFromBotState(botState: BotState, setId: SetId): void {
  for (const cardId of getSetCards(setId)) {
    botState.cardLocations.delete(cardId);
  }
}

// ============================================================
// Decision Making
// ============================================================

function getOpponents(gameState: GameState, botId: PlayerId): PlayerId[] {
  const bot = gameState.players.find(p => p.id === botId)!;
  return gameState.players
    .filter(p => p.teamId !== bot.teamId && p.cardCount > 0)
    .map(p => p.id);
}

function getTeammates(gameState: GameState, botId: PlayerId): PlayerId[] {
  const bot = gameState.players.find(p => p.id === botId)!;
  return gameState.players
    .filter(p => p.teamId === bot.teamId)
    .map(p => p.id);
}

export function chooseAsk(
  botState: BotState,
  gameState: GameState
): AskAction | null {
  const { botId } = botState;
  const botHand = gameState.hands[botId] ?? [];
  if (botHand.length === 0) return null;

  const opponents = getOpponents(gameState, botId);
  if (opponents.length === 0) return null;

  const eligibleSets = getEligibleSets(botHand);
  if (eligibleSets.length === 0) return null;

  // Build list of askable cards (cards the bot doesn't have, from eligible sets)
  const askableCards: Array<{
    cardId: string;
    certainty: number; // 1 = certain, 0 = uncertain
    targetPlayerId: PlayerId;
  }> = [];

  for (const setId of eligibleSets) {
    const setCards = getSetCards(setId);
    for (const cardId of setCards) {
      if (botHand.includes(cardId)) continue; // already have it

      const loc = botState.cardLocations.get(cardId);
      if (!loc) continue; // card already played/claimed

      // Check if the set is already claimed
      const claimed = gameState.claimedSets.some(cs => cs.setId === setId);
      if (claimed) continue;

      if (loc.known) {
        if (opponents.includes(loc.holder)) {
          askableCards.push({ cardId, certainty: 1, targetPlayerId: loc.holder });
        }
      } else {
        // Filter possible holders to only opponents
        const possibleOpponents = [...loc.possibleHolders].filter(id => opponents.includes(id));
        if (possibleOpponents.length > 0) {
          const certainty = 1 / loc.possibleHolders.size;
          const target = possibleOpponents[Math.floor(Math.random() * possibleOpponents.length)];
          askableCards.push({ cardId, certainty, targetPlayerId: target });
        }
      }
    }
  }

  if (askableCards.length === 0) return null;

  // Sort by certainty descending, then pick the best
  askableCards.sort((a, b) => b.certainty - a.certainty);
  const best = askableCards[0];

  // Validate the ask is still legal
  const validation = canAskForCard(botHand, best.cardId);
  if (!validation.valid) return null;

  return {
    type: 'ask',
    askingPlayerId: botId,
    targetPlayerId: best.targetPlayerId,
    cardId: best.cardId,
  };
}

export function chooseCallSet(
  botState: BotState,
  gameState: GameState
): CallSetAction | null {
  const { botId } = botState;
  const teammates = getTeammates(gameState, botId);

  for (const setId of ALL_SET_IDS) {
    // Skip already claimed sets
    if (gameState.claimedSets.some(cs => cs.setId === setId)) continue;

    const setCards = getSetCards(setId);
    const assignment: Record<string, PlayerId> = {};
    let canCall = true;

    for (const cardId of setCards) {
      const loc = botState.cardLocations.get(cardId);
      if (!loc || !loc.known) {
        canCall = false;
        break;
      }
      if (!teammates.includes(loc.holder)) {
        canCall = false;
        break;
      }
      assignment[cardId] = loc.holder;
    }

    if (canCall) {
      return {
        type: 'call_set',
        callingPlayerId: botId,
        setId,
        assignment,
      };
    }
  }

  return null;
}

export function chooseCounterSet(
  botState: BotState,
  gameState: GameState
): CounterSetAction | null {
  const { botId } = botState;
  const opponents = getOpponents(gameState, botId);

  for (const setId of ALL_SET_IDS) {
    if (gameState.claimedSets.some(cs => cs.setId === setId)) continue;

    const setCards = getSetCards(setId);
    const assignment: Record<string, PlayerId> = {};
    let canCounter = true;

    for (const cardId of setCards) {
      const loc = botState.cardLocations.get(cardId);
      if (!loc || !loc.known) {
        canCounter = false;
        break;
      }
      if (!opponents.includes(loc.holder)) {
        canCounter = false;
        break;
      }
      assignment[cardId] = loc.holder;
    }

    if (canCounter) {
      return {
        type: 'counter_set',
        callingPlayerId: botId,
        setId,
        assignment,
      };
    }
  }

  return null;
}
