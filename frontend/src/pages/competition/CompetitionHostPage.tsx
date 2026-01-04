import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';
import { QuestionVisibilityPanel } from '@/components/competition/QuestionVisibilityPanel';
import {
  HostControlPanel,
  type CompetitionPhase,
  type CompetitionStatus,
} from '@/components/competition/host/HostControlPanel';
import { competitionApi } from '@/services/competition.api';
import { ensureValidToken } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { QuestionDisplayState, Team } from '@/types/competition';

interface Competition {
  _id: string;
  name: string;
  joinCode: string;
  status: CompetitionStatus;
  currentPhase: CompetitionPhase;
  participantMode: 'individual' | 'team';
  currentQuestionIndex: number;
  questionCount: number;
  participantCount: number;
  teamCount: number;
  settings: {
    questionTimeLimit: number;
    basePoints: number;
    showLeaderboard: boolean;
    teamSettings?: {
      enabled: boolean;
      teamSize: number;
    };
  };
  timerState: {
    remainingTime: number;
    isRunning: boolean;
    totalDuration: number;
  };
}

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  totalScore: number;
  correctCount: number;
  isOnline?: boolean;
}

// Question structure from socket (host:joined event)
interface SocketQuestion {
  id: string;
  order: number;
  status: string;
  points: number;
  timeLimit: number;
  problem: {
    id: string;
    content: string;
    type: string;
    options?: Array<{ id: string; label: string; content: string }>;
    correctAnswer: string | string[];
  } | null;
}

// Question structure from API
interface ApiQuestion {
  _id: string;
  order: number;
  content: string;
  type: string;
  options?: Array<{ id: string; label: string; content: string }>;
  timeLimit: number;
  points: number;
  status: string;
}

// Unified question type for the component
interface CompetitionQuestion {
  id: string;
  order: number;
  status: string;
  points: number;
  timeLimit: number;
  content: string;
  type: string;
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer?: string | string[];
}

