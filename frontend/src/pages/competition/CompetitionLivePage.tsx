import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';
import { IconTimer } from '@/components/icons/competition/IconTimer';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { competitionApi } from '@/services/competition.api';
import { getSocket } from '@/services/socket';
import {
  type CompetitionDisplaySettings,
  type CustomThemeColors,
  type QuestionDisplayState,
  type CompetitionPhase,
  type TeamLeaderboardEntry,
  getThemeColors,
  DEFAULT_DISPLAY_SETTINGS,
} from '@/types/competition';

interface Competition {
  _id: string;
  name: string;
  joinCode: string;
  status: string;
  currentQuestionIndex: number;
  participantCount: number;
  currentPhase?: CompetitionPhase;
  participantMode?: 'individual' | 'team';
  settings: {
    questionTimeLimit: number;
    showLeaderboard: boolean;
    showLeaderboardDuringQuestion?: boolean;
  };
  displaySettings?: CompetitionDisplaySettings;
}

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  totalScore: number;
  correctCount: number;
}

interface CurrentQuestion {
  _id: string;
  number: number;
  content: string;
  type: 'choice' | 'blank' | 'answer';
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer?: string;
  explanation?: string;
  timeLimit: number;
  points: number;
}

interface TimerState {
  remainingTime: number;
  isRunning: boolean;
  totalDuration: number;
}

interface Team {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  totalScore: number;
  rank?: number;
}

