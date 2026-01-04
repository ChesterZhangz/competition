import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconCompetition } from '@/components/icons/competition/IconCompetition';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { competitionApi } from '@/services/competition.api';
import { useCompetitionStore } from '@/store/competitionStore';

export function CompetitionsPage() {
  const { t } = useTranslation();
  const { competitions, setCompetitions, competitionsLoading, setCompetitionsLoading } = useCompetitionStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompetitions = async () => {
      setCompetitionsLoading(true);
      try {
        const data = await competitionApi.list();
        setCompetitions(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setCompetitionsLoading(false);
      }
    };

    fetchCompetitions();
  }, [setCompetitions, setCompetitionsLoading, t]);

  if (competitionsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('competition.title', 'Competitions')}</h1>
        <div className="flex gap-2">
          <Link to="/competitions/tutorial">
            <Button variant="outline">
              {t('competition.tutorial.button', 'Tutorial')}
            </Button>
          </Link>
          <Link to="/competitions/create">
            <Button>
              {t('competition.create', 'Create Competition')}
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {competitions.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <IconCompetition size={64} state="idle" className="mx-auto mb-4 opacity-50" />
          <p className="text-lg text-[var(--color-muted)]">
            {t('competition.empty', 'No competitions yet')}
          </p>
          <Link to="/competitions/create" className="mt-4 inline-block">
            <Button>{t('competition.createFirst', 'Create your first competition')}</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <Link key={competition._id} to={`/competitions/${competition._id}`}>
              <GlassCard className="h-full p-6 transition-transform hover:scale-[1.02]">
                <h3 className="mb-2 text-lg font-semibold">{competition.name}</h3>
                <p className="mb-4 line-clamp-2 text-sm text-[var(--color-muted)]">
                  {competition.description || t('competition.noDescription', 'No description')}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className={`rounded-full px-2 py-1 ${
                    competition.status === 'ongoing' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                    competition.status === 'finished' ? 'bg-[var(--color-secondary)] text-[var(--color-muted)]' :
                    'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                  }`}>
                    {t(`competition.status.${competition.status}`, competition.status)}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    {competition.participantCount} {t('competition.participants', 'participants')}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
