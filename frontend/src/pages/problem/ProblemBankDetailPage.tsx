import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { problemApi } from '@/services/problem.api';
import { useProblemStore } from '@/store/problemStore';

interface Problem {
  _id: string;
  type: string;
  difficulty: string;
  content: string;
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer?: string | string[];
  answerExplanation?: string;
  tags?: Array<{ _id: string; name: string; color?: string }>;
}

interface ProblemBank {
  _id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'public' | 'shared';
  problemCount: number;
}

type ViewMode = 'list' | 'card' | 'split';

// View mode icons
const ViewIcons = {
  list: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  card: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  split: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
};

export function ProblemBankDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentBank, removeBank } = useProblemStore();

  const [bank, setBank] = useState<ProblemBank | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('problemViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [bankData, problemsData] = await Promise.all([
          problemApi.banks.get(id),
          problemApi.problems.list({ bankId: id, limit: 100 }),
        ]);
        setBank(bankData);
        setCurrentBank(bankData);
        setProblems(problemsData.items);
        // Auto-select first problem in split view
        if (problemsData.items.length > 0) {
          setSelectedProblem(problemsData.items[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, setCurrentBank, t]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('problemViewMode', viewMode);
  }, [viewMode]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await problemApi.banks.delete(id);
      removeBank(id);
      navigate('/problems');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.deleteFailed', 'Failed to delete'));
      setIsDeleting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      case 'medium': return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
      case 'hard': return 'bg-[var(--color-error-bg)] text-[var(--color-error)]';
      default: return 'bg-[var(--color-secondary)] text-[var(--color-muted)]';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'single_choice': t('problem.type.singleChoice', 'Single Choice'),
      'multiple_choice': t('problem.type.multipleChoice', 'Multiple Choice'),
      'fill_blank': t('problem.type.fillBlank', 'Fill in the Blank'),
      'single-choice': t('problem.type.singleChoice', 'Single Choice'),
      'multiple-choice': t('problem.type.multipleChoice', 'Multiple Choice'),
      'fill-blank': t('problem.type.fillBlank', 'Fill in the Blank'),
      'short-answer': t('problem.type.shortAnswer', 'Short Answer'),
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('choice')) {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  };

  // Problem Card Component
  const ProblemCard = ({ problem, index, compact = false }: { problem: Problem; index: number; compact?: boolean }) => (
    <GlassCard
      className={`p-4 transition-all hover:shadow-lg ${
        selectedProblem?._id === problem._id && viewMode === 'split'
          ? 'ring-2 ring-[var(--color-primary)]'
          : ''
      } ${compact ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (viewMode === 'split') {
          setSelectedProblem(problem);
          setShowAnswer(false);
        }
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-bold text-[var(--color-primary)]">
            {index + 1}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-xs text-[var(--color-primary)]">
            {getTypeIcon(problem.type)}
            <span className="hidden sm:inline">{getTypeLabel(problem.type)}</span>
          </span>
          <span className={`rounded-full px-2 py-1 text-xs ${getDifficultyColor(problem.difficulty)}`}>
            {t(`problem.difficulty.${problem.difficulty}`, problem.difficulty)}
          </span>
        </div>
        {!compact && (
          <Link
            to={`/problems/${id}/problems/${problem._id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className={compact ? 'line-clamp-3' : ''}>
        <LaTeXRenderer
          content={problem.content}
          className="text-[var(--color-foreground)] leading-relaxed"
        />
      </div>

      {/* Options for choice questions (non-compact view) */}
      {!compact && problem.options && problem.options.length > 0 && (
        <div className="mt-4 space-y-2">
          {problem.options.filter(opt => opt.content).map((option) => {
            const isCorrect = Array.isArray(problem.correctAnswer)
              ? problem.correctAnswer.includes(option.id)
              : problem.correctAnswer === option.id;
            return (
              <div
                key={option.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  isCorrect
                    ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card)]'
                }`}
              >
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCorrect
                    ? 'bg-[var(--color-success)] text-white'
                    : 'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                }`}>
                  {option.label}
                </span>
                <LaTeXRenderer
                  content={option.content}
                  className="flex-1 text-sm"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Fill-blank answer (non-compact view) */}
      {!compact && !problem.options && problem.correctAnswer && (
        <div className="mt-4">
          <div className="rounded-lg border border-[var(--color-success)] bg-[var(--color-success-bg)] p-3">
            <span className="text-xs font-medium text-[var(--color-success)]">
              {t('problem.correctAnswer', 'Correct Answer')}:
            </span>
            <LaTeXRenderer
              content={String(problem.correctAnswer)}
              className="mt-1 text-[var(--color-success)]"
            />
          </div>
        </div>
      )}

      {/* Explanation (non-compact view) */}
      {!compact && problem.answerExplanation && (
        <div className="mt-4 rounded-lg bg-[var(--color-info-bg)] p-3">
          <span className="text-xs font-medium text-[var(--color-info)]">
            {t('problem.explanation', 'Explanation')}:
          </span>
          <LaTeXRenderer
            content={problem.answerExplanation}
            className="mt-1 text-sm text-[var(--color-foreground)]"
          />
        </div>
      )}

      {/* Tags */}
      {problem.tags && problem.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {problem.tags.map((tag) => (
            <span
              key={tag._id}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : 'var(--color-secondary)',
                color: tag.color || 'var(--color-muted)',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );

  // Problem Detail Panel (for split view)
  const ProblemDetailPanel = ({ problem }: { problem: Problem }) => (
    <div className="space-y-4">
      <GlassCard className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm text-[var(--color-primary)]">
              {getTypeIcon(problem.type)}
              {getTypeLabel(problem.type)}
            </span>
            <span className={`rounded-full px-3 py-1 text-sm ${getDifficultyColor(problem.difficulty)}`}>
              {t(`problem.difficulty.${problem.difficulty}`, problem.difficulty)}
            </span>
          </div>
          <Link
            to={`/problems/${id}/problems/${problem._id}`}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--color-primary)]/80"
          >
            {t('common.edit', 'Edit')}
          </Link>
        </div>

        {/* Content */}
        <div className="rounded-xl bg-[var(--color-background)] p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.content', 'Problem')}
          </h3>
          <LaTeXRenderer
            content={problem.content}
            className="text-lg leading-relaxed"
          />
        </div>
      </GlassCard>

      {/* Options for choice questions */}
      {problem.options && problem.options.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.options', 'Options')}
          </h3>
          <div className="space-y-3">
            {problem.options.filter(opt => opt.content).map((option) => {
              const isCorrect = Array.isArray(problem.correctAnswer)
                ? problem.correctAnswer.includes(option.id)
                : problem.correctAnswer === option.id;
              return (
                <div
                  key={option.id}
                  className={`flex items-start gap-4 rounded-xl border-2 p-4 transition-colors ${
                    isCorrect
                      ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]'
                      : 'border-[var(--color-border)] bg-[var(--color-card)]'
                  }`}
                >
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isCorrect
                      ? 'bg-[var(--color-success)] text-white'
                      : 'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                  }`}>
                    {option.label}
                  </span>
                  <LaTeXRenderer
                    content={option.content}
                    className="flex-1 pt-1"
                  />
                  {isCorrect && (
                    <svg className="h-6 w-6 flex-shrink-0 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Answer for fill-blank */}
      {!problem.options && problem.correctAnswer && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {t('problem.correctAnswer', 'Answer')}
            </h3>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {showAnswer ? t('common.hide', 'Hide') : t('common.show', 'Show')}
            </button>
          </div>
          {showAnswer && (
            <div className="mt-4 rounded-xl bg-[var(--color-success-bg)] p-4">
              <LaTeXRenderer
                content={String(problem.correctAnswer)}
                className="text-lg text-[var(--color-success)]"
              />
            </div>
          )}
        </GlassCard>
      )}

      {/* Explanation */}
      {problem.answerExplanation && (
        <GlassCard className="p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.explanation', 'Explanation')}
          </h3>
          <div className="rounded-xl bg-[var(--color-info-bg)] p-4">
            <LaTeXRenderer
              content={problem.answerExplanation}
              className="leading-relaxed"
            />
          </div>
        </GlassCard>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  if (error || !bank) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
          {error || t('error.notFound', 'Not found')}
        </div>
        <Button onClick={() => navigate('/problems')}>
          {t('common.back', 'Back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{bank.name}</h1>
          {bank.description && (
            <p className="mt-2 text-[var(--color-muted)]">{bank.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-sm ${
              bank.visibility === 'public' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
              bank.visibility === 'shared' ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]' :
              'bg-[var(--color-secondary)] text-[var(--color-muted)]'
            }`}>
              {t(`problem.visibility.${bank.visibility}`, bank.visibility)}
            </span>
            <span className="text-sm text-[var(--color-muted)]">
              {problems.length} {t('problem.problems', 'problems')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/problems/${id}/edit`}>
            <Button variant="outline">{t('common.edit', 'Edit')}</Button>
          </Link>
          <Button
            variant="outline"
            className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to={`/problems/${id}/problems/create`}>
          <Button>{t('problem.addProblem', 'Add Problem')}</Button>
        </Link>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-[var(--color-secondary)] p-1">
          {(['list', 'card', 'split'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                viewMode === mode
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              }`}
              title={t(`problem.view.${mode}`, mode)}
            >
              {ViewIcons[mode]}
              <span className="hidden sm:inline">{t(`problem.view.${mode}`, mode)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Problems Display */}
      {problems.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary)]">
            <svg className="h-8 w-8 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg text-[var(--color-muted)]">
            {t('problem.noProblems', 'No problems in this bank yet')}
          </p>
          <Link to={`/problems/${id}/problems/create`} className="mt-4 inline-block">
            <Button>{t('problem.addFirstProblem', 'Add your first problem')}</Button>
          </Link>
        </GlassCard>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-4">
          {problems.map((problem, index) => (
            <ProblemCard key={problem._id} problem={problem} index={index} />
          ))}
        </div>
      ) : viewMode === 'card' ? (
        /* Card/Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem, index) => (
            <Link key={problem._id} to={`/problems/${id}/problems/${problem._id}`}>
              <ProblemCard problem={problem} index={index} compact />
            </Link>
          ))}
        </div>
      ) : (
        /* Split View */
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Problem List (Left Panel) */}
          <div className="space-y-3 lg:max-h-[calc(100vh-300px)] lg:overflow-y-auto lg:pr-2">
            {problems.map((problem, index) => (
              <ProblemCard key={problem._id} problem={problem} index={index} compact />
            ))}
          </div>

          {/* Problem Detail (Right Panel) */}
          <div className="lg:max-h-[calc(100vh-300px)] lg:overflow-y-auto">
            {selectedProblem ? (
              <ProblemDetailPanel problem={selectedProblem} />
            ) : (
              <GlassCard className="flex h-64 items-center justify-center p-6 text-[var(--color-muted)]">
                {t('problem.selectToView', 'Select a problem to view details')}
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <GlassCard className="mx-4 max-w-md p-6">
            <h3 className="mb-4 text-xl font-bold">
              {t('problem.deleteConfirm', 'Delete Problem Bank?')}
            </h3>
            <p className="mb-6 text-[var(--color-muted)]">
              {t('problem.deleteWarning', 'This will permanently delete the problem bank and all its problems. This action cannot be undone.')}
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
