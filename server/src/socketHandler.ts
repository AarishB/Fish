import type { Server, Socket } from 'socket.io';
import type {
  PlayerId,
  SetId,
  TeamId,
  AskAction,
  CallSetAction,
  CounterSetAction,
  GameState,
  GameDifficulty,
  SwapRequest,
} from 'shared';
import {
  validateAsk,
  validateCallSet,
  validateCounterSet,
  applyAsk,
  applyCallSet,
  applyCounterSet,
  checkWin,
  getRevealCredits,
  getSetCards,
  ALL_SET_IDS,
} from 'shared';
import {
  createRoom,
  getRoom,
  deleteRoom,
  joinRoom,
  addBot,
  removeBot,
  removePlayer,
  initRevealCredits,
  switchTeam,
  swapPlayers,
  renameTeam,
  addSwapRequest,
  removeSwapRequest,
} from './rooms/roomManager';
import { initializeGame, buildClientView } from './game/gameManager';
import { createBotState, updateBotState, removeSetFromBotState } from './bot/botBrain';
import { scheduleBotTurn, checkBotCounterSet } from './bot/botRunner';

// Map socket.id → { playerId, roomCode } for disconnect handling
const socketToPlayer = new Map<string, { playerId: PlayerId; roomCode: string }>();

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    // ----------------------------------------------------------
    // Lobby Events
    // ----------------------------------------------------------

    socket.on('create_room', ({ playerName, playerCount, difficulty }: { playerName: string; playerCount: number; difficulty: GameDifficulty }) => {
      if (!Number.isInteger(playerCount) || playerCount < 4 || playerCount > 14) {
        socket.emit('error', { message: 'Player count must be between 4 and 14.' });
        return;
      }
      const validDifficulties: GameDifficulty[] = ['easy', 'normal', 'hard'];
      const safeDifficulty: GameDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'normal';
      const playerId = socket.id;
      const room = createRoom(socket.id, playerId, playerName, playerCount, safeDifficulty);
      socketToPlayer.set(socket.id, { playerId, roomCode: room.roomCode });
      socket.join(room.roomCode);
      socket.emit('room_created', { roomCode: room.roomCode, lobby: room.lobby });
    });

    socket.on('join_room', ({ roomCode, playerName, preferredTeam }: { roomCode: string; playerName: string; preferredTeam?: TeamId }) => {
      const result = joinRoom(roomCode.toUpperCase(), socket.id, playerName, socket.id, preferredTeam);
      if ('error' in result) {
        socket.emit('error', { message: result.error });
        return;
      }
      const { lobby } = result;
      socketToPlayer.set(socket.id, { playerId: socket.id, roomCode: roomCode.toUpperCase() });
      socket.join(roomCode.toUpperCase());
      // Tell the joiner to navigate to the lobby
      socket.emit('room_joined', { roomCode: roomCode.toUpperCase(), lobby });
      // Tell everyone else the lobby changed
      socket.to(roomCode.toUpperCase()).emit('lobby_updated', { lobby });

      // Snapshot existing votes to the new joiner so they see ongoing votes
      const joinedRoom = getRoom(roomCode.toUpperCase());
      if (joinedRoom) {
        const humanCount = lobby.slots.filter(s => s.status === 'human').length;
        const needed = Math.max(2, Math.ceil((humanCount - 1) / 2));
        for (const [targetId, voterSet] of joinedRoom.kickVotes) {
          if (voterSet.size > 0) {
            socket.emit('kick_vote_updated', { targetPlayerId: targetId, votes: voterSet.size, needed, voterIds: Array.from(voterSet) });
          }
        }
        for (const [targetId, voterSet] of joinedRoom.teamSwitchVotes) {
          if (voterSet.size > 0) {
            socket.emit('team_switch_vote_updated', { targetPlayerId: targetId, votes: voterSet.size, needed, voterIds: Array.from(voterSet) });
          }
        }
      }
    });

    socket.on('leave_lobby', ({ roomCode }: { roomCode: string }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      const result = removePlayer(roomCode, socket.id);
      if (!result) return;
      socketToPlayer.delete(socket.id);
      socket.leave(roomCode);
      socket.emit('left_lobby');
      io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
    });

    socket.on('rename_self', ({ roomCode, newName }: { roomCode: string; newName: string }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      const trimmed = (newName ?? '').trim();
      if (!trimmed || trimmed.length > 24) { socket.emit('error', { message: 'Name must be 1–24 characters.' }); return; }
      const duplicate = room.lobby.slots.some(
        s => s.status === 'human' && s.playerId !== socket.id && s.playerName === trimmed
      );
      if (duplicate) { socket.emit('error', { message: `"${trimmed}" is already taken.` }); return; }
      const mySlot = room.lobby.slots.find(s => s.playerId === socket.id && s.status === 'human');
      if (!mySlot) return;
      mySlot.playerName = trimmed;
      io.to(roomCode).emit('lobby_updated', { lobby: room.lobby });
    });

    socket.on('rename_team', ({ roomCode, teamId, newName }: { roomCode: string; teamId: TeamId; newName: string }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }
      if (room.game) { socket.emit('error', { message: 'Cannot rename teams during a game.' }); return; }
      const trimmed = (newName ?? '').trim();
      if (!trimmed) { socket.emit('error', { message: 'Team name cannot be empty.' }); return; }
      const result = renameTeam(roomCode, teamId, trimmed);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
    });

    socket.on('switch_team', ({ roomCode }: { roomCode: string }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) { socket.emit('error', { message: 'Cannot switch teams.' }); return; }
      const result = switchTeam(roomCode, socket.id);
      if (!result.success) { socket.emit('error', { message: 'No empty slots on the other team.' }); return; }
      io.to(roomCode).emit('lobby_updated', { lobby: result.lobby! });
    });

    socket.on('request_swap', ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      const mySlot = room.lobby.slots.find(s => s.playerId === socket.id && s.status === 'human');
      const targetSlot = room.lobby.slots.find(s => s.playerId === targetPlayerId && s.status === 'human');
      if (!mySlot || !targetSlot) { socket.emit('error', { message: 'Player not found.' }); return; }
      if (mySlot.teamId === targetSlot.teamId) { socket.emit('error', { message: 'Can only swap with someone on the other team.' }); return; }

      const req: SwapRequest = {
        id: Math.random().toString(36).slice(2, 10),
        requesterId: socket.id,
        requesterName: mySlot.playerName ?? 'Someone',
        targetId: targetPlayerId,
        targetName: targetSlot.playerName ?? 'Someone',
      };
      addSwapRequest(roomCode, req);

      const targetSocketId = room.socketMap.get(targetPlayerId);
      if (targetSocketId) io.to(targetSocketId).emit('swap_requested', { requestId: req.id, requesterName: req.requesterName });
      io.to(roomCode).emit('lobby_updated', { lobby: room.lobby });
    });

    socket.on('respond_swap', ({ roomCode, requestId, accept }: { roomCode: string; requestId: string; accept: boolean }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      const req = removeSwapRequest(roomCode, requestId);
      if (req?.targetId !== socket.id) return;

      if (accept) {
        const result = swapPlayers(roomCode, req.requesterId, req.targetId);
        if ('error' in result) { socket.emit('error', { message: result.error }); return; }
        io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
      } else {
        const requesterSocketId = room.socketMap.get(req.requesterId);
        if (requesterSocketId) io.to(requesterSocketId).emit('error', { message: `${req.targetName} declined your swap request.` });
        io.to(roomCode).emit('lobby_updated', { lobby: room.lobby });
      }
    });

    socket.on('vote_team_switch', ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      if (socket.id === targetPlayerId) { socket.emit('error', { message: "You can't vote to move yourself." }); return; }
      const targetSlot = room.lobby.slots.find(s => s.playerId === targetPlayerId && s.status === 'human');
      if (!targetSlot) return;

      if (!room.teamSwitchVotes.has(targetPlayerId)) room.teamSwitchVotes.set(targetPlayerId, new Set());
      room.teamSwitchVotes.get(targetPlayerId)!.add(socket.id);

      const humanCount = room.lobby.slots.filter(s => s.status === 'human').length;
      const needed = Math.max(2, Math.ceil((humanCount - 1) / 2));
      const votes = room.teamSwitchVotes.get(targetPlayerId)!.size;

      io.to(roomCode).emit('team_switch_vote_updated', {
        targetPlayerId,
        votes,
        needed,
        voterIds: Array.from(room.teamSwitchVotes.get(targetPlayerId)!),
      });

      if (votes >= needed) {
        room.teamSwitchVotes.delete(targetPlayerId);
        io.to(roomCode).emit('team_switch_vote_updated', { targetPlayerId, votes: 0, needed, voterIds: [] });
        const result = switchTeam(roomCode, targetPlayerId);
        if (result.success) {
          io.to(roomCode).emit('lobby_updated', { lobby: result.lobby! });
        } else {
          socket.emit('error', { message: 'Cannot move player — other team is full.' });
        }
      }
    });

    socket.on('unvote_team_switch', ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      const voteSet = room.teamSwitchVotes.get(targetPlayerId);
      if (!voteSet?.has(socket.id)) return;
      voteSet.delete(socket.id);
      if (voteSet.size === 0) room.teamSwitchVotes.delete(targetPlayerId);
      const humanCount = room.lobby.slots.filter(s => s.status === 'human').length;
      const needed = Math.max(2, Math.ceil((humanCount - 1) / 2));
      io.to(roomCode).emit('team_switch_vote_updated', {
        targetPlayerId,
        votes: voteSet.size,
        needed,
        voterIds: Array.from(voteSet),
      });
    });

    socket.on('kick_player', ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }
      if (room.lobby.hostId !== socket.id) { socket.emit('error', { message: 'Only the host can kick players.' }); return; }
      if (targetPlayerId === socket.id) { socket.emit('error', { message: "You can't kick yourself." }); return; }

      const slot = room.lobby.slots.find(s => s.playerId === targetPlayerId && s.status === 'human');
      if (!slot) { socket.emit('error', { message: 'Player not found.' }); return; }
      const playerName = slot.playerName ?? 'Player';

      const targetSocketId = room.socketMap.get(targetPlayerId);
      const result = removePlayer(roomCode, targetPlayerId);
      if (!result) return;

      room.kickVotes.delete(targetPlayerId);
      if (targetSocketId) io.to(targetSocketId).emit('kicked', { message: 'You were kicked from the room.' });
      io.to(roomCode).emit('player_kicked', { playerId: targetPlayerId, playerName });
      io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
    });

    socket.on('vote_kick', ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      if (socket.id === targetPlayerId) { socket.emit('error', { message: "You can't vote to kick yourself." }); return; }

      const targetSlot = room.lobby.slots.find(s => s.playerId === targetPlayerId && s.status === 'human');
      if (!targetSlot) return;

      if (!room.kickVotes.has(targetPlayerId)) room.kickVotes.set(targetPlayerId, new Set());
      room.kickVotes.get(targetPlayerId)!.add(socket.id);

      const humanCount = room.lobby.slots.filter(s => s.status === 'human').length;
      const needed = Math.max(2, Math.ceil((humanCount - 1) / 2)); // majority of non-target, min 2 votes required
      const votes = room.kickVotes.get(targetPlayerId)!.size;

      io.to(roomCode).emit('kick_vote_updated', {
        targetPlayerId,
        votes,
        needed,
        voterIds: Array.from(room.kickVotes.get(targetPlayerId)!),
      });

      if (votes >= needed) {
        const playerName = targetSlot.playerName ?? 'Player';
        const targetSocketId = room.socketMap.get(targetPlayerId);
        const result = removePlayer(roomCode, targetPlayerId);
        if (!result) return;
        room.kickVotes.delete(targetPlayerId);
        if (targetSocketId) io.to(targetSocketId).emit('kicked', { message: 'You were voted out of the room.' });
        io.to(roomCode).emit('player_kicked', { playerId: targetPlayerId, playerName });
        io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
      }
    });

    socket.on('unvote_kick', ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room || room.game) return;
      const voteSet = room.kickVotes.get(targetPlayerId);
      if (!voteSet?.has(socket.id)) return;
      voteSet.delete(socket.id);
      if (voteSet.size === 0) room.kickVotes.delete(targetPlayerId);
      const humanCount = room.lobby.slots.filter(s => s.status === 'human').length;
      const needed = Math.max(2, Math.ceil((humanCount - 1) / 2));
      io.to(roomCode).emit('kick_vote_updated', {
        targetPlayerId,
        votes: voteSet.size,
        needed,
        voterIds: Array.from(voteSet),
      });
    });

    socket.on('add_bot', ({ roomCode, seatIndex }: { roomCode: string; seatIndex: number }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }
      if (room.lobby.hostId !== socket.id) { socket.emit('error', { message: 'Only the host can add bots.' }); return; }

      const result = addBot(roomCode, seatIndex);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
    });

    socket.on('remove_bot', ({ roomCode, seatIndex }: { roomCode: string; seatIndex: number }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }
      if (room.lobby.hostId !== socket.id) { socket.emit('error', { message: 'Only the host can remove bots.' }); return; }

      const result = removeBot(roomCode, seatIndex);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      io.to(roomCode).emit('lobby_updated', { lobby: result.lobby });
    });

    socket.on('start_game', ({ roomCode }: { roomCode: string }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }
      if (room.lobby.hostId !== socket.id) { socket.emit('error', { message: 'Only the host can start the game.' }); return; }
      if (!room.lobby.isStartable) { socket.emit('error', { message: 'Not all seats are filled.' }); return; }

      // Initialize game
      room.game = initializeGame(room.lobby);

      // Initialize reveal credits for human players
      initRevealCredits(room);

      // Initialize bot states
      for (const player of room.game.players) {
        if (player.isBot) {
          const botHand = room.game.hands[player.id] ?? [];
          const allPlayerIds = room.game.players.map(p => p.id);
          room.botStates.set(player.id, createBotState(player.id, botHand, allPlayerIds));
        }
      }

      // Send each human player their personal view (only their own hand)
      for (const player of room.game.players) {
        if (player.isBot) continue;
        const socketId = room.socketMap.get(player.id);
        if (socketId) {
          const view = buildClientView(room.game, player.id);
          io.to(socketId).emit('game_started', { view });
        }
      }

      // If first player is a bot, schedule its turn
      const firstPlayer = room.game.players.find(p => p.id === room.game!.currentTurnPlayerId);
      if (firstPlayer?.isBot) {
        scheduleBotTurn(io, roomCode, firstPlayer.id);
      }
    });

    // ----------------------------------------------------------
    // Game Events
    // ----------------------------------------------------------

    socket.on('ask', ({ roomCode, targetPlayerId, cardId }: {
      roomCode: string; targetPlayerId: PlayerId; cardId: string;
    }) => {
      processAsk(io, roomCode, socket.id, {
        type: 'ask',
        askingPlayerId: socket.id,
        targetPlayerId,
        cardId,
      });
    });

    socket.on('call_set', ({ roomCode, setId, assignment }: {
      roomCode: string; setId: SetId; assignment: Record<string, PlayerId>;
    }) => {
      processCallSet(io, roomCode, socket.id, {
        type: 'call_set',
        callingPlayerId: socket.id,
        setId,
        assignment,
      });
    });

    socket.on('counter_set', ({ roomCode, setId, assignment }: {
      roomCode: string; setId: SetId; assignment: Record<string, PlayerId>;
    }) => {
      processCounterSet(io, roomCode, socket.id, {
        type: 'counter_set',
        callingPlayerId: socket.id,
        setId,
        assignment,
      });
    });

    // ------ Live Call Set Flow ------

    socket.on('call_set_initiated', ({ roomCode }: { roomCode: string }) => {
      const room = getRoom(roomCode);
      if (!room || !room.game) { socket.emit('error', { message: 'No active game.' }); return; }
      if (room.callSetLock) { socket.emit('error', { message: 'A call set is already in progress.' }); return; }
      const caller = room.game.players.find(p => p.id === socket.id);
      if (!caller) return;
      room.callSetLock = socket.id;
      io.to(roomCode).emit('call_set_initiated', { callerPlayerId: socket.id, callerName: caller.name });
    });

    socket.on('call_set_choose_set', ({ roomCode, setId }: { roomCode: string; setId: string }) => {
      const room = getRoom(roomCode);
      if (!room || !room.game || room.callSetLock !== socket.id) return;
      const callerHand = room.game.hands[socket.id] ?? [];
      const setCards = getSetCards(setId as import('shared').SetId);
      const preAssignment: Record<string, string> = {};
      for (const cardId of setCards) {
        if (callerHand.includes(cardId)) preAssignment[cardId] = socket.id;
      }
      io.to(roomCode).emit('call_set_set_chosen', {
        callerPlayerId: socket.id,
        setId,
        preAssignment,
        players: room.game.players,
      });
    });

    socket.on('call_set_card_assigned', ({ roomCode, cardId, assignedPlayerId }: {
      roomCode: string; cardId: string; assignedPlayerId: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room || !room.game || room.callSetLock !== socket.id) return;
      io.to(roomCode).emit('call_set_card_assigned', { cardId, assignedPlayerId });
    });

    socket.on('vote_end_game', ({ roomCode }: { roomCode: string }) => {
      const room = getRoom(roomCode);
      if (!room || !room.game || room.game.phase !== 'in_progress') return;
      const player = room.game.players.find(p => p.id === socket.id && !p.isBot);
      if (!player) return;

      room.endGameVotes.add(socket.id);
      const humanPlayers = room.game.players.filter(p => !p.isBot);
      const needed = humanPlayers.length;
      const voterIds = Array.from(room.endGameVotes);

      io.to(roomCode).emit('end_game_vote_updated', { votes: voterIds.length, needed, voterIds });

      if (voterIds.length >= needed) {
        room.endGameVotes.clear();
        const state = room.game;
        const { A, B } = state.scores;
        let winner: string;
        let tiebreaker: { winnerTeam: TeamId; teamACards: number; teamBCards: number } | null = null;

        if (A > B) {
          winner = 'A';
        } else if (B > A) {
          winner = 'B';
        } else {
          const { cardsA, cardsB } = countTeamCardsInUnclaimedSets(state);
          winner = cardsA >= cardsB ? 'A' : 'B';
          tiebreaker = { winnerTeam: cardsA >= cardsB ? 'A' : 'B', teamACards: cardsA, teamBCards: cardsB };
        }

        emitGameOver(io, roomCode, state, winner, tiebreaker);
      }
    });

    socket.on('pass_turn', ({ roomCode, toPlayerId }: { roomCode: string; toPlayerId: PlayerId }) => {
      const room = getRoom(roomCode);
      if (!room || !room.game || room.game.phase !== 'in_progress') return;

      const sender = room.game.players.find(p => p.id === socket.id);
      if (!sender) return;
      // Only valid if: it's the sender's turn and they have 0 cards
      if (room.game.currentTurnPlayerId !== socket.id) return;
      if (sender.cardCount !== 0) return;

      const target = room.game.players.find(p => p.id === toPlayerId);
      if (!target || target.teamId !== sender.teamId || target.cardCount === 0) return;

      room.game = { ...room.game, currentTurnPlayerId: toPlayerId };
      io.to(roomCode).emit('turn_updated', { newTurnPlayerId: toPlayerId });
      if (target.isBot) scheduleBotTurn(io, roomCode, toPlayerId);
    });

    socket.on('reveal_ask', ({ roomCode }: { roomCode: string }) => {
      const room = getRoom(roomCode);
      if (!room || !room.game) { socket.emit('error', { message: 'No active game.' }); return; }

      const playerId = socket.id;
      const credits = room.revealCredits.get(playerId) ?? 0;
      if (credits <= 0) {
        socket.emit('error', { message: 'No reveal credits remaining.' });
        return;
      }

      // Determine how many asks to show: each use reveals one more (cumulative)
      const maxCredits = getRevealCredits(room.lobby.difficulty);
      const usedSoFar = maxCredits - credits; // 0 = first use, 1 = second, etc.
      const numToShow = usedSoFar + 1;
      const asks = room.game.askHistory.slice(-numToShow);

      room.revealCredits.set(playerId, credits - 1);
      socket.emit('reveal_response', { asks, creditsRemaining: credits - 1 });
    });

    // ----------------------------------------------------------
    // Disconnect
    // ----------------------------------------------------------

    socket.on('disconnect', () => {
      const info = socketToPlayer.get(socket.id);
      if (!info) return;
      socketToPlayer.delete(socket.id);

      const { playerId, roomCode } = info;
      const room = getRoom(roomCode);
      if (!room) return;

      // If disconnecting player was mid-call-set, cancel it
      if (room.callSetLock === socket.id) {
        room.callSetLock = null;
        io.to(roomCode).emit('call_set_cancelled', { reason: 'Player disconnected during call set.' });
      }

      const result = removePlayer(roomCode, playerId);
      if (!result) return;

      // If no humans left, clean up the room
      const humansLeft = room.lobby.slots.filter(s => s.status === 'human').length;
      if (humansLeft === 0) {
        deleteRoom(roomCode);
        return;
      }

      io.to(roomCode).emit('player_disconnected', {
        playerId,
        lobby: result.lobby,
      });
    });
  });
}

