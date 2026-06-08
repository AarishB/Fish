import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, signOutUser } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { updateUserProfile, checkUsernameAvailable, claimUsername } from '../userStats';
import { COUNTRIES } from '../data/countries';
import { getBelt } from '../utils/belt';
import { usePlusStatus } from '../hooks/usePlusStatus';
import { PlusRing } from '../components/ui/PlusRing';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import { Button } from '../components/ui/Button';

interface UserDoc {
  displayName: string;
  email: string;
  photoURL: string;
  age: number | null;
  country: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  gamesEndedEarly: number;
  isPlus: boolean;
  username?: string;
}

const PLUS_FEATURES = [
  { icon: '🎨', title: 'Premium Card Designs', desc: 'Unlock Midnight, Gold, and Obsidian card backs.' },
  { icon: '🃏', title: 'Hidden Deck Mode', desc: 'An exclusive game mode where some cards are dealt to an unseen ghost hand.' },
  { icon: '🌟', title: 'Gold Plus Ring', desc: 'Show off your supporter status with a glowing gold ring around your avatar.' },
  { icon: '🥋', title: 'Belt Upgrades', desc: 'Unlock prestige belts faster and earn special Plus-exclusive belt colors.' },
  { icon: '📊', title: 'Full Stats', desc: 'Access detailed game stats and full ask history.' },
  { icon: '👁', title: 'More Reveals', desc: '5 reveals per game in Normal mode (free players get 3) + buy extra mid-game.' },
];

function PlusBenefitsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✦</span>
            <h2 className="text-lg font-bold text-amber-300">Fish Plus Benefits</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          {PLUS_FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-xl shrink-0">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold text-white">{f.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40
            text-amber-300 font-semibold text-sm hover:bg-amber-500/30 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function CountryDropdown({ value, onChange }: { readonly value: string; readonly onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Search country…"
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white
          placeholder-gray-500 focus:outline-none focus:border-teamA transition-colors"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl
          shadow-2xl max-h-52 overflow-y-auto scrollbar-thin">
          {filtered.map(c => (
            <button
              key={c.name}
              type="button"
              onMouseDown={() => { onChange(c.name); setQuery(c.name); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10
                text-left text-sm text-white transition-colors"
            >
              <span className="text-xl leading-none">{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setIsPlus, setPhotoURL: setGlobalPhotoURL, setUsername: setGlobalUsername } = useAuthStore();
  const isPlus = usePlusStatus();

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // @handle editing
  const [username, setUsername] = useState('');
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState('');
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const [handleSaving, setHandleSaving] = useState(false);
  const handleCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as UserDoc;
        setProfile(d);
        setDisplayName(d.displayName ?? '');
        setAge(d.age != null ? String(d.age) : '');
        setCountry(d.country ?? '');
        setPhotoURL(d.photoURL ?? user.photoURL ?? '');
        setUsername(d.username ?? '');
        if (d.isPlus !== isPlus) setIsPlus(d.isPlus);
      }
      setLoading(false);
    });
  }, [user, navigate, isPlus, setIsPlus]);

  function startEditHandle() {
    setHandleDraft(username);
    setHandleAvailable(null);
    setEditingHandle(true);
  }

  function onHandleDraftChange(val: string) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setHandleDraft(cleaned);
    setHandleAvailable(null);
    if (handleCheckTimer.current) clearTimeout(handleCheckTimer.current);
    if (!cleaned || cleaned.length < 2 || cleaned === username) { setHandleChecking(false); return; }
    setHandleChecking(true);
    handleCheckTimer.current = setTimeout(async () => {
      const ok = await checkUsernameAvailable(cleaned, user!.uid);
      setHandleAvailable(ok);
      setHandleChecking(false);
    }, 400);
  }

  async function saveHandle() {
    if (!user || !handleDraft || handleDraft.length < 2) return;
    setHandleSaving(true);
    try {
      await claimUsername(user.uid, handleDraft, username || undefined);
      setUsername(handleDraft);
      setGlobalUsername(handleDraft);
      setEditingHandle(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save username.';
      alert(msg);
    } finally {
      setHandleSaving(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const parsedAge = age.trim() ? Number(age) : null;
    await updateUserProfile(user.uid, {
      displayName: displayName.trim() || undefined,
      age: parsedAge,
      country: country.trim(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await signOutUser();
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setIsPlus(false);
    navigate('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-feltDark flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const belt = getBelt(profile.gamesPlayed);
  const ratio = profile.losses > 0
    ? (profile.wins / profile.losses).toFixed(2)
    : profile.wins > 0 ? '∞' : '—';

  const handleCanSave = handleDraft.length >= 2 && (handleDraft === username || handleAvailable === true);

  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center py-10 px-4">
      {showCropModal && (
        <ImageCropModal
          uid={user.uid}
          onSaved={url => { setPhotoURL(url); setGlobalPhotoURL(url); setShowCropModal(false); }}
          onCancel={() => setShowCropModal(false)}
        />
      )}
      {showPlusModal && <PlusBenefitsModal onClose={() => setShowPlusModal(false)} />}

      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white font-card">Profile</h1>
          {isPlus && (
            <button
              type="button"
              onClick={() => setShowPlusModal(true)}
              className="ml-auto text-xs font-bold px-2 py-1 rounded-full
                bg-amber-500/20 border border-amber-500/50 text-amber-300
                hover:bg-amber-500/30 transition-colors"
              title="View Plus benefits"
            >
              ✦ Plus
            </button>
          )}
        </div>

        {/* Identity card */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-6 space-y-4">

          {/* Belt badge */}
          <div className="flex justify-center">
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: belt.color + '30', color: belt.color, border: `1px solid ${belt.color}60` }}
            >
              <span>🥋</span>
              <span>{belt.name} Belt</span>
              <span className="text-xs opacity-60">
                ({belt.max == null ? `${belt.min}+` : `${belt.min}–${belt.max}`} games)
              </span>
            </div>
          </div>

          {/* Avatar (clickable to edit) */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowCropModal(true)}
              className="relative group"
              title="Change profile picture"
            >
              <PlusRing active={isPlus} padding={4}>
                {photoURL
                  ? <img src={photoURL} alt="avatar" className="w-20 h-20 rounded-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl">👤</div>
                }
              </PlusRing>
              <div className="absolute inset-0 rounded-full flex items-center justify-center
                bg-black/0 group-hover:bg-black/40 transition-colors">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
                  Edit
                </span>
              </div>
            </button>
          </div>

          {/* @handle */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Username</label>
            {editingHandle ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">@</span>
                  <input
                    autoFocus
                    value={handleDraft}
                    onChange={e => onHandleDraftChange(e.target.value)}
                    placeholder="yourhandle"
                    maxLength={20}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white
                      placeholder-gray-500 focus:outline-none focus:border-teamA transition-colors font-mono text-sm"
                  />
                </div>
                {handleDraft.length >= 2 && handleDraft !== username && (
                  <div className="text-xs ml-5">
                    {handleChecking
                      ? <span className="text-gray-400">Checking…</span>
                      : handleAvailable === true
                        ? <span className="text-green-400">✓ Available</span>
                        : handleAvailable === false
                          ? <span className="text-red-400">✗ Already taken</span>
                          : null
                    }
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingHandle(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveHandle}
                    disabled={!handleCanSave || handleSaving}
                    className="flex-1"
                  >
                    {handleSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white font-mono text-sm">
                  {username ? `@${username}` : <span className="text-gray-500 italic">Not set</span>}
                </span>
                <button
                  type="button"
                  onClick={startEditHandle}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1"
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Display Name</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={24}
                placeholder="Your name"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white
                  placeholder-gray-500 focus:outline-none focus:border-teamA transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Age</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                min={1}
                max={120}
                placeholder="Optional"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white
                  placeholder-gray-500 focus:outline-none focus:border-teamA transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Country</label>
              <CountryDropdown value={country} onChange={setCountry} />
            </div>
          </div>

          <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full">
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Stats */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Games Played', value: profile.gamesPlayed, emoji: '🎮' },
              { label: 'Wins',         value: profile.wins,        emoji: '🏆' },
              { label: 'Losses',       value: profile.losses,      emoji: '💔' },
              { label: 'W/L Ratio',    value: ratio,               emoji: '📊' },
              { label: 'Ended Early',  value: profile.gamesEndedEarly, emoji: '⏹' },
            ] as const).map(({ label, value, emoji }) => (
              <div key={label} className="bg-gray-800/60 rounded-2xl p-4 flex flex-col gap-1">
                <div className="text-xl">{emoji}</div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade to Plus */}
        {!isPlus && (
          <div className="bg-gray-900/90 border border-amber-500/30 rounded-3xl p-6
            flex items-center gap-4">
            <div className="text-3xl">✦</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">Upgrade to Fish Plus</div>
              <div className="text-gray-400 text-xs mt-0.5">
                Premium card designs, Hidden Deck Mode, gold ring &amp; more — $4.99/mo
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/upgrade')}
              className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm
                bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                text-black transition-colors"
            >
              Upgrade
            </button>
          </div>
        )}

        {/* Sign out */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-6">
          {showSignOutConfirm ? (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm text-center">Are you sure you want to sign out?</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowSignOutConfirm(false)} className="flex-1">Cancel</Button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-700
                    text-red-300 font-semibold text-sm py-2 rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full text-red-400 hover:text-red-300 text-sm font-semibold
                py-2 rounded-xl hover:bg-red-950/30 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
