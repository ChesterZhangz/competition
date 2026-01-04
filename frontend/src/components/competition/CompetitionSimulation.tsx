import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import {
  type CompetitionSettings,
  type CompetitionPhase,
  type Participant,
  type Team,
  type ParticipantMode,
  type ScoreAdjustment,
  type CustomThemeColors,
  getThemeColors,
  TEAM_COLORS,
  MOCK_NICKNAMES,
  MOCK_TEAM_NAMES,
} from '@/types/competition';

interface CompetitionSimulationProps {
  settings: CompetitionSettings;
  onClose: () => void;
  className?: string;
}

// Mock questions with LaTeX support
interface SimulationQuestion {
  id: string;
  number: number;
  content: string;
  type: 'choice' | 'blank' | 'integral';
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer: string;
  points: number;
}

const SIMULATION_QUESTIONS: SimulationQuestion[] = [
  {
    id: 'q1',
    number: 1,
    content: '$\\displaystyle\\int x^2 \\, dx = ?$',
    type: 'choice',
    options: [
      { id: 'a', label: 'A', content: '$\\frac{x^3}{3} + C$' },
      { id: 'b', label: 'B', content: '$2x + C$' },
      { id: 'c', label: 'C', content: '$x^3 + C$' },
      { id: 'd', label: 'D', content: '$\\frac{x^2}{2} + C$' },
    ],
    correctAnswer: 'a',
    points: 100,
  },
  {
    id: 'q2',
    number: 2,
    content: '$\\displaystyle\\lim_{x \\to 0} \\frac{\\sin x}{x} = ?$',
    type: 'blank',
    correctAnswer: '1',
    points: 100,
  },
  {
    id: 'q3',
    number: 3,
    content: '数列 $1, 1, 2, 3, 5, 8, 13, ?$ 下一项是多少？',
    type: 'blank',
    correctAnswer: '21',
    points: 80,
  },
  {
    id: 'q4',
    number: 4,
    content: '$\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = ?$',
    type: 'choice',
    options: [
      { id: 'a', label: 'A', content: '$\\frac{\\pi^2}{6}$' },
      { id: 'b', label: 'B', content: '$\\pi$' },
      { id: 'c', label: 'C', content: '$\\frac{\\pi}{2}$' },
      { id: 'd', label: 'D', content: '$1$' },
    ],
    correctAnswer: 'a',
    points: 120,
  },
  {
    id: 'q5',
    number: 5,
    content: '求导数：$\\frac{d}{dx}(x^3 + 2x^2 - 5x + 1) = ?$',
    type: 'blank',
    correctAnswer: '3x^2+4x-5',
    points: 100,
  },
  {
    id: 'q6',
    number: 6,
    content: '如果 $f(x) = e^x$，则 $f\'(0) = ?$',
    type: 'blank',
    correctAnswer: '1',
    points: 80,
  },
  {
    id: 'q7',
    number: 7,
    content: '$\\displaystyle\\int \\cos x \\, dx = ?$',
    type: 'choice',
    options: [
      { id: 'a', label: 'A', content: '$\\sin x + C$' },
      { id: 'b', label: 'B', content: '$-\\sin x + C$' },
      { id: 'c', label: 'C', content: '$\\cos x + C$' },
      { id: 'd', label: 'D', content: '$-\\cos x + C$' },
    ],
    correctAnswer: 'a',
    points: 100,
  },
  {
    id: 'q8',
    number: 8,
    content: '方程 $x^2 - 5x + 6 = 0$ 的两个根之和等于？',
    type: 'blank',
    correctAnswer: '5',
    points: 80,
  },
];

