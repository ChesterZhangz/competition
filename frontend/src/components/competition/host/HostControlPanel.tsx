import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconTimer } from '@/components/icons/competition/IconTimer';

export type CompetitionPhase =
  | 'setup'
  | 'team-formation'
  | 'waiting'
  | 'countdown'
  | 'question'
  | 'revealing'
  | 'leaderboard'
  | 'finished';

export type CompetitionStatus = 'draft' | 'ready' | 'ongoing' | 'paused' | 'finished';

interface TimerState {
  remainingTime: number;
  isRunning: boolean;
  totalDuration: number;
}

interface HostControlPanelProps {
  competitionId: string;
  status: CompetitionStatus;
  currentPhase: CompetitionPhase;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerState: TimerState;
  participantMode: 'individual' | 'team';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onPhaseChange: (phase: CompetitionPhase) => void;
  onNextQuestion: () => void;
  onRevealAnswer: () => void;
  onShowLeaderboard: () => void;
  onTimerStart: (duration: number) => void;
  onTimerPause: () => void;
  onTimerResume: () => void;
  onTimerReset: (duration?: number) => void;
  onTimerAdjust: (seconds: number) => void;
}

const PHASE_LABELS: Record<CompetitionPhase, string> = {
  'setup': 'competition.phase.setup',
  'team-formation': 'competition.phase.teamFormation',
  'waiting': 'competition.phase.waiting',
  'countdown': 'competition.phase.countdown',
  'question': 'competition.phase.question',
  'revealing': 'competition.phase.revealing',
  'leaderboard': 'competition.phase.leaderboard',
  'finished': 'competition.phase.finished',
};

