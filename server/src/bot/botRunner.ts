import type { Server } from 'socket.io';
import type { PlayerId, CallSetAction } from 'shared';
import { getSetCards } from 'shared';
import { getRoom } from '../rooms/roomManager';
import { chooseAsk, chooseCallSet, chooseCounterSet } from './botBrain';
import { processAsk, processCallSet, processCounterSet } from '../socketHandler';

// ─── Timing constants ──────────────────────────────────────────────────────────
const BOT_THINK_MIN_MS   = 1500;
const BOT_THINK_MAX_MS   = 3500;
const BOT_POST_THINK_MS  = 700;   // gap between "thinking" dot and actual ask
const BOT_CARD_MIN_MS    = 900;   // min delay between card-assignment steps
const BOT_CARD_MAX_MS    = 1700;

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Public entry points ───────────────────────────────────────────────────────

// minDelay lets callers ensure the bot doesn't fire before a UI overlay finishes
export function scheduleBotTurn(io: Server, roomCode: string, botId: PlayerId, minDelay = 0): void {
  const delay = Math.max(minDelay, rnd(BOT_THINK_MIN_MS, BOT_THINK_MAX_MS));
  setTimeout(() => { void runBotTurn(io, roomCode, botId); }, delay);
}

export function checkBotCounterSet(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room?.game) return;

  for (const player of room.game.players) {
    if (!player.isBot) continue;
    const botState = room.botStates.get(player.id);
    if (!botState) continue;

    const counterAction = chooseCounterSet(botState, room.game);
    if (counterAction) {
      setTimeout(() => {
        processCounterSet(io, roomCode, player.id, counterAction);
      }, rnd(BOT_THINK_MIN_MS, BOT_THINK_MAX_MS));
      break; // only one counter at a time
    }
  }
}

// ─── Bot turn logic ────────────────────────────────────────────────────────────

async function runBotTurn(io: Server, roomCode: string, botId: PlayerId): Promise<void> {
  const room = getRoom(roomCode);
  if (!room?.game) return;
  if (room.game.currentTurnPlayerId !== botId) return;

  // Show thinking indicator to all players
  io.to(roomCode).emit('bot_thinking', { playerId: botId });

  const botState = room.botStates.get(botId);
  if (!botState) return;

  // Prefer calling a set if possible — do the full live flow
  const callSetAction = chooseCallSet(botState, room.game);
  if (callSetAction) {
    await sleep(BOT_POST_THINK_MS);
    await performBotCallSet(io, roomCode, botId, callSetAction);
    return;
  }

  // Otherwise ask — pause so the thinking indicator is visible before the ask fires
  await sleep(BOT_POST_THINK_MS);

  const room2 = getRoom(roomCode);
  if (!room2?.game) return;
  if (room2.game.currentTurnPlayerId !== botId) return;

  const askAction = chooseAsk(botState, room2.game);
  if (askAction) {
    processAsk(io, roomCode, botId, askAction);
    return;
  }

  // No valid move (shouldn't happen in normal play) — pass turn to a random opponent
  const game = room2.game;
  const myTeamId = game.players.find(p => p.id === botId)?.teamId;
  const fallback = game.players.find(p => p.teamId !== myTeamId && p.cardCount > 0);
  if (fallback) {
    room2.game = { ...game, currentTurnPlayerId: fallback.id };
    io.to(roomCode).emit('turn_changed', { currentTurnPlayerId: fallback.id });
  }
}

// ─── Live call-set flow for bots ───────────────────────────────────────────────
// Mirrors exactly what a human client would emit, with human-like delays between steps.

async function performBotCallSet(
  io: Server,
  roomCode: string,
  botId: PlayerId,
  action: CallSetAction
): Promise<void> {
  const room = getRoom(roomCode);
  if (!room?.game) return;
  if (room.callSetLock) return; // another call set already in progress

  const bot = room.game.players.find(p => p.id === botId);
  if (!bot) return;

  // Step 1: Announce call set initiated (acquires the lock)
  room.callSetLock = botId;
  io.to(roomCode).emit('call_set_initiated', { callerPlayerId: botId, callerName: bot.name });

  // Step 2: Pause while everyone sees the announcement, then reveal which set
  await sleep(rnd(1000, 1800));

  const r1 = getRoom(roomCode);
  if (!r1?.game || r1.callSetLock !== botId) return;

  const { setId, assignment } = action;
  const setCards = getSetCards(setId);

  // Send empty pre-assignment so all cards are revealed one by one (more theatrical)
  io.to(roomCode).emit('call_set_set_chosen', {
    callerPlayerId: botId,
    setId,
    preAssignment: {},
    players: r1.game.players,
  });

  // Step 3: Assign every card one at a time, with human-like pauses
  for (const cardId of setCards) {
    await sleep(rnd(BOT_CARD_MIN_MS, BOT_CARD_MAX_MS));

    const r2 = getRoom(roomCode);
    if (!r2?.game || r2.callSetLock !== botId) return;

    const assignedPlayerId = assignment[cardId];
    if (!assignedPlayerId) continue;

    io.to(roomCode).emit('call_set_card_assigned', { cardId, assignedPlayerId });
  }

  // Step 4: Review pause so players can see the complete assignment, then submit
  await sleep(rnd(900, 1400));

  const r3 = getRoom(roomCode);
  if (!r3?.game || r3.callSetLock !== botId) return;

  processCallSet(io, roomCode, botId, action);
}
