import type { GameState, ClientGameView, PlayerId, PlayerInfo, TeamId } from 'shared';
import { deal } from 'shared';
import type { LobbyState } from 'shared';

export function initializeGame(lobby: LobbyState): GameState {
  const slots = lobby.slots;
  const playerIds = slots.map(s => s.playerId!);

  const hands = deal(playerIds);

  const players: PlayerInfo[] = slots.map(slot => ({
    id: slot.playerId!,
    name: slot.playerName!,
    teamId: slot.teamId,
    seatIndex: slot.seatIndex,
    isBot: slot.status === 'bot',
    cardCount: hands[slot.playerId!]?.length ?? 0,
  }));

  // First turn goes to seat 0 (Team A host)
  const firstPlayer = players[0];

  return {
    gameId: lobby.roomCode + '_' + Date.now(),
    phase: 'in_progress',
    difficulty: lobby.difficulty,
    players,
    currentTurnPlayerId: firstPlayer.id,
    hands,
    claimedSets: [],
    scores: { A: 0, B: 0 },
    lastAction: null,
    turnNumber: 1,
    askHistory: [],
  };
}

// Build a client-safe view of the game state for a specific player.
// Only their own hand is included — no other player's cards.
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
  };
}
