import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../cards/Card';
import { useGameStore } from '../../store/useGameStore';
import { socket } from '../../socket';
import {
  getEligibleSets,
  getSetForCard,
  getSetCards,
  SET_DEFINITIONS,
} from 'shared';
import type { SetId, PlayerInfo } from 'shared';

type Step = 'set' | 'card' | 'target';

interface AskModalProps {
  open: boolean;
  onClose: () => void;
}

export function AskModal({ open, onClose }: AskModalProps) {
  const gameView = useGameStore(s => s.gameView);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const roomCode = useGameStore(s => s.roomCode);
  const initialCardId = useGameStore(s => s.askModalInitialCardId);

  const [step, setStep] = useState<Step>('set');
  const [selectedSet, setSelectedSet] = useState<SetId | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<PlayerInfo | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      if (initialCardId) {
        const setId = getSetForCard(initialCardId);
        setSelectedSet(setId);
        setStep('card');
      } else {
        setStep('set');
        setSelectedSet(null);
      }
      setSelectedCard(null);
      setSelectedTarget(null);
    }
  }, [open, initialCardId]);

  if (!gameView || !myPlayerId) return null;

  const myHand = gameView.myHand;
  const myPlayer = gameView.players.find(p => p.id === myPlayerId);
  const eligibleSets = getEligibleSets(myHand);

  const opponents = gameView.players.filter(
    p => p.teamId !== myPlayer?.teamId && p.cardCount > 0
  );

  const askableCards = selectedSet
    ? getSetCards(selectedSet).filter(c => !myHand.includes(c))
    : [];

  function handleSubmit() {
    if (!selectedCard || !selectedTarget || !roomCode) return;
    socket.emit('ask', { roomCode, targetPlayerId: selectedTarget.id, cardId: selectedCard });
    onClose();
  }

  const stepLabels: Step[] = ['set', 'card', 'target'];
  const stepTitles: Record<Step, string> = {
    set: 'Step 1: Pick a Set',
    card: 'Step 2: Pick a Card',
    target: 'Step 3: Pick a Player to Ask',
  };

  return (
    <Modal open={open} onClose={onClose} title="Ask for a Card" maxWidth="max-w-xl">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {stepLabels.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? 'bg-teamA text-white' :
                stepLabels.indexOf(step) > i ? 'bg-green-600 text-white' :
                'bg-gray-700 text-gray-400'}`}>
              {stepLabels.indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < stepLabels.length - 1 && <div className="w-8 h-px bg-gray-600" />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-300">{stepTitles[step]}</span>
      </div>

      {/* Step 1: Pick a Set */}
      {step === 'set' && (
        <div className="grid grid-cols-2 gap-3">
          {eligibleSets.map(setId => (
            <button
              key={setId}
              onClick={() => { setSelectedSet(setId); setStep('card'); }}
              className="p-4 rounded-xl border-2 border-gray-600 hover:border-teamA bg-gray-800
                hover:bg-teamA/10 transition-all text-left group"
            >
              <div className="font-bold text-white">{SET_DEFINITIONS[setId].label}</div>
              <div className="text-xs text-gray-400 mt-1">
                {myHand.filter(c => getSetForCard(c) === setId).length} card(s) in your hand
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Pick a Card */}
      {step === 'card' && selectedSet && (
        <div>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {getSetCards(selectedSet).map(cardId => {
              const alreadyHave = myHand.includes(cardId);
              return (
                <div key={cardId} className="flex flex-col items-center gap-1">
                  <Card
                    cardId={cardId}
                    selected={selectedCard === cardId}
                    disabled={alreadyHave}
                    onClick={alreadyHave ? undefined : () => {
                      setSelectedCard(cardId);
                      setStep('target');
                    }}
                    size="sm"
                  />
                  {alreadyHave && (
                    <span className="text-xs text-gray-500">You have</span>
                  )}
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep('set')}>← Back</Button>
        </div>
      )}

      {/* Step 3: Pick a Target */}
      {step === 'target' && selectedCard && (
        <div>
          <div className="text-sm text-gray-300 mb-3">
            Asking for: <span className="font-bold text-white">{selectedCard.replace('_', ' ')}</span>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {opponents.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedTarget(player)}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all text-left
                  ${selectedTarget?.id === player.id
                    ? 'border-teamA bg-teamA/20'
                    : 'border-gray-600 hover:border-teamA bg-gray-800 hover:bg-teamA/10'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${player.teamId === 'A' ? 'bg-teamA/20 text-teamALight border border-teamA' : 'bg-teamB/20 text-teamBLight border border-teamB'}`}>
                  {player.isBot ? '🤖' : player.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-white">{player.name}</div>
                  <div className="text-xs text-gray-400">{player.cardCount} cards</div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setStep('card'); setSelectedTarget(null); }}>
              ← Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selectedTarget}
              className="flex-1"
            >
              Ask
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
