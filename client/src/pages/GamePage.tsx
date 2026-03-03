import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { socket } from '../socket';
import { Button } from '../components/ui/Button';
import { CardHand } from '../components/cards/CardHand';
import { PlayerSeat } from '../components/players/PlayerSeat';
import { TeamScorePanel } from '../components/game/TeamScorePanel';
import { SetTrophies } from '../components/game/SetTrophies';
import { EventLog, buildSetClaimedEntry } from '../components/game/EventLog';
import { AskModal } from '../components/modals/AskModal';
import { CallSetModal } from '../components/modals/CallSetModal';
import { CounterSetModal } from '../components/modals/CounterSetModal';
import { RevealModal } from '../components/modals/RevealModal';
import { PassTurnModal } from '../components/modals/PassTurnModal';
import { AskAnnouncementOverlay } from '../components/game/AskAnnouncementOverlay';
import { CallSetSpectatorOverlay } from '../components/game/CallSetSpectatorOverlay';
import { CallSetResultOverlay } from '../components/game/CallSetResultOverlay';
import type { EventEntry } from '../components/game/EventLog';

export default function GamePage() {
  const gameView = useGameStore(s => s.gameView);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const revealCredits = useGameStore(s => s.revealCredits);
  const askModalOpen = useGameStore(s => s.askModalOpen);
  const callSetModalOpen = useGameStore(s => s.callSetModalOpen);
  const counterSetModalOpen = useGameStore(s => s.counterSetModalOpen);
  const revealModalOpen = useGameStore(s => s.revealModalOpen);
  const roomCode = useGameStore(s => s.roomCode);
  const openAskModal = useGameStore(s => s.openAskModal);
  const closeAskModal = useGameStore(s => s.closeAskModal);
  const openCallSetModal = useGameStore(s => s.openCallSetModal);
  const closeCallSetModal = useGameStore(s => s.closeCallSetModal);
  const openCounterSetModal = useGameStore(s => s.openCounterSetModal);
  const closeCounterSetModal = useGameStore(s => s.closeCounterSetModal);
  const closeRevealModal = useGameStore(s => s.closeRevealModal);
  const askAnnouncement = useGameStore(s => s.askAnnouncement);
  const callSetProgress = useGameStore(s => s.callSetProgress);
  const callSetResultAnim = useGameStore(s => s.callSetResultAnim);
  const endGameVotes = useGameStore(s => s.endGameVotes);
  const passTurnCandidates = useGameStore(s => s.passTurnCandidates);
  const closePassTurnModal = useGameStore(s => s.closePassTurnModal);

  const [eventLog, setEventLog] = useState<EventEntry[]>([]);
  const [prevClaimedCount, setPrevClaimedCount] = useState(0);

  // Track new set claims and add to event log
  useEffect(() => {
    if (!gameView) return;
    const newSets = gameView.claimedSets.slice(prevClaimedCount);
    if (newSets.length > 0) {
      const newEntries = newSets.map(cs => buildSetClaimedEntry(cs, gameView.players));
      setEventLog(prev => [...prev, ...newEntries]);
      setPrevClaimedCount(gameView.claimedSets.length);
    }
  }, [gameView?.claimedSets]);

  // Add turn change to event log
  useEffect(() => {
    if (!gameView) return;
    const player = gameView.players.find(p => p.id === gameView.currentTurnPlayerId);
    if (player) {
      setEventLog(prev => [
        ...prev,
        {
          id: `turn_${Date.now()}`,
          type: 'turn_change',
          message: `It's ${player.name}'s turn`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [gameView?.currentTurnPlayerId]);

  if (!gameView) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin-slow">🃏</div>
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  const myPlayer = gameView.players.find(p => p.id === myPlayerId);
  const isMyTurn = gameView.currentTurnPlayerId === myPlayerId;

  // Team-based layout: opponents across the top, me + teammates at the bottom
  const otherPlayers = gameView.players.filter(p => p.id !== myPlayerId);
  const myTeamId = myPlayer?.teamId;
  const teammates = otherPlayers.filter(p => p.teamId === myTeamId);
  const opponents = otherPlayers.filter(p => p.teamId !== myTeamId);

  function handleReveal() {
    if (revealCredits <= 0 || !roomCode) return;
    socket.emit('reveal_ask', { roomCode });
  }

  const humanCount = gameView.players.filter(p => !p.isBot).length;
  const hasVotedEndGame = endGameVotes?.voterIds.includes(myPlayerId ?? '') ?? false;
  function handleVoteEndGame() {
    if (!roomCode || hasVotedEndGame) return;
    socket.emit('vote_end_game', { roomCode });
  }

  return (
    <div className="min-h-screen bg-felt flex flex-col" style={{ background: 'radial-gradient(ellipse at center, #236B43 0%, #133D24 100%)' }}>
      {/* Top bar: scores */}
      <div className="flex items-center justify-between px-6 py-4">
        <TeamScorePanel scores={gameView.scores} myTeamId={myPlayer?.teamId} />
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Turn {gameView.turnNumber}</div>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-400">
            {isMyTurn ? '🟢 Your turn' : `⏳ ${gameView.players.find(p => p.id === gameView.currentTurnPlayerId)?.name}'s turn`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col">
        {/* Top: all opponents */}
        <div className="flex justify-center gap-6 py-4 px-8">
          {opponents.map(player => (
            <PlayerSeat
              key={player.id}
              player={player}
              isCurrentTurn={gameView.currentTurnPlayerId === player.id}
              isLocalPlayer={false}
              position="top"
            />
          ))}
        </div>

        {/* Middle: left teammate | set trophies + event log | right teammate */}
        <div className="flex-1 flex items-center justify-center gap-6 px-8 py-2">
          {/* Left teammate — fixed width so center stays centered */}
          <div className="w-52 flex justify-end">
            {teammates[0] && (
              <PlayerSeat
                player={teammates[0]}
                isCurrentTurn={gameView.currentTurnPlayerId === teammates[0].id}
                isLocalPlayer={false}
                position="left"
              />
            )}
          </div>

          <div className="flex-1 max-w-md flex flex-col gap-4">
            <div className="bg-black/20 rounded-2xl p-4 shadow-table">
              <div className="text-xs text-gray-400 uppercase tracking-wide text-center mb-3">Sets</div>
              <SetTrophies claimedSets={gameView.claimedSets} />
            </div>
            <EventLog entries={eventLog} players={gameView.players} />
          </div>

          {/* Right teammate — fixed width so center stays centered */}
          <div className="w-52 flex justify-start">
            {teammates[1] && (
              <PlayerSeat
                player={teammates[1]}
                isCurrentTurn={gameView.currentTurnPlayerId === teammates[1].id}
                isLocalPlayer={false}
                position="right"
              />
            )}
          </div>
        </div>

        {/* Bottom: local player + hand + buttons */}
        <div className="pb-6 px-4">
          <div className="flex items-end justify-center">
            {/* Me + hand + buttons */}
            {myPlayer && (
              <div className="flex flex-col items-center gap-4">
                <PlayerSeat
                  player={myPlayer}
                  isCurrentTurn={isMyTurn}
                  isLocalPlayer={true}
                  position="bottom"
                />

                {/* Card hand */}
                <div className="w-full overflow-x-auto py-2">
                  <CardHand
                    cardIds={gameView.myHand}
                    onCardClick={isMyTurn ? (cardId) => openAskModal(cardId) : undefined}
                    disabled={!isMyTurn}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 flex-wrap justify-center">
                  {isMyTurn && (
                    <Button variant="primary" size="lg" onClick={() => openAskModal()}>
                      🗣 Ask
                    </Button>
                  )}
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={openCallSetModal}
                    disabled={!!callSetProgress}
                  >
                    ✓ Call Set
                  </Button>
                  <Button variant="secondary" size="lg" onClick={openCounterSetModal}>
                    ⚡ Counter Set
                  </Button>
                  {gameView.difficulty !== 'hard' && (
                    <button
                      onClick={handleReveal}
                      disabled={gameView.difficulty !== 'easy' && revealCredits <= 0}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-base font-bold
                        transition-all active:scale-95
                        ${gameView.difficulty === 'easy' || revealCredits > 0
                          ? 'bg-amber-900/30 border-amber-600 text-amber-300 hover:bg-amber-800/30'
                          : 'opacity-30 cursor-not-allowed border-gray-700 text-gray-500'
                        }`}
                    >
                      🪙 {gameView.difficulty === 'easy' ? '∞' : revealCredits}
                      <span className="text-sm font-normal">Reveal</span>
                    </button>
                  )}
                  {gameView.difficulty === 'normal' && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2
                        opacity-30 cursor-not-allowed border-gray-700 text-gray-500 text-base font-bold"
                      title="Payment not set up yet"
                    >
                      💳 <span className="text-sm font-normal">Buy More Reveals</span>
                    </button>
                  )}
                  <button
                    onClick={handleVoteEndGame}
                    disabled={hasVotedEndGame}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-base font-bold
                      transition-all active:scale-95
                      ${hasVotedEndGame
                        ? 'opacity-40 cursor-not-allowed border-gray-700 text-gray-500'
                        : 'bg-red-950/40 border-red-700 text-red-300 hover:bg-red-900/40'
                      }`}
                    title="Vote to end the game early"
                  >
                    🏳️ End ({endGameVotes?.votes ?? 0}/{humanCount})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask announcement overlay */}
      <AskAnnouncementOverlay announcement={askAnnouncement} />

      {/* Live call set spectator overlay — shown to everyone except the caller */}
      {callSetProgress && callSetProgress.callerPlayerId !== myPlayerId && (
        <CallSetSpectatorOverlay progress={callSetProgress} />
      )}

      {/* Call set result animation — shown to everyone */}
      <CallSetResultOverlay result={callSetResultAnim} />

      {/* Modals */}
      <AskModal open={askModalOpen} onClose={closeAskModal} />
      <CallSetModal open={callSetModalOpen} onClose={closeCallSetModal} />
      <CounterSetModal open={counterSetModalOpen} onClose={closeCounterSetModal} />
      <RevealModal
        open={revealModalOpen}
        onClose={closeRevealModal}
        players={gameView.players}
      />
      {passTurnCandidates && (
        <PassTurnModal candidates={passTurnCandidates} onClose={closePassTurnModal} />
      )}
    </div>
  );
}
