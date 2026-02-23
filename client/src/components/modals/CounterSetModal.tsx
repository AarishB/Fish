import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../cards/Card';
import { useGameStore } from '../../store/useGameStore';
import { socket } from '../../socket';
import { getSetCards, SET_DEFINITIONS, ALL_SET_IDS } from 'shared';
import type { SetId } from 'shared';

interface CounterSetModalProps {
  open: boolean;
  onClose: () => void;
}

export function CounterSetModal({ open, onClose }: CounterSetModalProps) {
  const gameView = useGameStore(s => s.gameView);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const roomCode = useGameStore(s => s.roomCode);

  const [step, setStep] = useState<'set' | 'assign'>('set');
  const [selectedSet, setSelectedSet] = useState<SetId | null>(null);
  const [assignment, setAssignment] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep('set');
      setSelectedSet(null);
      setAssignment({});
    }
  }, [open]);

  if (!gameView || !myPlayerId) return null;

  const myPlayer = gameView.players.find(p => p.id === myPlayerId);
  const opponents = gameView.players.filter(p => p.teamId !== myPlayer?.teamId);

  const counterableSets = ALL_SET_IDS.filter(setId =>
    !gameView.claimedSets.some(cs => cs.setId === setId)
  );

  function handleSelectSet(setId: SetId) {
    setSelectedSet(setId);
    setAssignment({});
    setStep('assign');
  }

  function handleAssign(cardId: string, playerId: string) {
    setAssignment(prev => ({ ...prev, [cardId]: playerId }));
  }

  const setCards = selectedSet ? getSetCards(selectedSet) : [];
  const allAssigned = selectedSet && Object.keys(assignment).length === setCards.length;

  function handleSubmit() {
    if (!selectedSet || !allAssigned || !roomCode) return;
    socket.emit('counter_set', { roomCode, setId: selectedSet, assignment });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="⚡ Counter Set" maxWidth="max-w-xl">
      <p className="text-gray-400 text-sm mb-4">
        If you know all 6 cards of a set are on the opposing team, name exactly who has each card.
        <span className="text-red-400"> If you're wrong, they get the set.</span>
      </p>

      {step === 'set' && (
        <div className="grid grid-cols-2 gap-3">
          {counterableSets.map(setId => (
            <button
              key={setId}
              onClick={() => handleSelectSet(setId)}
              className="p-4 rounded-xl border-2 border-gray-600 hover:border-blue-400 bg-gray-800
                hover:bg-blue-500/10 transition-all text-left"
            >
              <div className="font-bold text-white">{SET_DEFINITIONS[setId].label}</div>
            </button>
          ))}
        </div>
      )}

      {step === 'assign' && selectedSet && (
        <div>
          <div className="text-sm text-gray-300 mb-1 font-bold">
            {SET_DEFINITIONS[selectedSet].label}
          </div>
          <div className="text-xs text-gray-500 mb-4">
            {Object.keys(assignment).length}/{setCards.length} assigned to opponents
          </div>

          <div className="flex flex-col gap-3 mb-4 max-h-72 overflow-y-auto">
            {setCards.map(cardId => {
              const assignedTo = assignment[cardId];
              return (
                <div key={cardId} className="flex items-center gap-3">
                  <Card cardId={cardId} size="xs" />
                  <div className="flex-1 flex gap-2 flex-wrap">
                    {opponents.map(opp => {
                      const isSelected = assignedTo === opp.id;
                      return (
                        <button
                          key={opp.id}
                          onClick={() => handleAssign(cardId, opp.id)}
                          className={`px-3 py-1 rounded-lg text-xs border transition-all cursor-pointer
                            ${isSelected
                              ? 'bg-blue-500/30 border-blue-400 text-white font-bold'
                              : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-400'
                            }`}
                        >
                          {opp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('set')}>← Back</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!allAssigned}
              className="flex-1"
            >
              Counter Set ({Object.keys(assignment).length}/{setCards.length})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