export function CompetitionLivePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamLeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<CurrentQuestion[]>([]);
  const [visibilityStates, setVisibilityStates] = useState<QuestionDisplayState[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({ remainingTime: 0, isRunning: false, totalDuration: 60000 });
  const [currentPhase, setCurrentPhase] = useState<CompetitionPhase>('waiting');
  const [participantMode, setParticipantMode] = useState<'individual' | 'team'>('individual');
  const [isLoading, setIsLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);

  // Get display settings with fallback
  const displaySettings = useMemo(
    () => competition?.displaySettings || DEFAULT_DISPLAY_SETTINGS,
    [competition?.displaySettings]
  );

  // Get theme colors
  const colors = useMemo(() => getThemeColors(displaySettings.theme), [displaySettings.theme]);

  // Get visible questions based on visibility states and layout
  const visibleQuestions = useMemo(() => {
    let filtered = questions.filter((q) => {
      const state = visibilityStates.find((s) => s.questionId === q._id);
      return state?.visible !== false;
    });

    // Sort by order from visibility states
    filtered.sort((a, b) => {
      const orderA = visibilityStates.find((s) => s.questionId === a._id)?.order ?? a.number;
      const orderB = visibilityStates.find((s) => s.questionId === b._id)?.order ?? b.number;
      return orderA - orderB;
    });

    // For single layout, show only current question
    if (displaySettings.layout === 'single') {
      return filtered.slice(currentQuestionIndex, currentQuestionIndex + 1);
    }

    // For grid/list, show questionsPerPage
    return filtered.slice(0, displaySettings.questionsPerPage);
  }, [questions, visibilityStates, displaySettings, currentQuestionIndex]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [compData, leaderboardData, questionsData] = await Promise.all([
        competitionApi.get(id),
        competitionApi.getLeaderboard(id, 10),
        competitionApi.getQuestions(id).catch(() => []),
      ]);
      setCompetition(compData as Competition);
      setLeaderboard(leaderboardData);
      setParticipantCount(compData.participantCount || 0);
      setCurrentPhase((compData.currentPhase || 'waiting') as CompetitionPhase);
      setParticipantMode((compData.participantMode || 'individual') as 'individual' | 'team');
      setCurrentQuestionIndex(compData.currentQuestionIndex ?? -1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setQuestions((questionsData as any[]).map((q, i: number) => ({
        _id: q._id,
        number: i + 1,
        content: q.content,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit,
        points: q.points,
      })));

      // Fetch teams if team mode
      if (compData.participantMode === 'team') {
        try {
          const teamsData = await competitionApi.getTeams(id);
          setTeams(teamsData);
          setTeamCount(teamsData.length);
        } catch {
          console.error('Failed to fetch teams');
        }
      }

      // Initialize visibility states
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVisibilityStates(
        (questionsData as any[]).map((q, i: number) => ({
          questionId: q._id,
          visible: true as const,
          order: i + 1,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (id && socket) {
      // Join as display
      socket.emit('join:display', { competitionId: id });

      // Competition lifecycle events
      socket.on('competition:started', (data: { phase: CompetitionPhase }) => {
        setCurrentPhase(data.phase || 'waiting');
      });

      socket.on('competition:paused', () => {
        setTimerState(prev => ({ ...prev, isRunning: false }));
      });

      socket.on('competition:resumed', () => {
        setTimerState(prev => ({ ...prev, isRunning: true }));
      });

      socket.on('competition:ended', () => {
        setCurrentPhase('finished');
        competitionApi.getLeaderboard(id, 10).then(setLeaderboard);
      });

      // Phase change events
      socket.on('phase:changed', (data: { phase: CompetitionPhase; questionIndex?: number }) => {
        setCurrentPhase(data.phase);
        if (data.questionIndex !== undefined) {
          setCurrentQuestionIndex(data.questionIndex);
        }
        // Start countdown animation when entering countdown phase
        if (data.phase === 'countdown') {
          setCountdownValue(3);
        }
      });

      // Question events
      socket.on('question:show', (data: {
        questionIndex: number;
        question: CurrentQuestion;
        timerState: TimerState
      }) => {
        setCurrentQuestionIndex(data.questionIndex);
        setCurrentQuestion(data.question);
        setTimerState(data.timerState);
        setCurrentPhase('question');
      });

      socket.on('answer:revealed', (data: {
        questionId: string;
        correctAnswer: string;
        explanation?: string;
        stats?: { correct: number; total: number }
      }) => {
        setCurrentPhase('revealing');
        setCurrentQuestion(prev => prev ? {
          ...prev,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation
        } : null);
      });

      // Timer events - backend sends milliseconds, convert to seconds for display
      socket.on('timer:tick', (data?: { remainingTime?: number }) => {
        if (data?.remainingTime !== undefined) {
          setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime! / 1000) }));
        }
      });

      socket.on('timer:started', (data?: { duration?: number; remainingTime?: number }) => {
        if (data?.duration !== undefined) {
          const remainingSeconds = Math.ceil((data.remainingTime || data.duration) / 1000);
          const totalSeconds = Math.ceil(data.duration / 1000);
          setTimerState({ remainingTime: remainingSeconds, isRunning: true, totalDuration: totalSeconds });
        }
      });

      socket.on('timer:paused', (data?: { remainingTime?: number }) => {
        if (data?.remainingTime !== undefined) {
          setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime! / 1000), isRunning: false }));
        } else {
          setTimerState(prev => ({ ...prev, isRunning: false }));
        }
      });

      socket.on('timer:resumed', (data?: { remainingTime?: number }) => {
        if (data?.remainingTime !== undefined) {
          setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime! / 1000), isRunning: true }));
        } else {
          setTimerState(prev => ({ ...prev, isRunning: true }));
        }
      });

      socket.on('timer:reset', (data: { duration: number; remainingTime?: number }) => {
        const remainingSeconds = Math.ceil((data.remainingTime || data.duration) / 1000);
        const totalSeconds = Math.ceil(data.duration / 1000);
        setTimerState({ remainingTime: remainingSeconds, isRunning: false, totalDuration: totalSeconds });
      });

      socket.on('timer:ended', () => {
        setTimerState(prev => ({ ...prev, remainingTime: 0, isRunning: false }));
      });

      // Participant events
      socket.on('participant:joined', (data: { participantCount: number }) => {
        setParticipantCount(data.participantCount);
      });

      socket.on('participant:left', (data: { participantCount: number }) => {
        setParticipantCount(data.participantCount);
      });

      // Team events
      socket.on('team:created', (data: { team: Team; teamCount: number }) => {
        setTeams(prev => [...prev, data.team]);
        setTeamCount(data.teamCount);
      });

      socket.on('team:updated', (data: { team: Team }) => {
        setTeams(prev => prev.map(t => t.id === data.team.id ? data.team : t));
      });

      // Backend uses kebab-case for team member events
      socket.on('team:member-joined', (data: { teamId: string; memberCount: number }) => {
        setTeams(prev => prev.map(t => t.id === data.teamId ? { ...t, memberCount: data.memberCount } : t));
      });

      socket.on('team:member-left', (data: { teamId: string; memberCount: number }) => {
        setTeams(prev => prev.map(t => t.id === data.teamId ? { ...t, memberCount: data.memberCount } : t));
      });

      // Leaderboard events
      socket.on('leaderboard:update', (data: {
        individual?: LeaderboardEntry[];
        team?: TeamLeaderboardEntry[]
      }) => {
        if (data.individual) setLeaderboard(data.individual);
        if (data.team) setTeamLeaderboard(data.team);
      });

      socket.on('leaderboard:toggle', (data: { visible: boolean }) => {
        if (data.visible) {
          setCurrentPhase('leaderboard');
        }
      });

      // Visibility events
      socket.on('questions:visibility', (data: { visibilityStates: QuestionDisplayState[] }) => {
        setVisibilityStates(data.visibilityStates);
      });

      socket.on('questions:reorder', (data: { visibilityStates: QuestionDisplayState[] }) => {
        setVisibilityStates(data.visibilityStates);
      });
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('competition:started');
        socket.off('competition:paused');
        socket.off('competition:resumed');
        socket.off('competition:ended');
        socket.off('phase:changed');
        socket.off('question:show');
        socket.off('answer:revealed');
        socket.off('timer:tick');
        socket.off('timer:started');
        socket.off('timer:paused');
        socket.off('timer:resumed');
        socket.off('timer:reset');
        socket.off('timer:ended');
        socket.off('participant:joined');
        socket.off('participant:left');
        socket.off('team:created');
        socket.off('team:updated');
        socket.off('team:member-joined');
        socket.off('team:member-left');
        socket.off('leaderboard:update');
        socket.off('leaderboard:toggle');
        socket.off('questions:visibility');
        socket.off('questions:reorder');
      }
    };
  }, [id, fetchData]);

  // Countdown timer for countdown phase
  useEffect(() => {
    if (currentPhase === 'countdown' && countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, countdownValue]);

  // Calculate progress
  const progress = questions.length > 0
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  // Format time from seconds (already converted from milliseconds in event handlers)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get the join URL for QR code
  const joinUrl = useMemo(() => {
    if (!competition) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/competition/join/${competition.joinCode}`;
  }, [competition]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <IconLoading size={64} state="loading" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <p>{t('error.notFound', 'Competition not found')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      {/* Setup Phase - Preparing */}
      {currentPhase === 'setup' && (
        <SetupScreen competition={competition} colors={colors} />
      )}

      {/* Team Formation Phase */}
      {currentPhase === 'team-formation' && (
        <TeamFormationScreen
          competition={competition}
          teams={teams}
          participantCount={participantCount}
          teamCount={teamCount}
          joinUrl={joinUrl}
          colors={colors}
        />
      )}

      {/* Waiting Screen */}
      {currentPhase === 'waiting' && (
        <WaitingScreen
          competition={competition}
          participantCount={participantCount}
          teamCount={teamCount}
          participantMode={participantMode}
          joinUrl={joinUrl}
          colors={colors}
        />
      )}

      {/* Countdown Screen */}
      {currentPhase === 'countdown' && (
        <CountdownScreen
          countdownValue={countdownValue}
          colors={colors}
        />
      )}

      {/* Question Display */}
      {currentPhase === 'question' && (
        competition?.settings.showLeaderboardDuringQuestion ? (
          <div className="flex min-h-screen">
            <div className="flex-1">
              <QuestionDisplay
                questions={visibleQuestions}
                currentQuestion={currentQuestion}
                timerState={timerState}
                currentIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                progress={progress}
                displaySettings={displaySettings}
                colors={colors}
                formatTime={formatTime}
              />
            </div>
            <div
              className="w-80 overflow-y-auto border-l p-4"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.secondary + '30'
              }}
            >
              <MiniLeaderboard
                leaderboard={leaderboard}
                teamLeaderboard={teamLeaderboard}
                participantMode={participantMode}
                colors={colors}
              />
            </div>
          </div>
        ) : (
          <QuestionDisplay
            questions={visibleQuestions}
            currentQuestion={currentQuestion}
            timerState={timerState}
            currentIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            progress={progress}
            displaySettings={displaySettings}
            colors={colors}
            formatTime={formatTime}
          />
        )
      )}

      {/* Answer Revealing */}
      {currentPhase === 'revealing' && currentQuestion && (
        <RevealingScreen
          question={currentQuestion}
          colors={colors}
        />
      )}

      {/* Leaderboard Display */}
      {currentPhase === 'leaderboard' && (
        <LeaderboardDisplay
          leaderboard={leaderboard}
          teamLeaderboard={teamLeaderboard}
          participantMode={participantMode}
          isEnded={false}
          colors={colors}
        />
      )}

      {/* Finished Screen */}
      {currentPhase === 'finished' && (
        <LeaderboardDisplay
          leaderboard={leaderboard}
          teamLeaderboard={teamLeaderboard}
          participantMode={participantMode}
          isEnded={true}
          colors={colors}
        />
      )}

      {/* QR Code Corner Display (when not in setup/finished) */}
      {currentPhase !== 'setup' && currentPhase !== 'finished' && currentPhase !== 'waiting' && currentPhase !== 'team-formation' && (
        <QRCodeCorner joinCode={competition.joinCode} joinUrl={joinUrl} colors={colors} />
      )}
    </div>
  );
}

// Setup Screen Component
function SetupScreen({
  competition,
  colors,
}: {
  competition: Competition;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-8 flex items-center gap-4">
        <IconLoading size={48} state="loading" className="text-[var(--color-primary)]" />
      </div>
      <h1 className="mb-4 text-4xl font-bold" style={{ color: colors.text }}>
        {competition.name}
      </h1>
      <p className="text-xl" style={{ color: colors.text + '80' }}>
        {t('competition.preparingCompetition', 'Preparing competition...')}
      </p>
    </div>
  );
}

// Team Formation Screen Component
function TeamFormationScreen({
  competition,
  teams,
  participantCount,
  teamCount,
  joinUrl,
  colors,
}: {
  competition: Competition;
  teams: Team[];
  participantCount: number;
  teamCount: number;
  joinUrl: string;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-5xl font-bold" style={{ color: colors.text }}>
        {competition.name}
      </h1>

      <div className="mb-8 text-center">
        <p className="mb-4 text-2xl" style={{ color: colors.accent }}>
          {t('competition.teamFormationPhase', 'Team Formation Phase')}
        </p>
        <p className="text-lg" style={{ color: colors.text + '80' }}>
          {t('competition.formYourTeams', 'Form your teams to get started!')}
        </p>
      </div>

      {/* QR Code and Join Code */}
      <div className="mb-8 flex items-center gap-12">
        <div className="rounded-2xl bg-white p-6">
          <QRCodeSVG value={joinUrl} size={200} level="M" />
        </div>
        <div className="text-center">
          <p className="mb-2 text-lg" style={{ color: colors.text + '80' }}>
            {t('competition.joinWithCode', 'Join with code')}
          </p>
          <div
            className="rounded-xl px-8 py-4"
            style={{ backgroundColor: colors.primary + '20' }}
          >
            <span
              className="font-mono text-5xl font-bold tracking-widest"
              style={{ color: colors.primary }}
            >
              {competition.joinCode}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 flex gap-12 text-center">
        <div>
          <p className="text-4xl font-bold" style={{ color: colors.accent }}>
            {participantCount}
          </p>
          <p style={{ color: colors.text + '80' }}>
            {t('competition.participants', 'Participants')}
          </p>
        </div>
        <div>
          <p className="text-4xl font-bold" style={{ color: colors.primary }}>
            {teamCount}
          </p>
          <p style={{ color: colors.text + '80' }}>
            {t('competition.teams', 'Teams')}
          </p>
        </div>
      </div>

      {/* Team List */}
      {teams.length > 0 && (
        <div className="w-full max-w-4xl">
          <h3 className="mb-4 text-xl font-semibold" style={{ color: colors.text }}>
            {t('competition.formedTeams', 'Formed Teams')}
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 rounded-xl p-4"
                style={{ backgroundColor: team.color + '20', borderLeft: `4px solid ${team.color}` }}
              >
                <div
                  className="h-10 w-10 rounded-lg"
                  style={{ backgroundColor: team.color }}
                />
                <div>
                  <p className="font-medium" style={{ color: colors.text }}>
                    {team.name}
                  </p>
                  <p className="text-sm" style={{ color: colors.text + '60' }}>
                    {team.memberCount} {t('competition.members', 'members')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Waiting Screen Component
function WaitingScreen({
  competition,
  participantCount,
  teamCount,
  participantMode,
  joinUrl,
  colors,
}: {
  competition: Competition;
  participantCount: number;
  teamCount: number;
  participantMode: 'individual' | 'team';
  joinUrl: string;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-5xl font-bold" style={{ color: colors.text }}>
        {competition.name}
      </h1>

      {/* QR Code */}
      <div className="mb-8 rounded-3xl bg-white p-8 shadow-2xl">
        <QRCodeSVG value={joinUrl} size={280} level="M" />
      </div>

      <div className="mb-12 text-center">
        <p className="mb-4 text-2xl" style={{ color: colors.text + '80' }}>
          {t('competition.joinWith', 'Join with code')}
        </p>
        <div
          className="rounded-2xl px-12 py-6"
          style={{ backgroundColor: colors.primary + '20' }}
        >
          <span
            className="font-mono text-7xl font-bold tracking-widest"
            style={{ color: colors.primary }}
          >
            {competition.joinCode}
          </span>
        </div>
      </div>

      <div className="text-center">
        {participantMode === 'team' ? (
          <div className="flex gap-12">
            <div>
              <p className="text-5xl font-bold" style={{ color: colors.accent }}>
                {participantCount}
              </p>
              <p className="mt-2 text-xl" style={{ color: colors.text + '80' }}>
                {t('competition.participantsJoined', 'participants joined')}
              </p>
            </div>
            <div>
              <p className="text-5xl font-bold" style={{ color: colors.primary }}>
                {teamCount}
              </p>
              <p className="mt-2 text-xl" style={{ color: colors.text + '80' }}>
                {t('competition.teamsFormed', 'teams formed')}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-3xl">
            <span className="font-bold" style={{ color: colors.accent }}>
              {participantCount}
            </span>
            <span className="ml-3" style={{ color: colors.text + '80' }}>
              {t('competition.participantsJoined', 'participants joined')}
            </span>
          </p>
        )}
      </div>

      <div className="mt-12 flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-3 w-3 animate-bounce rounded-full"
            style={{ backgroundColor: colors.accent, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// Countdown Screen Component
function CountdownScreen({
  countdownValue,
  colors,
}: {
  countdownValue: number;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {countdownValue > 0 ? (
        <div
          className="animate-pulse text-[20rem] font-bold leading-none"
          style={{ color: colors.primary }}
        >
          {countdownValue}
        </div>
      ) : (
        <div
          className="animate-bounce text-8xl font-bold"
          style={{ color: colors.accent }}
        >
          {t('competition.go', 'GO!')}
        </div>
      )}
    </div>
  );
}

// Question Display Component
function QuestionDisplay({
  questions,
  currentQuestion,
  timerState,
  currentIndex,
  totalQuestions,
  progress,
  displaySettings,
  colors,
  formatTime,
}: {
  questions: CurrentQuestion[];
  currentQuestion: CurrentQuestion | null;
  timerState: TimerState;
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  displaySettings: CompetitionDisplaySettings;
  colors: CustomThemeColors;
  formatTime: (ms: number) => string;
}) {
  const { t } = useTranslation();
  const isLowTime = timerState.remainingTime < 10 && timerState.isRunning;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with timer and progress */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="text-white">
          {displaySettings.showQuestionNumber && (
            <span className="text-xl font-medium">
              {t('competition.questionOf', 'Question {{current}} of {{total}}', {
                current: currentIndex + 1,
                total: totalQuestions,
              })}
            </span>
          )}
        </div>

        {displaySettings.showTimer && (
          <div className="flex items-center gap-3">
            <IconTimer
              size={32}
              state={timerState.isRunning ? 'active' : 'idle'}
              className={cn('text-white', isLowTime && 'text-red-300')}
            />
            <div
              className={cn(
                'rounded-full px-6 py-3 text-3xl font-bold text-white',
                isLowTime && 'animate-pulse'
              )}
              style={{
                backgroundColor: isLowTime ? '#ef4444' : colors.accent,
              }}
            >
              {formatTime(timerState.remainingTime)}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {displaySettings.showProgress && (
        <div className="h-2" style={{ backgroundColor: colors.secondary + '40' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: colors.accent }}
          />
        </div>
      )}

      {/* Questions content based on layout */}
      <div className="flex-1 p-8">
        {displaySettings.layout === 'single' && currentQuestion && (
          <SingleQuestionView question={currentQuestion} colors={colors} displaySettings={displaySettings} />
        )}

        {displaySettings.layout === 'grid' && questions.length > 0 && (
          <GridQuestionView questions={questions} colors={colors} displaySettings={displaySettings} />
        )}

        {displaySettings.layout === 'list' && questions.length > 0 && (
          <ListQuestionView questions={questions} colors={colors} displaySettings={displaySettings} />
        )}
      </div>
    </div>
  );
}

// Single Question View with LaTeX
function SingleQuestionView({
  question,
  colors,
  displaySettings,
}: {
  question: CurrentQuestion;
  colors: CustomThemeColors;
  displaySettings: CompetitionDisplaySettings;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      {/* Question number badge */}
      {displaySettings.showQuestionNumber && (
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
          style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
        >
          {question.number}
        </div>
      )}

      {/* Question content with LaTeX */}
      <LaTeXRenderer
        content={question.content}
        className="mb-12 max-w-4xl text-center text-4xl leading-relaxed"
        style={{ color: colors.text }}
      />

      {/* Options for choice questions */}
      {question.type === 'choice' && question.options && (
        <div className="grid w-full max-w-4xl grid-cols-2 gap-6">
          {question.options.map((option, index) => (
            <div
              key={option.id}
              className="rounded-xl p-6 text-2xl text-white"
              style={{
                backgroundColor:
                  index === 0 ? '#ef4444' :
                  index === 1 ? '#3b82f6' :
                  index === 2 ? '#eab308' :
                  '#22c55e',
              }}
            >
              <span className="mr-4 font-bold">{option.label}.</span>
              <LaTeXRenderer content={option.content} className="inline" />
            </div>
          ))}
        </div>
      )}

      {/* Points display */}
      <div className="mt-8 text-lg" style={{ color: colors.accent }}>
        {question.points} pts
      </div>
    </div>
  );
}

// Grid Question View
function GridQuestionView({
  questions,
  colors,
  displaySettings,
}: {
  questions: CurrentQuestion[];
  colors: CustomThemeColors;
  displaySettings: CompetitionDisplaySettings;
}) {
  const columns = questions.length <= 2 ? 2 : questions.length <= 4 ? 2 : 3;

  return (
    <div
      className="grid h-full gap-6"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {questions.map((question) => (
        <QuestionCard
          key={question._id}
          question={question}
          colors={colors}
          displaySettings={displaySettings}
        />
      ))}
    </div>
  );
}

// List Question View
function ListQuestionView({
  questions,
  colors,
  displaySettings,
}: {
  questions: CurrentQuestion[];
  colors: CustomThemeColors;
  displaySettings: CompetitionDisplaySettings;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {questions.map((question) => (
        <QuestionCard
          key={question._id}
          question={question}
          colors={colors}
          displaySettings={displaySettings}
          horizontal
        />
      ))}
    </div>
  );
}

// Question Card for Grid/List views
function QuestionCard({
  question,
  colors,
  displaySettings,
  horizontal = false,
}: {
  question: CurrentQuestion;
  colors: CustomThemeColors;
  displaySettings: CompetitionDisplaySettings;
  horizontal?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'rounded-2xl border p-6',
        horizontal && 'flex items-start gap-6'
      )}
      style={{
        borderColor: colors.secondary + '40',
        backgroundColor: colors.secondary + '10',
      }}
    >
      {/* Question number */}
      {displaySettings.showQuestionNumber && (
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold',
            !horizontal && 'mx-auto mb-4'
          )}
          style={{ backgroundColor: colors.primary, color: '#fff' }}
        >
          {question.number}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Question content with LaTeX */}
        <LaTeXRenderer
          content={question.content}
          className={cn('text-xl', horizontal ? 'text-left' : 'text-center')}
          style={{ color: colors.text }}
        />

        {/* Options preview for choice questions */}
        {question.type === 'choice' && question.options && (
          <div className={cn('mt-4 space-y-2', horizontal && 'grid grid-cols-2 gap-2 space-y-0')}>
            {question.options.map((option) => (
              <div
                key={option.id}
                className="rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: colors.secondary + '30', color: colors.text }}
              >
                <span className="font-bold">{option.label}.</span>{' '}
                <LaTeXRenderer content={option.content} className="inline" />
              </div>
            ))}
          </div>
        )}

        {/* Meta info */}
        <div className="mt-4 flex items-center gap-4">
          <span
            className="rounded px-2 py-1 text-xs"
            style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
          >
            {question.type === 'choice' && t('problem.type.choice', 'Choice')}
            {question.type === 'blank' && t('problem.type.blank', 'Fill-in')}
            {question.type === 'answer' && t('problem.type.answer', 'Answer')}
          </span>
          <span className="text-sm" style={{ color: colors.text + '80' }}>
            {question.points} pts
          </span>
        </div>
      </div>
    </div>
  );
}

// Answer Revealing Screen
function RevealingScreen({
  question,
  colors,
}: {
  question: CurrentQuestion;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h2 className="mb-8 text-3xl font-bold" style={{ color: colors.text }}>
        {t('competition.answerRevealed', 'Answer Revealed')}
      </h2>

      {/* Question */}
      <div
        className="mb-8 rounded-2xl p-8"
        style={{ backgroundColor: colors.secondary + '20' }}
      >
        <LaTeXRenderer
          content={question.content}
          className="max-w-3xl text-center text-2xl"
          style={{ color: colors.text }}
        />
      </div>

      {/* Correct Answer */}
      <div className="text-center">
        <p className="mb-4 text-xl" style={{ color: colors.text + '80' }}>
          {t('competition.correctAnswer', 'Correct Answer')}
        </p>
        <div
          className="rounded-xl px-12 py-6"
          style={{ backgroundColor: '#22c55e20' }}
        >
          {question.type === 'choice' && question.options ? (
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold text-green-500">
                {question.correctAnswer}
              </span>
              <span className="text-2xl" style={{ color: colors.text }}>
                {question.options.find(o => o.label === question.correctAnswer)?.content}
              </span>
            </div>
          ) : (
            <LaTeXRenderer
              content={question.correctAnswer || ''}
              className="text-4xl font-bold text-green-500"
            />
          )}
        </div>
      </div>

      {/* Explanation / Analysis */}
      {question.explanation && (
        <div className="mt-8 w-full max-w-3xl">
          <p className="mb-4 text-xl" style={{ color: colors.text + '80' }}>
            {t('competition.explanation', 'Explanation')}
          </p>
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: colors.secondary + '15', borderLeft: `4px solid ${colors.accent}` }}
          >
            <LaTeXRenderer
              content={question.explanation}
              className="text-lg leading-relaxed"
              style={{ color: colors.text }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Mini Leaderboard Component (shown during question phase)
function MiniLeaderboard({
  leaderboard,
  teamLeaderboard,
  participantMode,
  colors,
}: {
  leaderboard: LeaderboardEntry[];
  teamLeaderboard: TeamLeaderboardEntry[];
  participantMode: 'individual' | 'team';
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();
  const displayData = participantMode === 'team' && teamLeaderboard.length > 0
    ? teamLeaderboard.slice(0, 10).map(e => ({
        id: e.team.id,
        rank: e.rank,
        name: e.team.name,
        score: e.team.totalScore,
        color: e.team.color,
      }))
    : leaderboard.slice(0, 10).map(e => ({
        id: e.participantId,
        rank: e.rank,
        name: e.nickname,
        score: e.totalScore,
      }));

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center gap-2">
        <IconTrophy size={20} state="active" className="text-yellow-500" />
        <h3 className="text-sm font-semibold" style={{ color: colors.text }}>
          {t('competition.liveRanking', 'Live Ranking')}
        </h3>
      </div>

      <div className="space-y-2">
        {displayData.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{
              backgroundColor:
                index === 0 ? 'rgba(234, 179, 8, 0.15)' :
                index === 1 ? 'rgba(156, 163, 175, 0.15)' :
                index === 2 ? 'rgba(249, 115, 22, 0.15)' :
                colors.secondary + '10',
              borderLeft: 'color' in entry ? `3px solid ${entry.color}` : undefined,
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className="w-5 text-sm font-bold"
                style={{
                  color:
                    index === 0 ? '#eab308' :
                    index === 1 ? '#9ca3af' :
                    index === 2 ? '#f97316' :
                    colors.text + '60',
                }}
              >
                {entry.rank}
              </span>
              {'color' in entry && (
                <div
                  className="h-4 w-4 flex-shrink-0 rounded"
                  style={{ backgroundColor: entry.color as string }}
                />
              )}
              <span
                className="truncate text-sm"
                style={{ color: colors.text }}
                title={entry.name}
              >
                {entry.name}
              </span>
            </div>
            <span
              className="ml-2 flex-shrink-0 text-sm font-semibold"
              style={{ color: colors.accent }}
            >
              {entry.score}
            </span>
          </div>
        ))}

        {displayData.length === 0 && (
          <div className="py-4 text-center text-sm" style={{ color: colors.text + '60' }}>
            {t('competition.noRankingYet', 'No ranking yet')}
          </div>
        )}
      </div>
    </div>
  );
}

// Leaderboard Display Component
function LeaderboardDisplay({
  leaderboard,
  teamLeaderboard,
  participantMode,
  isEnded,
  colors,
}: {
  leaderboard: LeaderboardEntry[];
  teamLeaderboard: TeamLeaderboardEntry[];
  participantMode: 'individual' | 'team';
  isEnded: boolean;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();
  const displayData = participantMode === 'team' && teamLeaderboard.length > 0
    ? teamLeaderboard.map(e => ({
        id: e.team.id,
        rank: e.rank,
        name: e.team.name,
        score: e.team.totalScore,
        subtext: `${e.team.members?.length || 0} ${t('competition.members', 'members')}`,
        color: e.team.color,
      }))
    : leaderboard.map(e => ({
        id: e.participantId,
        rank: e.rank,
        name: e.nickname,
        score: e.totalScore,
        subtext: `${e.correctCount} ${t('competition.correct', 'correct')}`,
      }));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-8 flex items-center gap-4">
        <IconTrophy size={48} state="active" className="text-yellow-500" />
        <h2 className="text-4xl font-bold" style={{ color: colors.text }}>
          {isEnded
            ? t('competition.finalResults', 'Final Results')
            : t('competition.leaderboard', 'Leaderboard')}
        </h2>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {displayData.map((entry, index) => (
          <div
            key={entry.id}
            className={cn(
              'flex items-center justify-between rounded-xl p-6 transition-all',
              index === 0 && 'scale-110',
              index === 1 && 'scale-105'
            )}
            style={{
              backgroundColor:
                index === 0 ? 'rgba(234, 179, 8, 0.2)' :
                index === 1 ? 'rgba(156, 163, 175, 0.2)' :
                index === 2 ? 'rgba(249, 115, 22, 0.2)' :
                colors.secondary + '20',
              borderLeft: 'color' in entry ? `4px solid ${entry.color}` : undefined,
            }}
          >
            <div className="flex items-center gap-6">
              <span
                className="text-4xl font-bold"
                style={{
                  color:
                    index === 0 ? '#eab308' :
                    index === 1 ? '#9ca3af' :
                    index === 2 ? '#f97316' :
                    colors.text + '60',
                }}
              >
                #{entry.rank}
              </span>
              {'color' in entry && (
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: entry.color as string }}
                />
              )}
              <span className="text-2xl" style={{ color: colors.text }}>
                {entry.name}
              </span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: colors.accent }}>
                {entry.score}
              </div>
              <div className="text-sm" style={{ color: colors.text + '60' }}>
                {entry.subtext}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEnded && (
        <div className="mt-12 text-2xl" style={{ color: colors.text + '60' }}>
          {t('competition.thanksForParticipating', 'Thanks for participating!')}
        </div>
      )}
    </div>
  );
}

// QR Code Corner Display
function QRCodeCorner({
  joinCode,
  joinUrl,
  colors,
}: {
  joinCode: string;
  joinUrl: string;
  colors: CustomThemeColors;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 flex items-center gap-3 rounded-xl p-3"
      style={{ backgroundColor: colors.background, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      <div className="rounded-lg bg-white p-2">
        <QRCodeSVG value={joinUrl} size={64} level="M" />
      </div>
      <div className="text-center">
        <p className="text-xs" style={{ color: colors.text + '80' }}>
          Join
        </p>
        <p className="font-mono text-lg font-bold" style={{ color: colors.primary }}>
          {joinCode}
        </p>
      </div>
    </div>
  );
}
