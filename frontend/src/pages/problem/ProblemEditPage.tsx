import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { problemApi } from '@/services/problem.api';
import { useProblemStore } from '@/store/problemStore';

type ProblemType = 'single-choice' | 'multiple-choice' | 'fill-blank' | 'short-answer';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Option {
  id: string;
  label: string;
  content: string;
}

export function ProblemEditPage() {
  const { t } = useTranslation();
  const { id: bankId, problemId } = useParams<{ id: string; problemId: string }>();
  const navigate = useNavigate();
  const { updateProblem, removeProblem } = useProblemStore();

  const [type, setType] = useState<ProblemType>('single-choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('');
  const [answerExplanation, setAnswerExplanation] = useState('');
  const [source, setSource] = useState('');
  const [points, setPoints] = useState(10);
  const [estimatedTime, setEstimatedTime] = useState(60);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const fetchProblem = async () => {
      if (!problemId) return;
      setIsLoading(true);
      try {
        const problem = await problemApi.problems.get(problemId);
        setType(problem.type as ProblemType);
        setDifficulty(problem.difficulty as Difficulty);
        setContent(problem.content);
        setOptions(problem.options || []);
        setCorrectAnswer(problem.correctAnswer);
        setAnswerExplanation(problem.answerExplanation || '');
        setSource(problem.source || '');
        setPoints(problem.points || 10);
        setEstimatedTime(problem.estimatedTime || 60);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [problemId, t]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].content = value;
    setOptions(newOptions);
  };

  const handleCorrectAnswerChange = (optionId: string) => {
    if (type === 'single-choice') {
      setCorrectAnswer(optionId);
    } else if (type === 'multiple-choice') {
      const current = Array.isArray(correctAnswer) ? correctAnswer : [];
      if (current.includes(optionId)) {
        setCorrectAnswer(current.filter(a => a !== optionId));
      } else {
        setCorrectAnswer([...current, optionId]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError(t('problem.contentRequired', 'Problem content is required'));
      return;
    }

    if (!problemId) return;

    setIsSubmitting(true);
    try {
      // Convert type to underscore format for backend compatibility
      const backendType = type.replace(/-/g, '_');

      // Filter out empty options
      const validOptions = (type === 'single-choice' || type === 'multiple-choice')
        ? options.filter(opt => opt.content.trim())
        : undefined;

      const problemData = {
        type: backendType,
        difficulty,
        content: content.trim(),
        options: validOptions,
        correctAnswer,
        answerExplanation: answerExplanation.trim() || undefined,
        source: source.trim() || undefined,
        points,
        estimatedTime,
      };

      const updated = await problemApi.problems.update(problemId, problemData);
      updateProblem(problemId, updated);
      navigate(`/problems/${bankId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.updateFailed', 'Failed to update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!problemId) return;
    setIsDeleting(true);
    try {
      await problemApi.problems.delete(problemId);
      removeProblem(problemId);
      navigate(`/problems/${bankId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.deleteFailed', 'Failed to delete'));
      setIsDeleting(false);
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
      case 'medium': return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
      case 'hard': return 'bg-[var(--color-error-bg)] text-[var(--color-error)]';
      default: return 'bg-[var(--color-secondary)] text-[var(--color-muted)]';
    }
  };

  const getTypeLabel = (t_: string) => {
    const labels: Record<string, string> = {
      'single-choice': t('problem.type.singleChoice', 'Single Choice'),
      'multiple-choice': t('problem.type.multipleChoice', 'Multiple Choice'),
      'fill-blank': t('problem.type.fillBlank', 'Fill in the Blank'),
      'short-answer': t('problem.type.shortAnswer', 'Short Answer'),
    };
    return labels[t_] || t_;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  // Preview Panel Component
  const PreviewPanel = () => (
    <div className="space-y-4">
      <GlassCard className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm text-[var(--color-primary)]">
            {getTypeLabel(type)}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm ${getDifficultyColor(difficulty)}`}>
            {t(`problem.difficulty.${difficulty}`, difficulty)}
          </span>
        </div>

        {/* Content */}
        <div className="rounded-xl bg-[var(--color-background)] p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.content', 'Problem')}
          </h3>
          {content ? (
            <LaTeXRenderer
              content={content}
              className="text-lg leading-relaxed"
            />
          ) : (
            <p className="text-[var(--color-muted)] italic">
              {t('problem.previewPlaceholder', 'Problem preview will appear here')}
            </p>
          )}
        </div>
      </GlassCard>

      {/* Options Preview */}
      {(type === 'single-choice' || type === 'multiple-choice') && options.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.options', 'Options')}
          </h3>
          <div className="space-y-3">
            {options.filter(opt => opt.content).map((option) => {
              const isCorrect = Array.isArray(correctAnswer)
                ? correctAnswer.includes(option.id)
                : correctAnswer === option.id;
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

      {/* Fill-blank Answer Preview */}
      {(type === 'fill-blank' || type === 'short-answer') && correctAnswer && (
        <GlassCard className="p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.correctAnswer', 'Correct Answer')}
          </h3>
          <div className="rounded-xl bg-[var(--color-success-bg)] p-4">
            <LaTeXRenderer
              content={String(correctAnswer)}
              className="text-lg text-[var(--color-success)]"
            />
          </div>
        </GlassCard>
      )}

      {/* Explanation Preview */}
      {answerExplanation && (
        <GlassCard className="p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {t('problem.explanation', 'Explanation')}
          </h3>
          <div className="rounded-xl bg-[var(--color-info-bg)] p-4">
            <LaTeXRenderer
              content={answerExplanation}
              className="leading-relaxed"
            />
          </div>
        </GlassCard>
      )}

      {/* Additional Info Preview */}
      {(source || points || estimatedTime) && (
        <GlassCard className="p-6">
          <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
            {points > 0 && (
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>{points} {t('problem.points', 'points')}</span>
              </div>
            )}
            {estimatedTime > 0 && (
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{estimatedTime}s</span>
              </div>
            )}
            {source && (
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{source}</span>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('problem.editProblem', 'Edit Problem')}</h1>
        <div className="flex items-center gap-2">
          {/* Preview Toggle */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              showPreview
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-secondary)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t('problem.preview', 'Preview')}
          </button>
          <Button
            variant="outline"
            className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        {/* Editor Panel */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type and Difficulty */}
          <GlassCard className="p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('problem.basicInfo', 'Basic Information')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.type.label', 'Type')}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ProblemType)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  disabled
                >
                  <option value="single-choice">{t('problem.type.singleChoice', 'Single Choice')}</option>
                  <option value="multiple-choice">{t('problem.type.multipleChoice', 'Multiple Choice')}</option>
                  <option value="fill-blank">{t('problem.type.fillBlank', 'Fill in the Blank')}</option>
                  <option value="short-answer">{t('problem.type.shortAnswer', 'Short Answer')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.difficulty.label', 'Difficulty')}</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="easy">{t('problem.difficulty.easy', 'Easy')}</option>
                  <option value="medium">{t('problem.difficulty.medium', 'Medium')}</option>
                  <option value="hard">{t('problem.difficulty.hard', 'Hard')}</option>
                </select>
              </div>
            </div>
          </GlassCard>

          {/* Content */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('problem.content', 'Problem Content')}</h2>
              <span className="text-xs text-[var(--color-muted)]">
                {t('problem.latexHint', 'Use $...$ or $$...$$ for LaTeX')}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('problem.contentPlaceholder', 'Enter problem content')}
              rows={6}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </GlassCard>

          {/* Options */}
          {(type === 'single-choice' || type === 'multiple-choice') && options.length > 0 && (
            <GlassCard className="p-6">
              <h2 className="mb-4 text-lg font-semibold">{t('problem.options', 'Options')}</h2>
              <p className="mb-4 text-sm text-[var(--color-muted)]">
                {t('problem.choiceHint', 'Click the circle/checkbox to set correct answer')}
              </p>
              <div className="space-y-3">
                {options.map((option, index) => {
                  const isCorrect = Array.isArray(correctAnswer)
                    ? correctAnswer.includes(option.id)
                    : correctAnswer === option.id;
                  return (
                    <div
                      key={option.id}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
                        isCorrect
                          ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type={type === 'single-choice' ? 'radio' : 'checkbox'}
                          name="correctAnswer"
                          checked={isCorrect}
                          onChange={() => handleCorrectAnswerChange(option.id)}
                          className="h-5 w-5 accent-[var(--color-success)]"
                        />
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isCorrect
                            ? 'bg-[var(--color-success)] text-white'
                            : 'bg-[var(--color-secondary)] text-[var(--color-muted)]'
                        }`}>
                          {option.label}
                        </span>
                      </label>
                      <Input
                        type="text"
                        value={option.content}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={t('problem.optionPlaceholder', 'Enter option content')}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Answer for fill-blank and short-answer */}
          {(type === 'fill-blank' || type === 'short-answer') && (
            <GlassCard className="p-6">
              <h2 className="mb-4 text-lg font-semibold">{t('problem.correctAnswer', 'Correct Answer')}</h2>
              <Input
                type="text"
                value={typeof correctAnswer === 'string' ? correctAnswer : ''}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder={t('problem.answerPlaceholder', 'Enter the correct answer')}
                className="font-mono"
              />
            </GlassCard>
          )}

          {/* Explanation */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('problem.explanation', 'Answer Explanation')}</h2>
              <span className="text-xs text-[var(--color-muted)]">
                {t('problem.latexHint', 'Use $...$ or $$...$$ for LaTeX')}
              </span>
            </div>
            <textarea
              value={answerExplanation}
              onChange={(e) => setAnswerExplanation(e.target.value)}
              placeholder={t('problem.explanationPlaceholder', 'Enter explanation (optional)')}
              rows={4}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </GlassCard>

          {/* Additional Info */}
          <GlassCard className="p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('problem.additionalInfo', 'Additional Information')}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.points', 'Points')}</label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.estimatedTime', 'Time (seconds)')}</label>
                <Input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                  min={10}
                  max={600}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('problem.source', 'Source')}</label>
                <Input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={t('problem.sourcePlaceholder', 'e.g., AMC 2024')}
                />
              </div>
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/problems/${bankId}`)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </div>
        </form>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                {t('problem.livePreview', 'Live Preview')}
              </h2>
            </div>
            <PreviewPanel />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <GlassCard className="mx-4 max-w-md p-6">
            <h3 className="mb-4 text-xl font-bold">
              {t('problem.deleteProblemConfirm', 'Delete Problem?')}
            </h3>
            <p className="mb-6 text-[var(--color-muted)]">
              {t('problem.deleteProblemWarning', 'This action cannot be undone.')}
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
