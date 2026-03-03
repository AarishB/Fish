import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '../cards/Card';
import { getSetCards, SET_DEFINITIONS } from 'shared';
import type { SetId, PlayerInfo } from 'shared';

interface CallSetProgress {
  callerPlayerId: string;
  callerName: string;
  setId: string | null;
  assignment: Record<string, string>; // cardId → playerId
  players: PlayerInfo[];
}

interface Props {
  progress: CallSetProgress;
}

export function CallSetSpectatorOverlay({ progress }: Props) {
  const { callerName, setId, assignment, players } = progress;

  const setCards = setId ? getSetCards(setId as SetId) : [];
  const setLabel = setId ? SET_DEFINITIONS[setId as SetId]?.label : null;

  return (
    <AnimatePresence>
      <motion.div
        key="call-set-spectator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-40 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Content panel */}
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="relative z-10 w-full max-w-lg mx-4 bg-gray-900 border border-amber-600/40
            rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-amber-900/30 border-b border-amber-600/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🃏</span>
              <div>
                <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest">Call Set in Progress</p>
                <p className="text-white text-lg font-bold">
                  {callerName}
                  {setLabel
                    ? <span className="text-amber-400"> is calling {setLabel}</span>
                    : <span className="text-gray-400"> is choosing a set…</span>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {!setId ? (
              /* Phase 1: waiting for set selection */
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full"
                  style={{ borderWidth: 3 }}
                />
                <p className="text-gray-400 text-sm">Waiting for {callerName} to choose a set…</p>
              </div>
            ) : (
              /* Phase 2: set chosen — show card-by-card assignments */
              <div>
                <p className="text-gray-400 text-xs mb-4">
                  {callerName} is assigning cards. Watch as each is revealed.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {setCards.map(cardId => {
                    const assignedToId = assignment[cardId];
                    const assignedPlayer = players.find(p => p.id === assignedToId);

                    return (
                      <motion.div
                        key={cardId}
                        layout
                        className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-colors ${
                          assignedPlayer
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-gray-700 bg-gray-800/50'
                        }`}
                      >
                        <Card cardId={cardId} size="xs" />
                        <AnimatePresence mode="wait">
                          {assignedPlayer ? (
                            <motion.span
                              key={assignedPlayer.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-xs font-bold text-amber-300 text-center truncate w-full text-center"
                            >
                              {assignedPlayer.name}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="waiting"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-gray-600 text-center"
                            >
                              ?
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
