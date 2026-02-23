import { Modal } from '../ui/Modal';
import { useGameStore } from '../../store/useGameStore';
import { socket } from '../../socket';
import type { PlayerInfo } from 'shared';

interface PassTurnModalProps {
  readonly candidates: PlayerInfo[];
  readonly onClose: () => void;
}

export function PassTurnModal({ candidates, onClose }: PassTurnModalProps) {
  const roomCode = useGameStore(s => s.roomCode);

  function handleSelect(playerId: string) {
    if (!roomCode) return;
    socket.emit('pass_turn', { roomCode, toPlayerId: playerId });
    onClose();
  }

  return (
    <Modal open onClose={() => {}} title="🃏 Pass Your Turn" maxWidth="max-w-sm">
      <p className="text-gray-400 text-sm mb-4 text-center">
        You have no cards left. Choose a teammate to take the turn.
      </p>
      <div className="flex flex-col gap-3">
        {candidates.map(player => (
          <button
            key={player.id}
            onClick={() => handleSelect(player.id)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10
              hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 text-left"
          >
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm
              ${player.teamId === 'A' ? 'border-teamA bg-teamA/20 text-teamALight' : 'border-teamB bg-teamB/20 text-teamBLight'}`}>
              {player.isBot ? '🤖' : player.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-semibold">{player.name}</div>
              <div className="text-gray-400 text-xs">{player.cardCount} cards</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
