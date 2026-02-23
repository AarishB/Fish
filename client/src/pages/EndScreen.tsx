import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/useGameStore';
import { Button } from '../components/ui/Button';
import { SET_DEFINITIONS } from 'shared';
import type { ClientGameView } from 'shared';

// ─── WinnerBanner ───────────────────────────────────────────────────────────

interface WinnerBannerProps {
  winner: 'A' | 'B' | null;
  isDraw: boolean;
  iWon: boolean;
  gameTiebreaker: { winnerTeam: string; teamACards: number; teamBCards: number } | null;
  gameView: ClientGameView | null;
}

function WinnerBanner({ winner, isDraw, iWon, gameTiebreaker, gameView }: Readonly<WinnerBannerProps>) {
  let bannerClass: string;
  if (isDraw) bannerClass = 'bg-gray-800/60 border-gray-500';
  else if (winner === 'A') bannerClass = 'bg-teamA/20 border-teamA';
  else bannerClass = 'bg-teamB/20 border-teamB';

  let resultEmoji: string;
  if (isDraw) resultEmoji = '🤝';
  else if (iWon) resultEmoji = '🏆';
  else resultEmoji = '🎴';

  // Pre-compute tiebreaker display to avoid nested ternary
  let closerCards = 0;
  let otherCards = 0;
  if (gameTiebreaker) {
    if (gameTiebreaker.winnerTeam === 'A') {
      closerCards = gameTiebreaker.teamACards;
      otherCards = gameTiebreaker.teamBCards;
    } else {
      closerCards = gameTiebreaker.teamBCards;
      otherCards = gameTiebreaker.teamACards;
    }
  }

  return (
    <div className={`text-center mb-8 p-8 rounded-3xl border-2 ${bannerClass}`}>
      <div className="text-6xl mb-3">{resultEmoji}</div>

      {isDraw ? (
        <>
          <h1 className="text-5xl font-bold font-card text-white mb-2">It's a Draw!</h1>
          <p className="text-gray-300 text-xl mb-1">Both teams claimed equal sets.</p>
          {gameTiebreaker && (
            <p className="text-amber-400 text-base mt-2">
              Team {gameTiebreaker.winnerTeam} was closer to winning —{' '}
              {closerCards} cards in unclaimed sets vs {otherCards}
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-5xl font-bold font-card text-white mb-2">
            Team {winner} Wins!
          </h1>
          {iWon
            ? <p className="text-green-400 text-xl">Congratulations — you won!</p>
            : <p className="text-gray-400 text-xl">Better luck next time.</p>
          }
        </>
      )}

      {/* Scores */}
      {gameView && (
        <div className="flex justify-center gap-8 mt-6">
          {(['A', 'B'] as const).map(team => (
            <div key={team} className={`text-center px-6 py-3 rounded-2xl border
              ${team === 'A' ? 'border-teamA bg-teamA/10' : 'border-teamB bg-teamB/10'}`}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Team {team}</div>
              <div className="text-4xl font-bold font-card text-white">
                {gameView.scores[team] ?? 0}
              </div>
              <div className="text-xs text-gray-400">sets</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cardLabel(cardId: string) {
  if (cardId === 'JOKER_1' || cardId === 'JOKER_2') return 'Joker';
  const parts = cardId.split('_');
  const suit = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const rank = parts.slice(1).join(' ');
  return `${rank} of ${suit}`;
}

// ─── EndScreen ──────────────────────────────────────────────────────────────

export default function EndScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameView = useGameStore(s => s.gameView);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const revealedAsks = useGameStore(s => s.revealedAsks);
  const roomCode = useGameStore(s => s.roomCode);
  const gameTiebreaker = useGameStore(s => s.gameTiebreaker);
  const resetGame = useGameStore(s => s.resetGame);

  const winner = searchParams.get('winner') as 'A' | 'B' | null;
  const myPlayer = gameView?.players.find(p => p.id === myPlayerId);
  const iWon = myPlayer?.teamId === winner;
  const isDraw = gameTiebreaker !== null && gameView?.scores.A === gameView?.scores.B;

  useEffect(() => {
    if (iWon) {
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'],
      });
    }
  }, [iWon]);

  function handlePlayAgain() {
    resetGame();
    if (roomCode) {
      navigate(`/lobby/${roomCode}`);
    } else {
      navigate('/');
    }
  }

  function handleLeave() {
    resetGame();
    navigate('/');
  }

  function playerName(id: string) {
    return gameView?.players.find(p => p.id === id)?.name ?? 'Unknown';
  }


  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center py-12 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-2xl"
      >
        <WinnerBanner
          winner={winner}
          isDraw={isDraw}
          iWon={iWon}
          gameTiebreaker={gameTiebreaker}
          gameView={gameView}
        />

        {/* Set breakdown */}
        {gameView && gameView.claimedSets.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 font-card">Set Breakdown</h2>
            <div className="flex flex-col gap-2">
              {gameView.claimedSets.map((cs, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm
                    ${cs.wonByTeam === 'A' ? 'bg-teamA/10 border border-teamA/30' : 'bg-teamB/10 border border-teamB/30'}`}
                >
                  <span className="text-gray-300">{SET_DEFINITIONS[cs.setId]?.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">called by {playerName(cs.calledBy)}</span>
                    {cs.wasCounter && <span className="text-blue-400 text-xs">⚡ counter</span>}
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full
                      ${cs.wonByTeam === 'A' ? 'bg-teamA/30 text-teamALight' : 'bg-teamB/30 text-teamBLight'}`}>
                      Team {cs.wonByTeam}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Full ask history */}
        {revealedAsks.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 font-card">
              Full Ask History ({revealedAsks.length} asks)
            </h2>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto scrollbar-thin">
              {revealedAsks.map((ask, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs
                    ${ask.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-900'}`}
                >
                  <span className="text-gray-300">
                    <span className="font-semibold text-white">{playerName(ask.askingPlayerId)}</span>
                    {' → '}
                    <span className="font-semibold text-white">{playerName(ask.targetPlayerId)}</span>
                    {' for '}
                    <span className="font-semibold text-white">{cardLabel(ask.cardId)}</span>
                  </span>
                  <span>{ask.success ? '✅' : '❌'}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button variant="primary" size="lg" onClick={handlePlayAgain}>
            🔄 Play Again
          </Button>
          <Button variant="secondary" size="lg" onClick={handleLeave}>
            🚪 Leave
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
