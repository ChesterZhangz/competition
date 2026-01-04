import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { LayoutSelector } from './LayoutSelector';
import { ThemeSelector } from './ThemeSelector';
import {
  type LayoutType,
  type ThemeConfig,
  type CompetitionDisplaySettings,
} from '@/types/competition';

interface StyleEditorProps {
  settings: CompetitionDisplaySettings;
  onChange: (settings: CompetitionDisplaySettings) => void;
  className?: string;
  compact?: boolean;
}

export function StyleEditor({ settings, onChange, className }: StyleEditorProps) {
  const { t } = useTranslation();

  const handleLayoutChange = (layout: LayoutType) => {
    onChange({
      ...settings,
      layout,
      questionsPerPage: layout === 'single' ? 1 : settings.questionsPerPage,
    });
  };

  const handleThemeChange = (theme: ThemeConfig) => {
    onChange({ ...settings, theme });
  };

  const handleQuestionsPerPageChange = (value: number) => {
    onChange({ ...settings, questionsPerPage: value });
  };

  const handleToggle = (key: keyof CompetitionDisplaySettings, value: boolean) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <GlassCard className={cn('space-y-8 p-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('competition.preview.styleEditor', 'Style Editor')}
        </h3>
        <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          {settings.mode === 'onsite'
            ? t('competition.mode.onsiteTitle', 'On-Site')
            : t('competition.mode.onlineTitle', 'Online')}
        </span>
      </div>

      {/* Layout Selection */}
      <div className="space-y-4" data-tour="layout-selector">
        <LayoutSelector value={settings.layout} onChange={handleLayoutChange} />

        {/* Questions per page */}
        {settings.layout !== 'single' && (
          <div className="rounded-xl bg-[var(--color-secondary)]/50 p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t('competition.display.questionsPerPage', 'Questions per page')}
              </label>
              <span className="rounded-lg bg-[var(--color-primary)] px-3 py-1 font-mono text-sm font-bold text-white">
                {settings.questionsPerPage}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={settings.questionsPerPage}
              onChange={(e) => handleQuestionsPerPageChange(parseInt(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)] accent-[var(--color-primary)]"
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--color-muted)]">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        )}
      </div>

      {/* Theme Selection */}
      <div data-tour="theme-selector">
        <ThemeSelector value={settings.theme} onChange={handleThemeChange} />
      </div>

      {/* Display Options */}
      <div className="space-y-4" data-tour="display-options">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          {t('competition.display.options', 'Display Options')}
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all',
              settings.showTimer
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
            )}
          >
            <input
              type="checkbox"
              checked={settings.showTimer}
              onChange={(e) => handleToggle('showTimer', e.target.checked)}
              className="sr-only"
            />
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all',
                settings.showTimer
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-[var(--color-border)]'
              )}
            >
              {settings.showTimer && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t('competition.display.timer', 'Timer')}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {t('competition.display.timerDesc', 'Countdown')}
              </p>
            </div>
          </label>

          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all',
              settings.showProgress
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
            )}
          >
            <input
              type="checkbox"
              checked={settings.showProgress}
              onChange={(e) => handleToggle('showProgress', e.target.checked)}
              className="sr-only"
            />
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all',
                settings.showProgress
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-[var(--color-border)]'
              )}
            >
              {settings.showProgress && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t('competition.display.progress', 'Progress')}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {t('competition.display.progressDesc', 'Progress bar')}
              </p>
            </div>
          </label>

          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all',
              settings.showQuestionNumber
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
            )}
          >
            <input
              type="checkbox"
              checked={settings.showQuestionNumber}
              onChange={(e) => handleToggle('showQuestionNumber', e.target.checked)}
              className="sr-only"
            />
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all',
                settings.showQuestionNumber
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-[var(--color-border)]'
              )}
            >
              {settings.showQuestionNumber && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t('competition.display.numbers', 'Numbers')}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {t('competition.display.numbersDesc', 'Question #')}
              </p>
            </div>
          </label>
        </div>
      </div>
    </GlassCard>
  );
}