// ============================================================
// Exported action processors (shared with botRunner)
// ============================================================

export function processAsk(
  io: Server,
  roomCode: string,
  requesterId: PlayerId,
  action: AskAction
): void {
  const room = getRoom(roomCode);
  if (!room || !room.game) return;

  if (room.callSetLock) {
    const socketId = room.socketMap.get(requesterId);
    if (socketId) io.to(socketId).emit('error', { message: 'Cannot ask while a call set is in progress.' });
    return;
  }

  const validation = validateAsk(room.game, action);
  if (!validation.valid) {
    const socketId = room.socketMap.get(requesterId);
    if (socketId) io.to(socketId).emit('error', { message: validation.reason });
    return;
  }

  const { newState, result } = applyAsk(room.game, action);
  room.game = newState;

  // Update all bot inference tables
  const lastAsk = newState.askHistory[newState.askHistory.length - 1];
  for (const [, botState] of room.botStates) {
    updateBotState(botState, lastAsk, newState);
  }

  // Broadcast result to all (public info: who asked whom for what, and success/fail)
  io.to(roomCode).emit('ask_result', {
    action,
    result,
    players: newState.players, // updated card counts
  });

  // Send updated hands privately to affected players
  sendHandUpdate(io, room, action.askingPlayerId, newState);
  if (result.cardTransferred) {
    sendHandUpdate(io, room, action.targetPlayerId, newState);
  }

  // Check win condition
  const winner = checkWin(newState);
  if (winner) {
    emitGameOver(io, roomCode, newState, winner);
    return;
  }

  // Check if bots want to counter-set
  checkBotCounterSet(io, roomCode);

  // Schedule bot turn if needed
  const nextPlayer = newState.players.find(p => p.id === newState.currentTurnPlayerId);
  if (nextPlayer?.isBot) {
    scheduleBotTurn(io, roomCode, nextPlayer.id);
  }
}

