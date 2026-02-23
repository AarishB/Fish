import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { useGameStore } from '../../store/useGameStore';
import type { AskRecord, PlayerInfo } from 'shared';

interface RevealModalProps {
  open: boolean;
  onClose: () => void;
  players: PlayerInfo[];
}

export function RevealModal({ open, onClose, players }: RevealModalProps) {
  const revealedAsks = useGameStore(s => s.revealedAsks);

  function playerName(id: string) {
    return players.find(p => p.id === id)?.name ?? 'Unknown';
  }

  function cardLabel(cardId: string) {
    if (cardId === 'JOKER_1' || cardId === 'JOKER_2') return 'Joker';
    const parts = cardId.split('_');
    const suit = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const rank = parts.slice(1).join(' ');
    return `${rank} of ${suit}`;
  }

  return (
    <Modal open={open} onClose={onClose} title="📜 Recent Asks" maxWidth="max-w-md">
      <p className="text-gray-400 text-xs mb-4">
        Showing the {revealedAsks.length} most recent ask{revealedAsks.length !== 1 ? 's' : ''}.
        This is all you get — remember the rest yourself.
      </p>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {revealedAsks.map((ask, i) => (
            <motion.div
              key={`${ask.timestamp}_${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm
                ${ask.success
                  ? 'bg-green-900/30 border-green-700'
                  : 'bg-red-900/20 border-red-800'
                }`}
            >
              <div className="flex-1">
                <span className="font-semibold text-white">{playerName(ask.askingPlayerId)}</span>
                <span className="text-gray-400"> asked </span>
                <span className="font-semibold text-white">{playerName(ask.targetPlayerId)}</span>
                <span className="text-gray-400"> for </span>
                <span className="font-semibold text-white">{cardLabel(ask.cardId)}</span>
              </div>
              <div className="ml-3 text-lg">
                {ask.success ? '✅' : '❌'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {revealedAsks.length === 0 && (
        <p className="text-gray-500 text-sm">No asks to show yet.</p>
      )}
    </Modal>
  );
}
