import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

export type TeamRole = 'viewer' | 'submitter' | 'both';

export interface TeamMember {
  participantId: string;
  nickname: string;
  avatar?: string;
  role: TeamRole;
  isOnline: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  captainId: string;
  members: TeamMember[];
  memberCount: number;
  maxSize: number;
}

interface TeamFormationProps {
  teams: Team[];
  myTeam: Team | null;
  myParticipantId: string;
  roleMode: 'all_equal' | 'single_submit' | 'split_view';
  allowTeamFormation: boolean;
  isOnsiteMode?: boolean;
  onCreateTeam: (name: string, color: string) => void;
  onJoinTeam: (teamId: string, role?: TeamRole) => void;
  onLeaveTeam: () => void;
  onUpdateRole: (participantId: string, role: TeamRole) => void;
  onKickMember?: (participantId: string) => void;
  onTransferCaptain?: (participantId: string) => void;
}

const TEAM_COLORS = [
  '#2cb1bc', '#f56565', '#48bb78', '#ed8936',
  '#9f7aea', '#4299e1', '#ed64a6', '#ecc94b',
];

export function TeamFormation({
  teams,
  myTeam,
  myParticipantId,
  roleMode,
  allowTeamFormation,
  isOnsiteMode = false,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onUpdateRole,
  onKickMember,
  onTransferCaptain,
}: TeamFormationProps) {
  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [selectedRole, setSelectedRole] = useState<TeamRole>('both');
  const [showKickConfirm, setShowKickConfirm] = useState<string | null>(null);

  const handleCreateTeam = () => {
    if (teamName.trim()) {
      onCreateTeam(teamName.trim(), selectedColor);
      setTeamName('');
      setShowCreateForm(false);
    }
  };

  const handleKickMember = (participantId: string) => {
    if (onKickMember) {
      onKickMember(participantId);
      setShowKickConfirm(null);
    }
  };

  const handleTransferCaptain = (participantId: string) => {
    if (onTransferCaptain) {
      onTransferCaptain(participantId);
    }
  };

  const isCaptain = myTeam && myTeam.captainId === myParticipantId;

  // If already in a team, show team details
  if (myTeam) {
    return (
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: myTeam.color }}
            />
            <div>
              <h3 className="font-semibold">{myTeam.name}</h3>
              <p className="text-sm text-[var(--color-muted)]">
                {myTeam.memberCount} / {myTeam.maxSize} {t('competition.members', 'members')}
              </p>
            </div>
          </div>
          {isCaptain && (
            <span className="rounded bg-[var(--color-primary)]/20 px-2 py-1 text-xs text-[var(--color-primary)]">
              {t('competition.captain', 'Captain')}
            </span>
          )}
        </div>

        {/* Team Members */}
        <div className="mb-4 space-y-2">
          {myTeam.members.map((member) => (
            <div
              key={member.participantId}
              className={cn(
                'flex items-center justify-between rounded-lg p-3',
                member.isOnline ? 'bg-[var(--color-card)]' : 'bg-[var(--color-card)]/50 opacity-60'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
                <span>{member.nickname}</span>
                {member.participantId === myTeam.captainId && (
                  <span className="text-xs text-[var(--color-primary)]">({t('competition.captain', 'Captain')})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Role selector (for captain in non-all_equal modes) */}
                {roleMode !== 'all_equal' && (
                  <>
                    {isCaptain && member.participantId !== myParticipantId ? (
                      <select
                        value={member.role}
                        onChange={(e) => onUpdateRole(member.participantId, e.target.value as TeamRole)}
                        className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                      >
                        <option value="viewer">{t('competition.role.viewer', 'Viewer')}</option>
                        <option value="submitter">{t('competition.role.submitter', 'Submitter')}</option>
                        <option value="both">{t('competition.role.both', 'Both')}</option>
                      </select>
                    ) : (
                      <span className="rounded bg-[var(--color-muted)]/20 px-2 py-1 text-xs">
                        {member.role === 'viewer' && t('competition.role.viewer', 'Viewer')}
                        {member.role === 'submitter' && t('competition.role.submitter', 'Submitter')}
                        {member.role === 'both' && t('competition.role.both', 'Both')}
                      </span>
                    )}
                  </>
                )}

                {/* Captain actions - kick or transfer */}
                {isCaptain && member.participantId !== myParticipantId && (
                  <div className="flex items-center gap-1">
                    {/* Transfer captain button */}
                    <button
                      onClick={() => handleTransferCaptain(member.participantId)}
                      className="rounded p-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-primary)]"
                      title={t('competition.transferCaptain', 'Transfer Captain')}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </button>

                    {/* Kick button */}
                    {showKickConfirm === member.participantId ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleKickMember(member.participantId)}
                          className="rounded bg-[var(--color-error)] px-2 py-1 text-xs text-white"
                        >
                          {t('common.confirm', 'Confirm')}
                        </button>
                        <button
                          onClick={() => setShowKickConfirm(null)}
                          className="rounded bg-[var(--color-muted)]/30 px-2 py-1 text-xs"
                        >
                          {t('common.cancel', 'Cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowKickConfirm(member.participantId)}
                        className="rounded p-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-error)]/20 hover:text-[var(--color-error)]"
                        title={t('competition.kickMember', 'Kick')}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* On-site mode notice */}
        {isOnsiteMode && (
          <div className="mb-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-400">
            <strong>{t('competition.onsiteMode', 'On-Site Mode')}:</strong>{' '}
            {t('competition.onsiteTeamNotice', 'Questions will be shown on the host screen. Watch the display to participate!')}
          </div>
        )}

        {/* Role explanation for split_view mode */}
        {roleMode === 'split_view' && (
          <div className="mb-4 rounded-lg bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning)]">
            <strong>{t('competition.splitViewMode', 'Split View Mode')}:</strong>{' '}
            {t('competition.splitViewExplanation', 'One member sees the question, another submits the answer.')}
          </div>
        )}

        <Button variant="outline" onClick={onLeaveTeam} className="w-full">
          {t('competition.leaveTeam', 'Leave Team')}
        </Button>
      </GlassCard>
    );
  }

  // Not in a team - show team list and create option
  return (
    <div className="space-y-4">
      {/* On-site mode info */}
      {isOnsiteMode && (
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-500/20 p-2">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-400">{t('competition.onsiteTeamMode', 'On-Site Team Mode')}</h4>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {t('competition.onsiteTeamModeDesc', 'Enter your team name to join. If a team with this name exists, you\'ll automatically join. Otherwise, you\'ll create a new team and become the captain.')}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Create Team */}
      {allowTeamFormation && (
        <GlassCard className="p-4">
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} className="w-full">
              {t('competition.createTeam', 'Create Team')}
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold">{t('competition.createTeam', 'Create Team')}</h3>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t('competition.teamName', 'Team name')}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2"
                maxLength={30}
              />
              <div>
                <p className="mb-2 text-sm text-[var(--color-muted)]">
                  {t('competition.teamColor', 'Team Color')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'h-8 w-8 rounded-lg transition-transform',
                        selectedColor === color && 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[var(--color-background)]'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateTeam} disabled={!teamName.trim()}>
                  {t('common.create', 'Create')}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Available Teams */}
      <GlassCard className="p-4">
        <h3 className="mb-4 font-semibold">{t('competition.availableTeams', 'Available Teams')}</h3>
        {teams.length === 0 ? (
          <p className="text-center text-[var(--color-muted)]">
            {t('competition.noTeamsYet', 'No teams created yet')}
          </p>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {team.memberCount} / {team.maxSize} {t('competition.members', 'members')}
                    </p>
                  </div>
                </div>
                {team.memberCount < team.maxSize ? (
                  <div className="flex items-center gap-2">
                    {roleMode !== 'all_equal' && (
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as TeamRole)}
                        className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                      >
                        <option value="viewer">{t('competition.role.viewer', 'Viewer')}</option>
                        <option value="submitter">{t('competition.role.submitter', 'Submitter')}</option>
                        <option value="both">{t('competition.role.both', 'Both')}</option>
                      </select>
                    )}
                    <Button
                      size="sm"
                      onClick={() => onJoinTeam(team.id, roleMode !== 'all_equal' ? selectedRole : undefined)}
                    >
                      {t('competition.join', 'Join')}
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">
                    {t('competition.teamFull', 'Full')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
