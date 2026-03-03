import { motion } from 'framer-motion';
import type { PlayerInfo } from 'shared';
import { useGameStore } from '../../store/useGameStore';
import { Card } from '../cards/Card';

interface PlayerSeatProps {
  player: PlayerInfo;
  isCurrentTurn: boolean;
  isLocalPlayer: boolean;
  isSelectable?: boolean;
  onSelect?: (playerId: string) => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const teamColors: Record<string, string> = {
  A: 'border-teamA text-teamA',
  B: 'border-teamB text-teamB',
};

const teamGlow: Record<string, string> = {
  A: 'shadow-[0_0_14px_4px_rgba(59,130,246,0.7)]',
  B: 'shadow-[0_0_14px_4px_rgba(239,68,68,0.7)]',
};

function Avatar({ player, size = 'md' }: Readonly<{ player: PlayerInfo; size?: 'sm' | 'md' }>) {
  const initials = player.isBot
    ? '🤖'
    : player.name.slice(0, 2).toUpperCase();

  const bgColors: Record<string, string> = {
    A: 'bg-teamA/20 text-teamALight',
    B: 'bg-teamB/20 text-teamBLight',
  };

  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-12 h-12 text-base';

  return (
    <div
      className={`${sz} rounded-full border-2 flex items-center justify-center font-bold
        ${bgColors[player.teamId]} ${teamColors[player.teamId]}`}
    >
      {initials}
    </div>
  );
}

export function PlayerSeat({
  player,
  isCurrentTurn,
  isLocalPlayer,
  isSelectable = false,
  onSelect,
  position = 'top',
}: Readonly<PlayerSeatProps>) {
  const shakingPlayerId = useGameStore(s => s.shakingPlayerId);
  const isShaking = shakingPlayerId === player.id;

  return (
    <motion.div
      layout
      data-player-id={player.id}
      animate={isShaking ? {
        x: [-8, 8, -6, 6, 0],
        transition: { duration: 0.4 },
      } : {}}
      onClick={isSelectable && onSelect ? () => onSelect(player.id) : undefined}
      className={`
        relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-200
        ${isSelectable ? 'cursor-pointer hover:bg-white/10 active:scale-95' : ''}
        ${isCurrentTurn ? 'bg-white/5' : ''}
        ${isLocalPlayer ? 'ring-2 ring-white/30' : ''}
      `}
    >
      {/* Turn glow ring */}
      {isCurrentTurn && (
        <motion.div
          layoutId="turn-ring"
          className={`absolute inset-0 rounded-2xl border-2 pointer-events-none
            ${teamColors[player.teamId]} ${teamGlow[player.teamId]}`}
          transition={{ duration: 0.35 }}
        />
      )}

      {/* Cards above avatar for opponents (top) */}
      {!isLocalPlayer && position === 'top' && player.cardCount > 0 && (
        <div className="flex items-center">
          {Array.from({ length: player.cardCount }, (_, i) => (
            <div key={i} style={{ marginLeft: i === 0 ? 0 : -30, zIndex: player.cardCount - i }}>
              <Card cardId="HEARTS_2" faceDown size="xs" />
            </div>
          ))}
        </div>
      )}

      {/* Avatar + side card stack for left/right teammates */}
      <div className="flex items-center gap-1">
        {!isLocalPlayer && position === 'left' && player.cardCount > 0 && (
          <div className="flex items-center">
            {Array.from({ length: player.cardCount }, (_, i) => (
              <div key={i} style={{ marginLeft: i === 0 ? 0 : -30, zIndex: player.cardCount - i }}>
                <Card cardId="HEARTS_2" faceDown size="xs" />
              </div>
            ))}
          </div>
        )}
        <Avatar player={player} />
        {!isLocalPlayer && position === 'right' && player.cardCount > 0 && (
          <div className="flex items-center">
            {Array.from({ length: player.cardCount }, (_, i) => (
              <div key={i} style={{ marginLeft: i === 0 ? 0 : -30, zIndex: player.cardCount - i }}>
                <Card cardId="HEARTS_2" faceDown size="xs" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="text-xs font-semibold text-white truncate max-w-[80px]">
          {player.name}
          {isLocalPlayer && <span className="text-gray-400"> (you)</span>}
        </div>
        <div className="text-xs text-gray-400">
          {player.cardCount} cards
        </div>
      </div>

      {isCurrentTurn && (
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full
          ${player.teamId === 'A' ? 'bg-teamA/30 text-teamALight' : 'bg-teamB/30 text-teamBLight'}`}>
          TURN
        </div>
      )}
    </motion.div>
  );
}