export function CompetitionHostPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Question visibility control
  const [visibilityStates, setVisibilityStates] = useState<QuestionDisplayState[]>([]);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);

  // Timer state from server
  const [timerState, setTimerState] = useState({
    remainingTime: 0,
    isRunning: false,
    totalDuration: 60000,
  });

  // Helper to convert API questions to unified format
  const convertApiQuestions = (apiQuestions: ApiQuestion[]): CompetitionQuestion[] => {
    return apiQuestions.map(q => ({
      id: q._id,
      order: q.order,
      status: q.status,
      points: q.points,
      timeLimit: q.timeLimit,
      content: q.content,
      type: q.type,
      options: q.options,
    }));
  };

  // Helper to convert socket questions to unified format
  const convertSocketQuestions = (socketQuestions: SocketQuestion[]): CompetitionQuestion[] => {
    return socketQuestions.map(q => ({
      id: q.id,
      order: q.order,
      status: q.status,
      points: q.points,
      timeLimit: q.timeLimit,
      content: q.problem?.content || '',
      type: q.problem?.type || 'choice',
      options: q.problem?.options,
      correctAnswer: q.problem?.correctAnswer,
    }));
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [compData, leaderboardData, questionsData] = await Promise.all([
        competitionApi.get(id),
        competitionApi.getLeaderboard(id, 50),
        competitionApi.getQuestions(id).catch(() => []),
      ]);

      // Transform API competition data to component format
      setCompetition({
        _id: compData._id,
        name: compData.name,
        joinCode: compData.joinCode,
        status: compData.status as CompetitionStatus,
        currentPhase: 'waiting' as CompetitionPhase,
        participantMode: 'individual',
        currentQuestionIndex: compData.currentQuestionIndex,
        questionCount: 0,
        participantCount: compData.participantCount,
        teamCount: 0,
        settings: compData.settings,
        timerState: {
          remainingTime: 0,
          isRunning: false,
          totalDuration: compData.settings.questionTimeLimit * 1000 || 60000,
        },
      });
      setLeaderboard(leaderboardData);
      setParticipantCount(compData.participantCount);

      // Convert API questions to unified format
      const convertedQuestions = convertApiQuestions(questionsData as unknown as ApiQuestion[]);
      setQuestions(convertedQuestions);

      // Initialize visibility states if not set
      if (convertedQuestions.length > 0) {
        setVisibilityStates((prev) => {
          if (prev.length === 0) {
            return convertedQuestions.map((q, index) => ({
              questionId: q.id,
              visible: true,
              order: index + 1,
            }));
          }
          return prev;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.fetchFailed', 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();

    // Create dedicated socket connection for host with valid token
    const initSocket = async () => {
      try {
        // Ensure token is valid before connecting
        const validToken = await ensureValidToken();

        const socket = io('/competition', {
          auth: {
            token: validToken,
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        if (id) {
          socket.on('connect', () => {
            console.log('Host socket connected');
            socket.emit('join:host', { competitionId: id });
          });

          socket.on('connect_error', async (error) => {
            console.error('Host socket connection error:', error);
            // Try to refresh token and reconnect
            try {
              const newToken = await ensureValidToken();
              socket.auth = { token: newToken };
              socket.connect();
            } catch {
              setError('Session expired. Please log in again.');
            }
          });

          socket.on('error', (data: { message: string }) => {
            console.error('Host socket error:', data.message);
            // Log current user info for debugging
            const { user } = useAuthStore.getState();
            console.log('Current user:', user);
            setError(data.message);
          });

      socket.on('host:joined', (data: {
        competition: Competition;
        questions: SocketQuestion[];
        teams: Team[];
        leaderboard: LeaderboardEntry[]
      }) => {
        setCompetition(data.competition);
        // Convert socket questions to unified format
        setQuestions(convertSocketQuestions(data.questions));
        setTeams(data.teams || []);
        setLeaderboard(data.leaderboard);
        setParticipantCount(data.competition.participantCount);
      });

      socket.on('participant:joined', () => {
        setParticipantCount((prev) => prev + 1);
        // Optionally refresh leaderboard
        competitionApi.getLeaderboard(id, 50).then(setLeaderboard);
      });

      socket.on('participant:left', () => {
        setParticipantCount((prev) => Math.max(0, prev - 1));
        // Refresh leaderboard to remove the participant
        competitionApi.getLeaderboard(id, 50).then(setLeaderboard);
      });

      socket.on('phase:changed', (data: { phase: CompetitionPhase }) => {
        setCompetition((prev) => prev ? { ...prev, currentPhase: data.phase } : null);
      });

      socket.on('competition:started', () => {
        setCompetition((prev) => prev ? { ...prev, status: 'ongoing', currentPhase: 'waiting' } : null);
      });

      socket.on('competition:paused', () => {
        setCompetition((prev) => prev ? { ...prev, status: 'paused' } : null);
      });

      socket.on('competition:resumed', () => {
        setCompetition((prev) => prev ? { ...prev, status: 'ongoing' } : null);
      });

      socket.on('competition:ended', () => {
        setCompetition((prev) => prev ? { ...prev, status: 'finished', currentPhase: 'finished' } : null);
      });

      // Timer events - backend sends milliseconds, convert to seconds for display
      socket.on('timer:tick', (data?: { remainingTime?: number }) => {
        if (data?.remainingTime !== undefined) {
          setTimerState((prev) => ({
            ...prev,
            remainingTime: Math.ceil(data.remainingTime! / 1000),
            isRunning: true,
          }));
        }
      });

      socket.on('timer:started', (data?: { totalDuration?: number; remainingTime?: number }) => {
        if (data?.remainingTime !== undefined && data?.totalDuration !== undefined) {
          setTimerState({
            totalDuration: Math.ceil(data.totalDuration / 1000),
            remainingTime: Math.ceil(data.remainingTime / 1000),
            isRunning: true,
          });
        }
      });

      socket.on('timer:paused', (data?: { remainingTime?: number }) => {
        if (data?.remainingTime !== undefined) {
          setTimerState((prev) => ({
            ...prev,
            remainingTime: Math.ceil(data.remainingTime! / 1000),
            isRunning: false,
          }));
        } else {
          setTimerState((prev) => ({ ...prev, isRunning: false }));
        }
      });

      socket.on('timer:resumed', (data?: { remainingTime?: number }) => {
        if (data?.remainingTime !== undefined) {
          setTimerState((prev) => ({
            ...prev,
            remainingTime: Math.ceil(data.remainingTime! / 1000),
            isRunning: true,
          }));
        } else {
          setTimerState((prev) => ({ ...prev, isRunning: true }));
        }
      });

      socket.on('timer:reset', (data?: { totalDuration?: number; remainingTime?: number }) => {
        if (data?.remainingTime !== undefined && data?.totalDuration !== undefined) {
          setTimerState({
            totalDuration: Math.ceil(data.totalDuration / 1000),
            remainingTime: Math.ceil(data.remainingTime / 1000),
            isRunning: false,
          });
        }
      });

      socket.on('timer:ended', () => {
        setTimerState((prev) => ({ ...prev, remainingTime: 0, isRunning: false }));
      });

      socket.on('question:preparing', (data: { questionIndex: number }) => {
        setCompetition((prev) =>
          prev ? { ...prev, currentQuestionIndex: data.questionIndex, currentPhase: 'countdown' } : null
        );
      });

      socket.on('question:show', (data: { order: number }) => {
        setCompetition((prev) =>
          prev ? { ...prev, currentQuestionIndex: data.order, currentPhase: 'question' } : null
        );
      });

      socket.on('answer:revealed', () => {
        setCompetition((prev) => prev ? { ...prev, currentPhase: 'revealing' } : null);
        competitionApi.getLeaderboard(id, 50).then(setLeaderboard);
      });

      socket.on('leaderboard:update', (data: { leaderboard: LeaderboardEntry[] }) => {
        setLeaderboard(data.leaderboard);
      });

      socket.on('leaderboard:show', () => {
        setCompetition((prev) => prev ? { ...prev, currentPhase: 'leaderboard' } : null);
      });

      socket.on('team:new', (data: { team: Team }) => {
        setTeams((prev) => [...prev, data.team]);
      });

      socket.on('team:member-joined', () => {
        // Refresh teams
        if (competition?.settings.teamSettings?.enabled) {
          competitionApi.getTeams(id).then((teams) => setTeams(teams as unknown as Team[]));
        }
      });

      socket.on('team:member-left', () => {
        if (competition?.settings.teamSettings?.enabled) {
          competitionApi.getTeams(id).then((teams) => setTeams(teams as unknown as Team[]));
        }
      });
        }
      } catch (err) {
        console.error('Failed to initialize socket:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
      }
    };

    // Call initSocket
    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id, fetchData, competition?.settings.teamSettings?.enabled]);

  // Socket event handlers
  const handleStart = () => {
    socketRef.current?.emit('competition:start', { competitionId: id });
  };

  const handlePause = () => {
    socketRef.current?.emit('competition:pause', { competitionId: id });
  };

  const handleResume = () => {
    socketRef.current?.emit('competition:resume', { competitionId: id });
  };

  const handleEnd = () => {
    socketRef.current?.emit('competition:end', { competitionId: id });
  };

  const handlePhaseChange = (phase: CompetitionPhase) => {
    socketRef.current?.emit('phase:change', { competitionId: id, phase });
  };

  const handleNextQuestion = () => {
    socketRef.current?.emit('question:next', { competitionId: id });
  };

  const handleRevealAnswer = () => {
    const currentQuestion = questions.find(q => q.order === competition?.currentQuestionIndex);
    if (currentQuestion) {
      socketRef.current?.emit('answer:reveal', { competitionId: id, questionId: currentQuestion.id });
    }
  };

  const handleShowLeaderboard = () => {
    socketRef.current?.emit('leaderboard:show', { competitionId: id });
  };

  const handleTimerStart = (durationSeconds: number) => {
    // Convert seconds to milliseconds for backend
    socketRef.current?.emit('timer:start', { competitionId: id, duration: durationSeconds * 1000 });
  };

  const handleTimerPause = () => {
    socketRef.current?.emit('timer:pause', { competitionId: id });
  };

  const handleTimerResume = () => {
    socketRef.current?.emit('timer:resume', { competitionId: id });
  };

  const handleTimerReset = (duration?: number) => {
    socketRef.current?.emit('timer:reset', { competitionId: id, duration });
  };

  const handleTimerAdjust = (seconds: number) => {
    socketRef.current?.emit('timer:adjust', { competitionId: id, adjustment: seconds });
  };

  const handleOpenDisplayScreen = () => {
    window.open(`/competitions/${id}/live`, '_blank', 'width=1920,height=1080');
  };

  const handleVisibilityChange = (newStates: QuestionDisplayState[]) => {
    setVisibilityStates(newStates);
    socketRef.current?.emit('questions:visibility', { competitionId: id, visibilityStates: newStates });
  };

  const handleReorder = (newStates: QuestionDisplayState[]) => {
    setVisibilityStates(newStates);
    socketRef.current?.emit('questions:reorder', { competitionId: id, visibilityStates: newStates });
  };

  const handlePointsChange = (questionId: string, points: number) => {
    // Update local state
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, points } : q))
    );
    // Emit socket event to update on server
    socketRef.current?.emit('question:updatePoints', { competitionId: id, questionId, points });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoading size={48} state="loading" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--color-error-bg)] p-4 text-[var(--color-error)]">{error}</div>
        <Button onClick={() => navigate('/competitions')}>{t('common.back', 'Back')}</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Main Controls */}
      <div className="space-y-6 lg:col-span-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('competition.hostPanel', 'Host Panel')}</h1>
            <p className="text-[var(--color-muted)]">{competition.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenDisplayScreen}>
              {t('competition.openDisplay', 'Open Display')}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/competitions/${id}/results`)}>
              {t('competition.viewResults', 'Results')}
            </Button>
          </div>
        </div>

        {/* Join Code & Participants Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard className="p-4 text-center">
            <p className="text-sm text-[var(--color-muted)]">{t('competition.joinCode', 'Join Code')}</p>
            <p className="font-mono text-3xl font-bold text-[var(--color-primary)]">{competition.joinCode}</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-sm text-[var(--color-muted)]">{t('competition.participants', 'Participants')}</p>
            <p className="text-3xl font-bold">{participantCount}</p>
          </GlassCard>
          {competition.participantMode === 'team' && (
            <GlassCard className="p-4 text-center">
              <p className="text-sm text-[var(--color-muted)]">{t('competition.teams', 'Teams')}</p>
              <p className="text-3xl font-bold">{teams.length}</p>
            </GlassCard>
          )}
        </div>

        {/* Host Control Panel */}
        <HostControlPanel
          competitionId={id!}
          status={competition.status}
          currentPhase={competition.currentPhase}
          currentQuestionIndex={competition.currentQuestionIndex}
          totalQuestions={questions.length}
          timerState={timerState}
          participantMode={competition.participantMode}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={handleEnd}
          onPhaseChange={handlePhaseChange}
          onNextQuestion={handleNextQuestion}
          onRevealAnswer={handleRevealAnswer}
          onShowLeaderboard={handleShowLeaderboard}
          onTimerStart={handleTimerStart}
          onTimerPause={handleTimerPause}
          onTimerResume={handleTimerResume}
          onTimerReset={handleTimerReset}
          onTimerAdjust={handleTimerAdjust}
        />

        {/* Question Visibility Control */}
        {questions.length > 0 && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setShowQuestionPanel(!showQuestionPanel)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t('competition.questionControl', 'Question Control')}
              </span>
              <span className="text-sm text-[var(--color-muted)]">
                {visibilityStates.filter((s) => s.visible).length} / {questions.length}
              </span>
            </Button>

            {showQuestionPanel && (
              <QuestionVisibilityPanel
                questions={questions.map((q) => ({
                  _id: q.id,
                  order: q.order,
                  content: q.content,
                  type: q.type,
                  points: q.points,
                }))}
                visibilityStates={visibilityStates}
                onVisibilityChange={handleVisibilityChange}
                onReorder={handleReorder}
                onPointsChange={handlePointsChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Right Column - Participants & Teams */}
      <div className="space-y-6">
        {/* Participants List (Individual Mode) */}
        {competition.participantMode === 'individual' && (
          <GlassCard className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 className="font-semibold">{t('competition.participants', 'Participants')}</h2>
              </div>
              <span className="rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-sm font-medium text-[var(--color-primary)]">
                {participantCount}
              </span>
            </div>
            {leaderboard.length > 0 ? (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.participantId}
                    className={cn(
                      'flex items-center justify-between rounded-lg p-2',
                      index === 0 && 'bg-yellow-500/20',
                      index === 1 && 'bg-slate-400/20',
                      index === 2 && 'bg-orange-500/20',
                      index > 2 && 'bg-[var(--color-card)]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center font-bold text-[var(--color-muted)]">
                        {entry.rank}
                      </span>
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          entry.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        )}
                        title={entry.isOnline ? t('competition.online', 'Online') : t('competition.offline', 'Offline')}
                      />
                      <span className="truncate">{entry.nickname}</span>
                    </div>
                    <span className="font-bold">{entry.totalScore}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[var(--color-muted)]">
                <svg className="mx-auto mb-2 h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm">{t('competition.noParticipantsYet', 'No participants yet')}</p>
                <p className="mt-1 text-xs">{t('competition.waitingForJoin', 'Waiting for participants to join...')}</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* Teams (if team mode) */}
        {competition.participantMode === 'team' && (
          <GlassCard className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 className="font-semibold">{t('competition.teamsAndParticipants', 'Teams & Participants')}</h2>
              </div>
              <span className="rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-sm font-medium text-[var(--color-primary)]">
                {teams.length} {t('competition.teamsCount', 'teams')} · {participantCount} {t('competition.people', 'people')}
              </span>
            </div>
            {teams.length > 0 ? (
              <div className="max-h-[500px] space-y-3 overflow-y-auto">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    className={cn(
                      'rounded-lg border p-3',
                      index === 0 && 'border-yellow-500/50 bg-yellow-500/10',
                      index === 1 && 'border-slate-400/50 bg-slate-400/10',
                      index === 2 && 'border-orange-500/50 bg-orange-500/10',
                      index > 2 && 'border-[var(--color-border)] bg-[var(--color-card)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-center font-bold text-[var(--color-muted)]">
                            #{index + 1}
                          </span>
                          <div
                            className="h-8 w-8 rounded"
                            style={{ backgroundColor: team.color }}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-xs text-[var(--color-muted)]">
                            {team.members.length} {t('competition.members', 'members')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{team.totalScore}</p>
                        <p className="text-xs text-[var(--color-muted)]">{t('competition.points', 'pts')}</p>
                      </div>
                    </div>
                    {/* Team Members */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {team.members.map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-secondary)] px-2 py-0.5 text-xs"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            )}
                          />
                          {member.nickname}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[var(--color-muted)]">
                <svg className="mx-auto mb-2 h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm">{t('competition.noTeamsYet', 'No teams yet')}</p>
                <p className="mt-1 text-xs">{t('competition.waitingForTeams', 'Waiting for teams to form...')}</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* Leaderboard */}
        {competition.settings.showLeaderboard && leaderboard.length > 0 && competition.participantMode === 'team' && (
          <GlassCard className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <IconTrophy size={20} state="idle" className="text-yellow-500" />
              <h2 className="font-semibold">{t('competition.leaderboard', 'Leaderboard')}</h2>
            </div>
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {leaderboard.slice(0, 20).map((entry, index) => (
                <div
                  key={entry.participantId}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-2',
                    index === 0 && 'bg-yellow-500/20',
                    index === 1 && 'bg-slate-400/20',
                    index === 2 && 'bg-orange-500/20',
                    index > 2 && 'bg-[var(--color-card)]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-[var(--color-muted)]">
                      {entry.rank}
                    </span>
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        entry.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      )}
                    />
                    <span className="truncate">{entry.nickname}</span>
                  </div>
                  <span className="font-bold">{entry.totalScore}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Current Question Preview */}
        {competition.status === 'ongoing' && competition.currentQuestionIndex >= 0 && (() => {
          const currentQuestion = questions.find(q => q.order === competition.currentQuestionIndex);
          return (
            <GlassCard className="p-4">
              <h2 className="mb-2 font-semibold">
                {t('competition.currentQuestion', 'Current Question')}
              </h2>
              <p className="text-sm text-[var(--color-muted)]">
                #{competition.currentQuestionIndex + 1} / {questions.length}
              </p>
              {currentQuestion && (
                <div className="mt-2 rounded-lg bg-[var(--color-card)] p-3">
                  <p className="line-clamp-3 text-sm">
                    {currentQuestion.content || t('common.loading', 'Loading...')}
                  </p>
                </div>
              )}
            </GlassCard>
          );
        })()}
      </div>
    </div>
  );
}
