import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { socket } from '../socket';
import { Button } from '../components/ui/Button';
import type { LobbySlot, TeamId } from 'shared';

// ─── helpers ───────────────────────────────────────────────────────────

function slotBorderBg(slot: LobbySlot, isSelf: boolean): string {
  if (slot.status === 'empty') return 'border-dashed border-gray-600 bg-gray-800/40';
  if (slot.status === 'bot') return 'border-gray-600 bg-gray-800';
  if (isSelf) return 'border-white/20 bg-white/5';
  return 'border-gray-500 bg-gray-800';
}

function avatarClass(slot: LobbySlot, isSelf: boolean): string {
  if (slot.status === 'empty') return 'bg-gray-700 text-gray-500';
  if (slot.status === 'bot') return 'bg-gray-700 text-gray-300';
  if (isSelf) return 'bg-white/20 text-white';
  return 'bg-white/10 text-white';
}

function avatarLabel(slot: LobbySlot): string {
  if (slot.status === 'empty') return '?';
  if (slot.status === 'bot') return '🤖';
  return (slot.playerName ?? '?').slice(0, 2).toUpperCase();
}

// ─── SlotRow ───────────────────────────────────────────────────────────

interface SlotRowProps {
  slot: LobbySlot;
  myPlayerId: string | null;
  myTeam: TeamId | null;
  isHost: boolean;
  kickVoteInfo?: { votes: number; needed: number; voterIds: string[] };
  switchVoteInfo?: { votes: number; needed: number; voterIds: string[] };
  alreadySwapRequested: boolean;
  onAddBot: (i: number) => void;
  onRemoveBot: (i: number) => void;
  onKick: (id: string) => void;
  onVoteKick: (id: string) => void;
  onUnvoteKick: (id: string) => void;
  onRequestSwap: (id: string) => void;
  onVoteTeamSwitch: (id: string) => void;
  onUnvoteTeamSwitch: (id: string) => void;
  onRenameSelf: (newName: string) => void;
}

