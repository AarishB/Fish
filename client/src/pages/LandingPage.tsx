import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle } from '../firebase';
import { saveUserProfile } from '../userStats';
import { useAuthStore } from '../store/useAuthStore';
import { usePlusStatus } from '../hooks/usePlusStatus';
import { upgradeToPlusButton } from '../stripe';
import { socket } from '../socket';

function emitWhenConnected(event: string, data: Record<string, unknown>) {
  if (socket.connected) {
    socket.emit(event, data);
  } else {
    socket.once('connect', () => socket.emit(event, data));
    socket.connect();
  }
}
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore, type CardBack } from '../store/useSettingsStore';
import { CARD_BACK_DEFS } from '../cardBackDefs';
import { Button } from '../components/ui/Button';
import type { GameDifficulty } from 'shared';

type Mode = 'auth' | 'home' | 'create' | 'join';

const PRESET_COUNTS = [4, 6, 8, 10] as const;

const PLUS_BACKS = new Set(['midnight', 'gold', 'obsidian']);

interface DifficultyOption {
  id: GameDifficulty | 'very_hard' | 'hidden_deck';
  label: string;
  emoji: string;
  description: string;
  disabled?: boolean;
  plusOnly?: boolean;
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
    id: 'hidden_deck',
    label: 'Hidden Deck',
    emoji: '🃏',
    description: 'No reveals, no card counts visible, and opponent card backs are blacked out. Maximum deduction. Plus exclusive.',
    plusOnly: true,
  },
  {
    id: 'very_hard',
    label: 'Very Hard',
    emoji: '💀',
    description: 'Coming soon...',
    disabled: true,
  },
];

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_FLOATERS = Array.from({ length: 160 }, (_, i) => SUITS[i % 4]);
// Aesthetic directions only: up, down, left, right, and the 4 diagonals
const AESTHETIC_ANGLES = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
const FLOATER_DIRS = Array.from({ length: 160 }, () => {
  const angle = AESTHETIC_ANGLES[Math.floor(Math.random() * AESTHETIC_ANGLES.length)];
  return { x: Math.cos(angle), y: Math.sin(angle) };
});
// Negative delay = start mid-cycle so icons are spread out across the screen immediately
const FLOATER_DELAYS = Array.from({ length: 160 }, () => -(Math.random() * 30));

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
  const navigate = useNavigate();
  const { user: firebaseUser, loading: authLoading } = useAuthStore();
  const [mode, setMode] = useState<Mode>('auth');
  const [signingIn, setSigningIn] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [rulesOpen, setRulesOpen] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const isPlus = usePlusStatus();
  const setMyIdentity = useGameStore(s => s.setMyIdentity);
  const addToast = useGameStore(s => s.addToast);
  const { cardBack, setCardBack } = useSettingsStore();
  const myPlayerName = useGameStore(s => s.myPlayerName);

  function handlePlusGated() {
    void upgradeToPlusButton();
    addToast('✦ Upgrade to Plus to unlock this feature', 'info');
  }

  // Auto-advance past auth screen when Firebase session is already active
  useEffect(() => {
    if (!authLoading && firebaseUser && mode === 'auth') setMode('home');
  }, [authLoading, firebaseUser, mode]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    const count = isCustom ? Number.parseInt(customInput, 10) : playerCount;
    if (!count || count < 4 || count > 14) return;
    setMyIdentity(socket.id ?? '', playerName.trim());
    useGameStore.setState({ myPlayerName: playerName.trim() });
    emitWhenConnected('create_room', { playerName: playerName.trim(), playerCount: count, difficulty, cardBack });
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
    emitWhenConnected('join_room', { playerName: playerName.trim(), roomCode: roomCode.trim().toUpperCase() });
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
            style={{ left: `${(i * 13 + i * i * 7) % 95}%`, top: `${(i * 11 + i * i * 3) % 95}%` }}
            animate={{
              x: [-2000 * FLOATER_DIRS[i].x, -2000 * FLOATER_DIRS[i].x, 2000 * FLOATER_DIRS[i].x, 2000 * FLOATER_DIRS[i].x],
              y: [-2000 * FLOATER_DIRS[i].y, -2000 * FLOATER_DIRS[i].y, 2000 * FLOATER_DIRS[i].y, 2000 * FLOATER_DIRS[i].y],
            }}
            transition={{
              duration: 60,
              times: [0, 0.05, 0.95, 1],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: FLOATER_DELAYS[i],
            }}
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
          {mode === 'auth' && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                disabled={signingIn}
                onClick={async () => {
                  setSigningIn(true);
                  try {
                    const user = await signInWithGoogle();
                    useAuthStore.getState().setUser(user);
                    await saveUserProfile(user);
                    setMode('home');
                  } catch {
                    // user closed popup — do nothing
                  } finally {
                    setSigningIn(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                  bg-white hover:bg-gray-100 active:bg-gray-200 disabled:opacity-60
                  transition-colors text-gray-800 font-semibold text-sm shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                {signingIn ? 'Signing in…' : 'Sign in with Google'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              <Button variant="secondary" size="lg" onClick={() => setMode('home')} className="w-full">
                Play as Guest
              </Button>
            </div>
          )}

          {mode === 'home' && (
            <div className="flex flex-col gap-4">
              {firebaseUser && (
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  {firebaseUser.photoURL
                    ? <img src={firebaseUser.photoURL} alt="profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    : <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">👤</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{firebaseUser.displayName}</div>
                    <div className="text-gray-500 text-xs">View profile →</div>
                  </div>
                </button>
              )}
              <Button variant="primary" size="lg" onClick={() => setMode('create')} className="w-full">
                🃏 Create Room
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setMode('join')} className="w-full">
                🚪 Join Room
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode('auth')}>← Back</Button>
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
                          const locked = opt.disabled || (opt.plusOnly && !isPlus);
                          const isSelected = !locked && difficulty === opt.id;
                          let tileClass: string;
                          if (opt.disabled) {
                            tileClass = 'opacity-40 cursor-not-allowed border-gray-700 text-gray-500';
                          } else if (isSelected) {
                            tileClass = 'border-teamA bg-teamA/10 text-white';
                          } else if (opt.plusOnly && !isPlus) {
                            tileClass = 'border-amber-800/50 text-gray-300 hover:border-amber-600/60 cursor-pointer';
                          } else {
                            tileClass = 'border-gray-700 text-gray-300 hover:border-gray-500';
                          }
                          return (
                          <div key={opt.id} className="relative">
                            <button
                              type="button"
                              disabled={opt.disabled}
                              onClick={() => {
                                if (opt.disabled) return;
                                if (opt.plusOnly && !isPlus) { handlePlusGated(); return; }
                                if (opt.id !== 'very_hard' && opt.id !== 'hidden_deck') setDifficulty(opt.id as GameDifficulty);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${tileClass}`}
                            >
                              <span className="text-lg">{opt.emoji}</span>
                              <span className="font-semibold text-sm flex-1">{opt.label}</span>
                              {opt.disabled && (
                                <span className="text-xs text-gray-600 italic">Coming soon</span>
                              )}
                              {opt.plusOnly && !isPlus && (
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">✦ Plus</span>
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

              {/* Card back selector */}
              <div className="border border-gray-700 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Card Design</p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-subtle">
                  {Object.entries(CARD_BACK_DEFS).map(([id, def]) => {
                    const isPlusBack = PLUS_BACKS.has(id);
                    const isUnlocked = !def.locked || (isPlusBack && isPlus);
                    const isActive = isUnlocked && cardBack === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (isPlusBack && !isPlus) { handlePlusGated(); return; }
                          if (isUnlocked) setCardBack(id as CardBack);
                        }}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                      >
                        <div
                          className={`relative w-10 h-14 rounded-lg border-2 overflow-hidden flex items-center justify-center transition-all
                            ${!isUnlocked && !isPlusBack ? 'opacity-40' : ''}
                            ${isActive ? `${def.borderColor} ring-2 ring-offset-2 ring-offset-gray-900 ring-white/30 scale-110` : 'border-gray-600'}
                            ${isUnlocked ? 'group-hover:border-gray-400' : ''}
                          `}
                          style={def.container}
                        >
                          <div className="absolute inset-0" style={def.pattern} />
                          <div className="absolute inset-[2px] rounded border border-white/10 pointer-events-none" />
                          <span className={`relative z-10 ${def.symbolColor} opacity-70 text-base`}>✦</span>
                          {isPlusBack && !isPlus && (
                            <div className="absolute inset-0 flex items-end justify-center pb-1 rounded-lg bg-black/30">
                              <span className="text-xs font-bold text-amber-400">✦</span>
                            </div>
                          )}
                          {!isPlusBack && def.locked && (
                            <div className="absolute inset-0 flex items-end justify-center pb-1 rounded-lg">
                              <span className="text-xs">🔒</span>
                            </div>
                          )}
                        </div>
                        <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-500'} transition-colors`}>
                          {def.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
