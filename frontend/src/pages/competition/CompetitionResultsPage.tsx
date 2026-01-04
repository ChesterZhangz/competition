import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';
import { competitionApi } from '@/services/competition.api';

interface Competition {
  _id: string;
  name: string;
  status: string;
  participantCount: number;
}

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  avatar?: string;
  totalScore: number;
  correctCount: number;
}

export function CompetitionResultsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [compData, leaderboardData] = await Promise.all([
          competitionApi.get(id),
          competitionApi.getLeaderboard(id, 100),
        ]);
        setCompetition(compData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, t]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
        <Link to="/competitions">
          <Button>{t('common.back', 'Back')}</Button>
        </Link>
      </div>
    );
  }

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-slate-400';
      case 3: return 'text-orange-500';
      default: return 'text-[var(--color-muted)]';
    }
  };

  const getRowStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10';
      case 2: return 'bg-gradient-to-r from-slate-400/20 to-slate-500/10';
      case 3: return 'bg-gradient-to-r from-orange-500/20 to-orange-600/10';
      default: return 'bg-[var(--color-card)]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('competition.results', 'Results')}</h1>
          <p className="text-[var(--color-muted)]">{competition.name}</p>
        </div>
        <Link to={`/competitions/${id}`}>
          <Button variant="outline">{t('common.back', 'Back')}</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <GlassCard className="p-6 text-center">
          <p className="text-[var(--color-muted)]">{t('competition.totalParticipants', 'Total Participants')}</p>
          <p className="text-4xl font-bold">{competition.participantCount}</p>
        </GlassCard>
        {leaderboard[0] && (
          <GlassCard className="p-6 text-center">
            <p className="text-[var(--color-muted)]">{t('competition.highestScore', 'Highest Score')}</p>
            <p className="text-4xl font-bold text-[var(--color-primary)]">{leaderboard[0].totalScore}</p>
          </GlassCard>
        )}
        {leaderboard[0] && (
          <GlassCard className="p-6 text-center">
            <p className="text-[var(--color-muted)]">{t('competition.winner', 'Winner')}</p>
            <p className="text-2xl font-bold">{leaderboard[0].nickname}</p>
          </GlassCard>
        )}
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <GlassCard className="p-8">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="mb-2 h-16 w-16 rounded-full bg-slate-400/30 flex items-center justify-center text-2xl font-bold">
                {leaderboard[1].nickname.charAt(0)}
              </div>
              <p className="font-medium">{leaderboard[1].nickname}</p>
              <p className="text-lg font-bold text-slate-400">{leaderboard[1].totalScore}</p>
              <div className="mt-2 h-24 w-24 rounded-t-lg bg-slate-400/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-400">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <IconTrophy size={32} state="active" className="mb-2 text-yellow-400" />
              <div className="mb-2 h-20 w-20 rounded-full bg-yellow-500/30 flex items-center justify-center text-3xl font-bold">
                {leaderboard[0].nickname.charAt(0)}
              </div>
              <p className="font-medium">{leaderboard[0].nickname}</p>
              <p className="text-xl font-bold text-yellow-400">{leaderboard[0].totalScore}</p>
              <div className="mt-2 h-32 w-28 rounded-t-lg bg-yellow-500/30 flex items-center justify-center">
                <span className="text-4xl font-bold text-yellow-400">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="mb-2 h-16 w-16 rounded-full bg-orange-500/30 flex items-center justify-center text-2xl font-bold">
                {leaderboard[2].nickname.charAt(0)}
              </div>
              <p className="font-medium">{leaderboard[2].nickname}</p>
              <p className="text-lg font-bold text-orange-400">{leaderboard[2].totalScore}</p>
              <div className="mt-2 h-16 w-24 rounded-t-lg bg-orange-500/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-orange-400">3</span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Full Leaderboard */}
      <GlassCard className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <IconTrophy size={24} state="idle" />
          {t('competition.fullLeaderboard', 'Full Leaderboard')}
        </h2>

        {leaderboard.length === 0 ? (
          <p className="text-center text-[var(--color-muted)]">
            {t('competition.noResults', 'No results yet')}
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-[var(--color-muted)]">
              <div className="col-span-1">{t('competition.rank', 'Rank')}</div>
              <div className="col-span-5">{t('competition.participant', 'Participant')}</div>
              <div className="col-span-3 text-right">{t('competition.correct', 'Correct')}</div>
              <div className="col-span-3 text-right">{t('competition.score', 'Score')}</div>
            </div>

            {/* Rows */}
            {leaderboard.map((entry) => (
              <div
                key={entry.participantId}
                className={`grid grid-cols-12 gap-4 rounded-lg px-4 py-3 ${getRowStyle(entry.rank)}`}
              >
                <div className={`col-span-1 font-bold ${getMedalColor(entry.rank)}`}>
                  #{entry.rank}
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-medium">
                    {entry.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span>{entry.nickname}</span>
                </div>
                <div className="col-span-3 text-right text-[var(--color-muted)]">
                  {entry.correctCount}
                </div>
                <div className="col-span-3 text-right font-bold">
                  {entry.totalScore}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