// Generate random participants
function generateParticipants(count: number): Participant[] {
  const shuffledNicknames = [...MOCK_NICKNAMES].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i + 1}`,
    nickname: shuffledNicknames[i % shuffledNicknames.length],
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    status: 'waiting' as const,
    isOnline: true,
    currentStreak: 0,
  }));
}

// Generate teams with members
function generateTeams(participants: Participant[], teamSize: number): Team[] {
  const shuffledTeamNames = [...MOCK_TEAM_NAMES].sort(() => Math.random() - 0.5);
  const teams: Team[] = [];
  const teamCount = Math.ceil(participants.length / teamSize);

  for (let i = 0; i < teamCount; i++) {
    const start = i * teamSize;
    const end = Math.min(start + teamSize, participants.length);
    const members = participants.slice(start, end).map((p) => ({
      ...p,
      teamId: `team-${i + 1}`,
    }));

    teams.push({
      id: `team-${i + 1}`,
      name: shuffledTeamNames[i % shuffledTeamNames.length],
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      captainId: members[0]?.id || '',
      members,
      totalScore: 0,
      averageScore: 0,
      correctCount: 0,
      wrongCount: 0,
    });
  }

  return teams;
}

export function CompetitionSimulation({
  settings,
  onClose,
  className,
}: CompetitionSimulationProps) {
  const { t } = useTranslation();
  const colors = getThemeColors(settings.theme);

  // Simulation state
  const [phase, setPhase] = useState<CompetitionPhase>('setup');
  const [participantMode, setParticipantMode] = useState<ParticipantMode>(
    settings.participantMode || 'individual'
  );
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(settings.questionTimeLimit || 60);
  const [scoreAdjustments, setScoreAdjustments] = useState<ScoreAdjustment[]>([]);
  const [showRefereePanel, setShowRefereePanel] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'participant' | 'team'; id: string } | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [countdownNumber, setCountdownNumber] = useState(3);

  const totalQuestions = SIMULATION_QUESTIONS.length;

  // Initialize participants
  useEffect(() => {
    const initialParticipants = generateParticipants(12);
    setParticipants(initialParticipants);

    if (participantMode === 'team') {
      const initialTeams = generateTeams(initialParticipants, settings.teamSize || 4);
      setTeams(initialTeams);
    }
  }, [participantMode, settings.teamSize]);

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    const timer = setInterval(() => {
      setCountdownNumber((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('question');
          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Question timer effect
  useEffect(() => {
    if (phase !== 'question') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setPhase('revealing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Simulate answers when revealing
  useEffect(() => {
    if (phase !== 'revealing') return;

    setParticipants((prev) =>
      prev.map((p) => {
        const isCorrect = Math.random() > 0.4;
        const timeBonus = Math.floor(Math.random() * 50);
        const points = isCorrect ? (settings.basePoints || 100) + timeBonus : 0;

        return {
          ...p,
          score: p.score + points,
          correctCount: p.correctCount + (isCorrect ? 1 : 0),
          wrongCount: p.wrongCount + (isCorrect ? 0 : 1),
          lastAnswerCorrect: isCorrect,
          currentStreak: isCorrect ? (p.currentStreak || 0) + 1 : 0,
        };
      })
    );

    if (participantMode === 'team') {
      setTeams((prev) =>
        prev.map((team) => {
          const teamMembers = participants.filter((p) => p.teamId === team.id);
          const totalScore = teamMembers.reduce((sum, m) => sum + m.score, 0);
          const correctCount = teamMembers.reduce((sum, m) => sum + m.correctCount, 0);
          const wrongCount = teamMembers.reduce((sum, m) => sum + m.wrongCount, 0);

          return {
            ...team,
            totalScore,
            averageScore: totalScore / teamMembers.length,
            correctCount,
            wrongCount,
          };
        })
      );
    }

    const timer = setTimeout(() => {
      setPhase('leaderboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, participantMode, settings.basePoints, participants]);

  // Auto advance from leaderboard
  useEffect(() => {
    if (phase !== 'leaderboard') return;

    const timer = setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTimeRemaining(settings.questionTimeLimit || 60);
        setPhase('question');
      } else {
        setPhase('finished');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [phase, currentQuestionIndex, settings.questionTimeLimit, totalQuestions]);

  // Start competition
  const handleStart = useCallback(() => {
    setPhase('countdown');
    setCountdownNumber(3);
  }, []);

  // Handle mode change
  const handleModeChange = useCallback(
    (mode: ParticipantMode) => {
      setParticipantMode(mode);
      const newParticipants = generateParticipants(12);
      setParticipants(newParticipants);

      if (mode === 'team') {
        setTeams(generateTeams(newParticipants, settings.teamSize || 4));
      } else {
        setTeams([]);
      }
    },
    [settings.teamSize]
  );

  // Handle score adjustment
  const handleScoreAdjust = useCallback(() => {
    if (!selectedTarget || adjustmentValue === 0) return;

    const adjustment: ScoreAdjustment = {
      id: `adj-${Date.now()}`,
      refereeId: 'referee-1',
      refereeName: t('simulation.referee', 'Referee'),
      targetType: selectedTarget.type,
      targetId: selectedTarget.id,
      targetName: '',
      previousScore: 0,
      adjustment: adjustmentValue,
      newScore: 0,
      reason: adjustmentReason || t('simulation.manualAdjustment', 'Manual adjustment'),
      timestamp: new Date(),
    };

    if (selectedTarget.type === 'participant') {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === selectedTarget.id) {
            adjustment.targetName = p.nickname;
            adjustment.previousScore = p.score;
            adjustment.newScore = p.score + adjustmentValue;
            return { ...p, score: p.score + adjustmentValue };
          }
          return p;
        })
      );
    } else {
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id === selectedTarget.id) {
            adjustment.targetName = team.name;
            adjustment.previousScore = team.totalScore;
            adjustment.newScore = team.totalScore + adjustmentValue;
            return { ...team, totalScore: team.totalScore + adjustmentValue };
          }
          return team;
        })
      );
    }

    setScoreAdjustments((prev) => [adjustment, ...prev]);
    setSelectedTarget(null);
    setAdjustmentValue(0);
    setAdjustmentReason('');
  }, [selectedTarget, adjustmentValue, adjustmentReason, t]);

  // Sort and rank participants/teams
  const rankedParticipants = useMemo(() => {
    return [...participants]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [participants]);

  const rankedTeams = useMemo(() => {
    return [...teams]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [teams]);

  // Get visible questions based on layout
  const getVisibleQuestions = (): SimulationQuestion[] => {
    if (settings.layout === 'single') {
      return [SIMULATION_QUESTIONS[currentQuestionIndex]];
    }
    const start = Math.floor(currentQuestionIndex / settings.questionsPerPage) * settings.questionsPerPage;
    return SIMULATION_QUESTIONS.slice(start, start + settings.questionsPerPage);
  };

  const visibleQuestions = getVisibleQuestions();
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div
      className={cn('fixed inset-0 z-50 flex flex-col overflow-hidden', className)}
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-6 py-4"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">
            {t('simulation.title', 'Competition Simulation')}
          </h1>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm text-white">
            {participantMode === 'team'
              ? t('simulation.teamMode', 'Team Mode')
              : t('simulation.individualMode', 'Individual Mode')}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
            {settings.mode === 'onsite' ? t('competition.mode.onsite', 'On-Site') : t('competition.mode.online', 'Online')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {settings.mode === 'onsite' && settings.allowReferee && phase !== 'setup' && (
            <Button
              variant="outline"
              onClick={() => setShowRefereePanel(!showRefereePanel)}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <GavelIcon className="mr-2 h-4 w-4" />
              {t('simulation.refereePanel', 'Referee')}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {settings.showProgress && phase !== 'setup' && (
        <div className="h-1 shrink-0" style={{ backgroundColor: colors.secondary + '40' }}>
          <motion.div
            className="h-full"
            style={{ backgroundColor: colors.accent }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel - Setup or Leaderboard (only for onsite) */}
        {(phase === 'setup' || settings.mode === 'onsite') && (
          <div
            className="w-80 shrink-0 overflow-auto border-r p-4"
            style={{ borderColor: colors.secondary + '40' }}
          >
            {phase === 'setup' ? (
              <SetupPanel
                settings={settings}
                colors={colors}
                participantMode={participantMode}
                onModeChange={handleModeChange}
                participants={participants}
                teams={teams}
                onStart={handleStart}
              />
            ) : (
              <ParticipantList
                colors={colors}
                participantMode={participantMode}
                participants={rankedParticipants}
                teams={rankedTeams}
                onSelectTarget={settings.mode === 'onsite' ? setSelectedTarget : undefined}
                selectedTarget={selectedTarget}
              />
            )}
          </div>
        )}

        {/* Center - Competition area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {phase === 'setup' && (
            <SetupDisplay colors={colors} settings={settings} />
          )}

          {phase === 'countdown' && (
            <CountdownDisplay colors={colors} number={countdownNumber} />
          )}

          {phase === 'question' && (
            <QuestionDisplay
              settings={settings}
              colors={colors}
              questions={visibleQuestions}
              currentIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              timeRemaining={timeRemaining}
            />
          )}

          {phase === 'revealing' && (
            <RevealingDisplay
              colors={colors}
              question={SIMULATION_QUESTIONS[currentQuestionIndex]}
            />
          )}

          {phase === 'leaderboard' && (
            <LeaderboardDisplay
              colors={colors}
              participantMode={participantMode}
              rankedParticipants={rankedParticipants}
              rankedTeams={rankedTeams}
            />
          )}

          {phase === 'finished' && (
            <FinishedDisplay
              colors={colors}
              participantMode={participantMode}
              rankedParticipants={rankedParticipants}
              rankedTeams={rankedTeams}
            />
          )}
        </div>

        {/* Right panel - Referee (if enabled) */}
        <AnimatePresence>
          {showRefereePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden border-l"
              style={{ borderColor: colors.secondary + '40' }}
            >
              <RefereePanel
                colors={colors}
                selectedTarget={selectedTarget}
                adjustmentValue={adjustmentValue}
                adjustmentReason={adjustmentReason}
                scoreAdjustments={scoreAdjustments}
                participants={participants}
                teams={teams}
                onAdjustmentValueChange={setAdjustmentValue}
                onAdjustmentReasonChange={setAdjustmentReason}
                onSubmitAdjustment={handleScoreAdjust}
                onClearSelection={() => setSelectedTarget(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Setup Panel Component
function SetupPanel({
  settings,
  colors,
  participantMode,
  onModeChange,
  participants,
  teams,
  onStart,
}: {
  settings: CompetitionSettings;
  colors: CustomThemeColors;
  participantMode: ParticipantMode;
  onModeChange: (mode: ParticipantMode) => void;
  participants: Participant[];
  teams: Team[];
  onStart: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
        {t('simulation.setup', 'Competition Setup')}
      </h2>

      {/* Settings summary */}
      <div
        className="space-y-2 rounded-lg p-3"
        style={{ backgroundColor: colors.secondary + '20' }}
      >
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.text + '80' }}>{t('competition.display.layout', 'Layout')}</span>
          <span className="font-medium capitalize" style={{ color: colors.text }}>{settings.layout}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.text + '80' }}>{t('competition.display.questionsPerPage', 'Per Page')}</span>
          <span className="font-medium" style={{ color: colors.text }}>{settings.questionsPerPage}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.text + '80' }}>{t('competition.timeLimit', 'Time Limit')}</span>
          <span className="font-medium" style={{ color: colors.text }}>{settings.questionTimeLimit}s</span>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium" style={{ color: colors.text }}>
          {t('simulation.participantMode', 'Participant Mode')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('individual')}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all"
            style={{
              borderColor: participantMode === 'individual' ? colors.primary : colors.secondary,
              backgroundColor: participantMode === 'individual' ? colors.primary + '15' : 'transparent',
            }}
          >
            <UserIcon className="h-8 w-8" style={{ color: colors.primary }} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {t('simulation.individual', 'Individual')}
            </span>
          </button>
          <button
            onClick={() => onModeChange('team')}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all"
            style={{
              borderColor: participantMode === 'team' ? colors.primary : colors.secondary,
              backgroundColor: participantMode === 'team' ? colors.primary + '15' : 'transparent',
            }}
          >
            <UsersIcon className="h-8 w-8" style={{ color: colors.primary }} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {t('simulation.team', 'Team')}
            </span>
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium" style={{ color: colors.text }}>
          {participantMode === 'team'
            ? t('simulation.teamsPreview', 'Teams ({{count}})', { count: teams.length })
            : t('simulation.participantsPreview', 'Participants ({{count}})', { count: participants.length })}
        </label>

        <div className="max-h-48 space-y-2 overflow-auto">
          {participantMode === 'team'
            ? teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 rounded-lg p-2"
                  style={{ backgroundColor: team.color + '20' }}
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
                      {team.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: colors.text + '80' }}>
                      {team.members.map((m) => m.nickname).join(', ')}
                    </p>
                  </div>
                </div>
              ))
            : participants.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg p-2"
                  style={{ backgroundColor: colors.secondary + '30' }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {p.nickname.charAt(0)}
                  </div>
                  <span className="text-sm truncate" style={{ color: colors.text }}>
                    {p.nickname}
                  </span>
                </div>
              ))}
          {participantMode === 'individual' && participants.length > 6 && (
            <p className="text-center text-xs" style={{ color: colors.text + '60' }}>
              +{participants.length - 6} {t('simulation.more', 'more')}
            </p>
          )}
        </div>
      </div>

      {/* Start Button */}
      <Button
        onClick={onStart}
        className="w-full"
        style={{ backgroundColor: colors.primary }}
      >
        <PlayIcon className="mr-2 h-5 w-5" />
        {t('simulation.startCompetition', 'Start Competition')}
      </Button>
    </div>
  );
}

// Setup Display
function SetupDisplay({ colors, settings }: { colors: CustomThemeColors; settings: CompetitionSettings }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div
        className="flex h-32 w-32 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary + '20' }}
      >
        <TrophyIcon className="h-16 w-16" style={{ color: colors.primary }} />
      </div>
      <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
        {t('simulation.readyToStart', 'Ready to Start')}
      </h2>
      <p className="text-center max-w-md" style={{ color: colors.text + '80' }}>
        {t('simulation.configureAndStart', 'Configure the competition settings on the left, then click Start.')}
      </p>
      <div className="flex gap-4 text-sm" style={{ color: colors.text + '60' }}>
        <span>{t(`competition.display.layout${settings.layout.charAt(0).toUpperCase() + settings.layout.slice(1)}`, settings.layout)}</span>
        <span>•</span>
        <span>{settings.questionsPerPage} {t('competition.display.questionsPerPage', 'per page')}</span>
        <span>•</span>
        <span>{settings.questionTimeLimit}s / {t('competition.question', 'question')}</span>
      </div>
    </div>
  );
}

// Countdown Display
function CountdownDisplay({ colors, number }: { colors: CustomThemeColors; number: number }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <motion.div
        key={number}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        className="text-9xl font-bold"
        style={{ color: colors.primary }}
      >
        {number}
      </motion.div>
      <p className="text-xl" style={{ color: colors.text }}>
        {t('simulation.getReady', 'Get Ready!')}
      </p>
    </div>
  );
}

// Question Display - respects layout settings
function QuestionDisplay({
  settings,
  colors,
  questions,
  currentIndex,
  totalQuestions,
  timeRemaining,
}: {
  settings: CompetitionSettings;
  colors: CustomThemeColors;
  questions: SimulationQuestion[];
  currentIndex: number;
  totalQuestions: number;
  timeRemaining: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Question header */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-6 py-4"
        style={{ borderColor: colors.secondary + '40' }}
      >
        {settings.showQuestionNumber && (
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            {t('simulation.question', 'Question')} {currentIndex + 1}/{totalQuestions}
          </span>
        )}
        {settings.showTimer && (
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: colors.primary + '20' }}
          >
            <TimerIcon className="h-5 w-5" style={{ color: colors.primary }} />
            <span className="font-mono text-lg font-bold" style={{ color: colors.primary }}>
              {timeRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* Questions content based on layout */}
      <div className="flex-1 overflow-auto p-6">
        {settings.layout === 'single' && questions[0] && (
          <SingleQuestionView question={questions[0]} colors={colors} settings={settings} />
        )}

        {settings.layout === 'grid' && (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(questions.length, 3)}, 1fr)`,
            }}
          >
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} colors={colors} settings={settings} />
            ))}
          </div>
        )}

        {settings.layout === 'list' && (
          <div className="space-y-4">
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} colors={colors} settings={settings} horizontal />
            ))}
          </div>
        )}
      </div>

      {/* Timer progress bar */}
      <div className="h-2 shrink-0" style={{ backgroundColor: colors.secondary + '30' }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: colors.accent }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: timeRemaining, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

