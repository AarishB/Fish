import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, signOutUser } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { updateUserProfile } from '../userStats';
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
  const { user, setIsPlus } = useAuthStore();
  const isPlus = usePlusStatus();

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [photoURL, setPhotoURL] = useState('');

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
        if (d.isPlus !== isPlus) setIsPlus(d.isPlus);
      }
      setLoading(false);
    });
  }, [user, navigate, isPlus, setIsPlus]);

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

  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center py-10 px-4">
      {showCropModal && (
        <ImageCropModal
          uid={user.uid}
          onSaved={url => { setPhotoURL(url); setShowCropModal(false); }}
          onCancel={() => setShowCropModal(false)}
        />
      )}

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
            <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full
              bg-amber-500/20 border border-amber-500/50 text-amber-300">
              ✦ Plus
            </span>
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
