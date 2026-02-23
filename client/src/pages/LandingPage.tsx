import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';
import { useGameStore } from '../store/useGameStore';
import { Button } from '../components/ui/Button';
import type { GameDifficulty } from 'shared';

type Mode = 'home' | 'create' | 'join';

const PRESET_COUNTS = [4, 6, 8, 10] as const;

interface DifficultyOption {
  id: GameDifficulty | 'very_hard';
  label: string;
  emoji: string;
  description: string;
  disabled?: boolean;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    id: 'easy',
    label: 'Easy',
    emoji: '😌',
    description: 'Unlimited reveals — see as much ask history as you want, any time. Great for learning the game.',
  },
  {
    id: 'normal',
    label: 'Normal',
    emoji: '🧠',
    description: '3 reveals per player per game. Each use shows one more past ask (1st: last ask, 2nd: last 2, 3rd: last 3). After that, you\'re on your own.',
  },
  {
    id: 'hard',
    label: 'Hard',
    emoji: '🔥',
    description: 'No reveals at all. Pure memory — pay attention or lose.',
  },
  {
    id: 'very_hard',
    label: 'Very Hard',
    emoji: '💀',
    description: 'Coming soon...',
    disabled: true,
  },
];

const SUIT_FLOATERS = ['♠', '♥', '♦', '♣', '♠', '♥', '♦', '♣', '♠', '♥'];

const HOW_TO_PLAY = [
  { q: 'What is the goal?', a: 'Claim the most sets. First team to 5 wins (out of 9 total sets).' },
  { q: 'What are the 9 sets?', a: '4 low sets (2-7 of each suit), 4 high sets (9-A of each suit), and 1 middle set (all 8s + both jokers).' },
  { q: 'How do I ask for a card?', a: "On your turn, ask any opponent for a specific card — but you must already hold at least one card from the same set, and you can't ask for a card you already have." },
  { q: 'What happens when I ask?', a: 'Correct: you get the card and keep your turn. Wrong: the turn passes to the player you asked.' },
  { q: 'What is "Call Set"?', a: 'At any time, if you know which teammate holds each of the 6 cards in a set, call it. Get it right: your team wins the set. Get any card wrong: the other team wins it.' },
  { q: 'What is "Counter Set"?', a: 'If you know all 6 cards of a set are on the opposing team, you can name exactly who has what before they call it — and steal it for your team.' },
  { q: 'What are Reveal credits?', a: 'Each player gets 3 reveals per game. Each use shows you one more past ask (1st use: last ask, 2nd: last 2, 3rd: last 3). After that, you\'re on your own.' },
];

