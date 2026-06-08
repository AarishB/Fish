import { useState, useEffect, useCallback } from 'react';
import type { RoomSummary } from 'shared';
import { socket } from '../../socket';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '😌 Easy',
  normal: '🧠 Normal',
  hard: '🔥 Hard',
  hidden_deck: '🃏 Hidden',
};

interface Props {
  onJoin: (roomCode: string) => void;
  playerName: string;
}

export function BrowseRoomsPanel({ onJoin, playerName }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    socket.emit('list_rooms');
  }, []);

  useEffect(() => {
    function handleList({ rooms: r }: { rooms: RoomSummary[] }) {
      setRooms(r);
      setLoading(false);
    }
    socket.on('rooms_list', handleList);
    refresh();
    return () => { socket.off('rooms_list', handleList); };
  }, [refresh]);

  const filtered = rooms.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.roomCode.toLowerCase().includes(q) ||
      (r.roomName ?? '').toLowerCase().includes(q) ||
      r.hostName.toLowerCase().includes(q) ||
      (r.hostUsername ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by room name or @handle…"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white
            placeholder-gray-500 focus:outline-none focus:border-teamA transition-colors text-sm"
        />
        <button
          type="button"
          onClick={refresh}
          className="px-3 py-2 rounded-xl border border-gray-600 text-gray-400
            hover:border-gray-400 hover:text-white transition-colors text-sm"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-700 divide-y divide-gray-800">
        {loading ? (
          <div className="py-6 text-center text-gray-500 text-sm animate-pulse">Loading rooms…</div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-gray-600 text-sm">
            {rooms.length === 0 ? 'No open rooms right now.' : 'No rooms match your search.'}
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.roomCode} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors">
              {r.hostPhotoURL
                ? <img src={r.hostPhotoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                : <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm shrink-0">👤</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white text-sm font-semibold truncate">
                    {r.roomName ?? r.roomCode}
                  </span>
                  {r.roomName && (
                    <span className="font-mono text-xs text-gray-500">{r.roomCode}</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                    ${r.isFull ? 'bg-red-900/40 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                    {r.playerCount}/{r.maxPlayers}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {r.hostUsername ? `@${r.hostUsername}` : r.hostName} · {DIFFICULTY_LABELS[r.difficulty] ?? r.difficulty}
                </div>
              </div>
              <button
                type="button"
                disabled={r.isFull || !playerName.trim()}
                onClick={() => onJoin(r.roomCode)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-teamA/20 border border-teamA/60 text-teamALight
                  hover:bg-teamA/30 enabled:active:scale-95"
              >
                Join
              </button>
            </div>
          ))
        )}
      </div>
      {!playerName.trim() && (
        <p className="text-xs text-amber-400/70">Enter your name above to join a room.</p>
      )}
    </div>
  );
}
