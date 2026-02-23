import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ClientGameView, LobbyState, AskRecord } from 'shared';
import { socket } from '../socket';
import { useGameStore } from '../store/useGameStore';

export function useSocket() {
  const navigate = useNavigate();
  const store = useGameStore();

  useEffect(() => {
    // Capture socket.id as our player ID once connected
    socket.on('connect', () => {
      // playerId is set on room creation / join
    });

    // ------ Lobby ------
    socket.on('room_created', ({ roomCode, lobby }: { roomCode: string; lobby: LobbyState }) => {
      store.setMyIdentity(socket.id ?? '', store.myPlayerName ?? 'You');
      store.setRoomCode(roomCode);
      store.updateLobby(lobby);
      navigate(`/lobby/${roomCode}`);
    });

    socket.on('room_joined', ({ roomCode, lobby }: { roomCode: string; lobby: LobbyState }) => {
      store.setMyIdentity(socket.id ?? '', store.myPlayerName ?? 'You');
      store.setRoomCode(roomCode);
      store.updateLobby(lobby);
      navigate(`/lobby/${roomCode}`);
    });

    socket.on('lobby_updated', ({ lobby }: { lobby: LobbyState }) => {
      store.updateLobby(lobby);
    });

    socket.on('player_disconnected', ({ lobby }: { playerId: string; lobby: LobbyState }) => {
      store.updateLobby(lobby);
      store.addToast('A player disconnected.', 'info');
    });

    socket.on('kicked', ({ message }: { message: string }) => {
      store.addToast(message, 'error');
      navigate('/');
    });

    socket.on('player_kicked', ({ playerId, playerName }: { playerId: string; playerName: string }) => {
      store.addToast(`${playerName} was kicked.`, 'info');
      store.clearKickVote(playerId);
    });

    socket.on('kick_vote_updated', ({ targetPlayerId, votes, needed, voterIds }: {
      targetPlayerId: string; votes: number; needed: number; voterIds: string[];
    }) => {
      if (votes === 0) store.clearKickVote(targetPlayerId);
      else store.updateKickVote(targetPlayerId, { votes, needed, voterIds });
    });

    socket.on('team_switch_vote_updated', ({ targetPlayerId, votes, needed, voterIds }: {
      targetPlayerId: string; votes: number; needed: number; voterIds: string[];
    }) => {
      if (votes === 0) store.clearTeamSwitchVote(targetPlayerId);
      else store.updateTeamSwitchVote(targetPlayerId, { votes, needed, voterIds });
    });

    socket.on('swap_requested', ({ requestId, requesterName }: { requestId: string; requesterName: string }) => {
      store.setPendingSwapRequest({ requestId, requesterName });
    });

    socket.on('left_lobby', () => {
      navigate('/');
    });

    // ------ Game Start ------
    socket.on('game_started', ({ view }: { view: ClientGameView }) => {
      store.setMyIdentity(socket.id ?? '', store.myPlayerName ?? 'You');
      store.setGameView(view);
      store.setRevealCredits(3);
      navigate(`/game`);
    });

    // ------ Ask ------
    socket.on('ask_result', ({
      action,
      result,
      players,
    }: {
      action: { askingPlayerId: string; targetPlayerId: string; cardId: string };
      result: { success: boolean; cardTransferred: boolean; newTurnPlayerId: string };
      players: ClientGameView['players'];
    }) => {
      store.updatePlayers(players);

      // Update current turn in game view
      useGameStore.setState(state => ({
        gameView: state.gameView
          ? { ...state.gameView, players, currentTurnPlayerId: result.newTurnPlayerId }
          : state.gameView,
      }));

      // Show ask announcement overlay
      const askerName = players.find(p => p.id === action.askingPlayerId)?.name ?? 'Someone';
      const targetName = players.find(p => p.id === action.targetPlayerId)?.name ?? 'Someone';
      store.setAskAnnouncement({ cardId: action.cardId, askerPlayerId: action.askingPlayerId, targetPlayerId: action.targetPlayerId, askerName, targetName, success: result.success });
      setTimeout(() => store.setAskAnnouncement(null), 3200);

      if (result.success) {
        store.setFlyingCard({
          cardId: action.cardId,
          fromPlayerId: action.targetPlayerId,
          toPlayerId: action.askingPlayerId,
        });
        setTimeout(() => store.setFlyingCard(null), 700);
      } else {
        store.setShakingPlayer(action.askingPlayerId);
        setTimeout(() => store.setShakingPlayer(null), 500);
      }
    });

    socket.on('hand_updated', ({ myHand }: { myHand: string[] }) => {
      store.updateMyHand(myHand);
    });

    socket.on('bot_thinking', ({ playerId }: { playerId: string }) => {
      // Handled visually by TurnIndicator
    });

    // ------ Live Call Set Flow ------
    socket.on('call_set_initiated', ({ callerPlayerId, callerName }: { callerPlayerId: string; callerName: string }) => {
      store.setCallSetProgress({ callerPlayerId, callerName, setId: null, assignment: {}, players: [] });
    });

    socket.on('call_set_set_chosen', ({ callerPlayerId, setId, preAssignment, players }: {
      callerPlayerId: string; setId: string; preAssignment: Record<string, string>; players: ClientGameView['players'];
    }) => {
      store.setCallSetProgress({ callerPlayerId, callerName: players.find(p => p.id === callerPlayerId)?.name ?? '', setId, assignment: preAssignment, players });
    });

    socket.on('call_set_card_assigned', ({ cardId, assignedPlayerId }: { cardId: string; assignedPlayerId: string }) => {
      store.updateCallSetProgressAssignment(cardId, assignedPlayerId);
    });

    socket.on('call_set_cancelled', () => {
      store.setCallSetProgress(null);
      store.closeCallSetModal();
    });

    // ------ Call Set / Counter Set ------
    socket.on('call_set_result', ({ action, result, claimedSets, scores, players }: {
      action: { callingPlayerId: string; setId: string };
      result: { success: boolean; winningTeam: string; setId: string };
      claimedSets: ClientGameView['claimedSets'];
      scores: ClientGameView['scores'];
      players: ClientGameView['players'];
    }) => {
      store.updateScoresAndSets(scores, claimedSets, players);
      store.closeCallSetModal();
      const callerName = players.find(p => p.id === action.callingPlayerId)?.name ?? '';
      store.setCallSetProgress(null);
      store.setCallSetResultAnim({ success: result.success, winningTeam: result.winningTeam, setId: result.setId, callerName });
      setTimeout(() => store.setCallSetResultAnim(null), 4500);
    });

    socket.on('counter_set_result', ({ action, result, claimedSets, scores, players }: {
      action: { callingPlayerId: string; setId: string };
      result: { success: boolean; winningTeam: string; setId: string };
      claimedSets: ClientGameView['claimedSets'];
      scores: ClientGameView['scores'];
      players: ClientGameView['players'];
    }) => {
      store.updateScoresAndSets(scores, claimedSets, players);
      if (result.success) {
        store.addToast(`Counter set! Team ${result.winningTeam} steals it!`, 'gold');
      } else {
        store.addToast(`Counter failed. Team ${result.winningTeam} keeps the set.`, 'error');
      }
    });

    // ------ Reveal ------
    socket.on('reveal_response', ({ asks, creditsRemaining }: { asks: AskRecord[]; creditsRemaining: number }) => {
      store.setRevealedAsks(asks);
      store.setRevealCredits(creditsRemaining);
      store.openRevealModal();
    });

    socket.on('end_game_vote_updated', ({ votes, needed, voterIds }: { votes: number; needed: number; voterIds: string[] }) => {
      store.setEndGameVotes({ votes, needed, voterIds });
    });

    // ------ Pass Turn (0-card player chooses who gets the turn) ------
    socket.on('choose_turn_recipient', ({ candidates }: { candidates: import('shared').PlayerInfo[] }) => {
      store.openPassTurnModal(candidates);
    });

    socket.on('turn_updated', ({ newTurnPlayerId }: { newTurnPlayerId: string }) => {
      useGameStore.setState(state => ({
        gameView: state.gameView
          ? { ...state.gameView, currentTurnPlayerId: newTurnPlayerId }
          : state.gameView,
      }));
    });

    // ------ Game Over ------
    socket.on('game_over', ({ winnerTeam, scores, claimedSets, players, fullAskHistory, tiebreaker }: {
      winnerTeam: string;
      scores: ClientGameView['scores'];
      claimedSets: ClientGameView['claimedSets'];
      players: ClientGameView['players'];
      fullAskHistory: AskRecord[];
      tiebreaker?: { winnerTeam: string; teamACards: number; teamBCards: number } | null;
    }) => {
      store.updateScoresAndSets(scores, claimedSets, players);
      store.setRevealedAsks(fullAskHistory);
      store.setEndGameVotes(null);
      if (tiebreaker) store.setGameTiebreaker(tiebreaker);
      navigate(`/end?winner=${winnerTeam}`);
    });

    // ------ Errors ------
    socket.on('error', ({ message }: { message: string }) => {
      store.addToast(message, 'error');
    });

    return () => {
      socket.off('connect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('lobby_updated');
      socket.off('player_disconnected');
      socket.off('kicked');
      socket.off('player_kicked');
      socket.off('kick_vote_updated');
      socket.off('team_switch_vote_updated');
      socket.off('swap_requested');
      socket.off('left_lobby');
      socket.off('end_game_vote_updated');
      socket.off('game_started');
      socket.off('ask_result');
      socket.off('hand_updated');
      socket.off('bot_thinking');
      socket.off('call_set_initiated');
      socket.off('call_set_set_chosen');
      socket.off('call_set_card_assigned');
      socket.off('call_set_cancelled');
      socket.off('call_set_result');
      socket.off('counter_set_result');
      socket.off('reveal_response');
      socket.off('choose_turn_recipient');
      socket.off('turn_updated');
      socket.off('game_over');
      socket.off('error');
    };
  }, [navigate]);
}
