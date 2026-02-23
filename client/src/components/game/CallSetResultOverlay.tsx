import { AnimatePresence, motion } from 'framer-motion';
import { SET_DEFINITIONS } from 'shared';
import type { SetId } from 'shared';

interface CallSetResultAnim {
  success: boolean;
  winningTeam: string;
  setId: string;
  callerName: string;
}

interface Props {
  result: CallSetResultAnim | null;
}

export function CallSetResultOverlay({ result }: Props) {
  if (!result) return null;

  const { success, winningTeam, setId, callerName } = result;
  const setLabel = SET_DEFINITIONS[setId as SetId]?.label ?? setId;

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key={`result-${setId}-${success}`}
          className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 3.8, duration: 0.5 }}
        >
          {/* Dark base — green for correct, deep red for incorrect */}
          <div
            className={`absolute inset-0 ${
              success ? 'bg-emerald-950' : 'bg-red-950'
            }`}
          />

          {/* Result text — revealed after the curtain sweeps away */}
          <motion.div
            className="relative z-10 text-center px-8"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 160, damping: 16 }}
          >
            <motion.div
              className="text-7xl mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 1.1, duration: 0.5, times: [0, 0.6, 1] }}
            >
              {success ? '✅' : '❌'}
            </motion.div>

            <div className={`text-5xl font-black mb-3 drop-shadow-lg ${
              success ? 'text-green-400' : 'text-red-400'
            }`}>
              {success ? 'Correctly Called!' : 'Incorrectly Called!'}
            </div>

            <div className="text-2xl text-white font-bold mb-1">{setLabel}</div>

            <div className={`text-xl font-semibold ${
              success ? 'text-green-300' : 'text-red-300'
            }`}>
              Team {winningTeam} wins the set
            </div>

            {!success && callerName && (
              <div className="text-base text-gray-400 mt-2">
                {callerName}'s wrong call handed the set to Team {winningTeam}
              </div>
            )}
          </motion.div>

          {/* Metallic curtain — sweeps right to reveal result */}
          <motion.div
            className="absolute inset-0 z-20"
            style={{
              background: success
                ? 'repeating-linear-gradient(105deg, #92400e 0%, #fbbf24 20%, #d97706 35%, #fcd34d 50%, #b45309 65%, #fbbf24 80%, #92400e 100%)'
                : 'repeating-linear-gradient(105deg, #3f0a0a 0%, #7f1d1d 20%, #450a0a 35%, #991b1b 50%, #3f0a0a 65%, #7f1d1d 80%, #3f0a0a 100%)',
            }}
            initial={{ x: 0 }}
            animate={{ x: '100%' }}
            transition={{ delay: 0.3, duration: 0.9, ease: [0.4, 0, 0.15, 1] }}
          >
            {/* Shimmer highlight on the curtain */}
            <motion.div
              className="absolute inset-y-0 w-16"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                left: '-4rem',
              }}
              animate={{ left: ['−4rem', '110%'] }}
              transition={{ delay: 0.3, duration: 0.9, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