export function processCallSet(
  io: Server,
  roomCode: string,
  requesterId: PlayerId,
  action: CallSetAction
): void {
  const room = getRoom(roomCode);
  if (!room || !room.game) return;

  const validation = validateCallSet(room.game, action);
  if (!validation.valid) {
    const socketId = room.socketMap.get(requesterId);
    if (socketId) io.to(socketId).emit('error', { message: validation.reason });
    return;
  }

  const { newState, result } = applyCallSet(room.game, action);
  room.game = newState;
  room.callSetLock = null; // release lock — result broadcast signals end to clients

  // Update bot inference: remove claimed set cards
  for (const [, botState] of room.botStates) {
    removeSetFromBotState(botState, action.setId);
  }

  io.to(roomCode).emit('call_set_result', {
    action,
    result,
    claimedSets: newState.claimedSets,
    scores: newState.scores,
    players: newState.players,
  });

  // Send updated hands to all human players (set cards stripped from everyone who had them)
  for (const player of newState.players) {
    if (!player.isBot) sendHandUpdate(io, room, player.id, newState);
  }

  const winner = checkWin(newState);
  if (winner) {
    emitGameOver(io, roomCode, newState, winner);
    return;
  }

  handleZeroCardTurn(io, roomCode, newState);
}

export function processCounterSet(
  io: Server,
  roomCode: string,
  requesterId: PlayerId,
  action: CounterSetAction
): void {
  const room = getRoom(roomCode);
  if (!room || !room.game) return;

  const validation = validateCounterSet(room.game, action);
  if (!validation.valid) {
    const socketId = room.socketMap.get(requesterId);
    if (socketId) io.to(socketId).emit('error', { message: validation.reason });
    return;
  }

  const { newState, result } = applyCounterSet(room.game, action);
  room.game = newState;
  room.callSetLock = null;

  for (const [, botState] of room.botStates) {
    removeSetFromBotState(botState, action.setId);
  }

  io.to(roomCode).emit('counter_set_result', {
    action,
    result,
    claimedSets: newState.claimedSets,
    scores: newState.scores,
    players: newState.players,
  });

  for (const player of newState.players) {
    if (!player.isBot) sendHandUpdate(io, room, player.id, newState);
  }

  const winner = checkWin(newState);
  if (winner) {
    emitGameOver(io, roomCode, newState, winner);
    return;
  }

  handleZeroCardTurn(io, roomCode, newState);
}

