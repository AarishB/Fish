import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../cards/Card';
import { useGameStore } from '../../store/useGameStore';
import { socket } from '../../socket';
import {
  getSetForCard,
  getSetCards,
  SET_DEFINITIONS,
  ALL_SET_IDS,
} from 'shared';
import type { SetId } from 'shared';

interface CallSetModalProps {
  open: boolean;
  onClose: () => void;
}

export function CallSetModal({ open, onClose }: CallSetModalProps) {
  const gameView = useGameStore(s => s.gameView);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const roomCode = useGameStore(s => s.roomCode);

  const [step, setStep] = useState<'set' | 'assign'>('set');
  const [selectedSet, setSelectedSet] = useState<SetId | null>(null);
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('set');
      setSelectedSet(null);
      setAssignment({});
      setInitiated(false);
    }
  }, [open]);

  // Emit call_set_initiated as soon as the modal opens — this is the point of no return
  useEffect(() => {
    if (open && !initiated && roomCode) {
      socket.emit('call_set_initiated', { roomCode });
      setInitiated(true);
    }
  }, [open, initiated, roomCode]);

  if (!gameView || !myPlayerId) return null;

  const myPlayer = gameView.players.find(p => p.id === myPlayerId);
  const teammates = gameView.players.filter(p => p.teamId === myPlayer?.teamId);

  // Only show sets where I hold at least one card and not already claimed
  const callableSets = ALL_SET_IDS.filter(setId => {
    if (gameView.claimedSets.some(cs => cs.setId === setId)) return false;
    return gameView.myHand.some(c => getSetForCard(c) === setId);
  });

  function handleSelectSet(setId: SetId) {
    setSelectedSet(setId);
    // Pre-assign own cards
    const initialAssignment: Record<string, string> = {};
    for (const cardId of getSetCards(setId)) {
      if (gameView?.myHand.includes(cardId)) {
        initialAssignment[cardId] = myPlayerId!;
      }
    }
    setAssignment(initialAssignment);
    setStep('assign');
    // Broadcast set choice — server will relay preAssignment computed from its hand knowledge
    if (roomCode) socket.emit('call_set_choose_set', { roomCode, setId });
  }

  function handleAssign(cardId: string, playerId: string) {
    setAssignment(prev => {
      const next = { ...prev, [cardId]: playerId };
      // Broadcast each assignment in real time
      if (roomCode) socket.emit('call_set_card_assigned', { roomCode, cardId, assignedPlayerId: playerId });
      return next;
    });
  }

  const setCards = selectedSet ? getSetCards(selectedSet) : [];
  const assignedCount = Object.keys(assignment).length;
  const allAssigned = selectedSet && assignedCount === setCards.length;

  function handleSubmit() {
    if (!selectedSet || !allAssigned || !roomCode) return;
    socket.emit('call_set', { roomCode, setId: selectedSet, assignment });
    // Modal will be closed by useSocket when call_set_result arrives
  }

  return (
    <Modal open={open} onClose={onClose} title="Call Set" maxWidth="max-w-xl" locked>
      {/* Step 1: Pick a Set */}
      {step === 'set' && (
        <div>
          <p className="text-amber-400 text-sm font-semibold mb-1">⚠️ No going back — once you pick a set, you must assign all cards.</p>
          <p className="text-gray-400 text-sm mb-4">
            Choose a set you believe your team holds all 6 cards of.
          </p>
          {callableSets.length === 0 ? (
            <p className="text-gray-500 text-sm">
              You don't have cards from any unclaimed set yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {callableSets.map(setId => (
                <button
                  key={setId}
                  onClick={() => handleSelectSet(setId)}
                  className="p-4 rounded-xl border-2 border-gray-600 hover:border-gold bg-gray-800
                    hover:bg-amber-500/10 transition-all text-left"
                >
                  <div className="font-bold text-white">{SET_DEFINITIONS[setId].label}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Assign cards to teammates */}
      {step === 'assign' && selectedSet && (
        <div>
          <div className="text-sm text-gray-300 mb-1">
            <span className="font-bold text-white">{SET_DEFINITIONS[selectedSet].label}</span>
            {' '}— assign each card to a teammate
          </div>
          <div className="text-xs text-gray-500 mb-4">
            {assignedCount}/{setCards.length} assigned
          </div>

          <div className="flex flex-col gap-3 mb-4 max-h-72 overflow-y-auto">
            {setCards.map(cardId => {
              const isOwnCard = gameView.myHand.includes(cardId);
              const assignedTo = assignment[cardId];

              return (
                <div key={cardId} className="flex items-center gap-3">
                  <Card cardId={cardId} size="xs" />
                  <div className="flex-1 flex gap-2 flex-wrap">
                    {teammates.map(teammate => {
                      const isSelected = assignedTo === teammate.id;
                      const isLocked = isOwnCard && teammate.id === myPlayerId;
                      return (
                        <button
                          key={teammate.id}
                          disabled={isOwnCard && teammate.id !== myPlayerId}
                          onClick={() => !isLocked && handleAssign(cardId, teammate.id)}
                          className={`px-3 py-1 rounded-lg text-xs border transition-all
                            ${isSelected
                              ? 'bg-gold/30 border-gold text-white font-bold'
                              : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gold'
                            }
                            ${isOwnCard && teammate.id !== myPlayerId ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                            ${isLocked ? 'opacity-80 cursor-default ring-1 ring-gold' : ''}
                          `}
                        >
                          {teammate.name}{isLocked ? ' 🔒' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={!allAssigned}
            className="w-full"
          >
            Call Set ({assignedCount}/{setCards.length})
          </Button>
        </div>
      )}
    </Modal>
  );
}
