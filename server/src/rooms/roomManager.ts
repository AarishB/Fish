import type {
  LobbyState,
  LobbySlot,
  GameState,
  PlayerId,
  TeamId,
  GameDifficulty,
  SwapRequest,
} from 'shared';
import { getRevealCredits } from 'shared';
import type { BotState } from '../bot/botBrain';

export interface Room {
  roomCode: string;
  lobby: LobbyState;
  game: GameState | null;
  socketMap: Map<PlayerId, string>;      // playerId → socket.id
  botStates: Map<PlayerId, BotState>;
  revealCredits: Map<PlayerId, number>;  // 3 credits per player per game
  kickVotes: Map<PlayerId, Set<PlayerId>>; // targetId → Set of voter socket IDs
  callSetLock: PlayerId | null;          // playerId currently executing a call set
  teamSwitchVotes: Map<PlayerId, Set<PlayerId>>; // targetId → Set of voter playerIds
  endGameVotes: Set<PlayerId>;           // human playerIds who voted to end game
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function buildSlots(playerCount: number): LobbySlot[] {
  const slots: LobbySlot[] = [];
  for (let i = 0; i < playerCount; i++) {
    const teamId: TeamId = i % 2 === 0 ? 'A' : 'B';
    slots.push({ seatIndex: i, status: 'empty', teamId });
  }
  return slots;
}

export function createRoom(hostSocketId: string, hostId: PlayerId, hostName: string, playerCount: number, difficulty: GameDifficulty): Room {
  const roomCode = generateRoomCode();
  const slots = buildSlots(playerCount);
  // Place host in seat 0 (Team A)
  slots[0] = { seatIndex: 0, status: 'human', playerId: hostId, playerName: hostName, teamId: 'A' };

  const lobby: LobbyState = {
    roomCode,
    hostId,
    playerCount,
    difficulty,
    slots,
    isStartable: false,
    teamNames: { A: 'Team A', B: 'Team B' },
    swapRequests: [],
  };

  const room: Room = {
    roomCode,
    lobby,
    game: null,
    socketMap: new Map([[hostId, hostSocketId]]),
    botStates: new Map(),
    revealCredits: new Map(),
    kickVotes: new Map(),
    callSetLock: null,
    teamSwitchVotes: new Map(),
    endGameVotes: new Set(),
  };

  rooms.set(roomCode, room);
  return room;
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode);
}

export function joinRoom(
  roomCode: string,
  playerId: PlayerId,
  playerName: string,
  socketId: string,
  preferredTeam?: TeamId
): { slot: LobbySlot; lobby: LobbyState } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found.' };
  if (room.game) return { error: 'Game already in progress.' };

  // Try preferred team first, then fall back to any empty slot
  let emptySlot = preferredTeam
    ? room.lobby.slots.find(s => s.status === 'empty' && s.teamId === preferredTeam)
    : undefined;
  emptySlot ??= room.lobby.slots.find(s => s.status === 'empty');
  if (!emptySlot) return { error: 'Room is full.' };

  emptySlot.status = 'human';
  emptySlot.playerId = playerId;
  emptySlot.playerName = playerName;
  room.socketMap.set(playerId, socketId);
  room.lobby.isStartable = isRoomStartable(room);

  return { slot: emptySlot, lobby: room.lobby };
}

export function switchTeam(roomCode: string, playerId: PlayerId): { success: boolean; lobby?: LobbyState } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false };

  const currentSlot = room.lobby.slots.find(s => s.playerId === playerId && s.status === 'human');
  if (!currentSlot) return { success: false };

  const otherTeam: TeamId = currentSlot.teamId === 'A' ? 'B' : 'A';
  const targetSlot = room.lobby.slots.find(s => s.status === 'empty' && s.teamId === otherTeam);
  if (!targetSlot) return { success: false };

  // Move player to the new slot
  targetSlot.status = 'human';
  targetSlot.playerId = currentSlot.playerId;
  targetSlot.playerName = currentSlot.playerName;

  // Empty old slot
  currentSlot.status = 'empty';
  currentSlot.playerId = undefined;
  currentSlot.playerName = undefined;

  room.lobby.isStartable = isRoomStartable(room);
  return { success: true, lobby: room.lobby };
}

