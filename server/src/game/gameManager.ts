import type { GameState, ClientGameView, PlayerId, PlayerInfo, LobbyState } from 'shared';
import { deal, GHOST_PLAYER_ID } from 'shared';

export function initializeGame(lobby: LobbyState): GameState {
  const slots = lobby.slots;
  const playerIds = slots.map(s => s.playerId!);

  // In hidden_deck mode deal to one extra slot — that extra hand becomes the ghost deck
  const dealIds = lobby.difficulty === 'hidden_deck'
    ? [...playerIds, GHOST_PLAYER_ID]
    : playerIds;

  const allHands = deal(dealIds);
  const ghostHand = allHands[GHOST_PLAYER_ID] ?? [];

  // Regular hands: only real players
  const hands: Record<string, string[]> = {};
  for (const id of playerIds) hands[id] = allHands[id] ?? [];

  const players: PlayerInfo[] = slots.map(slot => ({
    id: slot.playerId!,
    name: slot.playerName!,
    teamId: slot.teamId,
    seatIndex: slot.seatIndex,
    isBot: slot.status === 'bot',
    cardCount: hands[slot.playerId!]?.length ?? 0,
    photoURL: slot.photoURL,
    isPlus: slot.isPlus,
  }));

  const firstPlayer = players[0];

  return {
    gameId: lobby.roomCode + '_' + Date.now(),
    phase: 'in_progress',
    difficulty: lobby.difficulty,
    players,
    currentTurnPlayerId: firstPlayer.id,
    hands,
    ghostHand,
    claimedSets: [],
    scores: { A: 0, B: 0 },
    lastAction: null,
    turnNumber: 1,
    askHistory: [],
  };
}

// Build a client-safe view of the game state for a specific player.
// Only their own hand is included — no other players' cards.
export function buildClientView(state: GameState, forPlayerId: PlayerId): ClientGameView {
  return {
    gameId: state.gameId,
    phase: state.phase,
    difficulty: state.difficulty,
    players: state.players,
    currentTurnPlayerId: state.currentTurnPlayerId,
    myHand: state.hands[forPlayerId] ?? [],
    claimedSets: state.claimedSets,
    scores: state.scores,
    lastAction: state.lastAction,
    turnNumber: state.turnNumber,
    ghostCardCount: state.ghostHand.length,
  };
}