// Single Question View (full size)
function SingleQuestionView({
  question,
  colors,
  settings,
}: {
  question: SimulationQuestion;
  colors: CustomThemeColors;
  settings: CompetitionSettings;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Question number */}
      {settings.showQuestionNumber && (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
          style={{
            backgroundColor: colors.primary + '20',
            color: colors.primary,
          }}
        >
          {question.number}
        </div>
      )}

      {/* Question content */}
      <div className="text-center max-w-3xl">
        <LaTeXRenderer
          content={question.content}
          className="text-3xl font-medium"
          style={{ color: colors.text }}
        />
      </div>

      {/* Choice options */}
      {question.type === 'choice' && question.options && (
        <div className="grid gap-4 md:grid-cols-2 w-full max-w-2xl">
          {question.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-4 rounded-xl p-5"
              style={{ backgroundColor: colors.secondary + '30' }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold"
                style={{
                  backgroundColor: colors.secondary,
                  color: colors.text,
                }}
              >
                {option.label}
              </span>
              <LaTeXRenderer content={option.content} style={{ color: colors.text }} className="text-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Fill in blank hint */}
      {question.type !== 'choice' && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: colors.secondary + '20' }}
        >
          <p style={{ color: colors.text + '80' }}>
            {question.type === 'integral'
              ? t('competition.enterIntegral', 'Enter antiderivative (without +C)')
              : t('competition.enterAnswer', 'Enter your answer')}
          </p>
        </div>
      )}

      {/* Points */}
      <div
        className="rounded-full px-4 py-2"
        style={{ backgroundColor: colors.accent + '20' }}
      >
        <span className="font-bold" style={{ color: colors.accent }}>
          {question.points} {t('competition.points', 'pts')}
        </span>
      </div>
    </div>
  );
}

