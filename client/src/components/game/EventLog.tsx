import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SET_DEFINITIONS } from 'shared';
import type { SetOwnership, PlayerInfo } from 'shared';

export interface EventEntry {
  id: string;
  type: 'set_claimed' | 'counter_set' | 'turn_change' | 'game_start' | 'player_join' | 'ask_success' | 'ask_fail';
  message: string;
  timestamp: number;
}

interface EventLogProps {
  readonly entries: EventEntry[];
  readonly players: PlayerInfo[];
}

const typeColors: Record<EventEntry['type'], string> = {
  set_claimed: 'text-amber-300',
  counter_set: 'text-blue-300',
  turn_change: 'text-gray-400',
  game_start: 'text-green-400',
  player_join: 'text-gray-400',
  ask_success: 'text-green-300',
  ask_fail: 'text-red-400',
};

export function cardLabel(cardId: string): string {
  if (cardId === 'JOKER_1' || cardId === 'JOKER_2') return 'Joker';
  const parts = cardId.split('_');
  const suit = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const rank = parts.slice(1).join(' ');
  return `${rank} of ${suit}`;
}

export function EventLog({ entries, players }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="bg-black/30 rounded-xl border border-gray-700 h-40 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-1">
      <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">Game Log</div>
      {entries.length === 0 && (
        <div className="text-gray-600 text-xs">Game events will appear here...</div>
      )}
      <AnimatePresence>
        {entries.map(entry => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-xs ${typeColors[entry.type]}`}
          >
            {entry.message}
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

// Helpers to build event entries from socket data
export function buildSetClaimedEntry(
  claimedSet: SetOwnership,
  players: PlayerInfo[]
): EventEntry {
  const caller = players.find(p => p.id === claimedSet.calledBy);
  const setLabel = SET_DEFINITIONS[claimedSet.setId]?.label ?? claimedSet.setId;
  const teamLabel = `Team ${claimedSet.wonByTeam}`;
  const prefix = claimedSet.wasCounter ? '⚡ Counter: ' : '✓ ';

  return {
    id: `${claimedSet.setId}_${Date.now()}`,
    type: claimedSet.wasCounter ? 'counter_set' : 'set_claimed',
    message: `${prefix}${caller?.name ?? 'Someone'} claimed ${setLabel} for ${teamLabel}`,
    timestamp: Date.now(),
  };
}
