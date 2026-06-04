import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, signOutUser } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { updateUserProfile } from '../userStats';
import { COUNTRIES } from '../data/countries';
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

function CountryDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

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
              onMouseDown={() => select(c.name)}
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
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as UserDoc;
        setProfile(d);
        setDisplayName(d.displayName ?? '');
        setAge(d.age != null ? String(d.age) : '');
        setCountry(d.country ?? '');
      }
      setLoading(false);
    });
  }, [user, navigate]);

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

  const ratio = profile.losses > 0
    ? (profile.wins / profile.losses).toFixed(2)
    : profile.wins > 0 ? '∞' : '—';

  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center py-10 px-4">
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
        </div>

        {/* Identity card */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" className="w-14 h-14 rounded-full" referrerPolicy="no-referrer" />
              : <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-2xl">👤</div>
            }
            <div>
              <div className="text-white font-semibold">{profile.displayName}</div>
              <div className="text-gray-400 text-sm">{profile.email}</div>
            </div>
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

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Stats card */}
        <div className="bg-gray-900/90 border border-gray-700 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Games Played', value: profile.gamesPlayed, emoji: '🎮' },
              { label: 'Wins', value: profile.wins, emoji: '🏆' },
              { label: 'Losses', value: profile.losses, emoji: '💔' },
              { label: 'W/L Ratio', value: ratio, emoji: '📊' },
              { label: 'Ended Early', value: profile.gamesEndedEarly, emoji: '⏹' },
            ].map(({ label, value, emoji }) => (
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
          {!showSignOutConfirm ? (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full text-red-400 hover:text-red-300 text-sm font-semibold
                py-2 rounded-xl hover:bg-red-950/30 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm text-center">Are you sure you want to sign out?</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowSignOutConfirm(false)} className="flex-1">
                  Cancel
                </Button>
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
          )}
        </div>

      </div>
    </div>
  );
}