// Question Card for grid/list layouts
function QuestionCard({
  question,
  colors,
  settings,
  horizontal = false,
}: {
  question: SimulationQuestion;
  colors: CustomThemeColors;
  settings: CompetitionSettings;
  horizontal?: boolean;
}) {
  const { t } = useTranslation();
  const typeLabels: Record<string, string> = {
    choice: t('problem.type.choice', 'Choice'),
    blank: t('problem.type.fillBlank', 'Fill-in'),
    integral: t('problem.type.integral', 'Integral'),
  };
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        horizontal && 'flex items-start gap-4'
      )}
      style={{
        borderColor: colors.secondary + '40',
        backgroundColor: colors.secondary + '10',
      }}
    >
      {settings.showQuestionNumber && (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
            !horizontal && 'mb-3'
          )}
          style={{
            backgroundColor: colors.primary,
            color: '#fff',
          }}
        >
          {question.number}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-3">
        <LaTeXRenderer
          content={question.content}
          className="text-sm"
          style={{ color: colors.text }}
        />

        {/* Choice options */}
        {question.type === 'choice' && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => (
              <div
                key={option.id}
                className="rounded-lg px-3 py-1.5 text-xs"
                style={{
                  backgroundColor: colors.secondary + '30',
                  color: colors.text,
                }}
              >
                <span className="font-bold mr-1">{option.label}.</span>
                <LaTeXRenderer content={option.content} className="inline" />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-xs"
            style={{
              backgroundColor: colors.accent + '20',
              color: colors.accent,
            }}
          >
            {typeLabels[question.type] || question.type}
          </span>
          <span className="text-xs" style={{ color: colors.text + '80' }}>
            {question.points} {t('competition.points', 'pts')}
          </span>
        </div>
      </div>
    </div>
  );
}

