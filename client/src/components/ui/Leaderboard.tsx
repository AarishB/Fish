import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface LeaderEntry {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

type SortMode = 'wins' | 'played' | 'ratio';

const TABS: { id: SortMode; label: string; emoji: string }[] = [
  { id: 'wins',   label: 'Most Wins',   emoji: '🏆' },
  { id: 'played', label: 'Most Played', emoji: '🎮' },
  { id: 'ratio',  label: 'Best W/L',    emoji: '📊' },
];

function ratioLabel(wins: number, losses: number): string {
  if (losses === 0) return wins > 0 ? '∞' : '—';
  return (wins / losses).toFixed(2);
}

function statValue(entry: LeaderEntry, mode: SortMode): string {
  if (mode === 'wins')   return String(entry.wins);
  if (mode === 'played') return String(entry.gamesPlayed);
  return ratioLabel(entry.wins, entry.losses);
}

function statLabel(mode: SortMode): string {
  if (mode === 'wins')   return 'wins';
  if (mode === 'played') return 'games';
  return 'W/L';
}

export function Leaderboard() {
  const [tab, setTab] = useState<SortMode>('wins');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState<Set<SortMode>>(new Set());

  useEffect(() => {
    if (fetched.has(tab)) return;
    setLoading(true);

    const field = tab === 'ratio' ? 'wins' : tab === 'wins' ? 'wins' : 'gamesPlayed';
    const fetchLimit = tab === 'ratio' ? 50 : 10;
    const q = query(collection(db, 'users'), orderBy(field, 'desc'), limit(fetchLimit));

    getDocs(q).then(snap => {
      let rows: LeaderEntry[] = snap.docs.map(d => ({
        uid: d.id,
        displayName: d.data().displayName ?? 'Anonymous',
        username: d.data().username,
        photoURL: d.data().photoURL,
        wins: d.data().wins ?? 0,
        losses: d.data().losses ?? 0,
        gamesPlayed: d.data().gamesPlayed ?? 0,
      }));

      if (tab === 'ratio') {
        rows = rows
          .filter(r => r.gamesPlayed >= 3)
          .sort((a, b) => {
            const ra = a.losses === 0 ? Infinity : a.wins / a.losses;
            const rb = b.losses === 0 ? Infinity : b.wins / b.losses;
            return rb - ra;
          })
          .slice(0, 10);
      }

      setEntries(rows);
      setFetched(prev => new Set([...prev, tab]));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab, fetched]);

  return (
    <div className="mt-6 bg-gray-900/60 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-300">Leaderboard</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors
              ${tab === t.id
                ? 'text-white bg-white/5 border-b-2 border-teamA'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-800/60">
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">No data yet — be the first to play!</div>
        ) : (
          entries.map((entry, i) => (
            <div key={entry.uid} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`w-5 text-xs font-bold text-center shrink-0
                ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'}`}>
                {i + 1}
              </span>
              {entry.photoURL
                ? <img src={entry.photoURL} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                : <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">👤</div>
              }
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{entry.displayName}</div>
                {entry.username && (
                  <div className="text-xs text-gray-500">@{entry.username}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-white">{statValue(entry, tab)}</div>
                <div className="text-xs text-gray-500">{statLabel(tab)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