export function swapPlayers(roomCode: string, playerAId: PlayerId, playerBId: PlayerId): { lobby: LobbyState } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found.' };

  const slotA = room.lobby.slots.find(s => s.playerId === playerAId);
  const slotB = room.lobby.slots.find(s => s.playerId === playerBId);
  if (!slotA || !slotB) return { error: 'Player not found.' };

  // Swap player identity between the two team slots (teamId stays fixed to seat)
  const tmpId = slotA.playerId;
  const tmpName = slotA.playerName;
  slotA.playerId = slotB.playerId;
  slotA.playerName = slotB.playerName;
  slotB.playerId = tmpId;
  slotB.playerName = tmpName;

  // Update socketMap entries
  const socketA = room.socketMap.get(playerAId);
  const socketB = room.socketMap.get(playerBId);
  if (socketA) room.socketMap.set(playerBId, socketA);
  if (socketB) room.socketMap.set(playerAId, socketB);

  return { lobby: room.lobby };
}

export function renameTeam(roomCode: string, teamId: TeamId, newName: string): { lobby: LobbyState } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found.' };
  room.lobby.teamNames[teamId] = newName.trim().slice(0, 24);
  return { lobby: room.lobby };
}

export function addSwapRequest(roomCode: string, req: SwapRequest): { error?: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found.' };
  // Remove any existing request between these two
  room.lobby.swapRequests = room.lobby.swapRequests.filter(
    r => !(r.requesterId === req.requesterId && r.targetId === req.targetId)
  );
  room.lobby.swapRequests.push(req);
  return {};
}

export function removeSwapRequest(roomCode: string, requestId: string): SwapRequest | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const idx = room.lobby.swapRequests.findIndex(r => r.id === requestId);
  if (idx === -1) return null;
  const [req] = room.lobby.swapRequests.splice(idx, 1);
  return req;
}

export function addBot(roomCode: string, seatIndex: number): { lobby: LobbyState } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found.' };

  const slot = room.lobby.slots.find(s => s.seatIndex === seatIndex);
  if (!slot) return { error: 'Seat not found.' };
  if (slot.status !== 'empty') return { error: 'Seat is not empty.' };

  const botId = `BOT_${seatIndex}`;
  slot.status = 'bot';
  slot.playerId = botId;
  slot.playerName = `Bot ${seatIndex + 1}`;
  room.lobby.isStartable = isRoomStartable(room);

  return { lobby: room.lobby };
}

export function removeBot(roomCode: string, seatIndex: number): { lobby: LobbyState } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found.' };

  const slot = room.lobby.slots.find(s => s.seatIndex === seatIndex);
  if (!slot || slot.status !== 'bot') return { error: 'No bot at that seat.' };

  slot.status = 'empty';
  slot.playerId = undefined;
  slot.playerName = undefined;
  room.lobby.isStartable = isRoomStartable(room);

  return { lobby: room.lobby };
}

export function removePlayer(roomCode: string, playerId: PlayerId): { lobby: LobbyState; wasHost: boolean } | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const slot = room.lobby.slots.find(s => s.playerId === playerId && s.status === 'human');
  if (slot) {
    slot.status = 'empty';
    slot.playerId = undefined;
    slot.playerName = undefined;
  }
  room.socketMap.delete(playerId);
  room.lobby.isStartable = isRoomStartable(room);

  // Cancel any pending swap requests involving this player
  room.lobby.swapRequests = room.lobby.swapRequests.filter(
    r => r.requesterId !== playerId && r.targetId !== playerId
  );

  // Clear any team switch votes targeting or from this player
  room.teamSwitchVotes.delete(playerId);
  for (const [, voters] of room.teamSwitchVotes) {
    voters.delete(playerId);
  }

  const wasHost = room.lobby.hostId === playerId;

  // Transfer host to next human player
  if (wasHost) {
    const nextHuman = room.lobby.slots.find(s => s.status === 'human');
    if (nextHuman?.playerId) {
      room.lobby.hostId = nextHuman.playerId;
    }
  }

  return { lobby: room.lobby, wasHost };
}

export function isRoomStartable(room: Room): boolean {
  return room.lobby.slots.every(s => s.status !== 'empty');
}

export function initRevealCredits(room: Room): void {
  room.revealCredits.clear();
  const credits = getRevealCredits(room.lobby.difficulty);
  for (const slot of room.lobby.slots) {
    if (slot.status === 'human' && slot.playerId) {
      room.revealCredits.set(slot.playerId, credits);
    }
  }
}