// Revealing Display
function RevealingDisplay({
  colors,
  question,
}: {
  colors: CustomThemeColors;
  question: SimulationQuestion;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: '#22c55e20' }}
      >
        <CheckIcon className="h-12 w-12 text-green-500" />
      </motion.div>
      <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
        {t('simulation.correctAnswer', 'Correct Answer')}
      </h2>
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: colors.secondary + '20' }}
      >
        {question.type === 'choice' ? (
          <span className="text-4xl font-bold" style={{ color: colors.primary }}>
            {question.correctAnswer.toUpperCase()}
          </span>
        ) : (
          <LaTeXRenderer
            content={`$${question.correctAnswer}$`}
            className="text-2xl"
            style={{ color: colors.primary }}
          />
        )}
      </div>
      <p style={{ color: colors.text + '80' }}>
        {t('simulation.calculatingScores', 'Calculating scores...')}
      </p>
    </div>
  );
}

// Leaderboard Display
function LeaderboardDisplay({
  colors,
  participantMode,
  rankedParticipants,
  rankedTeams,
}: {
  colors: CustomThemeColors;
  participantMode: ParticipantMode;
  rankedParticipants: Participant[];
  rankedTeams: Team[];
}) {
  const { t } = useTranslation();
  const topEntries = participantMode === 'team' ? rankedTeams.slice(0, 5) : rankedParticipants.slice(0, 5);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
        {t('simulation.currentStandings', 'Current Standings')}
      </h2>

      <div className="w-full max-w-lg space-y-3">
        {topEntries.map((entry, index) => {
          const isTeam = 'members' in entry;
          const name = isTeam ? (entry as Team).name : (entry as Participant).nickname;
          const score = isTeam ? (entry as Team).totalScore : (entry as Participant).score;
          const color = isTeam ? (entry as Team).color : colors.primary;

          return (
            <motion.div
              key={entry.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 rounded-xl p-4"
              style={{ backgroundColor: color + '15' }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{
                  backgroundColor:
                    index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : color,
                }}
              >
                {index + 1}
              </span>
              <span className="flex-1 text-lg font-medium" style={{ color: colors.text }}>
                {name}
              </span>
              <span className="text-2xl font-bold" style={{ color }}>
                {score}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Finished Display
function FinishedDisplay({
  colors,
  participantMode,
  rankedParticipants,
  rankedTeams,
}: {
  colors: CustomThemeColors;
  participantMode: ParticipantMode;
  rankedParticipants: Participant[];
  rankedTeams: Team[];
}) {
  const { t } = useTranslation();
  const winner = participantMode === 'team' ? rankedTeams[0] : rankedParticipants[0];

  if (!winner) return null;

  const winnerName = 'members' in winner ? (winner as Team).name : (winner as Participant).nickname;
  const winnerScore = 'members' in winner ? (winner as Team).totalScore : (winner as Participant).score;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        className="flex h-32 w-32 items-center justify-center rounded-full"
        style={{ backgroundColor: '#fbbf2420' }}
      >
        <TrophyIcon className="h-16 w-16 text-yellow-500" />
      </motion.div>
      <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
        {t('simulation.winner', 'Winner')}!
      </h2>
      <p className="text-2xl font-semibold" style={{ color: colors.primary }}>
        {winnerName}
      </p>
      <p className="text-4xl font-bold" style={{ color: colors.accent }}>
        {winnerScore} {t('simulation.points', 'pts')}
      </p>
    </div>
  );
}

// Participant List Component
function ParticipantList({
  colors,
  participantMode,
  participants,
  teams,
  onSelectTarget,
  selectedTarget,
}: {
  colors: CustomThemeColors;
  participantMode: ParticipantMode;
  participants: Participant[];
  teams: Team[];
  onSelectTarget?: (target: { type: 'participant' | 'team'; id: string } | null) => void;
  selectedTarget: { type: 'participant' | 'team'; id: string } | null;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
        {participantMode === 'team'
          ? t('simulation.teamStandings', 'Team Standings')
          : t('simulation.leaderboard', 'Leaderboard')}
      </h2>

      <div className="space-y-2">
        {participantMode === 'team'
          ? teams.map((team) => {
              const isSelected = selectedTarget?.type === 'team' && selectedTarget?.id === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => onSelectTarget?.(isSelected ? null : { type: 'team', id: team.id })}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
                    isSelected && 'ring-2'
                  )}
                  style={{
                    backgroundColor: isSelected ? colors.primary + '20' : team.color + '15',
                    borderLeft: `4px solid ${team.color}`,
                    '--tw-ring-color': colors.primary,
                  } as React.CSSProperties}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: colors.text }}>
                      {team.name}
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '70' }}>
                      {team.members.length} {t('simulation.members', 'members')}
                    </p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: colors.primary }}>
                    {team.totalScore}
                  </span>
                </button>
              );
            })
          : participants.map((p) => {
              const isSelected = selectedTarget?.type === 'participant' && selectedTarget?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectTarget?.(isSelected ? null : { type: 'participant', id: p.id })}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
                    isSelected && 'ring-2'
                  )}
                  style={{
                    backgroundColor: isSelected ? colors.primary + '20' : colors.secondary + '20',
                    '--tw-ring-color': colors.primary,
                  } as React.CSSProperties}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor:
                        p.rank === 1 ? '#fbbf24' : p.rank === 2 ? '#94a3b8' : p.rank === 3 ? '#cd7f32' : colors.secondary,
                      color: p.rank && p.rank <= 3 ? 'white' : colors.text,
                    }}
                  >
                    {p.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: colors.text }}>
                      {p.nickname}
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '70' }}>
                      {p.correctCount}/{p.correctCount + p.wrongCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold" style={{ color: colors.primary }}>
                      {p.score}
                    </span>
                    {p.lastAnswerCorrect !== undefined && (
                      <p className="text-xs" style={{ color: p.lastAnswerCorrect ? '#22c55e' : '#ef4444' }}>
                        {p.lastAnswerCorrect ? '+100+' : '0'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
      </div>
    </div>
  );
}

// Referee Panel Component
function RefereePanel({
  colors,
  selectedTarget,
  adjustmentValue,
  adjustmentReason,
  scoreAdjustments,
  participants,
  teams,
  onAdjustmentValueChange,
  onAdjustmentReasonChange,
  onSubmitAdjustment,
  onClearSelection,
}: {
  colors: CustomThemeColors;
  selectedTarget: { type: 'participant' | 'team'; id: string } | null;
  adjustmentValue: number;
  adjustmentReason: string;
  scoreAdjustments: ScoreAdjustment[];
  participants: Participant[];
  teams: Team[];
  onAdjustmentValueChange: (value: number) => void;
  onAdjustmentReasonChange: (reason: string) => void;
  onSubmitAdjustment: () => void;
  onClearSelection: () => void;
}) {
  const { t } = useTranslation();

  const targetName = selectedTarget
    ? selectedTarget.type === 'team'
      ? teams.find((t) => t.id === selectedTarget.id)?.name
      : participants.find((p) => p.id === selectedTarget.id)?.nickname
    : null;

  return (
    <div className="flex h-full flex-col p-4">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: colors.text }}>
        <GavelIcon className="h-5 w-5" style={{ color: colors.primary }} />
        {t('simulation.refereePanel', 'Referee Panel')}
      </h2>

      {/* Score Adjustment Form */}
      <div
        className="mb-4 rounded-xl p-4"
        style={{ backgroundColor: colors.secondary + '20' }}
      >
        <h3 className="mb-3 text-sm font-medium" style={{ color: colors.text }}>
          {t('simulation.scoreAdjustment', 'Score Adjustment')}
        </h3>

        {selectedTarget ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: colors.text }}>
                {t('simulation.target', 'Target')}:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: colors.primary }}>
                  {targetName}
                </span>
                <button
                  onClick={onClearSelection}
                  className="rounded p-1 transition-colors"
                  style={{ backgroundColor: colors.secondary + '30' }}
                >
                  <XIcon className="h-4 w-4" style={{ color: colors.text }} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm" style={{ color: colors.text }}>
                {t('simulation.adjustment', 'Adjustment')}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAdjustmentValueChange(adjustmentValue - 10)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                >
                  -10
                </button>
                <input
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => onAdjustmentValueChange(parseInt(e.target.value) || 0)}
                  className="w-20 rounded-lg border p-2 text-center font-mono font-bold"
                  style={{
                    borderColor: colors.secondary,
                    backgroundColor: colors.background,
                    color: adjustmentValue > 0 ? '#22c55e' : adjustmentValue < 0 ? '#ef4444' : colors.text,
                  }}
                />
                <button
                  onClick={() => onAdjustmentValueChange(adjustmentValue + 10)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}
                >
                  +10
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm" style={{ color: colors.text }}>
                {t('simulation.reason', 'Reason')}
              </label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => onAdjustmentReasonChange(e.target.value)}
                placeholder={t('simulation.reasonPlaceholder', 'Optional reason...')}
                className="w-full rounded-lg border p-2 text-sm"
                style={{
                  borderColor: colors.secondary,
                  backgroundColor: colors.background,
                  color: colors.text,
                }}
              />
            </div>

            <Button
              onClick={onSubmitAdjustment}
              disabled={adjustmentValue === 0}
              className="w-full"
              style={{ backgroundColor: colors.primary }}
            >
              {t('simulation.applyAdjustment', 'Apply Adjustment')}
            </Button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {t('simulation.selectTarget', 'Select a participant or team from the list to adjust their score.')}
          </p>
        )}
      </div>

      {/* Adjustment History */}
      <div className="flex-1 overflow-auto">
        <h3 className="mb-2 text-sm font-medium" style={{ color: colors.text }}>
          {t('simulation.adjustmentHistory', 'Adjustment History')}
        </h3>
        {scoreAdjustments.length === 0 ? (
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {t('simulation.noAdjustments', 'No adjustments yet')}
          </p>
        ) : (
          <div className="space-y-2">
            {scoreAdjustments.map((adj) => (
              <div
                key={adj.id}
                className="rounded-lg p-3"
                style={{ backgroundColor: colors.secondary + '30' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: colors.text }}>
                    {adj.targetName}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: adj.adjustment > 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {adj.adjustment > 0 ? '+' : ''}
                    {adj.adjustment}
                  </span>
                </div>
                {adj.reason && (
                  <p className="mt-1 text-xs" style={{ color: colors.text + '70' }}>
                    {adj.reason}
                  </p>
                )}
                <p className="mt-1 text-xs" style={{ color: colors.text + '50' }}>
                  {new Date(adj.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
type IconProps = { className?: string; style?: React.CSSProperties };

function UserIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function PlayIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function TimerIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TrophyIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

function CheckIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GavelIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 9.5L9.5 14.5" />
      <path d="M3 21l4-4" />
      <path d="M6.5 6.5l11 11" />
      <path d="M17.5 6.5l-11 11" />
      <path d="M21 3l-4 4" />
    </svg>
  );
}

function XIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
