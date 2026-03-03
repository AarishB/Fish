import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/useSettingsStore';
import { CARD_BACK_DEFS } from '../../cardBackDefs';

type JokerVariant = 'red' | 'black' | null;

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-amber-500',
  clubs: 'text-green-700',
  spades: 'text-slate-800',
};

function parseCardId(cardId: string): { rank: string; suit: string; isJoker: boolean; jokerVariant: JokerVariant } {
  if (cardId === 'JOKER_1') return { rank: 'J', suit: 'joker', isJoker: true, jokerVariant: 'red' };
  if (cardId === 'JOKER_2') return { rank: 'J', suit: 'joker', isJoker: true, jokerVariant: 'black' };
  const parts = cardId.split('_');
  const suit = parts[0];
  const rank = parts.slice(1).join('_');
  return { rank, suit, isJoker: false, jokerVariant: null };
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

const rankTextClasses = {
  xs: 'text-lg',
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
};

const suitTextClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

// Derive joker-specific styles so the Card function stays below complexity limit
function jokerBg(variant: JokerVariant): string {
  if (variant === 'red') return 'bg-gradient-to-br from-red-50 to-red-100';
  if (variant === 'black') return 'bg-gradient-to-br from-gray-100 to-gray-200';
  return '';
}
function jokerColor(variant: JokerVariant): string {
  if (variant === 'red') return 'text-red-600';
  if (variant === 'black') return 'text-gray-800';
  return 'text-purple-600';
}
function jokerLabelColor(variant: JokerVariant): string {
  if (variant === 'red') return 'text-red-400';
  if (variant === 'black') return 'text-gray-500';
  return 'text-purple-400';
}
function cursorClass(disabled: boolean, hasClick: boolean): string {
  if (disabled) return 'opacity-50 cursor-not-allowed';
  if (hasClick) return 'cursor-pointer hover:shadow-card-hover';
  return 'cursor-default';
}

export function Card({
  cardId,
  selected = false,
  disabled = false,
  onClick,
  size = 'md',
  faceDown = false,
  className = '',
  animate: _animate = true,
}: Readonly<CardProps>) {
  const { rank, suit, isJoker, jokerVariant } = parseCardId(cardId);
  const suitSymbol = isJoker ? '🃏' : SUIT_SYMBOLS[suit];
  const suitColor = isJoker ? jokerColor(jokerVariant) : SUIT_COLORS[suit];
  const displayRank = rank === '10' ? '10' : rank;
  const hoverProps = disabled || !onClick ? {} : { y: -8, scale: 1.05 };
  const tapProps = disabled || !onClick ? {} : { scale: 0.97 };
  const cardBack = useSettingsStore(s => s.cardBack);
  const back = CARD_BACK_DEFS[cardBack] ?? CARD_BACK_DEFS['blue'];

  if (faceDown) {
    const faceDownHover = disabled || !onClick ? {} : { y: -4 };
    return (
      <motion.div
        whileHover={faceDownHover}
        className={`${sizeClasses[size]} rounded-xl border-2 ${back.borderColor} relative overflow-hidden select-none flex items-center justify-center ${className}`}
        style={back.container}
      >
        {/* Texture pattern overlay */}
        <div className="absolute inset-0" style={back.pattern} />
        {/* Inner border frame */}
        <div className="absolute inset-[3px] rounded-lg border border-white/10 pointer-events-none" />
        {/* Center symbol */}
        <span className={`relative z-10 ${back.symbolColor} opacity-60 text-xl`}>✦</span>
      </motion.div>
    );
  }

  const selectedClass = selected
    ? 'border-gold shadow-[0_0_12px_2px_rgba(245,158,11,0.6)] -translate-y-3'
    : 'border-gray-200';

  return (
    <motion.div
      whileHover={hoverProps}
      whileTap={tapProps}
      onClick={disabled ? undefined : onClick}
      className={`
        ${sizeClasses[size]}
        relative rounded-xl border-2 bg-cardFace select-none font-card
        flex flex-col justify-between p-1
        shadow-card transition-shadow duration-150
        ${selectedClass}
        ${cursorClass(disabled, !!onClick)}
        ${isJoker ? jokerBg(jokerVariant) : ''}
        ${className}
      `}
    >
      <div className={`${suitColor} leading-none display-flex flex-col items-center`}>
        <div className={`font-bold ${rankTextClasses[size]} leading-tight text-center`}>{displayRank}</div>
      </div>
      <div className={`${suitColor} text-center ${suitTextClasses[size]} font-bold`}>
        {isJoker ? '🃏' : suitSymbol}
      </div>
      {/* <div className={`${suitColor} leading-none rotate-180`}>
        <div className="font-bold text-xs leading-tight">{displayRank}</div>
        <div className="text-xs">{suitSymbol}</div>
      </div> */}
    </motion.div>
  );
}

// Compact inline card label for text (e.g. in logs and modals)
export function CardLabel({ cardId }: Readonly<{ cardId: string }>) {
  const { rank, suit, isJoker, jokerVariant } = parseCardId(cardId);
  const suitSymbol = isJoker ? '🃏' : SUIT_SYMBOLS[suit];
  const suitColor = isJoker ? jokerLabelColor(jokerVariant) : SUIT_COLORS[suit];
  const suitName = isJoker ? '' : suit.charAt(0).toUpperCase() + suit.slice(1);

  return (
    <span className={`font-bold font-card ${suitColor}`}>
      {isJoker ? 'Joker' : `${rank} of ${suitName}`} {suitSymbol}
    </span>
  );
}
