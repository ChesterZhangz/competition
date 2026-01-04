import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { LayoutSelector } from '@/components/competition/LayoutSelector';
import { ThemeSelector } from '@/components/competition/ThemeSelector';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { competitionApi } from '@/services/competition.api';
import { problemApi } from '@/services/problem.api';
import {
  type LayoutType,
  type ThemeConfig,
  type CompetitionDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
} from '@/types/competition';

type CompetitionType = 'integration_bee' | 'fun_math' | 'quiz' | 'speed_math';
type CompetitionMode = 'onsite' | 'online';

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: string;
  mode: string;
  status: string;
  settings: {
    questionTimeLimit: number;
    basePoints: number;
    timeBonus: boolean;
    showLeaderboard: boolean;
    showCorrectAnswer: boolean;
  };
  displaySettings?: CompetitionDisplaySettings;
}

interface CompetitionQuestion {
  _id: string;
  problemId: string;
  order: number;
  timeLimit?: number;
  points?: number;
  status: string;
  content?: string;
  type?: string;
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

export function CompetitionEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Competition data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CompetitionType>('integration_bee');
  const [mode, setMode] = useState<CompetitionMode>('onsite');
  const [status, setStatus] = useState('');

  // Settings
  const [questionTimeLimit, setQuestionTimeLimit] = useState(60);
  const [basePoints, setBasePoints] = useState(100);
  const [timeBonus, setTimeBonus] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showLeaderboardDuringQuestion, setShowLeaderboardDuringQuestion] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(true);

  // Display settings
  const [displaySettings, setDisplaySettings] = useState<CompetitionDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  // Questions management
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [problemBanks, setProblemBanks] = useState<ProblemBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankProblems, setBankProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);

  // Load competition data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [compData, questionsData, banksData] = await Promise.all([
          competitionApi.get(id),
          competitionApi.getQuestions(id),
          problemApi.banks.list({ limit: 100 }),
        ]);

        // Set competition data
        setName(compData.name);
        setDescription(compData.description || '');
        setType(compData.type as CompetitionType);
        setMode(compData.mode as CompetitionMode);
        setStatus(compData.status);
        setQuestionTimeLimit(compData.settings.questionTimeLimit);
        setBasePoints(compData.settings.basePoints);
        setTimeBonus(compData.settings.timeBonus);
        setShowLeaderboard(compData.settings.showLeaderboard);
        setShowLeaderboardDuringQuestion(compData.settings.showLeaderboardDuringQuestion || false);
        setShowCorrectAnswer(compData.settings.showCorrectAnswer);
        if (compData.displaySettings) {
          setDisplaySettings(compData.displaySettings);
        }

        // Set questions
        setQuestions(questionsData as unknown as CompetitionQuestion[]);

        // Set problem banks
        setProblemBanks(banksData.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, t]);

  // Load problems when bank is selected
  useEffect(() => {
    const fetchProblems = async () => {
      if (!selectedBankId) {
        setBankProblems([]);
        return;
      }
      setIsLoadingProblems(true);
      try {
        const data = await problemApi.problems.list({ bankId: selectedBankId, limit: 100 });
        setBankProblems(data.items);
      } catch (err) {
        console.error('Failed to load problems:', err);
      } finally {
        setIsLoadingProblems(false);
      }
    };

    fetchProblems();
  }, [selectedBankId]);

  const handleLayoutChange = (layout: LayoutType) => {
    setDisplaySettings((prev) => ({
      ...prev,
      layout,
      questionsPerPage: layout === 'single' ? 1 : prev.questionsPerPage,
    }));
  };

  const handleThemeChange = (theme: ThemeConfig) => {
    setDisplaySettings((prev) => ({ ...prev, theme }));
  };

  const handleSave = async () => {
    if (!id) return;
    setError('');

    if (!name.trim()) {
      setError(t('competition.nameRequired', 'Competition name is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      await competitionApi.update(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        mode,
        settings: {
          questionTimeLimit,
          basePoints,
          timeBonus,
          showLeaderboard,
          showLeaderboardDuringQuestion,
          showCorrectAnswer,
        },
        displaySettings,
      } as Partial<Competition>);
      navigate(`/competitions/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.updateFailed', 'Failed to update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestions = async () => {
    if (!id || selectedProblems.size === 0) return;
    setIsAddingQuestions(true);
    try {
      const newQuestions = Array.from(selectedProblems).map((problemId) => ({
        problemId,
        timeLimit: questionTimeLimit,
        points: basePoints,
      }));
      const added = await competitionApi.addQuestions(id, newQuestions);
      setQuestions((prev) => [...prev, ...added]);
      setSelectedProblems(new Set());
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
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  };

  const isReadOnly = status !== 'draft';

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('competition.edit', 'Edit Competition')}</h1>
        {isReadOnly && (
          <span className="rounded-full bg-[var(--color-warning-bg)] px-3 py-1 text-sm text-[var(--color-warning)]">
            {t('competition.readOnlyMode', 'Read-only (competition has started)')}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
      )}

      {/* Basic Info */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.basicInfo', 'Basic Information')}</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              {t('competition.name', 'Name')} <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('competition.namePlaceholder', 'Enter competition name')}
              maxLength={100}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('competition.description', 'Description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('competition.descriptionPlaceholder', 'Enter description (optional)')}
              rows={3}
              maxLength={500}
              disabled={isReadOnly}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      </GlassCard>

      {/* Type and Mode */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.typeAndMode', 'Type & Mode')}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('competition.type.label', 'Competition Type')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CompetitionType)}
              disabled={isReadOnly}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
            >
              <option value="integration_bee">{t('competition.type.integrationBee', 'Integration Bee')}</option>
              <option value="fun_math">{t('competition.type.funMath', 'Fun Math')}</option>
              <option value="quiz">{t('competition.type.quiz', 'Quiz')}</option>
              <option value="speed_math">{t('competition.type.speedMath', 'Speed Math')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('competition.mode.label', 'Mode')}</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as CompetitionMode)}
              disabled={isReadOnly}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
            >
              <option value="onsite">{t('competition.mode.onsite', 'On-Site')}</option>
              <option value="online">{t('competition.mode.online', 'Online')}</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Settings */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.settingsTitle', 'Settings')}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('competition.timeLimit', 'Time per Question (seconds)')}</label>
            <Input
              type="number"
              value={questionTimeLimit}
              onChange={(e) => setQuestionTimeLimit(parseInt(e.target.value) || 60)}
              min={10}
              max={300}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('competition.basePoints', 'Base Points')}</label>
            <Input
              type="number"
              value={basePoints}
              onChange={(e) => setBasePoints(parseInt(e.target.value) || 100)}
              min={10}
              max={1000}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={timeBonus}
              onChange={(e) => setTimeBonus(e.target.checked)}
              disabled={isReadOnly}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm">{t('competition.timeBonus', 'Enable time bonus')}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showLeaderboard}
              onChange={(e) => setShowLeaderboard(e.target.checked)}
              disabled={isReadOnly}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm">{t('competition.showLeaderboard', 'Show leaderboard')}</span>
          </label>

          {showLeaderboard && (
            <label className="ml-6 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showLeaderboardDuringQuestion}
                onChange={(e) => setShowLeaderboardDuringQuestion(e.target.checked)}
                disabled={isReadOnly}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">
                {t('competition.showLeaderboardDuringQuestion', 'Show real-time leaderboard during questions')}
              </span>
            </label>
          )}

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showCorrectAnswer}
              onChange={(e) => setShowCorrectAnswer(e.target.checked)}
              disabled={isReadOnly}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm">{t('competition.showCorrectAnswer', 'Show correct answer')}</span>
          </label>
        </div>
      </GlassCard>

      {/* Display Settings */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('competition.display.title', 'Display Settings')}</h2>

        <div className="space-y-6">
          <LayoutSelector value={displaySettings.layout} onChange={handleLayoutChange} />

          {displaySettings.layout !== 'single' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                {t('competition.display.questionsPerPage', 'Questions per page')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={displaySettings.questionsPerPage}
                  onChange={(e) =>
                    setDisplaySettings((prev) => ({
                      ...prev,
                      questionsPerPage: parseInt(e.target.value),
                    }))
                  }
                  disabled={isReadOnly}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-[var(--color-border)] accent-[var(--color-primary)]"
                />
                <span className="w-8 text-center font-mono text-lg font-bold text-[var(--color-primary)]">
                  {displaySettings.questionsPerPage}
                </span>
              </div>
            </div>
          )}

          <ThemeSelector value={displaySettings.theme} onChange={handleThemeChange} />

          <div className="space-y-3">
            <label className="block text-sm font-medium">{t('competition.display.options', 'Display Options')}</label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={displaySettings.showTimer}
                onChange={(e) => setDisplaySettings((prev) => ({ ...prev, showTimer: e.target.checked }))}
                disabled={isReadOnly}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">{t('competition.display.showTimer', 'Show countdown timer')}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={displaySettings.showProgress}
                onChange={(e) => setDisplaySettings((prev) => ({ ...prev, showProgress: e.target.checked }))}
                disabled={isReadOnly}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">{t('competition.display.showProgress', 'Show progress indicator')}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={displaySettings.showQuestionNumber}
                onChange={(e) => setDisplaySettings((prev) => ({ ...prev, showQuestionNumber: e.target.checked }))}
                disabled={isReadOnly}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">{t('competition.display.showQuestionNumber', 'Show question numbers')}</span>
            </label>
          </div>
        </div>
      </GlassCard>

      {/* Questions Management */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('competition.questions', 'Questions')} ({questions.length})
        </h2>

        {/* Current Questions */}
        {questions.length > 0 && (
          <div className="mb-6 space-y-2">
            {questions.map((q, index) => (
              <div
                key={q._id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-card)] p-3"
              >
                <div className="flex-1">
                  <span className="font-medium">
                    {t('competition.question', 'Question')} #{index + 1}
                  </span>
                  {q.content && (
                    <div className="mt-1 text-sm text-[var(--color-muted)] line-clamp-2">
                      <LaTeXRenderer content={q.content} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--color-muted)]">
                    {q.timeLimit || questionTimeLimit}s | {q.points || basePoints} pts
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemoveQuestion(q._id)}
                      className="text-[var(--color-error)] hover:text-[var(--color-error)]/80"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Questions from Problem Bank */}
        {!isReadOnly && (
          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-medium">{t('competition.addFromBank', 'Add from Problem Bank')}</h3>

            <div className="space-y-2">
              <label className="block text-sm font-medium">{t('competition.selectBank', 'Select Problem Bank')}</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">{t('competition.selectBankPlaceholder', '-- Select a problem bank --')}</option>
                {problemBanks.map((bank) => (
                  <option key={bank._id} value={bank._id}>
                    {bank.name} ({bank.problemCount} {t('problem.problems', 'problems')})
                  </option>
                ))}
              </select>
            </div>

            {selectedBankId && (
              <div className="space-y-2">
                {isLoadingProblems ? (
                  <div className="flex items-center justify-center py-4">
                    <IconLoading size={24} state="loading" />
                  </div>
                ) : bankProblems.length === 0 ? (
                  <p className="text-center text-[var(--color-muted)]">
                    {t('competition.noProblemsInBank', 'No problems in this bank')}
                  </p>
                ) : (
                  <>
                    {/* Select All */}
                    {(() => {
                      const selectableProblems = bankProblems.filter(
                        (p) => !questions.some((q) => q.problemId === p._id)
                      );
                      const allSelected = selectableProblems.length > 0 &&
                        selectableProblems.every((p) => selectedProblems.has(p._id));
                      const someSelected = selectableProblems.some((p) => selectedProblems.has(p._id));

                      return selectableProblems.length > 0 ? (
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] p-3 transition-colors hover:bg-[var(--color-secondary)]/80">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={() => {
                              if (allSelected) {
                                setSelectedProblems(new Set());
                              } else {
                                setSelectedProblems(new Set(selectableProblems.map((p) => p._id)));
                              }
                            }}
                            className="h-4 w-4 accent-[var(--color-primary)]"
                          />
                          <span className="text-sm font-medium">
                            {t('common.selectAll', 'Select All')} ({selectableProblems.length})
                          </span>
                        </label>
                      ) : null;
                    })()}

                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {bankProblems.map((problem) => {
                        const isAlreadyAdded = questions.some((q) => q.problemId === problem._id);
                        const isSelected = selectedProblems.has(problem._id);

                        return (
                          <label
                            key={problem._id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                              isAlreadyAdded
                                ? 'border-[var(--color-border)] bg-[var(--color-secondary)] opacity-50'
                                : isSelected
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                  : 'border-[var(--color-border)] hover:bg-[var(--color-secondary)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProblemSelection(problem._id)}
                              disabled={isAlreadyAdded}
                              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                            />
                            <div className="flex-1">
                              <div className="text-sm line-clamp-2">
                                <LaTeXRenderer content={problem.content} />
                              </div>
                              <div className="mt-1 flex gap-2 text-xs text-[var(--color-muted)]">
                                <span>{t(`problem.type.${problem.type}`, problem.type)}</span>
                                <span>•</span>
                                <span>{t(`problem.difficulty.${problem.difficulty}`, problem.difficulty)}</span>
                                {isAlreadyAdded && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[var(--color-success)]">
                                      {t('competition.alreadyAdded', 'Already added')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {selectedProblems.size > 0 && (
                      <Button
                        onClick={handleAddQuestions}
                        disabled={isAddingQuestions}
                        className="w-full"
                      >
                        {isAddingQuestions
                          ? t('common.adding', 'Adding...')
                          : t('competition.addSelected', 'Add {{count}} Selected', { count: selectedProblems.size })}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/competitions/${id}`)}
          disabled={isSubmitting}
        >
          {t('common.cancel', 'Cancel')}
        </Button>
        {!isReadOnly && (
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        )}
      </div>
    </div>
  );
}
