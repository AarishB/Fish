// ============================================================
// Cards
// ============================================================

export type Suit = 'hearts' | 'clubs' | 'diamonds' | 'spades';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7'   // low sets
  | '8'                                    // middle set
  | '9' | '10' | 'J' | 'Q' | 'K' | 'A'; // high sets

export interface RegularCard {
  kind: 'regular';
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "hearts_5"
}

export interface JokerCard {
  kind: 'joker';
  rank: 'JOKER_1' | 'JOKER_2';
  id: 'JOKER_1' | 'JOKER_2';
}

export type Card = RegularCard | JokerCard;

// ============================================================
// Sets
// ============================================================

export type SetId =
  | 'low_hearts' | 'low_clubs' | 'low_diamonds' | 'low_spades'
  | 'high_hearts' | 'high_clubs' | 'high_diamonds' | 'high_spades'
  | 'middle';

export interface SetDefinition {
  id: SetId;
  label: string;
  cardIds: string[];
}

// ============================================================
// Difficulty
// ============================================================

export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'hidden_deck';

// Special player ID representing the hidden ghost hand in hidden_deck mode
export const GHOST_PLAYER_ID = '__ghost__';

// ============================================================
// Players & Teams
// ============================================================

export type TeamId = 'A' | 'B';
export type PlayerId = string;

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  teamId: TeamId;
  seatIndex: number;
  isBot: boolean;
  cardCount: number; // only hand-size is public
  photoURL?: string;
}

// ============================================================
// Game State
// ============================================================

export type GamePhase = 'lobby' | 'dealing' | 'in_progress' | 'game_over';

export interface SetOwnership {
  setId: SetId;
  wonByTeam: TeamId;
  calledBy: PlayerId;
  wasCounter: boolean;
}

export interface AskRecord {
  askingPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  cardId: string;
  success: boolean;
  timestamp: number;
}

// Full server-side state — never sent whole to any client
export interface GameState {
  gameId: string;
  phase: GamePhase;
  difficulty: GameDifficulty;
  players: PlayerInfo[];
  currentTurnPlayerId: PlayerId;
  hands: Record<PlayerId, string[]>; // full hands, server-only
  ghostHand: string[];               // hidden deck cards (hidden_deck mode only, server-only)
  claimedSets: SetOwnership[];
  scores: Record<TeamId, number>;
  lastAction: ActionRecord | null;
  turnNumber: number;
  askHistory: AskRecord[]; // full history, server-only — never broadcast
}

// What each client receives — only their own hand, no history
export interface ClientGameView {
  gameId: string;
  phase: GamePhase;
  difficulty: GameDifficulty;
  players: PlayerInfo[];
  currentTurnPlayerId: PlayerId;
  myHand: string[]; // card IDs for THIS player only
  claimedSets: SetOwnership[];
  scores: Record<TeamId, number>;
  lastAction: ActionRecord | null;
  turnNumber: number;
  ghostCardCount: number; // how many cards are in the hidden deck (0 when not hidden_deck mode)
}

// ============================================================
// Actions
// ============================================================

export interface AskAction {
  type: 'ask';
  askingPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  cardId: string;
}

export interface CallSetAction {
  type: 'call_set';
  callingPlayerId: PlayerId;
  setId: SetId;
  assignment: Record<string, PlayerId>; // cardId → playerId (teammate)
}

export interface CounterSetAction {
  type: 'counter_set';
  callingPlayerId: PlayerId;
  setId: SetId;
  assignment: Record<string, PlayerId>; // cardId → playerId (opponent)
}

export type GameAction = AskAction | CallSetAction | CounterSetAction;

// ============================================================
// Action Results
// ============================================================

export interface AskResult {
  type: 'ask_result';
  success: boolean;
  newTurnPlayerId: PlayerId;
  cardTransferred: boolean;
}

export interface CallSetResult {
  type: 'call_set_result';
  success: boolean;
  winningTeam: TeamId;
  setId: SetId;
}

export interface CounterSetResult {
  type: 'counter_set_result';
  success: boolean;
  winningTeam: TeamId;
  setId: SetId;
}

export type ActionResult = AskResult | CallSetResult | CounterSetResult;

export interface ActionRecord {
  action: GameAction;
  result: ActionResult;
  timestamp: number;
}

// ============================================================
// Lobby
// ============================================================

export type LobbySlotStatus = 'empty' | 'human' | 'bot';

export interface LobbySlot {
  seatIndex: number;
  status: LobbySlotStatus;
  playerId?: PlayerId;
  playerName?: string;
  photoURL?: string;
  teamId: TeamId;
}

export interface SwapRequest {
  id: string;
  requesterId: PlayerId;
  requesterName: string;
  targetId: PlayerId;
  targetName: string;
}

export interface LobbyState {
  roomCode: string;
  hostId: PlayerId;
  playerCount: number;
  difficulty: GameDifficulty;
  cardBack: string;
  slots: LobbySlot[];
  isStartable: boolean;
  teamNames: Record<TeamId, string>;
  swapRequests: SwapRequest[];
}
