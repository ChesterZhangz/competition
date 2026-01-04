import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { cn } from '@/lib/utils';
import { type CompetitionMode } from '@/types/competition';

// Tutorial role type
type TutorialRole = 'host' | 'participant' | 'referee';
type TutorialPhase = 'intro' | 'setup' | 'waiting' | 'countdown' | 'question' | 'answering' | 'revealing' | 'leaderboard' | 'finished';

// Mock participant data
const MOCK_PARTICIPANTS = [
  { id: 'p1', nickname: '小明', score: 0, isOnline: true, rank: 1 },
  { id: 'p2', nickname: 'Alice', score: 0, isOnline: true, rank: 2 },
  { id: 'p3', nickname: '学霸王', score: 0, isOnline: true, rank: 3 },
  { id: 'p4', nickname: 'MathGenius', score: 0, isOnline: true, rank: 4 },
  { id: 'p5', nickname: '积分小能手', score: 0, isOnline: false, rank: 5 },
];

// Mock questions
const MOCK_QUESTIONS = [
  {
    id: 'q1',
    order: 1,
    content: '计算不定积分 $\\int x^2 \\, dx = ?$',
    type: 'integral' as const,
    correctAnswer: 'x³/3',
    points: 100,
    timeLimit: 60,
  },
  {
    id: 'q2',
    order: 2,
    content: '若 $f(x) = x^3 + 2x$，则 $f\'(x) = ?$',
    type: 'blank' as const,
    correctAnswer: '3x² + 2',
    points: 100,
    timeLimit: 60,
  },
  {
    id: 'q3',
    order: 3,
    content: '下列哪个是 $\\sin x$ 的原函数？',
    type: 'choice' as const,
    options: [
      { id: 'A', label: 'A', content: '$\\cos x$' },
      { id: 'B', label: 'B', content: '$-\\cos x$' },
      { id: 'C', label: 'C', content: '$\\tan x$' },
      { id: 'D', label: 'D', content: '$-\\sin x$' },
    ],
    correctAnswer: 'B',
    points: 100,
    timeLimit: 60,
  },
];

// Tutorial step definition
interface TutorialStep {
  id: string;
  phase: TutorialPhase;
  titleKey: string;
  descriptionKey: string;
  highlightArea?: string;
  action?: () => void;
  autoAdvanceAfter?: number;
}

// Icons
function HostIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ParticipantIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 18h8" />
    </svg>
  );
}

function RefereeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="5" />
      <path d="M3 21v-2a4 4 0 014-4h10a4 4 0 014 4v2" />
      <path d="M12 13v3M10 14l2 2 2-2" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 22V8a2 2 0 00-2-2H6v6a6 6 0 006 6v4" />
      <path d="M14 22V8a2 2 0 012-2h2v6a6 6 0 01-6 6" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function HourglassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22" />
      <path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2" />
    </svg>
  );
}

function CelebrationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5.8 11.3L2 22l10.7-3.8" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="M22 2l-2.24.75a2.9 2.9 0 00-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="M22 13l-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="M11 2l.33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
    </svg>
  );
}

