import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { StyleEditor } from '@/components/competition/StyleEditor';
import { CompetitionPreview } from '@/components/competition/CompetitionPreview';
import { CompetitionSimulation } from '@/components/competition/CompetitionSimulation';
import { TourGuide, TourTrigger, type TourStep } from '@/components/ui/tour-guide';
import { cn } from '@/lib/utils';
import {
  type CompetitionDisplaySettings,
  type CompetitionMode,
  type CompetitionSettings,
  DEFAULT_ONSITE_SETTINGS,
  DEFAULT_ONLINE_SETTINGS,
} from '@/types/competition';

// Tour steps for the demo page
const DEMO_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="mode-tabs"]',
    titleKey: 'tour.demo.modeTabs.title',
    descriptionKey: 'tour.demo.modeTabs.description',
    title: 'Competition Modes',
    description: 'Switch between On-Site and Online modes. Each mode has its own independent settings optimized for different scenarios.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="style-editor"]',
    titleKey: 'tour.demo.styleEditor.title',
    descriptionKey: 'tour.demo.styleEditor.description',
    title: 'Style Editor',
    description: 'Customize the visual appearance of your competition. Choose layouts, themes, colors, and display options.',
    placement: 'right',
  },
  {
    target: '[data-tour="layout-selector"]',
    titleKey: 'tour.demo.layout.title',
    descriptionKey: 'tour.demo.layout.description',
    title: 'Layout Options',
    description: 'Single layout shows one question at a time (best for projection). Grid and List layouts show multiple questions.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="theme-selector"]',
    titleKey: 'tour.demo.theme.title',
    descriptionKey: 'tour.demo.theme.description',
    title: 'Theme & Colors',
    description: 'Choose from preset themes or create your own custom color scheme. Toggle between light and dark modes.',
    placement: 'top',
  },
  {
    target: '[data-tour="display-options"]',
    titleKey: 'tour.demo.displayOptions.title',
    descriptionKey: 'tour.demo.displayOptions.description',
    title: 'Display Options',
    description: 'Enable or disable the timer, progress bar, and question numbers based on your needs.',
    placement: 'top',
  },
  {
    target: '[data-tour="live-preview"]',
    titleKey: 'tour.demo.preview.title',
    descriptionKey: 'tour.demo.preview.description',
    title: 'Live Preview',
    description: 'See real-time changes as you customize settings. This shows exactly how your competition will look to participants.',
    placement: 'left',
  },
  {
    target: '[data-tour="simulate-button"]',
    titleKey: 'tour.demo.simulate.title',
    descriptionKey: 'tour.demo.simulate.description',
    title: 'Simulation Mode',
    description: 'Click Simulate to test the competition flow with a working timer and question progression.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="mode-comparison"]',
    titleKey: 'tour.demo.comparison.title',
    descriptionKey: 'tour.demo.comparison.description',
    title: 'Mode Comparison',
    description: 'Compare settings between On-Site and Online modes at a glance. Each mode maintains its own configuration.',
    placement: 'top',
  },
];

// Icons
function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
    </svg>
  );
}

function ProjectorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M6 18v2M18 18v2" />
      <circle cx="6" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M6 8h4M6 11h8" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Default full settings for onsite mode
const DEFAULT_ONSITE_FULL_SETTINGS: CompetitionSettings = {
  ...DEFAULT_ONSITE_SETTINGS,
  participantMode: 'individual',
  teamSize: 4,
  minTeamSize: 2,
  allowReferee: true,
  refereeCount: 1,
  questionTimeLimit: 60,
  basePoints: 100,
  timeBonusEnabled: true,
  penaltyEnabled: false,
  penaltyPoints: 0,
};

// Default full settings for online mode
const DEFAULT_ONLINE_FULL_SETTINGS: CompetitionSettings = {
  ...DEFAULT_ONLINE_SETTINGS,
  participantMode: 'individual',
  teamSize: 4,
  minTeamSize: 2,
  allowReferee: false,
  refereeCount: 0,
  questionTimeLimit: 120,
  basePoints: 100,
  timeBonusEnabled: true,
  penaltyEnabled: false,
  penaltyPoints: 0,
};