export function HostControlPanel({
  status,
  currentPhase,
  currentQuestionIndex,
  totalQuestions,
  timerState,
  participantMode,
  onStart,
  onPause,
  onResume,
  onEnd,
  onPhaseChange,
  onNextQuestion,
  onRevealAnswer,
  onShowLeaderboard,
  onTimerStart,
  onTimerPause,
  onTimerResume,
  onTimerReset,
  onTimerAdjust,
}: HostControlPanelProps) {
  const { t } = useTranslation();
  const [customDuration, setCustomDuration] = useState(60);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Status & Phase */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('competition.statusLabel', 'Status')}</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  status === 'ongoing' && 'bg-green-500 animate-pulse',
                  status === 'paused' && 'bg-yellow-500',
                  status === 'finished' && 'bg-red-500',
                  (status === 'draft' || status === 'ready') && 'bg-gray-500'
                )}
              />
              <span className="font-medium">{t(`competition.status.${status}`, status)}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('competition.phaseLabel', 'Phase')}</p>
            <span className="font-medium">{t(PHASE_LABELS[currentPhase], currentPhase)}</span>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('competition.mode.label', 'Mode')}</p>
            <span className="font-medium">{t(`competition.settings.${participantMode}`, participantMode)}</span>
          </div>
        </div>
      </GlassCard>

      {/* Competition Control */}
      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-muted)]">
          {t('competition.controls', 'Competition Controls')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(status === 'draft' || status === 'ready') && (
            <Button onClick={onStart} className="bg-green-600 hover:bg-green-700">
              {t('competition.start', 'Start')}
            </Button>
          )}
          {status === 'ongoing' && (
            <Button onClick={onPause} variant="outline" className="border-yellow-500 text-yellow-500">
              {t('competition.pause', 'Pause')}
            </Button>
          )}
          {status === 'paused' && (
            <Button onClick={onResume} className="bg-green-600 hover:bg-green-700">
              {t('competition.resume', 'Resume')}
            </Button>
          )}
          {(status === 'ongoing' || status === 'paused') && (
            <Button onClick={onEnd} variant="outline" className="border-red-500 text-red-500">
              {t('competition.end', 'End')}
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Question Progress */}
      {status === 'ongoing' && (
        <GlassCard className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-muted)]">
            {t('competition.questionProgress', 'Question Progress')}
          </h3>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-sm">
              <span>
                {t('competition.question', 'Question')} {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNextQuestion} disabled={currentQuestionIndex >= totalQuestions - 1}>
              {currentQuestionIndex < 0
                ? t('competition.startFirstQuestion', 'Start First Question')
                : t('competition.nextQuestion', 'Next Question')}
            </Button>
            <Button onClick={onRevealAnswer} variant="outline" disabled={currentPhase !== 'question'}>
              {t('competition.revealAnswer', 'Reveal Answer')}
            </Button>
            <Button onClick={onShowLeaderboard} variant="outline">
              {t('competition.showLeaderboard', 'Show Leaderboard')}
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Timer Control */}
      {status === 'ongoing' && (
        <GlassCard className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-muted)]">
            {t('competition.timerControl', 'Timer Control')}
          </h3>

          {/* Timer Display */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <IconTimer
              size={32}
              state={timerState.isRunning ? 'active' : 'idle'}
              className={cn(timerState.remainingTime < 10000 && timerState.isRunning && 'text-red-500')}
            />
            <span
              className={cn(
                'font-mono text-4xl font-bold',
                timerState.remainingTime < 10000 && timerState.isRunning && 'animate-pulse text-red-500'
              )}
            >
              {formatTime(timerState.remainingTime)}
            </span>
          </div>

          {/* Timer Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {!timerState.isRunning && timerState.remainingTime > 0 && (
              <Button onClick={onTimerResume} size="sm" className="bg-green-600 hover:bg-green-700">
                {t('competition.timerResume', 'Resume')}
              </Button>
            )}
            {timerState.isRunning && (
              <Button onClick={onTimerPause} size="sm" variant="outline">
                {t('competition.timerPause', 'Pause')}
              </Button>
            )}
            <Button onClick={() => onTimerReset()} size="sm" variant="outline">
              {t('competition.timerReset', 'Reset')}
            </Button>
          </div>

          {/* Adjust Timer */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={() => onTimerAdjust(-10)} size="sm" variant="ghost">
              -10s
            </Button>
            <Button onClick={() => onTimerAdjust(-5)} size="sm" variant="ghost">
              -5s
            </Button>
            <Button onClick={() => onTimerAdjust(5)} size="sm" variant="ghost">
              +5s
            </Button>
            <Button onClick={() => onTimerAdjust(10)} size="sm" variant="ghost">
              +10s
            </Button>
            <Button onClick={() => onTimerAdjust(30)} size="sm" variant="ghost">
              +30s
            </Button>
          </div>

          {/* Custom Duration */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <input
              type="number"
              value={customDuration}
              onChange={(e) => setCustomDuration(parseInt(e.target.value) || 60)}
              className="w-20 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-center"
              min={10}
              max={600}
            />
            <span className="text-sm text-[var(--color-muted)]">s</span>
            <Button onClick={() => onTimerStart(customDuration)} size="sm">
              {t('competition.setTimer', 'Set')}
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Phase Selector (for manual control) */}
      {status === 'ongoing' && (
        <GlassCard className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-muted)]">
            {t('competition.phaseControl', 'Phase Control')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {participantMode === 'team' && (
              <Button
                size="sm"
                variant={currentPhase === 'team-formation' ? 'default' : 'outline'}
                onClick={() => onPhaseChange('team-formation')}
              >
                {t('competition.phase.teamFormation', 'Team Formation')}
              </Button>
            )}
            <Button
              size="sm"
              variant={currentPhase === 'waiting' ? 'default' : 'outline'}
              onClick={() => onPhaseChange('waiting')}
            >
              {t('competition.phase.waiting', 'Waiting')}
            </Button>
            <Button
              size="sm"
              variant={currentPhase === 'question' ? 'default' : 'outline'}
              onClick={() => onPhaseChange('question')}
            >
              {t('competition.phase.question', 'Question')}
            </Button>
            <Button
              size="sm"
              variant={currentPhase === 'revealing' ? 'default' : 'outline'}
              onClick={() => onPhaseChange('revealing')}
            >
              {t('competition.phase.revealing', 'Revealing')}
            </Button>
            <Button
              size="sm"
              variant={currentPhase === 'leaderboard' ? 'default' : 'outline'}
              onClick={() => onPhaseChange('leaderboard')}
            >
              {t('competition.phase.leaderboard', 'Leaderboard')}
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
