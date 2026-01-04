import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconProblemBank } from '@/components/icons/problem/IconProblemBank';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { problemApi } from '@/services/problem.api';
import { useProblemStore } from '@/store/problemStore';

export function ProblemsPage() {
  const { t } = useTranslation();
  const { problemBanks, setProblemBanks, isLoading, setIsLoading } = useProblemStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProblemBanks = async () => {
      setIsLoading(true);
      try {
        const data = await problemApi.banks.list();
        setProblemBanks(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblemBanks();
  }, [setProblemBanks, setIsLoading, t]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('problem.title', 'Problem Banks')}</h1>
        <Link to="/problems/create">
          <Button>
            {t('problem.createBank', 'Create Problem Bank')}
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {problemBanks.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <IconProblemBank size={64} state="idle" className="mx-auto mb-4 opacity-50" />
          <p className="text-lg text-[var(--color-muted)]">
            {t('problem.empty', 'No problem banks yet')}
          </p>
          <Link to="/problems/create" className="mt-4 inline-block">
            <Button>{t('problem.createFirst', 'Create your first problem bank')}</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problemBanks.map((bank) => (
            <Link key={bank._id} to={`/problems/${bank._id}`}>
              <GlassCard className="h-full p-6 transition-transform hover:scale-[1.02]">
                <h3 className="mb-2 text-lg font-semibold">{bank.name}</h3>
                <p className="mb-4 line-clamp-2 text-sm text-[var(--color-muted)]">
                  {bank.description || t('problem.noDescription', 'No description')}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className={`rounded-full px-2 py-1 ${
                    bank.visibility === 'public' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                    bank.visibility === 'shared' ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]' :
                    'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                  }`}>
                    {t(`problem.visibility.${bank.visibility}`, bank.visibility)}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    {bank.problemCount} {t('problem.problems', 'problems')}
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
