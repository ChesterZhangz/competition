import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { competitionApi } from '@/services/competition.api';
import { problemApi } from '@/services/problem.api';

interface PopulatedProblem {
  _id: string;
  content: string;
  type: string;
}

interface CompetitionQuestion {
  _id: string;
  problemId: string | PopulatedProblem;
  order: number;
  timeLimit?: number;
  points?: number;
  status: string;
  content?: string;
  type?: string;
}

// Helper to get content from question (handles both flat and populated structures)
function getQuestionContent(q: CompetitionQuestion): string {
  if (q.content) return q.content;
  if (typeof q.problemId === 'object' && q.problemId?.content) return q.problemId.content;
  return '';
}

function getQuestionType(q: CompetitionQuestion): string {
  if (q.type) return q.type;
  if (typeof q.problemId === 'object' && q.problemId?.type) return q.problemId.type;
  return 'unknown';
}

function getQuestionProblemId(q: CompetitionQuestion): string {
  if (typeof q.problemId === 'string') return q.problemId;
  if (typeof q.problemId === 'object' && q.problemId?._id) return q.problemId._id;
  return '';
}

interface ProblemBank {
  _id: string;
  name: string;
  problemCount: number;
}

interface Problem {
  _id: string;
  content: string;
  type: string;
  difficulty: string;
}

export function CompetitionQuestionsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [competitionName, setCompetitionName] = useState('');
  const [competitionStatus, setCompetitionStatus] = useState('');
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [problemBanks, setProblemBanks] = useState<ProblemBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankProblems, setBankProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [error, setError] = useState('');

  // Fetch competition and questions data
  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [compData, questionsData, banksData] = await Promise.all([
        competitionApi.get(id),
        competitionApi.getQuestions(id),
        problemApi.banks.list({ limit: 100 }),
      ]);
      setCompetitionName(compData.name);
      setCompetitionStatus(compData.status);
      setQuestions(questionsData as unknown as CompetitionQuestion[]);
      setProblemBanks(banksData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch problems when bank is selected
  useEffect(() => {
    const fetchBankProblems = async () => {
      if (!selectedBankId) {
        setBankProblems([]);
        return;
      }
      setIsLoadingProblems(true);
      try {
        const data = await problemApi.problems.list({ bankId: selectedBankId, limit: 100 });
        setBankProblems(data.items);
      } catch (err) {
        console.error('Failed to fetch problems:', err);
      } finally {
        setIsLoadingProblems(false);
      }
    };
    fetchBankProblems();
  }, [selectedBankId]);

  const handleAddQuestions = async () => {
    if (!id || selectedProblems.size === 0) return;
    setIsAddingQuestions(true);
    try {
      const newQuestions = Array.from(selectedProblems).map((problemId) => ({
        problemId,
      }));
      await competitionApi.addQuestions(id, newQuestions);
      // Refetch questions to get full details including content
      const questionsData = await competitionApi.getQuestions(id);
      setQuestions(questionsData as unknown as CompetitionQuestion[]);
      setSelectedProblems(new Set());
      setSelectedBankId('');
      setBankProblems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.addFailed', 'Failed to add questions'));
    } finally {
      setIsAddingQuestions(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!id) return;
    try {
      await competitionApi.removeQuestion(id, questionId);
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.removeFailed', 'Failed to remove question'));
    }
  };

  const toggleProblemSelection = (problemId: string) => {
    setSelectedProblems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };

  const isReadOnly = competitionStatus !== 'draft';

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              to={`/competitions/${id}`}
              className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">{t('competition.manageQuestions', 'Manage Questions')}</h1>
          </div>
          <p className="text-[var(--color-muted)]">{competitionName}</p>
        </div>
        {isReadOnly && (
          <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-500">
            {t('competition.readOnly', 'Read Only')}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">
          {error}
          <button onClick={() => setError('')} className="ml-4 underline">
            {t('common.dismiss', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Current Questions */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('competition.currentQuestions', 'Current Questions')} ({questions.length})
        </h2>

        {questions.length === 0 ? (
          <p className="text-center text-[var(--color-muted)] py-8">
            {t('competition.noQuestions', 'No questions added yet')}
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div
                key={q._id}
                className="flex items-start gap-4 rounded-lg bg-[var(--color-card)] p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-bold text-[var(--color-primary)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <LaTeXRenderer
                    content={getQuestionContent(q) || t('common.loading', 'Loading...')}
                    className="line-clamp-2 text-sm"
                  />
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-muted)]">
                    <span>{getQuestionType(q)}</span>
                    <span>{q.timeLimit || 60}s</span>
                    <span>{q.points || 100} pts</span>
                  </div>
                </div>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                    onClick={() => handleRemoveQuestion(q._id)}
                  >
                    {t('common.remove', 'Remove')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Add Questions Section - Only for draft */}
      {!isReadOnly && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {t('competition.addQuestions', 'Add Questions')}
          </h2>

          {/* Bank Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              {t('competition.selectBank', 'Select Problem Bank')}
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2"
            >
              <option value="">{t('competition.selectBankPlaceholder', 'Choose a problem bank...')}</option>
              {problemBanks.map((bank) => (
                <option key={bank._id} value={bank._id}>
                  {bank.name} ({bank.problemCount} {t('competition.problems', 'problems')})
                </option>
              ))}
            </select>
          </div>

          {/* Problems List */}
          {selectedBankId && (
            <div className="space-y-4">
              {isLoadingProblems ? (
                <div className="flex justify-center py-8">
                  <IconLoading size={32} state="loading" />
                </div>
              ) : bankProblems.length === 0 ? (
                <p className="text-center text-[var(--color-muted)] py-4">
                  {t('competition.noProblemsInBank', 'No problems in this bank')}
                </p>
              ) : (
                <>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {bankProblems.map((problem) => {
                      const isAlreadyAdded = questions.some((q) => getQuestionProblemId(q) === problem._id);
                      const isSelected = selectedProblems.has(problem._id);

                      return (
                        <label
                          key={problem._id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors ${
                            isAlreadyAdded
                              ? 'bg-[var(--color-muted)]/10 opacity-50'
                              : isSelected
                                ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]'
                                : 'bg-[var(--color-card)] hover:bg-[var(--color-secondary)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProblemSelection(problem._id)}
                            disabled={isAlreadyAdded}
                            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                          />
                          <div className="min-w-0 flex-1">
                            <LaTeXRenderer content={problem.content} className="line-clamp-2 text-sm" />
                            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                              <span className="rounded bg-[var(--color-secondary)] px-2 py-0.5">
                                {problem.type}
                              </span>
                              <span className="rounded bg-[var(--color-secondary)] px-2 py-0.5">
                                {problem.difficulty}
                              </span>
                              {isAlreadyAdded && (
                                <span className="text-[var(--color-warning)]">
                                  {t('competition.alreadyAdded', 'Already added')}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Add Button */}
                  <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                    <span className="text-sm text-[var(--color-muted)]">
                      {t('competition.selectedCount', '{{count}} selected', { count: selectedProblems.size })}
                    </span>
                    <Button
                      onClick={handleAddQuestions}
                      disabled={selectedProblems.size === 0 || isAddingQuestions}
                    >
                      {isAddingQuestions
                        ? t('common.adding', 'Adding...')
                        : t('competition.addSelected', 'Add Selected')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link to={`/competitions/${id}`}>
          <Button variant="outline">{t('common.back', 'Back')}</Button>
        </Link>
        <Link to="/problems">
          <Button variant="outline">{t('competition.goToProblemBank', 'Go to Problem Bank')}</Button>
        </Link>
      </div>
    </div>
  );
}
