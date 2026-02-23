import { motion } from 'framer-motion';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-hearts',
  diamonds: 'text-diamonds',
  clubs: 'text-clubs',
  spades: 'text-spades',
};

function parseCardId(cardId: string): { rank: string; suit: string; isJoker: boolean } {
  if (cardId === 'JOKER_1' || cardId === 'JOKER_2') {
    return { rank: 'J', suit: 'joker', isJoker: true };
  }
  const parts = cardId.split('_');
  const suit = parts[0];
  const rank = parts.slice(1).join('_');
  return { rank, suit, isJoker: false };
}

interface CardProps {
  cardId: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  faceDown?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeClasses = {
  xs: 'w-10 h-14 text-xs',
  sm: 'w-14 h-20 text-sm',
  md: 'w-20 h-28 text-base',
  lg: 'w-24 h-36 text-lg',
  xl: 'w-36 h-52 text-2xl',
};

export function Card({
  cardId,
  selected = false,
  disabled = false,
  onClick,
  size = 'md',
  faceDown = false,
  className = '',
  animate = true,
}: CardProps) {
  const { rank, suit, isJoker } = parseCardId(cardId);
  const suitSymbol = isJoker ? '🃏' : SUIT_SYMBOLS[suit];
  const suitColor = isJoker ? 'text-purple-600' : SUIT_COLORS[suit];
  const displayRank = rank === '10' ? '10' : rank;

  if (faceDown) {
    return (
      <motion.div
        whileHover={!disabled && onClick ? { y: -4 } : {}}
        className={`
          ${sizeClasses[size]} rounded-xl border-2 border-gray-600
          bg-gradient-to-br from-blue-900 to-blue-700
          flex items-center justify-center select-none
          ${className}
        `}
      >
        <span className="text-blue-400 opacity-50 text-2xl">✦</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={!disabled && onClick ? { y: -8, scale: 1.05 } : {}}
      whileTap={!disabled && onClick ? { scale: 0.97 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        ${sizeClasses[size]}
        relative rounded-xl border-2 bg-cardFace select-none font-card
        flex flex-col justify-between p-1
        shadow-card transition-shadow duration-150
        ${selected
          ? 'border-gold shadow-[0_0_12px_2px_rgba(245,158,11,0.6)] -translate-y-3'
          : 'border-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:shadow-card-hover' : 'cursor-default'}
        ${isJoker ? 'bg-gradient-to-br from-purple-50 to-purple-100' : ''}
        ${className}
      `}
    >
      {/* Top-left rank + suit */}
      <div className={`${suitColor} leading-none`}>
        <div className="font-bold text-xs leading-tight">{displayRank}</div>
        <div className="text-xs">{suitSymbol}</div>
      </div>

      {/* Center suit symbol */}
      <div className={`${suitColor} text-center text-lg font-bold`}>
        {isJoker ? '🃏' : suitSymbol}
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div className={`${suitColor} leading-none rotate-180`}>
        <div className="font-bold text-xs leading-tight">{displayRank}</div>
        <div className="text-xs">{suitSymbol}</div>
      </div>
    </motion.div>
  );
}

// Compact inline card label for text (e.g. in logs and modals)
export function CardLabel({ cardId }: { cardId: string }) {
  const { rank, suit, isJoker } = parseCardId(cardId);
  const suitSymbol = isJoker ? '🃏' : SUIT_SYMBOLS[suit];
  const suitColor = isJoker ? 'text-purple-400' : SUIT_COLORS[suit];
  const suitName = isJoker ? '' : suit.charAt(0).toUpperCase() + suit.slice(1);

  return (
    <span className={`font-bold font-card ${suitColor}`}>
      {isJoker ? 'Joker' : `${rank} of ${suitName}`} {suitSymbol}
    </span>
  );
}
