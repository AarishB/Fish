import type { TeamId } from 'shared';
import { WINNING_SETS } from 'shared';

interface TeamScorePanelProps {
  scores: Record<TeamId, number>;
  myTeamId?: TeamId;
}

export function TeamScorePanel({ scores, myTeamId }: TeamScorePanelProps) {
  return (
    <div className="flex gap-4 items-center">
      {(['A', 'B'] as TeamId[]).map(teamId => {
        const score = scores[teamId] ?? 0;
        const isMyTeam = myTeamId === teamId;
        return (
          <div
            key={teamId}
            className={`px-4 py-2 rounded-xl border font-bold text-center
              ${teamId === 'A'
                ? 'bg-teamA/20 border-teamA text-teamALight'
                : 'bg-teamB/20 border-teamB text-teamBLight'
              }
              ${isMyTeam ? 'ring-2 ring-white/30' : ''}
            `}
          >
            <div className="text-xs uppercase tracking-wide opacity-70">Team {teamId}</div>
            <div className="text-2xl font-bold font-card">{score}</div>
            <div className="text-xs opacity-60">/ {WINNING_SETS} to win</div>
          </div>
        );
      })}
    </div>
  );
}