function SlotRow({
  slot, myPlayerId, myTeam, isHost,
  kickVoteInfo, switchVoteInfo, alreadySwapRequested,
  onAddBot, onRemoveBot, onKick, onVoteKick, onUnvoteKick, onRequestSwap, onVoteTeamSwitch, onUnvoteTeamSwitch, onRenameSelf,
}: Readonly<SlotRowProps>) {
  const isSelf = slot.playerId === myPlayerId;
  const isOtherHuman = slot.status === 'human' && !isSelf;
  const isOnOtherTeam = slot.teamId !== myTeam;
  const hasKickVoted = kickVoteInfo?.voterIds.includes(myPlayerId ?? '') ?? false;
  const hasSwitchVoted = switchVoteInfo?.voterIds.includes(myPlayerId ?? '') ?? false;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  function confirmRename() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== slot.playerName) onRenameSelf(trimmed);
    setIsEditingName(false);
  }

  // Pre-compute name element to avoid nested ternaries in JSX
  let nameEl: React.ReactNode;
  if (slot.status === 'empty') {
    nameEl = <span className="text-gray-500 italic">Empty seat</span>;
  } else if (slot.status === 'bot') {
    nameEl = <span className="text-gray-300">{slot.playerName}</span>;
  } else if (isSelf && isEditingName) {
    nameEl = (
      <input
        autoFocus
        value={nameDraft}
        onChange={e => setNameDraft(e.target.value)}
        onBlur={confirmRename}
        onKeyDown={e => {
          if (e.key === 'Enter') confirmRename();
          else if (e.key === 'Escape') setIsEditingName(false);
        }}
        maxLength={24}
        className="bg-gray-900 border border-blue-400 rounded px-2 py-0.5 outline-none text-white font-semibold text-sm w-32"
      />
    );
  } else if (isSelf) {
    nameEl = (
      <button
        type="button"
        className="flex items-center gap-1.5 bg-transparent border border-gray-600 hover:border-gray-400 rounded px-2 py-0.5 cursor-text transition-colors text-sm"
        onClick={() => { setNameDraft(slot.playerName ?? ''); setIsEditingName(true); }}
        title="Click to rename"
      >
        <span className="text-white font-semibold">{slot.playerName}</span>
        <span className="text-gray-500 text-xs">(you)</span>
      </button>
    );
  } else {
    nameEl = <span className="text-gray-100 text-sm font-semibold">{slot.playerName}</span>;
  }

  return (
    <motion.div
      key={slot.seatIndex}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border p-3.5 ${slotBorderBg(slot, isSelf)}`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Avatar + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${avatarClass(slot, isSelf)}`}>
            {avatarLabel(slot)}
          </div>
          <div className="min-w-0">
            <div className="truncate">
              {nameEl}
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {kickVoteInfo && (
                <span className="text-yellow-400 text-xs">👎 {kickVoteInfo.votes}/{kickVoteInfo.needed} to kick</span>
              )}
              {switchVoteInfo && (
                <span className="text-blue-400 text-xs">🔄 {switchVoteInfo.votes}/{switchVoteInfo.needed} to move</span>
              )}
              {alreadySwapRequested && (
                <span className="text-yellow-600 text-xs">⏳ Swap request sent</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 shrink-0 items-end">
          {isHost && slot.status === 'empty' && (
            <Button variant="secondary" size="sm" onClick={() => onAddBot(slot.seatIndex)}>+ Bot</Button>
          )}
          {isHost && slot.status === 'bot' && (
            <Button variant="ghost" size="sm" onClick={() => onRemoveBot(slot.seatIndex)}>Remove</Button>
          )}
          {isOnOtherTeam && isOtherHuman && (
            <Button
              variant="ghost" size="sm"
              disabled={alreadySwapRequested}
              onClick={() => onRequestSwap(slot.playerId!)}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              🔄 Swap
            </Button>
          )}
          {isOtherHuman && (
            <Button
              variant="ghost" size="sm"
              onClick={() => hasSwitchVoted ? onUnvoteTeamSwitch(slot.playerId!) : onVoteTeamSwitch(slot.playerId!)}
              className={hasSwitchVoted ? 'text-purple-300 hover:text-gray-400 text-xs' : 'text-purple-400 hover:text-purple-300 text-xs'}
            >
              {hasSwitchVoted
                ? `🗳️ ${switchVoteInfo?.votes ?? 1}/${switchVoteInfo?.needed ?? '?'} ✕`
                : '🗳️ Move'}
            </Button>
          )}
          {isHost && isOtherHuman && (
            <Button
              variant="ghost" size="sm"
              onClick={() => onKick(slot.playerId!)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Kick
            </Button>
          )}
          {!isHost && isOtherHuman && (
            <Button
              variant="ghost" size="sm"
              onClick={() => hasKickVoted ? onUnvoteKick(slot.playerId!) : onVoteKick(slot.playerId!)}
              className={hasKickVoted ? 'text-red-300 hover:text-gray-400 text-xs' : 'text-red-400 hover:text-red-300 text-xs'}
            >
              {hasKickVoted
                ? `👎 ${kickVoteInfo?.votes ?? 1}/${kickVoteInfo?.needed ?? '?'} ✕`
                : '👎 Kick'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── LobbyPage ─────────────────────────────────────────────────────────

export default function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const lobby = useGameStore(s => s.lobby);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const kickVotes = useGameStore(s => s.kickVotes);
  const teamSwitchVotes = useGameStore(s => s.teamSwitchVotes);
  const pendingSwapRequest = useGameStore(s => s.pendingSwapRequest);
  const setPendingSwapRequest = useGameStore(s => s.setPendingSwapRequest);

  const [editingTeam, setEditingTeam] = useState<TeamId | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');

  if (!lobby || !roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">🃏</div>
          <p className="text-gray-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  const isHost = lobby.hostId === myPlayerId;
  const mySlot = lobby.slots.find(s => s.playerId === myPlayerId);
  const myTeam: TeamId | null = mySlot?.teamId ?? null;

  function hasEmptySlot(teamId: TeamId) {
    return lobby?.slots.some(s => s.teamId === teamId && s.status === 'empty') ?? false;
  }

  function handleAddBot(seatIndex: number) { socket.emit('add_bot', { roomCode, seatIndex }); }
  function handleRemoveBot(seatIndex: number) { socket.emit('remove_bot', { roomCode, seatIndex }); }
  function handleStartGame() { socket.emit('start_game', { roomCode }); }
  function handleCopyCode() { navigator.clipboard.writeText(roomCode ?? ''); }
  function handleKick(id: string) { socket.emit('kick_player', { roomCode, targetPlayerId: id }); }
  function handleVoteKick(id: string) { socket.emit('vote_kick', { roomCode, targetPlayerId: id }); }
  function handleUnvoteKick(id: string) { socket.emit('unvote_kick', { roomCode, targetPlayerId: id }); }
  function handleSwitchTeam() { socket.emit('switch_team', { roomCode }); }
  function handleRequestSwap(id: string) { socket.emit('request_swap', { roomCode, targetPlayerId: id }); }
  function handleRespondSwap(requestId: string, accept: boolean) {
    socket.emit('respond_swap', { roomCode, requestId, accept });
    setPendingSwapRequest(null);
  }
  function handleVoteTeamSwitch(id: string) { socket.emit('vote_team_switch', { roomCode, targetPlayerId: id }); }
  function handleUnvoteTeamSwitch(id: string) { socket.emit('unvote_team_switch', { roomCode, targetPlayerId: id }); }
  function handleRenameSelf(newName: string) { socket.emit('rename_self', { roomCode, newName }); }
  function handleLeaveLobby() { socket.emit('leave_lobby', { roomCode }); }
  function handleRenameTeam(teamId: TeamId) {
    if (teamNameDraft.trim()) socket.emit('rename_team', { roomCode, teamId, newName: teamNameDraft.trim() });
    setEditingTeam(null);
  }

  const teams: TeamId[] = ['A', 'B'];

  return (
    <div className="min-h-screen bg-feltDark flex flex-col items-center justify-center p-6">
      {/* Swap request banner */}
      <AnimatePresence>
        {pendingSwapRequest && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-yellow-950/95 border border-yellow-500 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl"
          >
            <span className="text-yellow-200 font-semibold">
              🔄 <span className="text-yellow-300">{pendingSwapRequest.requesterName}</span> wants to swap teams with you!
            </span>
            <Button variant="gold" size="sm" onClick={() => handleRespondSwap(pendingSwapRequest.requestId, true)}>
              Accept
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleRespondSwap(pendingSwapRequest.requestId, false)}>
              Decline
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-card text-white mb-3">Lobby</h1>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-gray-900 border border-gray-600 rounded-2xl px-6 py-2">
              <span className="text-gray-400 text-sm mr-2">Room Code:</span>
              <span className="font-mono text-2xl font-bold text-white tracking-widest">{roomCode}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyCode}>📋 Copy</Button>
          </div>
          {!isHost && (
            <p className="text-gray-500 text-sm mt-2">Waiting for the host to start the game...</p>
          )}
        </div>

        {/* Team Columns */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {teams.map(team => {
            const slots = lobby.slots.filter(s => s.teamId === team);
            const isMyTeam = myTeam === team;
            const canSwitch = !isMyTeam && mySlot != null && hasEmptySlot(team);
            const colorClass = team === 'A' ? 'text-teamALight' : 'text-teamBLight';
            const borderClass = team === 'A' ? 'border-teamA' : 'border-teamB';
            const teamName = lobby.teamNames[team];
            const isEditingThis = editingTeam === team;

            // Compute team name element ahead of JSX to avoid nested ternary
            let teamNameEl: React.ReactNode;
            if (isEditingThis) {
              teamNameEl = (
                <input
                  autoFocus
                  value={teamNameDraft}
                  onChange={e => setTeamNameDraft(e.target.value)}
                  onBlur={() => handleRenameTeam(team)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameTeam(team);
                    else if (e.key === 'Escape') setEditingTeam(null);
                  }}
                  maxLength={24}
                  className={`bg-gray-800 border border-blue-400 rounded px-2 py-0.5 outline-none font-bold text-lg ${colorClass} w-36`}
                />
              );
            } else {
              teamNameEl = (
                <button
                  type="button"
                  className={`font-bold text-lg ${colorClass} hover:opacity-70 transition-opacity flex items-center gap-1.5 bg-transparent border border-gray-600 hover:border-gray-400 rounded px-2 py-0.5 cursor-text`}
                  onClick={() => { setEditingTeam(team); setTeamNameDraft(teamName); }}
                  title="Click to rename"
                >
                  {teamName}
                  <span className="text-gray-500 text-sm">✏️</span>
                </button>
              );
            }

            return (
              <div key={team} className={`bg-gray-900 border-2 ${borderClass} rounded-2xl p-5`}>
                {/* Team header */}
                <div className="flex items-center justify-between mb-5 min-h-[2rem]">
                  {teamNameEl}
                  {canSwitch && (
                    <Button variant="secondary" size="sm" onClick={handleSwitchTeam}>
                      Join {teamName}
                    </Button>
                  )}
                  {isMyTeam && (
                    <span className="text-xs text-gray-500 italic">Your team</span>
                  )}
                </div>

                {/* Player rows */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {slots.map(slot => (
                      <SlotRow
                        key={slot.seatIndex}
                        slot={slot}
                        myPlayerId={myPlayerId}
                        myTeam={myTeam}
                        isHost={isHost}
                        kickVoteInfo={slot.playerId ? kickVotes[slot.playerId] : undefined}
                        switchVoteInfo={slot.playerId ? teamSwitchVotes[slot.playerId] : undefined}
                        alreadySwapRequested={lobby.swapRequests.some(
                          r => r.requesterId === myPlayerId && r.targetId === slot.playerId
                        )}
                        onAddBot={handleAddBot}
                        onRemoveBot={handleRemoveBot}
                        onKick={handleKick}
                        onVoteKick={handleVoteKick}
                        onUnvoteKick={handleUnvoteKick}
                        onRequestSwap={handleRequestSwap}
                        onVoteTeamSwitch={handleVoteTeamSwitch}
                        onUnvoteTeamSwitch={handleUnvoteTeamSwitch}
                        onRenameSelf={handleRenameSelf}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost" size="sm"
            onClick={handleLeaveLobby}
            className="text-red-400 hover:text-red-300 shrink-0"
          >
            🚪 Leave Room
          </Button>
          {isHost && (
            <div className="flex flex-col items-center flex-1 gap-2">
              <Button
                variant="gold" size="lg"
                onClick={handleStartGame}
                disabled={!lobby.isStartable}
                className="w-full max-w-xs"
              >
                {lobby.isStartable ? '🚀 Start Game' : '⏳ Fill all seats first'}
              </Button>
              {!lobby.isStartable && (
                <p className="text-gray-500 text-xs">Add bots to empty seats or wait for players to join.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