export function CompetitionTutorialPage() {
  const { t } = useTranslation();

  // State
  const [mode, setMode] = useState<CompetitionMode>('onsite');
  const [role, setRole] = useState<TutorialRole>('host');
  const [phase, setPhase] = useState<TutorialPhase>('intro');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tutorial steps based on mode and role
  const getTutorialSteps = useCallback((): TutorialStep[] => {
    const baseSteps: TutorialStep[] = [
      {
        id: 'intro',
        phase: 'intro',
        titleKey: 'competition.tutorial.step.intro.title',
        descriptionKey: 'competition.tutorial.step.intro.description',
      },
      {
        id: 'setup',
        phase: 'setup',
        titleKey: 'competition.tutorial.step.setup.title',
        descriptionKey: 'competition.tutorial.step.setup.description',
      },
      {
        id: 'waiting',
        phase: 'waiting',
        titleKey: 'competition.tutorial.step.waiting.title',
        descriptionKey: 'competition.tutorial.step.waiting.description',
      },
      {
        id: 'countdown',
        phase: 'countdown',
        titleKey: 'competition.tutorial.step.countdown.title',
        descriptionKey: 'competition.tutorial.step.countdown.description',
        autoAdvanceAfter: 3000,
      },
      {
        id: 'question',
        phase: 'question',
        titleKey: 'competition.tutorial.step.question.title',
        descriptionKey: 'competition.tutorial.step.question.description',
      },
      {
        id: 'answering',
        phase: 'answering',
        titleKey: 'competition.tutorial.step.answering.title',
        descriptionKey: 'competition.tutorial.step.answering.description',
      },
      {
        id: 'revealing',
        phase: 'revealing',
        titleKey: 'competition.tutorial.step.revealing.title',
        descriptionKey: 'competition.tutorial.step.revealing.description',
      },
      {
        id: 'leaderboard',
        phase: 'leaderboard',
        titleKey: 'competition.tutorial.step.leaderboard.title',
        descriptionKey: 'competition.tutorial.step.leaderboard.description',
      },
      {
        id: 'finished',
        phase: 'finished',
        titleKey: 'competition.tutorial.step.finished.title',
        descriptionKey: 'competition.tutorial.step.finished.description',
      },
    ];

    return baseSteps;
  }, []);

  const steps = getTutorialSteps();
  const currentStep = steps[currentStepIndex];
  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (isPlaying && phase === 'question' && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }

    if (timeRemaining === 0 && phase === 'question') {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, phase, timeRemaining]);

  // Handle time up
  const handleTimeUp = () => {
    setPhase('revealing');
    setShowAnswer(true);
    simulateScoring();
  };

  // Simulate scoring
  const simulateScoring = () => {
    setParticipants(prev => prev.map((p) => {
      const isCorrect = Math.random() > 0.4;
      const bonus = Math.floor(Math.random() * 20);
      const score = isCorrect ? 100 + bonus : 0;
      return {
        ...p,
        score: p.score + score,
      };
    }).sort((a, b) => b.score - a.score).map((p, idx) => ({ ...p, rank: idx + 1 })));
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setPhase(steps[nextIndex].phase);

      // Reset state for new phase
      if (steps[nextIndex].phase === 'question') {
        setTimeRemaining(60);
        setUserAnswer('');
        setShowAnswer(false);
      }
    }
  };

  // Navigate to previous step
  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setPhase(steps[prevIndex].phase);
    }
  };

  // Start simulation
  const startSimulation = () => {
    setIsPlaying(true);
    setPhase('countdown');
    setCurrentStepIndex(3);

    // Auto advance from countdown
    setTimeout(() => {
      setPhase('question');
      setCurrentStepIndex(4);
    }, 3000);
  };

  // Submit answer (participant role)
  const submitAnswer = () => {
    if (!userAnswer.trim()) return;
    setPhase('revealing');
    setShowAnswer(true);
    simulateScoring();
    setCurrentStepIndex(6);
  };

  // Next question
  const nextQuestion = () => {
    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeRemaining(60);
      setUserAnswer('');
      setShowAnswer(false);
      setPhase('question');
      setCurrentStepIndex(4);
    } else {
      setPhase('finished');
      setCurrentStepIndex(8);
    }
  };

  // Show leaderboard
  const showLeaderboard = () => {
    setPhase('leaderboard');
    setCurrentStepIndex(7);
  };

  // Reset tutorial
  const resetTutorial = () => {
    setPhase('intro');
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setTimeRemaining(60);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
    setParticipants(MOCK_PARTICIPANTS);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render role selector
  const renderRoleSelector = () => (
    <div className="grid grid-cols-3 gap-4">
      {[
        { id: 'host' as TutorialRole, icon: HostIcon, labelKey: 'competition.tutorial.role.host', descKey: 'competition.tutorial.role.hostDesc' },
        { id: 'participant' as TutorialRole, icon: ParticipantIcon, labelKey: 'competition.tutorial.role.participant', descKey: 'competition.tutorial.role.participantDesc' },
        { id: 'referee' as TutorialRole, icon: RefereeIcon, labelKey: 'competition.tutorial.role.referee', descKey: 'competition.tutorial.role.refereeDesc' },
      ].map(({ id, icon: Icon, labelKey, descKey }) => (
        <button
          key={id}
          onClick={() => setRole(id)}
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all',
            role === id
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
          )}
        >
          <Icon className={cn('h-12 w-12', role === id ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]')} />
          <div className="text-center">
            <p className="font-semibold">{t(labelKey, id)}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{t(descKey, '')}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // Render mode selector
  const renderModeSelector = () => (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => setMode('onsite')}
        className={cn(
          'rounded-xl border-2 p-4 text-left transition-all',
          mode === 'onsite'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
        )}
      >
        <h4 className="font-semibold">{t('competition.mode.onsiteTitle', 'On-Site Mode')}</h4>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t('competition.mode.onsiteDesc', 'Host controls via display screen')}
        </p>
      </button>
      <button
        onClick={() => setMode('online')}
        className={cn(
          'rounded-xl border-2 p-4 text-left transition-all',
          mode === 'online'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
        )}
      >
        <h4 className="font-semibold">{t('competition.mode.onlineTitle', 'Online Mode')}</h4>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t('competition.mode.onlineDesc', 'Automated rules, self-paced')}
        </p>
      </button>
    </div>
  );

  // Render host view
  const renderHostView = () => (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Display */}
      <div className="lg:col-span-2">
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('competition.tutorial.hostView.display', 'Display Screen')}</h3>
            {phase === 'question' && (
              <div className={cn(
                'rounded-lg px-4 py-2 font-mono text-2xl font-bold',
                timeRemaining <= 10 ? 'bg-red-500/20 text-red-500' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
              )}>
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[300px] flex-col items-center justify-center text-center"
              >
                <h2 className="mb-4 text-2xl font-bold">{t('competition.tutorial.intro.title', 'Welcome to Competition Tutorial')}</h2>
                <p className="text-[var(--color-muted)]">
                  {t('competition.tutorial.intro.description', 'Learn how to host and participate in math competitions')}
                </p>
              </motion.div>
            )}

            {phase === 'waiting' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[300px] flex-col items-center justify-center"
              >
                <div className="mb-6 text-6xl font-bold text-[var(--color-primary)]">
                  {participants.filter(p => p.isOnline).length}
                </div>
                <p className="text-xl">{t('competition.tutorial.waiting.joined', 'participants joined')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {participants.map(p => (
                    <span
                      key={p.id}
                      className={cn(
                        'rounded-full px-3 py-1 text-sm',
                        p.isOnline ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                      )}
                    >
                      {p.nickname}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === 'countdown' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="flex min-h-[300px] items-center justify-center"
              >
                <motion.div
                  key={timeRemaining}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-9xl font-bold text-[var(--color-primary)]"
                >
                  3
                </motion.div>
              </motion.div>
            )}

            {(phase === 'question' || phase === 'answering' || phase === 'revealing') && currentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="min-h-[300px]"
              >
                <div className="mb-4 text-sm text-[var(--color-muted)]">
                  {t('competition.questionOf', 'Question {{current}} / {{total}}', {
                    current: currentQuestionIndex + 1,
                    total: MOCK_QUESTIONS.length,
                  })}
                </div>
                <div className="rounded-xl bg-[var(--color-card)] p-6">
                  <LaTeXRenderer content={currentQuestion.content} className="text-xl" />
                </div>
                {currentQuestion.options && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {currentQuestion.options.map(option => (
                      <div
                        key={option.id}
                        className={cn(
                          'rounded-xl border-2 p-4 transition-all',
                          showAnswer && option.id === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-[var(--color-border)]'
                        )}
                      >
                        <span className="font-bold text-[var(--color-primary)]">{option.label}.</span>
                        <span className="ml-2"><LaTeXRenderer content={option.content} /></span>
                      </div>
                    ))}
                  </div>
                )}
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-xl bg-green-500/10 p-4 text-center"
                  >
                    <p className="font-semibold text-green-500">
                      {t('competition.correctAnswerIs', 'Correct Answer')}: {currentQuestion.correctAnswer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {phase === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[300px]"
              >
                <h3 className="mb-4 text-xl font-bold text-center">{t('competition.leaderboard', 'Leaderboard')}</h3>
                <div className="space-y-2">
                  {participants.slice(0, 5).map((p, i) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center justify-between rounded-xl p-4',
                        i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-300/20' : i === 2 ? 'bg-orange-500/20' : 'bg-[var(--color-card)]'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold">{p.rank}</span>
                        <span className="font-medium">{p.nickname}</span>
                      </div>
                      <span className="text-xl font-bold text-[var(--color-primary)]">{p.score}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === 'finished' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex min-h-[300px] flex-col items-center justify-center text-center"
              >
                <div className="mb-4 flex justify-center">
                  <TrophyIcon className="h-16 w-16 text-yellow-500" />
                </div>
                <h2 className="text-3xl font-bold">{t('competition.gameOver', 'Competition Ended!')}</h2>
                <p className="mt-2 text-xl text-[var(--color-muted)]">
                  {t('competition.tutorial.finished.winner', 'Winner')}: {participants[0]?.nickname}
                </p>
                <p className="mt-1 text-[var(--color-primary)]">
                  {participants[0]?.score} {t('competition.points', 'points')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Control Panel */}
      <div className="space-y-4">
        <GlassCard className="p-4">
          <h3 className="mb-4 font-semibold">{t('competition.tutorial.hostView.controls', 'Host Controls')}</h3>
          <div className="space-y-3">
            {phase === 'intro' && (
              <Button onClick={() => { setPhase('setup'); setCurrentStepIndex(1); }} className="w-full">
                {t('competition.tutorial.action.startSetup', 'Start Setup')}
              </Button>
            )}
            {phase === 'setup' && (
              <Button onClick={() => { setPhase('waiting'); setCurrentStepIndex(2); }} className="w-full">
                {t('competition.tutorial.action.openJoin', 'Open for Joining')}
              </Button>
            )}
            {phase === 'waiting' && (
              <Button onClick={startSimulation} className="w-full">
                <PlayIcon className="mr-2 h-4 w-4" />
                {t('competition.startCompetition', 'Start Competition')}
              </Button>
            )}
            {phase === 'question' && (
              <>
                <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline" className="w-full">
                  {isPlaying ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                  {isPlaying ? t('competition.pause', 'Pause') : t('competition.resume', 'Resume')}
                </Button>
                <Button onClick={handleTimeUp} className="w-full">
                  {t('competition.revealAnswer', 'Reveal Answer')}
                </Button>
              </>
            )}
            {phase === 'revealing' && (
              <>
                <Button onClick={showLeaderboard} variant="outline" className="w-full">
                  {t('competition.showLeaderboard', 'Show Leaderboard')}
                </Button>
                <Button onClick={nextQuestion} className="w-full">
                  <NextIcon className="mr-2 h-4 w-4" />
                  {currentQuestionIndex < MOCK_QUESTIONS.length - 1
                    ? t('competition.nextQuestion', 'Next Question')
                    : t('competition.end', 'End Competition')}
                </Button>
              </>
            )}
            {phase === 'leaderboard' && (
              <Button onClick={nextQuestion} className="w-full">
                <NextIcon className="mr-2 h-4 w-4" />
                {currentQuestionIndex < MOCK_QUESTIONS.length - 1
                  ? t('competition.nextQuestion', 'Next Question')
                  : t('competition.end', 'End Competition')}
              </Button>
            )}
            {phase === 'finished' && (
              <Button onClick={resetTutorial} className="w-full">
                {t('competition.tutorial.action.restart', 'Restart Tutorial')}
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Participants Panel */}
        <GlassCard className="p-4">
          <h3 className="mb-4 font-semibold">{t('competition.participants', 'Participants')}</h3>
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', p.isOnline ? 'bg-green-500' : 'bg-gray-500')} />
                  <span>{p.nickname}</span>
                </div>
                <span className="font-medium">{p.score}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );

  // Render participant view
  const renderParticipantView = () => (
    <div className="mx-auto max-w-2xl">
      <GlassCard className="p-6">
        <AnimatePresence mode="wait">
          {(phase === 'intro' || phase === 'setup') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
            >
              <div className="mb-4 flex justify-center">
                <PhoneIcon className="h-16 w-16 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-2xl font-bold">{t('competition.tutorial.participant.scanToJoin', 'Scan to Join')}</h2>
              <div className="mt-6 rounded-xl bg-[var(--color-card)] p-8">
                <div className="h-32 w-32 bg-gray-300" />
              </div>
              <p className="mt-4 text-[var(--color-muted)]">
                {t('competition.tutorial.participant.orEnterCode', 'Or enter code')}: <span className="font-mono font-bold">ABC123</span>
              </p>
              <Button onClick={() => { setPhase('waiting'); setCurrentStepIndex(2); }} className="mt-6">
                {t('competition.tutorial.action.joinNow', 'Join Now')}
              </Button>
            </motion.div>
          )}

          {phase === 'waiting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
            >
              <div className="mb-4 flex animate-pulse justify-center">
                <HourglassIcon className="h-16 w-16 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-2xl font-bold">{t('competition.waitingForHost', 'Waiting for host to start...')}</h2>
              <p className="mt-2 text-[var(--color-muted)]">
                {participants.filter(p => p.isOnline).length} {t('competition.participantsJoined', 'participants joined')}
              </p>
              <Button onClick={startSimulation} variant="outline" className="mt-6">
                {t('competition.tutorial.action.simulateStart', 'Simulate Start')}
              </Button>
            </motion.div>
          )}

          {phase === 'countdown' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[400px] items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-9xl font-bold text-[var(--color-primary)]"
              >
                3
              </motion.div>
            </motion.div>
          )}

          {(phase === 'question' || phase === 'answering') && currentQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-[400px]"
            >
              {/* On-site mode: Show "Watch host screen" message */}
              {mode === 'onsite' ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className={cn(
                      'rounded-lg px-4 py-2 font-mono text-xl font-bold',
                      timeRemaining <= 10 ? 'bg-red-500/20 text-red-500' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    )}>
                      {formatTime(timeRemaining)}
                    </div>
                  </div>

                  <div className="mb-4 rounded-full bg-blue-500/20 p-4">
                    <svg className="h-16 w-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">{t('competition.watchHostScreen', 'Watch the Host Screen')}</h2>
                  <p className="mt-2 text-center text-[var(--color-muted)]">
                    {t('competition.onsiteQuestionHint', 'The question is displayed on the main screen. Watch the projection for the current question!')}
                  </p>
                  <div className="mt-4 rounded-lg bg-[var(--color-primary)]/20 px-4 py-2">
                    <span className="text-sm text-[var(--color-muted)]">{t('competition.currentQuestion', 'Current Question')}: </span>
                    <span className="font-bold text-[var(--color-primary)]">Q{currentQuestionIndex + 1}</span>
                  </div>
                </div>
              ) : (
                /* Online mode: Show question and allow answering */
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-[var(--color-muted)]">
                      {t('competition.questionOf', 'Question {{current}} / {{total}}', {
                        current: currentQuestionIndex + 1,
                        total: MOCK_QUESTIONS.length,
                      })}
                    </span>
                    <div className={cn(
                      'rounded-lg px-4 py-2 font-mono text-xl font-bold',
                      timeRemaining <= 10 ? 'bg-red-500/20 text-red-500' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    )}>
                      {formatTime(timeRemaining)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[var(--color-card)] p-6">
                    <LaTeXRenderer content={currentQuestion.content} className="text-lg" />
                  </div>

                  {currentQuestion.options ? (
                    <div className="mt-4 grid gap-3">
                      {currentQuestion.options.map(option => (
                        <button
                          key={option.id}
                          onClick={() => { setUserAnswer(option.id); submitAnswer(); }}
                          className={cn(
                            'rounded-xl border-2 p-4 text-left transition-all hover:border-[var(--color-primary)]',
                            userAnswer === option.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'border-[var(--color-border)]'
                          )}
                        >
                          <span className="font-bold text-[var(--color-primary)]">{option.label}.</span>
                          <span className="ml-2"><LaTeXRenderer content={option.content} /></span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder={t('competition.typeAnswer', 'Type your answer...')}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 focus:border-[var(--color-primary)] focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                      />
                      <Button onClick={submitAnswer} className="mt-4 w-full" disabled={!userAnswer.trim()}>
                        {t('common.submit', 'Submit')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {phase === 'revealing' && currentQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
            >
              {mode === 'onsite' ? (
                /* On-site mode: Show that answer was revealed on host screen */
                <>
                  <div className="mb-4 rounded-full bg-green-500/20 p-4">
                    <svg className="h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">{t('competition.answerRevealed', 'Answer Revealed')}</h2>
                  <p className="mt-2 text-[var(--color-muted)]">
                    {t('competition.watchHostForAnswer', 'Check the host screen for the correct answer!')}
                  </p>
                  <div className="mt-4 rounded-xl bg-green-500/10 p-4">
                    <p className="text-sm text-[var(--color-muted)]">{t('competition.correctAnswer', 'Correct Answer')}</p>
                    <p className="text-xl font-bold text-green-500">{currentQuestion.correctAnswer}</p>
                  </div>
                </>
              ) : (
                /* Online mode: Show user's result */
                <>
                  {userAnswer === currentQuestion.correctAnswer ? (
                    <>
                      <div className="mb-4 text-6xl text-green-500"><CheckIcon className="h-16 w-16" /></div>
                      <h2 className="text-2xl font-bold text-green-500">{t('competition.tutorial.result.correct', 'Correct!')}</h2>
                      <p className="mt-2 text-xl">+100 {t('competition.points', 'points')}</p>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 text-6xl text-red-500"><CrossIcon className="h-16 w-16" /></div>
                      <h2 className="text-2xl font-bold text-red-500">{t('competition.tutorial.result.incorrect', 'Incorrect')}</h2>
                      <p className="mt-2 text-[var(--color-muted)]">
                        {t('competition.correctAnswerIs', 'Correct Answer')}: {currentQuestion.correctAnswer}
                      </p>
                    </>
                  )}
                </>
              )}
              <Button onClick={() => { setPhase('leaderboard'); setCurrentStepIndex(7); }} className="mt-6">
                {t('competition.tutorial.action.viewLeaderboard', 'View Leaderboard')}
              </Button>
            </motion.div>
          )}

          {phase === 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-[400px]"
            >
              <h2 className="mb-6 text-center text-2xl font-bold">{t('competition.leaderboard', 'Leaderboard')}</h2>
              <div className="space-y-3">
                {participants.map((p, i) => (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between rounded-xl p-4',
                      p.id === 'p1' ? 'bg-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]' :
                      i === 0 ? 'bg-yellow-500/20' : 'bg-[var(--color-card)]'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold">{p.rank}</span>
                      <span>{p.nickname}</span>
                      {p.id === 'p1' && <span className="text-xs text-[var(--color-primary)]">({t('competition.tutorial.you', 'You')})</span>}
                    </div>
                    <span className="font-bold">{p.score}</span>
                  </div>
                ))}
              </div>
              <Button onClick={nextQuestion} className="mt-6 w-full">
                {currentQuestionIndex < MOCK_QUESTIONS.length - 1
                  ? t('competition.tutorial.action.waitNext', 'Wait for Next Question')
                  : t('competition.tutorial.action.viewResults', 'View Final Results')}
              </Button>
            </motion.div>
          )}

          {phase === 'finished' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
            >
              <div className="mb-4 flex justify-center">
                <CelebrationIcon className="h-16 w-16 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-3xl font-bold">{t('competition.thanksForParticipating', 'Thanks for participating!')}</h2>
              <div className="mt-6 rounded-xl bg-[var(--color-card)] p-6">
                <p className="text-[var(--color-muted)]">{t('competition.yourRank', 'Your Rank')}</p>
                <p className="text-4xl font-bold">#{participants.find(p => p.id === 'p1')?.rank || 1}</p>
                <p className="mt-2 text-[var(--color-muted)]">{t('competition.totalScore', 'Total Score')}</p>
                <p className="text-2xl font-bold text-[var(--color-primary)]">
                  {participants.find(p => p.id === 'p1')?.score || 0}
                </p>
              </div>
              <Button onClick={resetTutorial} className="mt-6">
                {t('competition.tutorial.action.restart', 'Restart Tutorial')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );

  // Render referee view
  const renderRefereeView = () => (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main View */}
      <div className="lg:col-span-2">
        <GlassCard className="p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('competition.tutorial.refereeView.submissions', 'Live Submissions')}</h3>

          {(phase === 'question' || phase === 'revealing') && currentQuestion ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-[var(--color-card)] p-4">
                <p className="text-sm text-[var(--color-muted)]">
                  {t('competition.referee.currentQuestion', 'Current Question')}
                </p>
                <LaTeXRenderer content={currentQuestion.content} className="mt-2" />
              </div>

              <div className="space-y-2">
                {participants.map(p => {
                  const hasSubmitted = Math.random() > 0.3;
                  const isCorrect = Math.random() > 0.4;
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-[var(--color-card)] p-3">
                      <div className="flex items-center gap-3">
                        <span className={cn('h-2 w-2 rounded-full', p.isOnline ? 'bg-green-500' : 'bg-gray-500')} />
                        <span>{p.nickname}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {hasSubmitted ? (
                          <>
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            )}>
                              {isCorrect ? t('competition.referee.correct', 'Correct') : t('competition.referee.incorrect', 'Incorrect')}
                            </span>
                            <span className="font-medium">{isCorrect ? '+100' : '0'}</span>
                            <div className="flex gap-1">
                              <button className="rounded p-1 hover:bg-green-500/20">
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              </button>
                              <button className="rounded p-1 hover:bg-red-500/20">
                                <CrossIcon className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-[var(--color-muted)]">{t('competition.tutorial.refereeView.waiting', 'Waiting...')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center text-[var(--color-muted)]">
              {t('competition.tutorial.refereeView.noActiveQuestion', 'No active question')}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Stats Panel */}
      <div className="space-y-4">
        <GlassCard className="p-4">
          <h3 className="mb-4 font-semibold">{t('competition.referee.stats', 'Statistics')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.participants', 'Participants')}</span>
              <span className="font-bold">{participants.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.referee.submissions', 'Submissions')}</span>
              <span className="font-bold">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.referee.correct', 'Correct')}</span>
              <span className="font-bold text-green-500">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{t('competition.referee.incorrect', 'Incorrect')}</span>
              <span className="font-bold text-red-500">1</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <h3 className="mb-4 font-semibold">{t('competition.tutorial.refereeView.actions', 'Referee Actions')}</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              {t('competition.referee.overrideScore', 'Override Score')}
            </Button>
            <Button variant="outline" className="w-full justify-start">
              {t('competition.pause', 'Pause Competition')}
            </Button>
            <Button variant="outline" className="w-full justify-start">
              {t('competition.referee.permission.extendTime', 'Extend Time')}
            </Button>
          </div>
        </GlassCard>

        <Button onClick={startSimulation} className="w-full" disabled={phase !== 'waiting' && phase !== 'intro'}>
          {t('competition.tutorial.action.simulateStart', 'Start Demo')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('competition.tutorial.title', 'Competition Tutorial')}</h1>
          <p className="mt-1 text-[var(--color-muted)]">
            {t('competition.tutorial.description', 'Interactive guide to learn how competitions work')}
          </p>
        </div>
        <Button variant="outline" onClick={resetTutorial}>
          {t('competition.tutorial.action.reset', 'Reset Tutorial')}
        </Button>
      </div>

      {/* Progress Indicator */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted)]">
            {t('competition.tutorial.stepLabel', 'Step')} {currentStepIndex + 1} / {steps.length}
          </span>
          <span className="font-medium">{t(currentStep?.titleKey || '', currentStep?.phase || '')}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
          <motion.div
            className="h-full bg-[var(--color-primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </GlassCard>

      {/* Step Description */}
      <GlassCard className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold">
            {currentStepIndex + 1}
          </div>
          <div>
            <h3 className="font-semibold">{t(currentStep?.titleKey || '', currentStep?.phase || '')}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {t(currentStep?.descriptionKey || '', '')}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Role & Mode Selection (only in intro phase) */}
      {phase === 'intro' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="mb-4 text-lg font-semibold">{t('competition.tutorial.selectRole', 'Select Your Role')}</h3>
            {renderRoleSelector()}
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="mb-4 text-lg font-semibold">{t('competition.tutorial.selectMode', 'Select Competition Mode')}</h3>
            {renderModeSelector()}
          </GlassCard>
        </div>
      )}

      {/* Main Content based on role */}
      {phase !== 'intro' && (
        <>
          {role === 'host' && renderHostView()}
          {role === 'participant' && renderParticipantView()}
          {role === 'referee' && renderRefereeView()}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPrevStep}
          disabled={currentStepIndex === 0}
        >
          {t('common.previous', 'Previous')}
        </Button>
        <Button
          onClick={goToNextStep}
          disabled={currentStepIndex === steps.length - 1}
        >
          {t('common.next', 'Next')}
        </Button>
      </div>
    </div>
  );
}