// After a set is claimed, check if the current turn holder now has 0 cards.
// If so: let them choose a teammate (human with 2+ options) or auto-assign (bot / only 1 option).
function handleZeroCardTurn(io: Server, roomCode: string, state: GameState): void {
  const room = getRoom(roomCode);
  if (!room) return;

  const turnPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);
  if (!turnPlayer || turnPlayer.cardCount > 0) {
    // Normal case — schedule bot if needed
    if (turnPlayer?.isBot) scheduleBotTurn(io, roomCode, turnPlayer.id);
    return;
  }

  // Turn holder has 0 cards — find teammates with cards
  const eligible = state.players.filter(
    p => p.teamId === turnPlayer.teamId && p.id !== turnPlayer.id && p.cardCount > 0
  );

  if (eligible.length === 0) {
    // All teammates also have 0 cards — nothing to do (game should have ended)
    return;
  }

  if (eligible.length === 1 || turnPlayer.isBot) {
    // Only one choice (or it's a bot) — auto-assign
    const next = eligible[0];
    room.game = { ...room.game!, currentTurnPlayerId: next.id };
    io.to(roomCode).emit('turn_updated', { newTurnPlayerId: next.id });
    if (next.isBot) scheduleBotTurn(io, roomCode, next.id);
    return;
  }

  // Human turn holder with multiple eligible teammates — ask them to choose
  const socketId = room.socketMap.get(turnPlayer.id);
  if (socketId) {
    io.to(socketId).emit('choose_turn_recipient', { candidates: eligible });
  }
}