export function CompetitionDemoPage() {
  const { t } = useTranslation();

  // Separate FULL settings for each mode
  const [onsiteSettings, setOnsiteSettings] = useState<CompetitionSettings>(DEFAULT_ONSITE_FULL_SETTINGS);
  const [onlineSettings, setOnlineSettings] = useState<CompetitionSettings>(DEFAULT_ONLINE_FULL_SETTINGS);

  // Current active mode for preview
  const [activeMode, setActiveMode] = useState<CompetitionMode>('onsite');
  const [isSimulating, setIsSimulating] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'fullscreen'>('split');

  // Full simulation mode
  const [showFullSimulation, setShowFullSimulation] = useState(false);

  // Tour state
  const [isTourOpen, setIsTourOpen] = useState(false);

  const currentSettings = activeMode === 'onsite' ? onsiteSettings : onlineSettings;
  const setCurrentSettings = activeMode === 'onsite' ? setOnsiteSettings : setOnlineSettings;

  // Handle display settings change from StyleEditor
  const handleDisplaySettingsChange = (displaySettings: CompetitionDisplaySettings) => {
    setCurrentSettings(prev => ({
      ...prev,
      ...displaySettings,
    }));
  };

  const handleModeChange = (mode: CompetitionMode) => {
    setActiveMode(mode);
    setIsSimulating(false);
  };

  const handleSimulationEnd = () => {
    setIsSimulating(false);
  };

  const handleOpenFullSimulation = () => {
    setShowFullSimulation(true);
  };

  const handleCloseFullSimulation = () => {
    setShowFullSimulation(false);
  };

  // Full simulation mode - show competition simulation with participants
  if (showFullSimulation) {
    return (
      <CompetitionSimulation
        settings={currentSettings}
        onClose={handleCloseFullSimulation}
      />
    );
  }

  // Fullscreen mode
  if (viewMode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSimulating(!isSimulating)}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            {isSimulating ? (
              <>
                <StopIcon className="mr-2 h-4 w-4" />
                {t('competition.demo.stopSimulation', 'Stop')}
              </>
            ) : (
              <>
                <PlayIcon className="mr-2 h-4 w-4" />
                {t('competition.demo.startSimulation', 'Simulate')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode('split')}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            {t('common.close', 'Exit')}
          </Button>
        </div>
        <CompetitionPreview
          settings={currentSettings}
          isSimulating={isSimulating}
          onSimulationEnd={handleSimulationEnd}
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('competition.demo.title', 'Competition Demo')}</h1>
          <p className="mt-1 text-[var(--color-muted)]">
            {t('competition.demo.description', 'Preview and customize competition display settings for different modes')}
          </p>
        </div>
        <div className="flex gap-2">
          <TourTrigger
            onClick={() => setIsTourOpen(true)}
            label={t('tour.startTour', 'Take a Tour')}
          />
          <Button variant="outline" onClick={() => setViewMode('fullscreen')}>
            <ExpandIcon className="mr-2 h-4 w-4" />
            {t('competition.demo.fullscreen', 'Fullscreen')}
          </Button>
          <Button
            data-tour="simulate-button"
            onClick={handleOpenFullSimulation}
            variant="default"
          >
            <PlayIcon className="mr-2 h-4 w-4" />
            {t('competition.demo.startSimulation', 'Simulate')}
          </Button>
        </div>
      </div>

      {/* Mode Tabs */}
      <GlassCard className="p-2" data-tour="mode-tabs">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleModeChange('onsite')}
            className={cn(
              'flex items-center justify-center gap-3 rounded-xl px-6 py-4 transition-all',
              activeMode === 'onsite'
                ? 'bg-[var(--color-primary)] text-white shadow-lg'
                : 'bg-[var(--color-secondary)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary-hover)]'
            )}
          >
            <ProjectorIcon className="h-6 w-6" />
            <div className="text-left">
              <p className="font-semibold">{t('competition.mode.onsiteTitle', 'On-Site Mode')}</p>
              <p className={cn('text-xs', activeMode === 'onsite' ? 'text-white/80' : 'text-[var(--color-muted)]')}>
                {t('competition.mode.onsiteShort', 'Host-controlled, projection display')}
              </p>
            </div>
          </button>
          <button
            onClick={() => handleModeChange('online')}
            className={cn(
              'flex items-center justify-center gap-3 rounded-xl px-6 py-4 transition-all',
              activeMode === 'online'
                ? 'bg-[var(--color-primary)] text-white shadow-lg'
                : 'bg-[var(--color-secondary)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary-hover)]'
            )}
          >
            <MonitorIcon className="h-6 w-6" />
            <div className="text-left">
              <p className="font-semibold">{t('competition.mode.onlineTitle', 'Online Mode')}</p>
              <p className={cn('text-xs', activeMode === 'online' ? 'text-white/80' : 'text-[var(--color-muted)]')}>
                {t('competition.mode.onlineShort', 'Self-paced, individual screens')}
              </p>
            </div>
          </button>
        </div>
      </GlassCard>

      {/* Main Content - Split View */}
      <div className="grid gap-8 xl:grid-cols-2">
        {/* Editor Panel */}
        <div className="space-y-6">
          <div data-tour="style-editor">
            <StyleEditor settings={currentSettings} onChange={handleDisplaySettingsChange} />
          </div>

          {/* Competition Settings */}
          <GlassCard className="space-y-6 p-6" data-tour="competition-settings">
            <h3 className="text-lg font-semibold">
              {t('competition.settings.title', 'Competition Settings')}
            </h3>

            {/* Participant Mode */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                {t('competition.settings.participantMode', 'Participant Mode')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentSettings(prev => ({ ...prev, participantMode: 'individual' }))}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 transition-all',
                    currentSettings.participantMode === 'individual'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                  )}
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('competition.settings.individual', 'Individual')}</span>
                </button>
                <button
                  onClick={() => setCurrentSettings(prev => ({ ...prev, participantMode: 'team' }))}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 transition-all',
                    currentSettings.participantMode === 'team'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                  )}
                >
                  <UsersIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('competition.settings.team', 'Team')}</span>
                </button>
              </div>
            </div>

            {/* Team Size (only when team mode) */}
            {currentSettings.participantMode === 'team' && (
              <div className="space-y-3 rounded-xl bg-[var(--color-secondary)]/50 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t('competition.settings.teamSize', 'Team Size')}
                  </label>
                  <span className="rounded-lg bg-[var(--color-primary)] px-3 py-1 font-mono text-sm font-bold text-white">
                    {currentSettings.teamSize}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={currentSettings.teamSize || 4}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, teamSize: parseInt(e.target.value) }))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)] accent-[var(--color-primary)]"
                />
                <div className="flex justify-between text-xs text-[var(--color-muted)]">
                  <span>2</span>
                  <span>8</span>
                </div>
              </div>
            )}

            {/* Time Limit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t('competition.settings.timeLimit', 'Time per Question')}
                </label>
                <span className="rounded-lg bg-[var(--color-primary)] px-3 py-1 font-mono text-sm font-bold text-white">
                  {currentSettings.questionTimeLimit}s
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={currentSettings.questionTimeLimit}
                onChange={(e) => setCurrentSettings(prev => ({ ...prev, questionTimeLimit: parseInt(e.target.value) }))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)] accent-[var(--color-primary)]"
              />
              <div className="flex justify-between text-xs text-[var(--color-muted)]">
                <span>10s</span>
                <span>5min</span>
              </div>
            </div>

            {/* Base Points */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t('competition.settings.basePoints', 'Base Points')}
                </label>
                <span className="rounded-lg bg-[var(--color-accent)] px-3 py-1 font-mono text-sm font-bold text-white">
                  {currentSettings.basePoints}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={currentSettings.basePoints}
                onChange={(e) => setCurrentSettings(prev => ({ ...prev, basePoints: parseInt(e.target.value) }))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)] accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--color-muted)]">
                <span>10</span>
                <span>500</span>
              </div>
            </div>

            {/* Additional Options */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all',
                  currentSettings.timeBonusEnabled
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                )}
              >
                <input
                  type="checkbox"
                  checked={currentSettings.timeBonusEnabled}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, timeBonusEnabled: e.target.checked }))}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all',
                    currentSettings.timeBonusEnabled
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                      : 'border-[var(--color-border)]'
                  )}
                >
                  {currentSettings.timeBonusEnabled && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('competition.settings.timeBonus', 'Time Bonus')}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {t('competition.settings.timeBonusDesc', 'Faster = more points')}
                  </p>
                </div>
              </label>

              {activeMode === 'onsite' && (
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all',
                    currentSettings.allowReferee
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={currentSettings.allowReferee}
                    onChange={(e) => setCurrentSettings(prev => ({ ...prev, allowReferee: e.target.checked }))}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all',
                      currentSettings.allowReferee
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                        : 'border-[var(--color-border)]'
                    )}
                  >
                    {currentSettings.allowReferee && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('competition.settings.referee', 'Referee')}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {t('competition.settings.refereeDesc', 'Allow score adjustments')}
                    </p>
                  </div>
                </label>
              )}
            </div>
          </GlassCard>

          {/* Mode Info Card */}
          <GlassCard className="border-l-4 border-l-[var(--color-primary)] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {activeMode === 'onsite' ? <ProjectorIcon className="h-5 w-5" /> : <MonitorIcon className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-foreground)]">
                  {activeMode === 'onsite'
                    ? t('competition.demo.onsiteInfoTitle', 'On-Site Mode Tips')
                    : t('competition.demo.onlineInfoTitle', 'Online Mode Tips')}
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
                  {activeMode === 'onsite' ? (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {t('competition.demo.onsiteTip1', 'Use dark theme for better projection visibility')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {t('competition.demo.onsiteTip2', 'Single layout works best for large screens')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {t('competition.demo.onsiteTip3', 'Timer is essential for audience engagement')}
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {t('competition.demo.onlineTip1', 'Grid layout allows viewing multiple questions')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {t('competition.demo.onlineTip2', 'Light theme reduces eye strain for longer sessions')}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {t('competition.demo.onlineTip3', 'Progress indicator helps track completion')}
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Preview Panel */}
        <div className="sticky top-20 space-y-4 self-start" data-tour="live-preview">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">{t('competition.demo.livePreview', 'Live Preview')}</h3>
              <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                {t('competition.demo.realtime', 'Real-time')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              {currentSettings.theme.displayMode === 'dark' ? (
                <MoonIcon className="h-4 w-4" />
              ) : (
                <SunIcon className="h-4 w-4" />
              )}
              <span className="capitalize">{t(`competition.display.${currentSettings.theme.displayMode}`, currentSettings.theme.displayMode)}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xl">
            <CompetitionPreview
              settings={currentSettings}
              isSimulating={isSimulating}
              onSimulationEnd={handleSimulationEnd}
            />
          </div>

          {/* Current Settings Summary */}
          <GlassCard className="p-4">
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
              {t('competition.demo.currentSettings', 'Current Settings')}
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
              <div className="rounded-lg bg-[var(--color-secondary)]/50 p-3">
                <p className="text-xs text-[var(--color-muted)]">{t('competition.display.layout', 'Layout')}</p>
                <p className="mt-1 text-sm font-semibold capitalize">{t(`competition.display.${currentSettings.layout}`, currentSettings.layout)}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-secondary)]/50 p-3">
                <p className="text-xs text-[var(--color-muted)]">{t('competition.display.questionsPerPage', 'Per Page')}</p>
                <p className="mt-1 text-sm font-semibold">{currentSettings.questionsPerPage}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-secondary)]/50 p-3">
                <p className="text-xs text-[var(--color-muted)]">{t('competition.settings.participantMode', 'Mode')}</p>
                <p className="mt-1 text-sm font-semibold capitalize">{t(`competition.settings.${currentSettings.participantMode}`, currentSettings.participantMode)}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-secondary)]/50 p-3">
                <p className="text-xs text-[var(--color-muted)]">{t('competition.settings.timeLimit', 'Time')}</p>
                <p className="mt-1 text-sm font-semibold">{currentSettings.questionTimeLimit}s</p>
              </div>
              <div className="rounded-lg bg-[var(--color-secondary)]/50 p-3">
                <p className="text-xs text-[var(--color-muted)]">{t('competition.settings.basePoints', 'Points')}</p>
                <p className="mt-1 text-sm font-semibold">{currentSettings.basePoints}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-secondary)]/50 p-3">
                <p className="text-xs text-[var(--color-muted)]">{t('competition.display.theme', 'Theme')}</p>
                <p className="mt-1 text-sm font-semibold capitalize">{t(`competition.display.${currentSettings.theme.preset}`, currentSettings.theme.preset)}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Both Modes Comparison */}
      <GlassCard className="p-6" data-tour="mode-comparison">
        <h3 className="mb-4 text-lg font-semibold">
          {t('competition.demo.comparison', 'Mode Comparison')}
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* On-Site Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <ProjectorIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{t('competition.mode.onsiteTitle', 'On-Site Mode')}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {t(`competition.display.${onsiteSettings.theme.preset}`, onsiteSettings.theme.preset)} • {t(`competition.display.${onsiteSettings.theme.displayMode}`, onsiteSettings.theme.displayMode)} • {t(`competition.display.${onsiteSettings.layout}`, onsiteSettings.layout)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={cn('rounded-lg p-2', onsiteSettings.showTimer ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-secondary)] text-[var(--color-muted)]')}>
                {t('competition.demo.optionTimer', 'Timer')} {onsiteSettings.showTimer ? '✓' : '✗'}
              </div>
              <div className={cn('rounded-lg p-2', onsiteSettings.showProgress ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-secondary)] text-[var(--color-muted)]')}>
                {t('competition.demo.optionProgress', 'Progress')} {onsiteSettings.showProgress ? '✓' : '✗'}
              </div>
              <div className={cn('rounded-lg p-2', onsiteSettings.showQuestionNumber ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-secondary)] text-[var(--color-muted)]')}>
                {t('competition.demo.optionNumbers', 'Numbers')} {onsiteSettings.showQuestionNumber ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Online Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-info-bg)] text-[var(--color-info)]">
                <MonitorIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{t('competition.mode.onlineTitle', 'Online Mode')}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {t(`competition.display.${onlineSettings.theme.preset}`, onlineSettings.theme.preset)} • {t(`competition.display.${onlineSettings.theme.displayMode}`, onlineSettings.theme.displayMode)} • {t(`competition.display.${onlineSettings.layout}`, onlineSettings.layout)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={cn('rounded-lg p-2', onlineSettings.showTimer ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-secondary)] text-[var(--color-muted)]')}>
                {t('competition.demo.optionTimer', 'Timer')} {onlineSettings.showTimer ? '✓' : '✗'}
              </div>
              <div className={cn('rounded-lg p-2', onlineSettings.showProgress ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-secondary)] text-[var(--color-muted)]')}>
                {t('competition.demo.optionProgress', 'Progress')} {onlineSettings.showProgress ? '✓' : '✗'}
              </div>
              <div className={cn('rounded-lg p-2', onlineSettings.showQuestionNumber ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-secondary)] text-[var(--color-muted)]')}>
                {t('competition.demo.optionNumbers', 'Numbers')} {onlineSettings.showQuestionNumber ? '✓' : '✗'}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tour Guide */}
      <TourGuide
        steps={DEMO_TOUR_STEPS}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={() => setIsTourOpen(false)}
      />
    </div>
  );
}
