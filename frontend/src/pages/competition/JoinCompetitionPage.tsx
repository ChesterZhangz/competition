import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { competitionApi } from '@/services/competition.api';
import { connectToCompetition } from '@/services/socket';

type CompetitionMode = 'onsite' | 'online';
type ParticipantMode = 'individual' | 'team';

interface CompetitionInfo {
  id: string;
  name: string;
  mode: CompetitionMode;
  participantMode: ParticipantMode;
  status: string;
  teamSettings?: {
    enabled: boolean;
    teamSize: number;
    minTeamSize: number;
  };
}

const TEAM_COLORS = [
  '#2cb1bc', '#f56565', '#48bb78', '#ed8936',
  '#9f7aea', '#4299e1', '#ed64a6', '#ecc94b',
];

export function JoinCompetitionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Basic state
  const [joinCode, setJoinCode] = useState(searchParams.get('code') || '');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // Competition info
  const [competitionInfo, setCompetitionInfo] = useState<CompetitionInfo | null>(null);

  // Team mode state
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);

  // Fetch competition info when join code changes
  useEffect(() => {
    const fetchCompetitionInfo = async () => {
      if (joinCode.length !== 6) {
        setCompetitionInfo(null);
        return;
      }

      setIsLoadingInfo(true);
      setError('');
      try {
        const info = await competitionApi.getByJoinCode(joinCode.toUpperCase());
        setCompetitionInfo({
          id: info.id,
          name: info.name,
          mode: (info.mode as CompetitionMode) || 'online',
          participantMode: (info.participantMode as ParticipantMode) || 'individual',
          status: info.status,
          teamSettings: info.settings?.teamSettings,
        });
      } catch {
        setCompetitionInfo(null);
        // Don't show error for invalid codes yet
      } finally {
        setIsLoadingInfo(false);
      }
    };

    const debounceTimer = setTimeout(fetchCompetitionInfo, 500);
    return () => clearTimeout(debounceTimer);
  }, [joinCode]);

  const isTeamMode = competitionInfo?.participantMode === 'team';
  const isOnsiteMode = competitionInfo?.mode === 'onsite';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsJoining(true);

    try {
      // For team mode in on-site, we use team name as the identifier
      const joinData = {
        joinCode: joinCode.toUpperCase(),
        nickname,
        teamName: isTeamMode ? teamName : undefined,
        teamColor: isTeamMode ? selectedColor : undefined,
      };

      const { competitionId } = await connectToCompetition(
        joinData.joinCode,
        joinData.nickname,
        isTeamMode ? { teamName: joinData.teamName!, teamColor: joinData.teamColor! } : undefined
      );
      navigate(`/competitions/${competitionId}/play`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('competition.joinFailed', 'Failed to join'));
      setIsJoining(false);
    }
  };

  const canSubmit = () => {
    if (!joinCode || joinCode.length !== 6) return false;
    if (!nickname.trim()) return false;
    if (isTeamMode && !teamName.trim()) return false;
    return true;
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">
          {t('competition.join', 'Join Competition')}
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-[var(--color-error-bg)] p-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Join Code */}
          <div>
            <label htmlFor="joinCode" className="mb-1 block text-sm font-medium">
              {t('competition.joinCode', 'Join Code')}
            </label>
            <Input
              id="joinCode"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              required
            />
            {isLoadingInfo && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t('common.loading', 'Loading...')}
              </p>
            )}
          </div>

          {/* Competition Info Preview */}
          {competitionInfo && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/50 p-4">
              <h3 className="font-medium">{competitionInfo.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  isOnsiteMode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                )}>
                  {isOnsiteMode
                    ? t('competition.mode.onsite', 'On-Site')
                    : t('competition.mode.online', 'Online')}
                </span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  isTeamMode ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                )}>
                  {isTeamMode
                    ? t('competition.participantMode.team', 'Team')
                    : t('competition.participantMode.individual', 'Individual')}
                </span>
              </div>
              {isOnsiteMode && (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {t('competition.onsiteJoinHint', 'Questions will be displayed on the host screen.')}
                </p>
              )}
            </div>
          )}

          {/* Nickname */}
          <div>
            <label htmlFor="nickname" className="mb-1 block text-sm font-medium">
              {t('competition.nickname', 'Your Nickname')}
            </label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('competition.nicknamePlaceholder', 'Enter your nickname')}
              maxLength={20}
              required
            />
          </div>

          {/* Team Mode Fields */}
          {isTeamMode && (
            <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/30 p-4">
              <div>
                <label htmlFor="teamName" className="mb-1 block text-sm font-medium">
                  {t('competition.teamNameToJoin', 'Team Name')}
                  <span className="ml-1 text-[var(--color-primary)]">*</span>
                </label>
                <Input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={t('competition.teamNamePlaceholder', 'Enter team name')}
                  maxLength={30}
                  required
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {t('competition.teamAutoMatchHint', 'If a team with this name exists, you will automatically join it. Otherwise, a new team will be created and you will be the captain.')}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('competition.teamColorIfNew', 'Team Color (if creating new team)')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
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
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isJoining || !canSubmit()}
          >
            {isJoining ? t('competition.joining', 'Joining...') : t('competition.joinNow', 'Join Now')}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