function sendHandUpdate(io: Server, room: ReturnType<typeof getRoom>, playerId: PlayerId, state: GameState): void {
  if (!room) return;
  const socketId = room.socketMap.get(playerId);
  if (socketId) {
    io.to(socketId).emit('hand_updated', { myHand: state.hands[playerId] ?? [] });
  }
}

function countTeamCardsInUnclaimedSets(state: GameState): { cardsA: number; cardsB: number } {
  // Build cardId → teamId lookup from all player hands
  const cardTeam = new Map<string, TeamId>();
  for (const [pid, hand] of Object.entries(state.hands)) {
    const teamId = state.players.find(p => p.id === pid)?.teamId;
    if (teamId) hand.forEach(c => cardTeam.set(c, teamId));
  }
  const unclaimedSetIds = ALL_SET_IDS.filter(sid => !state.claimedSets.some(cs => cs.setId === sid));
  let cardsA = 0;
  let cardsB = 0;
  for (const sid of unclaimedSetIds) {
    for (const cardId of getSetCards(sid)) {
      const team = cardTeam.get(cardId);
      if (team === 'A') cardsA++;
      else if (team === 'B') cardsB++;
    }
  }
  return { cardsA, cardsB };
}

function emitGameOver(
  io: Server,
  roomCode: string,
  state: GameState,
  winner: string,
  tiebreaker?: { winnerTeam: TeamId; teamACards: number; teamBCards: number } | null
): void {
  state.phase = 'game_over';
  io.to(roomCode).emit('game_over', {
    winnerTeam: winner,
    scores: state.scores,
    claimedSets: state.claimedSets,
    players: state.players,
    fullAskHistory: state.askHistory, // safe to reveal now — game is over
    tiebreaker: tiebreaker ?? null,
  });
}
