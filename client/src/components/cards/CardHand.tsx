import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { getSetForCard } from 'shared';
import type { SetId } from 'shared';
import { SET_DEFINITIONS } from 'shared';

// Sort cards: by set, then by position within set
function sortHandBySet(cardIds: string[]): string[] {
  const setOrder: SetId[] = [
    'low_hearts', 'low_clubs', 'low_diamonds', 'low_spades',
    'high_hearts', 'high_clubs', 'high_diamonds', 'high_spades',
    'middle',
  ];
  return [...cardIds].sort((a, b) => {
    const setA = setOrder.indexOf(getSetForCard(a));
    const setB = setOrder.indexOf(getSetForCard(b));
    if (setA !== setB) return setA - setB;
    const defA = SET_DEFINITIONS[getSetForCard(a)];
    const defB = SET_DEFINITIONS[getSetForCard(b)];
    return defA.cardIds.indexOf(a) - defB.cardIds.indexOf(b);
  });
}

interface CardHandProps {
  cardIds: string[];
  onCardClick?: (cardId: string) => void;
  eligibleCardIds?: string[];    // highlighted during ask flow
  selectedCardId?: string | null;
  disabled?: boolean;
}

export function CardHand({
  cardIds,
  onCardClick,
  eligibleCardIds,
  selectedCardId,
  disabled = false,
}: CardHandProps) {
  const sorted = sortHandBySet(cardIds);

  // Group cards by set for visual spacing
  const groups: string[][] = [];
  let currentGroup: string[] = [];
  let currentSet: SetId | null = null;

  for (const cardId of sorted) {
    const setId = getSetForCard(cardId);
    if (setId !== currentSet) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [cardId];
      currentSet = setId;
    } else {
      currentGroup.push(cardId);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return (
    <div className="flex flex-wrap items-end justify-center gap-1 px-2">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-end gap-0.5">
          {group.map(cardId => {
            const isSelected = selectedCardId === cardId;
            const isEligible = !eligibleCardIds || eligibleCardIds.includes(cardId);
            const isDisabled = disabled || (eligibleCardIds !== undefined && !isEligible);

            return (
              <AnimatePresence key={cardId} mode="popLayout">
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card
                    cardId={cardId}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={onCardClick && !isDisabled ? () => onCardClick(cardId) : undefined}
                    size="sm"
                  />
                </motion.div>
              </AnimatePresence>
            );
          })}
          {/* Gap between set groups */}
          {gi < groups.length - 1 && <div className="w-2" />}
        </div>
      ))}
    </div>
  );
}
