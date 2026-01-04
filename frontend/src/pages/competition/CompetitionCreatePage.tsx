import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutSelector } from '@/components/competition/LayoutSelector';
import { ThemeSelector } from '@/components/competition/ThemeSelector';
import { competitionApi } from '@/services/competition.api';
import { useCompetitionStore } from '@/store/competitionStore';
import {
  type LayoutType,
  type ThemeConfig,
  type CompetitionDisplaySettings,
  type ParticipantMode,
  DEFAULT_DISPLAY_SETTINGS,
} from '@/types/competition';

type CompetitionType = 'integration_bee' | 'fun_math' | 'quiz' | 'speed_math';
type CompetitionMode = 'onsite' | 'online';
type TeamRoleMode = 'all_equal' | 'single_submit' | 'split_view';

export function CompetitionCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addCompetition } = useCompetitionStore();

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CompetitionType>('integration_bee');
  const [mode, setMode] = useState<CompetitionMode>('onsite');

  // Participant mode
  const [participantMode, setParticipantMode] = useState<ParticipantMode>('individual');
  const [teamSize, setTeamSize] = useState(4);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [teamRoleMode, setTeamRoleMode] = useState<TeamRoleMode>('all_equal');

  // Settings
  const [questionTimeLimit, setQuestionTimeLimit] = useState(60);
  const [basePoints, setBasePoints] = useState(100);
  const [timeBonus, setTimeBonus] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showLeaderboardDuringQuestion, setShowLeaderboardDuringQuestion] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(true);

  // Display settings
  const [displaySettings, setDisplaySettings] = useState<CompetitionDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('competition.nameRequired', 'Competition name is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const newCompetition = await competitionApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        mode,
        participantMode,
        settings: {
          questionTimeLimit,
          basePoints,
          timeBonus,
          showLeaderboard,
          showLeaderboardDuringQuestion,
          showCorrectAnswer,
          participantMode,
          ...(participantMode === 'team' && {
            teamSize,
            minTeamSize,
            teamRoleMode,
          }),
        },
        displaySettings,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      addCompetition(newCompetition);
      navigate(`/competitions/${newCompetition._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.createFailed', 'Failed to create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t('competition.create', 'Create Competition')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {t('competition.description', 'Description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('competition.descriptionPlaceholder', 'Enter description (optional)')}
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
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
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
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
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="onsite">{t('competition.mode.onsite', 'On-Site')}</option>
                <option value="online">{t('competition.mode.online', 'Online')}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-[var(--color-primary)]/10 p-4">
            {mode === 'onsite' ? (
              <p className="text-sm">
                <strong>{t('competition.mode.onsiteTitle', 'On-Site Mode')}:</strong>{' '}
                {t('competition.mode.onsiteDesc', 'Host controls the competition from a display screen. Participants join via QR code or join code.')}
              </p>
            ) : (
              <p className="text-sm">
                <strong>{t('competition.mode.onlineTitle', 'Online Mode')}:</strong>{' '}
                {t('competition.mode.onlineDesc', 'Automated competition flow. Participants compete independently with timed questions.')}
              </p>
            )}
          </div>
        </GlassCard>

        {/* Participant Mode */}
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('competition.participantMode.title', 'Participant Mode')}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Individual Mode */}
            <label
              className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                participantMode === 'individual'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="participantMode"
                  value="individual"
                  checked={participantMode === 'individual'}
                  onChange={() => setParticipantMode('individual')}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">{t('competition.participantMode.individual', 'Individual')}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {t('competition.participantMode.individualDesc', 'Each participant competes independently. Individual scores and rankings.')}
              </p>
            </label>

            {/* Team Mode */}
            <label
              className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                participantMode === 'team'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="participantMode"
                  value="team"
                  checked={participantMode === 'team'}
                  onChange={() => setParticipantMode('team')}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-medium">{t('competition.participantMode.team', 'Team')}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {t('competition.participantMode.teamDesc', 'Participants form teams. Team scores and rankings.')}
              </p>
            </label>
          </div>

          {/* Team Settings (only shown when team mode is selected) */}
          {participantMode === 'team' && (
            <div className="mt-6 space-y-4 rounded-lg bg-[var(--color-secondary)] p-4">
              <h3 className="font-medium">{t('competition.teamSettings.title', 'Team Settings')}</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {t('competition.teamSettings.maxSize', 'Max Team Size')}
                  </label>
                  <Input
                    type="number"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Math.max(2, parseInt(e.target.value) || 4))}
                    min={2}
                    max={10}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {t('competition.teamSettings.minSize', 'Min Team Size')}
                  </label>
                  <Input
                    type="number"
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(Math.max(1, Math.min(teamSize, parseInt(e.target.value) || 2)))}
                    min={1}
                    max={teamSize}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {t('competition.teamSettings.roleMode', 'Team Role Mode')}
                </label>
                <select
                  value={teamRoleMode}
                  onChange={(e) => setTeamRoleMode(e.target.value as TeamRoleMode)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="all_equal">{t('competition.teamSettings.allEqual', 'All Equal - Everyone can view and submit')}</option>
                  <option value="single_submit">{t('competition.teamSettings.singleSubmit', 'Single Submit - One person submits for the team')}</option>
                  <option value="split_view">{t('competition.teamSettings.splitView', 'Split View - Some view, some submit')}</option>
                </select>
              </div>
            </div>
          )}
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
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={timeBonus}
                onChange={(e) => setTimeBonus(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">
                {t('competition.timeBonus', 'Enable time bonus (faster answers get more points)')}
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showLeaderboard}
                onChange={(e) => setShowLeaderboard(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">
                {t('competition.showLeaderboard', 'Show leaderboard to participants')}
              </span>
            </label>

            {showLeaderboard && (
              <label className="ml-6 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={showLeaderboardDuringQuestion}
                  onChange={(e) => setShowLeaderboardDuringQuestion(e.target.checked)}
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
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">
                {t('competition.showCorrectAnswer', 'Show correct answer after each question')}
              </span>
            </label>
          </div>
        </GlassCard>

        {/* Display Settings */}
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {t('competition.display.title', 'Display Settings')}
          </h2>

          <div className="space-y-6">
            {/* Layout Selection */}
            <LayoutSelector
              value={displaySettings.layout}
              onChange={handleLayoutChange}
            />

            {/* Questions per page (only for grid/list) */}
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
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-[var(--color-border)] accent-[var(--color-primary)]"
                  />
                  <span className="w-8 text-center font-mono text-lg font-bold text-[var(--color-primary)]">
                    {displaySettings.questionsPerPage}
                  </span>
                </div>
              </div>
            )}

            {/* Theme Selection */}
            <ThemeSelector
              value={displaySettings.theme}
              onChange={handleThemeChange}
            />

            {/* Display Options */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                {t('competition.display.options', 'Display Options')}
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={displaySettings.showTimer}
                  onChange={(e) =>
                    setDisplaySettings((prev) => ({ ...prev, showTimer: e.target.checked }))
                  }
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="text-sm">
                  {t('competition.display.showTimer', 'Show countdown timer')}
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={displaySettings.showProgress}
                  onChange={(e) =>
                    setDisplaySettings((prev) => ({ ...prev, showProgress: e.target.checked }))
                  }
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="text-sm">
                  {t('competition.display.showProgress', 'Show progress indicator')}
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={displaySettings.showQuestionNumber}
                  onChange={(e) =>
                    setDisplaySettings((prev) => ({ ...prev, showQuestionNumber: e.target.checked }))
                  }
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="text-sm">
                  {t('competition.display.showQuestionNumber', 'Show question numbers')}
                </span>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/competitions')}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
