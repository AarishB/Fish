import type { Server } from 'socket.io';
import type { PlayerId } from 'shared';
import { getRoom } from '../rooms/roomManager';
import { chooseAsk, chooseCallSet, chooseCounterSet } from './botBrain';
import { processAsk, processCallSet, processCounterSet } from '../socketHandler';

const BOT_THINK_MIN_MS = 1200;
const BOT_THINK_MAX_MS = 3000;

function randomDelay(): number {
  return Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS) + BOT_THINK_MIN_MS);
}

export function scheduleBotTurn(io: Server, roomCode: string, botId: PlayerId): void {
  const delay = randomDelay();

  setTimeout(() => {
    const room = getRoom(roomCode);
    if (!room || !room.game) return;
    if (room.game.currentTurnPlayerId !== botId) return;

    // Emit thinking indicator
    io.to(roomCode).emit('bot_thinking', { playerId: botId });

    const botState = room.botStates.get(botId);
    if (!botState) return;

    // First check if we can call a set
    const callSetAction = chooseCallSet(botState, room.game);
    if (callSetAction) {
      processCallSet(io, roomCode, botId, callSetAction);
      return;
    }

    // Otherwise ask
    const askAction = chooseAsk(botState, room.game);
    if (askAction) {
      processAsk(io, roomCode, botId, askAction);
      return;
    }

    // No valid move — this shouldn't happen in a normal game but handle gracefully
    // Pass turn to a random opponent
    const opponents = room.game.players.filter(
      p => p.teamId !== room.game!.players.find(pl => pl.id === botId)?.teamId && p.cardCount > 0
    );
    if (opponents.length > 0) {
      const nextPlayer = opponents[0];
      room.game = { ...room.game, currentTurnPlayerId: nextPlayer.id };
      io.to(roomCode).emit('turn_changed', { currentTurnPlayerId: nextPlayer.id });
    }
  }, delay);
}

// Bots also check counter-set opportunities after every game event
export function checkBotCounterSet(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room || !room.game) return;

  for (const player of room.game.players) {
    if (!player.isBot) continue;
    const botState = room.botStates.get(player.id);
    if (!botState) continue;

    const counterAction = chooseCounterSet(botState, room.game);
    if (counterAction) {
      setTimeout(() => {
        processCounterSet(io, roomCode, player.id, counterAction);
      }, randomDelay());
      break; // Only one counter at a time
    }
  }
}
