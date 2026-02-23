import { motion } from 'framer-motion';
import type { SetOwnership } from 'shared';
import { SET_DEFINITIONS, ALL_SET_IDS } from 'shared';

interface SetTrophiesProps {
  claimedSets: SetOwnership[];
}

const setIcons: Record<string, string> = {
  low_hearts: '♥²⁻⁷', low_clubs: '♣²⁻⁷', low_diamonds: '♦²⁻⁷', low_spades: '♠²⁻⁷',
  high_hearts: '♥⁹⁻ᴬ', high_clubs: '♣⁹⁻ᴬ', high_diamonds: '♦⁹⁻ᴬ', high_spades: '♠⁹⁻ᴬ',
  middle: '8s+🃏',
};

const suitColors: Record<string, string> = {
  low_hearts: 'text-red-400', low_clubs: 'text-gray-300',
  low_diamonds: 'text-red-400', low_spades: 'text-gray-300',
  high_hearts: 'text-red-400', high_clubs: 'text-gray-300',
  high_diamonds: 'text-red-400', high_spades: 'text-gray-300',
  middle: 'text-purple-400',
};

export function SetTrophies({ claimedSets }: SetTrophiesProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {ALL_SET_IDS.map(setId => {
        const claimed = claimedSets.find(cs => cs.setId === setId);
        const def = SET_DEFINITIONS[setId];

        return (
          <motion.div
            key={setId}
            initial={false}
            animate={claimed ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.4 }}
            title={def.label + (claimed ? ` — Team ${claimed.wonByTeam}${claimed.wasCounter ? ' (counter)' : ''}` : ' — Unclaimed')}
            className={`
              px-2 py-1 rounded-lg border text-xs font-bold select-none
              ${claimed
                ? claimed.wonByTeam === 'A'
                  ? 'bg-teamA/30 border-teamA text-teamALight'
                  : 'bg-teamB/30 border-teamB text-teamBLight'
                : 'bg-gray-800/60 border-gray-600 text-gray-500'
              }
            `}
          >
            <span className={suitColors[setId]}>{setIcons[setId]}</span>
            {claimed && (
              <span className="ml-1 text-[10px]">
                {claimed.wasCounter ? '⚡' : '✓'}{claimed.wonByTeam}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
