import { create } from 'zustand';
import type { ClientGameView, LobbyState, AskRecord, PlayerInfo } from 'shared';

export type ToastType = 'success' | 'error' | 'info' | 'gold';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface GameStore {
  // Identity
  myPlayerId: string | null;
  myPlayerName: string | null;
  roomCode: string | null;

  // Lobby
  lobby: LobbyState | null;

  // Game
  gameView: ClientGameView | null;

  // Reveal system
  revealCredits: number;
  revealedAsks: AskRecord[];

  // Kick votes (lobby only)
  kickVotes: Record<string, { votes: number; needed: number; voterIds: string[] }>;

  // Team switch votes (lobby only)
  teamSwitchVotes: Record<string, { votes: number; needed: number; voterIds: string[] }>;

  // Pending swap request directed at this player
  pendingSwapRequest: { requestId: string; requesterName: string } | null;

  // End game vote (game only)
  endGameVotes: { votes: number; needed: number; voterIds: string[] } | null;

  // Tiebreaker info from end game vote
  gameTiebreaker: { winnerTeam: string; teamACards: number; teamBCards: number } | null;

  // UI state
  toasts: Toast[];

  // Modal open states
  askModalOpen: boolean;
  askModalInitialCardId: string | null;
  callSetModalOpen: boolean;
  counterSetModalOpen: boolean;
  revealModalOpen: boolean;

  // Pass-turn modal (shown to this player when they have 0 cards and must choose who gets the turn)
  passTurnCandidates: PlayerInfo[] | null;

  // Animation flags
  shakingPlayerId: string | null;
  flyingCard: { cardId: string; fromPlayerId: string; toPlayerId: string } | null;
  askAnnouncement: { cardId: string; askerPlayerId: string; targetPlayerId: string; askerName: string; targetName: string; success: boolean } | null;

  // Live call set state
  callSetProgress: {
    callerPlayerId: string;
    callerName: string;
    setId: string | null;
    assignment: Record<string, string>; // cardId → playerId
    players: PlayerInfo[];
  } | null;
  callSetResultAnim: {
    success: boolean;
    winningTeam: string;
    setId: string;
    callerName: string;
  } | null;

  // Actions
  setMyIdentity: (id: string, name: string) => void;
  setRoomCode: (code: string) => void;
  updateLobby: (lobby: LobbyState) => void;
  setGameView: (view: ClientGameView) => void;
  updateMyHand: (myHand: string[]) => void;
  updatePlayers: (players: ClientGameView['players']) => void;
  updateScoresAndSets: (
    scores: ClientGameView['scores'],
    claimedSets: ClientGameView['claimedSets'],
    players: ClientGameView['players']
  ) => void;

  updateKickVote: (targetId: string, info: { votes: number; needed: number; voterIds: string[] }) => void;
  clearKickVote: (targetId: string) => void;

  updateTeamSwitchVote: (targetId: string, info: { votes: number; needed: number; voterIds: string[] }) => void;
  clearTeamSwitchVote: (targetId: string) => void;
  setPendingSwapRequest: (req: { requestId: string; requesterName: string } | null) => void;
  setEndGameVotes: (info: { votes: number; needed: number; voterIds: string[] } | null) => void;
  setGameTiebreaker: (info: { winnerTeam: string; teamACards: number; teamBCards: number } | null) => void;

  setRevealCredits: (n: number) => void;
  setRevealedAsks: (asks: AskRecord[]) => void;

  openAskModal: (initialCardId?: string) => void;
  closeAskModal: () => void;
  openCallSetModal: () => void;
  closeCallSetModal: () => void;
  openCounterSetModal: () => void;
  closeCounterSetModal: () => void;
  openRevealModal: () => void;
  closeRevealModal: () => void;

  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  setShakingPlayer: (playerId: string | null) => void;
  setFlyingCard: (data: { cardId: string; fromPlayerId: string; toPlayerId: string } | null) => void;
  setAskAnnouncement: (data: { cardId: string; askerPlayerId: string; targetPlayerId: string; askerName: string; targetName: string; success: boolean } | null) => void;
  setCallSetProgress: (data: GameStore['callSetProgress']) => void;
  updateCallSetProgressAssignment: (cardId: string, assignedPlayerId: string) => void;
  setCallSetResultAnim: (data: GameStore['callSetResultAnim']) => void;

  openPassTurnModal: (candidates: PlayerInfo[]) => void;
  closePassTurnModal: () => void;

  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  myPlayerId: null,
  myPlayerName: null,
  roomCode: null,
  lobby: null,
  gameView: null,
  revealCredits: 3,
  revealedAsks: [],
  kickVotes: {},
  teamSwitchVotes: {},
  pendingSwapRequest: null,
  endGameVotes: null,
  gameTiebreaker: null,
  toasts: [],
  askModalOpen: false,
  askModalInitialCardId: null,
  callSetModalOpen: false,
  counterSetModalOpen: false,
  revealModalOpen: false,
  shakingPlayerId: null,
  flyingCard: null,
  askAnnouncement: null,
  callSetProgress: null,
  callSetResultAnim: null,
  passTurnCandidates: null,

  setMyIdentity: (id, name) => set({ myPlayerId: id, myPlayerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  updateLobby: (lobby) => set({ lobby }),
  setGameView: (view) => set({ gameView: view }),

  updateMyHand: (myHand) =>
    set(state => ({
      gameView: state.gameView ? { ...state.gameView, myHand } : state.gameView,
    })),

  updatePlayers: (players) =>
    set(state => ({
      gameView: state.gameView ? { ...state.gameView, players } : state.gameView,
    })),

  updateScoresAndSets: (scores, claimedSets, players) =>
    set(state => ({
      gameView: state.gameView
        ? { ...state.gameView, scores, claimedSets, players }
        : state.gameView,
    })),

  updateKickVote: (targetId, info) =>
    set(state => ({ kickVotes: { ...state.kickVotes, [targetId]: info } })),
  clearKickVote: (targetId) =>
    set(state => {
      const next = { ...state.kickVotes };
      delete next[targetId];
      return { kickVotes: next };
    }),

  updateTeamSwitchVote: (targetId, info) =>
    set(state => ({ teamSwitchVotes: { ...state.teamSwitchVotes, [targetId]: info } })),
  clearTeamSwitchVote: (targetId) =>
    set(state => {
      const next = { ...state.teamSwitchVotes };
      delete next[targetId];
      return { teamSwitchVotes: next };
    }),
  setPendingSwapRequest: (req) => set({ pendingSwapRequest: req }),
  setEndGameVotes: (info) => set({ endGameVotes: info }),
  setGameTiebreaker: (info) => set({ gameTiebreaker: info }),

  setRevealCredits: (n) => set({ revealCredits: n }),
  setRevealedAsks: (asks) => set({ revealedAsks: asks }),

  openAskModal: (initialCardId) =>
    set({ askModalOpen: true, askModalInitialCardId: initialCardId ?? null }),
  closeAskModal: () => set({ askModalOpen: false, askModalInitialCardId: null }),
  openCallSetModal: () => set({ callSetModalOpen: true }),
  closeCallSetModal: () => set({ callSetModalOpen: false }),
  openCounterSetModal: () => set({ counterSetModalOpen: true }),
  closeCounterSetModal: () => set({ counterSetModalOpen: false }),
  openRevealModal: () => set({ revealModalOpen: true }),
  closeRevealModal: () => set({ revealModalOpen: false }),

  addToast: (message, type = 'info') =>
    set(state => ({
      toasts: [...state.toasts, { id: Date.now().toString(), message, type }],
    })),
  removeToast: (id) =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  setShakingPlayer: (playerId) => set({ shakingPlayerId: playerId }),
  setFlyingCard: (data) => set({ flyingCard: data }),
  setAskAnnouncement: (data) => set({ askAnnouncement: data }),
  setCallSetProgress: (data) => set({ callSetProgress: data }),
  updateCallSetProgressAssignment: (cardId, assignedPlayerId) =>
    set(state => ({
      callSetProgress: state.callSetProgress
        ? {
            ...state.callSetProgress,
            assignment: { ...state.callSetProgress.assignment, [cardId]: assignedPlayerId },
          }
        : null,
    })),
  setCallSetResultAnim: (data) => set({ callSetResultAnim: data }),

  openPassTurnModal: (candidates) => set({ passTurnCandidates: candidates }),
  closePassTurnModal: () => set({ passTurnCandidates: null }),

  resetGame: () =>
    set({
      gameView: null,
      revealCredits: 3,
      revealedAsks: [],
      askModalOpen: false,
      callSetModalOpen: false,
      counterSetModalOpen: false,
      revealModalOpen: false,
      shakingPlayerId: null,
      flyingCard: null,
      callSetProgress: null,
      callSetResultAnim: null,
      passTurnCandidates: null,
      endGameVotes: null,
      gameTiebreaker: null,
    }),
}));
