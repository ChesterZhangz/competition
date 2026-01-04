import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { IconTimer } from '@/components/icons/competition/IconTimer';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';
import { competitionApi } from '@/services/competition.api';
import { useCompetitionStore } from '@/store/competitionStore';

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: string;
  mode: string;
  joinCode: string;
  status: string;
  currentQuestionIndex: number;
  participantCount: number;
  settings: {
    questionTimeLimit: number;
    basePoints: number;
    timeBonus: boolean;
    showLeaderboard: boolean;
    showCorrectAnswer: boolean;
  };
}

interface CompetitionQuestion {
  _id: string;
  problemId: string;
  order: number;
  timeLimit?: number;
  points?: number;
  status: string;
}

export function CompetitionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { removeCompetition } = useCompetitionStore();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [compData, questionsData] = await Promise.all([
          competitionApi.get(id),
          competitionApi.getQuestionsBasic(id),
        ]);
        setCompetition(compData);
        setQuestions(questionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, t]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await competitionApi.delete(id);
      removeCompetition(id);
      navigate('/competitions');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.deleteFailed', 'Failed to delete'));
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      case 'finished': return 'bg-[var(--color-secondary)] text-[var(--color-muted)]';
      case 'waiting': return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
      default: return 'bg-[var(--color-info-bg)] text-[var(--color-info)]';
    }
  };

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
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
          {error || t('error.notFound', 'Not found')}
        </div>
        <Button onClick={() => navigate('/competitions')}>
          {t('common.back', 'Back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{competition.name}</h1>
          {competition.description && (
            <p className="mt-2 text-[var(--color-muted)]">{competition.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(competition.status)}`}>
              {t(`competition.status.${competition.status}`, competition.status)}
            </span>
            <span className="rounded-full bg-[var(--color-primary)]/20 px-3 py-1 text-sm text-[var(--color-primary)]">
              {t(`competition.type.${competition.type}`, competition.type)}
            </span>
            <span className="rounded-full bg-[var(--color-muted)]/20 px-3 py-1 text-sm">
              {t(`competition.mode.${competition.mode}`, competition.mode)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {competition.status === 'draft' && (
            <>
              <Link to={`/competitions/${id}/edit`}>
                <Button variant="outline">{t('common.edit', 'Edit')}</Button>
              </Link>
              <Button
                variant="outline"
                className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t('common.delete', 'Delete')}
              </Button>
            </>
          )}
          {/* Preview button - always available for admins */}
          <Link to={`/competitions/${id}/preview`}>
            <Button variant="outline">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t('competition.previewButton', 'Preview')}
            </Button>
          </Link>
          {(competition.status === 'draft' || competition.status === 'waiting') && (
            <Link to={`/competitions/${id}/host`}>
              <Button>{t('competition.startHost', 'Start Hosting')}</Button>
            </Link>
          )}
          {competition.status === 'ongoing' && (
            <Link to={`/competitions/${id}/host`}>
              <Button>{t('competition.continueHost', 'Continue Hosting')}</Button>
            </Link>
          )}
          {competition.status === 'finished' && (
            <Link to={`/competitions/${id}/results`}>
              <Button>{t('competition.viewResults', 'View Results')}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Join Code */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.joinCode', 'Join Code')}</h2>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-[var(--color-card)] px-6 py-4 font-mono text-3xl font-bold tracking-widest">
            {competition.joinCode}
          </div>
          <div className="text-sm text-[var(--color-muted)]">
            <p>{t('competition.participantCount', 'Participants')}: {competition.participantCount}</p>
            <p className="mt-1">{t('competition.shareCode', 'Share this code with participants')}</p>
          </div>
        </div>
      </GlassCard>

      {/* Settings Overview */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.settingsTitle', 'Settings')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <IconTimer size={24} state="idle" className="text-[var(--color-primary)]" />
            <div>
              <p className="text-sm text-[var(--color-muted)]">{t('competition.timeLimit', 'Time Limit')}</p>
              <p className="font-medium">{competition.settings.questionTimeLimit}s</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IconTrophy size={24} state="idle" className="text-[var(--color-primary)]" />
            <div>
              <p className="text-sm text-[var(--color-muted)]">{t('competition.basePoints', 'Base Points')}</p>
              <p className="font-medium">{competition.settings.basePoints}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('competition.timeBonus', 'Time Bonus')}</p>
            <p className="font-medium">{competition.settings.timeBonus ? '✓' : '✗'}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('competition.showLeaderboard', 'Leaderboard')}</p>
            <p className="font-medium">{competition.settings.showLeaderboard ? '✓' : '✗'}</p>
          </div>
        </div>
      </GlassCard>

      {/* Questions */}
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t('competition.questions', 'Questions')} ({questions.length})
          </h2>
          {competition.status === 'draft' && (
            <Link to={`/competitions/${id}/edit`}>
              <Button variant="outline" size="sm">
                {t('competition.manageQuestions', 'Manage Questions')}
              </Button>
            </Link>
          )}
        </div>

        {questions.length === 0 ? (
          <p className="text-center text-[var(--color-muted)]">
            {t('competition.noQuestions', 'No questions added yet')}
          </p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, index) => (
              <div
                key={q._id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-card)] p-3"
              >
                <span className="font-medium">
                  {t('competition.question', 'Question')} #{index + 1}
                </span>
                <div className="flex items-center gap-4 text-sm text-[var(--color-muted)]">
                  <span>{q.timeLimit || competition.settings.questionTimeLimit}s</span>
                  <span>{q.points || competition.settings.basePoints} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <GlassCard className="mx-4 max-w-md p-6">
            <h3 className="mb-4 text-xl font-bold">
              {t('competition.deleteConfirm', 'Delete Competition?')}
            </h3>
            <p className="mb-6 text-[var(--color-muted)]">
              {t('competition.deleteWarning', 'This action cannot be undone.')}
            </p>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                className="bg-[var(--color-error)] hover:bg-[var(--color-error)]/80"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