export default function LandingPage() {
  const [mode, setMode] = useState<Mode>('home');
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [rulesOpen, setRulesOpen] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const setMyIdentity = useGameStore(s => s.setMyIdentity);
  const myPlayerName = useGameStore(s => s.myPlayerName);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    const count = isCustom ? Number.parseInt(customInput, 10) : playerCount;
    if (!count || count < 4 || count > 14) return;
    setMyIdentity(socket.id ?? '', playerName.trim());
    useGameStore.setState({ myPlayerName: playerName.trim() });
    socket.emit('create_room', { playerName: playerName.trim(), playerCount: count, difficulty });
  }

  function handleSelectPreset(n: number) {
    setPlayerCount(n);
    setIsCustom(false);
    setCustomInput('');
  }

  function handleSelectCustom() {
    setIsCustom(true);
    setCustomInput('');
  }

  const customCount = Number.parseInt(customInput, 10);
  const customValid = !isCustom || (
    !Number.isNaN(customCount) && customCount >= 4 && customCount <= 14
  );

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;
    useGameStore.setState({ myPlayerName: playerName.trim() });
    socket.emit('join_room', { playerName: playerName.trim(), roomCode: roomCode.trim().toUpperCase() });
  }

  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center justify-center relative overflow-hidden">
      {/* Floating suit symbols */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {SUIT_FLOATERS.map((suit, i) => (
          <motion.div
            key={i}
            className={`absolute text-4xl select-none opacity-5 ${
              suit === '♥' || suit === '♦' ? 'text-red-400' : 'text-gray-400'
            }`}
            style={{ left: `${10 + (i * 9) % 90}%`, top: `${(i * 17) % 90}%` }}
            animate={{ y: [-10, 10, -10], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
          >
            {suit}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-7xl font-bold font-card text-white tracking-wide mb-2">Fish</h1>
          <p className="text-gray-400 text-lg">The card game of memory and deduction</p>
        </div>

        {/* Main card */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-8 shadow-2xl backdrop-blur">
          {mode === 'home' && (
            <div className="flex flex-col gap-4">
              <Button variant="primary" size="lg" onClick={() => setMode('create')} className="w-full">
                🃏 Create Room
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setMode('join')} className="w-full">
                🚪 Join Room
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-white font-card">Create a Room</h2>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                <input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  maxLength={20}
                  placeholder="Enter your name"
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3
                    text-white placeholder-gray-500 focus:outline-none focus:border-teamA
                    transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Players</label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COUNTS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSelectPreset(n)}
                      className={`py-3 rounded-xl border-2 font-bold transition-all text-sm
                        ${!isCustom && playerCount === n
                          ? 'bg-teamA border-teamA text-white'
                          : 'border-gray-600 text-gray-400 hover:border-teamA'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSelectCustom}
                    className={`py-3 rounded-xl border-2 font-bold transition-all text-sm
                      ${isCustom
                        ? 'bg-teamA border-teamA text-white'
                        : 'border-gray-600 text-gray-400 hover:border-teamA'
                      }`}
                  >
                    Custom
                  </button>
                </div>
                {isCustom && (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      min={4}
                      max={14}
                      step={1}
                      placeholder="Number between 4–14"
                      className={`w-full bg-gray-800 border rounded-xl px-4 py-2 text-white
                        placeholder-gray-500 focus:outline-none transition-colors text-sm
                        ${customValid ? 'border-gray-600 focus:border-teamA' : 'border-red-500'}`}
                    />
                    {!customValid && customInput !== '' && (
                      <p className="text-red-400 text-xs mt-1">Must be a number between 4 and 14</p>
                    )}
                  </div>
                )}
              </div>
              {/* Game Settings */}
              <div className="border border-gray-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm
                    text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold">⚙️ Game Settings</span>
                  <span className="text-gray-500">{settingsOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {settingsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-700"
                    >
                      <div className="p-3 flex flex-col gap-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Difficulty</p>
                        {DIFFICULTY_OPTIONS.map(opt => {
                          const isSelected = !opt.disabled && difficulty === opt.id;
                          let tileClass: string;
                          if (opt.disabled) {
                            tileClass = 'opacity-40 cursor-not-allowed border-gray-700 text-gray-500';
                          } else if (isSelected) {
                            tileClass = 'border-teamA bg-teamA/10 text-white';
                          } else {
                            tileClass = 'border-gray-700 text-gray-300 hover:border-gray-500';
                          }
                          return (
                          <div key={opt.id} className="relative">
                            <button
                              type="button"
                              disabled={opt.disabled}
                              onClick={() => { if (!opt.disabled && opt.id !== 'very_hard') setDifficulty(opt.id); }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${tileClass}`}
                            >
                              <span className="text-lg">{opt.emoji}</span>
                              <span className="font-semibold text-sm flex-1">{opt.label}</span>
                              {opt.disabled && (
                                <span className="text-xs text-gray-600 italic">Coming soon</span>
                              )}
                              {/* Info icon */}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setInfoOpen(infoOpen === opt.id ? null : opt.id);
                                }}
                                className="w-5 h-5 rounded-full border border-gray-500 text-gray-400
                                  hover:border-gray-300 hover:text-white transition-colors
                                  flex items-center justify-center text-xs font-bold flex-shrink-0"
                                aria-label={`Info about ${opt.label}`}
                              >
                                i
                              </button>
                            </button>
                            <AnimatePresence>
                              {infoOpen === opt.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  transition={{ duration: 0.15 }}
                                  className="mt-1 mx-1 px-3 py-2 bg-gray-800 border border-gray-600
                                    rounded-lg text-xs text-gray-300 leading-relaxed"
                                >
                                  {opt.description}
                                  {opt.id === 'normal' && (
                                    <div className="mt-1.5">
                                      <span className="inline-block px-2 py-0.5 rounded bg-gray-700
                                        text-gray-500 text-xs cursor-not-allowed opacity-60">
                                        🪙 Buy More Reveals (coming soon)
                                      </span>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setMode('home')}>Back</Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={!playerName.trim() || !customValid}>
                  Create
                </Button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-white font-card">Join a Room</h2>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                <input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  maxLength={20}
                  placeholder="Enter your name"
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3
                    text-white placeholder-gray-500 focus:outline-none focus:border-teamA
                    transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room Code</label>
                <input
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="e.g. ABCD"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3
                    text-white placeholder-gray-500 focus:outline-none focus:border-teamA
                    transition-colors font-mono text-xl tracking-widest uppercase text-center"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setMode('home')}>Back</Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={!playerName.trim() || roomCode.length < 4}
                >
                  Join
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* How to Play accordion */}
        <div className="mt-6 bg-gray-900/60 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-gray-300 border-b border-gray-700">
            How to Play
          </div>
          {HOW_TO_PLAY.map((item, i) => (
            <div key={i} className="border-b border-gray-800 last:border-0">
              <button
                onClick={() => setRulesOpen(rulesOpen === i ? null : i)}
                className="w-full text-left px-5 py-3 text-sm text-gray-300 hover:text-white
                  hover:bg-white/5 transition-colors flex justify-between items-center"
              >
                <span>{item.q}</span>
                <span className="text-gray-500 ml-2">{rulesOpen === i ? '▲' : '▼'}</span>
              </button>
              <motion.div
                initial={false}
                animate={{ height: rulesOpen === i ? 'auto' : 0, opacity: rulesOpen === i ? 1 : 0 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-4 text-xs text-gray-400 leading-relaxed">{item.a}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
