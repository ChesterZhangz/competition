import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { IconTimer } from '@/components/icons/competition/IconTimer';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { TeamFormation, type Team, type TeamMember, type TeamRole } from '@/components/competition/team/TeamFormation';
import { competitionApi } from '@/services/competition.api';
import { getSocket, kickTeamMember, transferCaptain, leaveTeam } from '@/services/socket';
import type { CompetitionPhase } from '@/types/competition';

interface CurrentQuestion {
  _id: string;
  number: number;
  content: string;
  type: 'choice' | 'blank' | 'answer';
  options?: Array<{ id: string; label: string; content: string }>;
  timeLimit: number;
  points: number;
}

interface TimerState {
  remainingTime: number;
  isRunning: boolean;
  totalDuration: number;
}

interface Competition {
  _id: string;
  name: string;
  mode: 'onsite' | 'online';
  status: string;
  currentPhase?: CompetitionPhase;
  participantMode?: 'individual' | 'team';
  settings: {
    questionTimeLimit: number;
    showLeaderboard?: boolean;
    showLeaderboardDuringQuestion?: boolean;
    teamSettings?: {
      enabled: boolean;
      teamSize: number;
      roleMode: 'all_equal' | 'single_submit' | 'split_view';
      allowTeamFormation: boolean;
    };
  };
}

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  totalScore: number;
  correctCount: number;
}

export function CompetitionPlayPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Competition state
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [currentPhase, setCurrentPhase] = useState<CompetitionPhase>('waiting');
  const [isLoading, setIsLoading] = useState(true);

  // Participant state
  const [participantId, setParticipantId] = useState<string>('');
  const [myRole, setMyRole] = useState<TeamRole>('both');

  // Team state
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>('');
  const [timerState, setTimerState] = useState<TimerState>({ remainingTime: 0, isRunning: false, totalDuration: 60000 });
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Score state
  const [feedback, setFeedback] = useState<{ correct: boolean; score: number; correctAnswer?: string; explanation?: string } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [rank, setRank] = useState(0);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Countdown
  const [countdownValue, setCountdownValue] = useState(3);

  // Derived state
  const canSubmit = useMemo(() => {
    if (myRole === 'viewer') return false;
    return myRole === 'submitter' || myRole === 'both';
  }, [myRole]);

  const canViewQuestion = useMemo(() => {
    const roleMode = competition?.settings?.teamSettings?.roleMode;
    if (roleMode === 'split_view' && myRole === 'submitter') return false;
    return true;
  }, [competition, myRole]);

  const participantMode = competition?.participantMode || 'individual';
  const roleMode = competition?.settings?.teamSettings?.roleMode || 'all_equal';
  const isOnsiteMode = competition?.mode === 'onsite';
  const isCaptain = myTeam && participantId && myTeam.captainId === participantId;

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const compData = await competitionApi.get(id);
      setCompetition(compData as Competition);
      setCurrentPhase((compData.currentPhase as CompetitionPhase) || 'waiting');

      // Get participant ID from localStorage (set during join)
      const storedParticipantId = localStorage.getItem(`competition_${id}_participantId`);
      if (storedParticipantId) {
        setParticipantId(storedParticipantId);
      }

      // Fetch teams if team mode
      if (compData.participantMode === 'team') {
        try {
          const teamsData = await competitionApi.getTeams(id);
          setTeams(teamsData.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color,
            captainId: t.captainId,
            members: t.members || [],
            memberCount: t.memberCount || t.members?.length || 0,
            maxSize: t.maxSize,
          })));

          // Check if I'm in a team
          if (storedParticipantId) {
            const myTeamData = teamsData.find(t =>
              t.members?.some((m: TeamMember) => m.participantId === storedParticipantId)
            );
            if (myTeamData) {
              setMyTeam({
                id: myTeamData.id,
                name: myTeamData.name,
                color: myTeamData.color,
                captainId: myTeamData.captainId,
                members: myTeamData.members || [],
                memberCount: myTeamData.memberCount || myTeamData.members?.length || 0,
                maxSize: myTeamData.maxSize,
              });
              const myMember = myTeamData.members?.find((m: TeamMember) => m.participantId === storedParticipantId);
              if (myMember) {
                setMyRole(myMember.role);
              }
            }
          }
        } catch {
          console.error('Failed to fetch teams');
        }
      }
    } catch (err) {
      console.error('Failed to fetch competition:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Submit answer
  const submitAnswer = useCallback(() => {
    if (!currentQuestion || hasAnswered || !selectedAnswer || !canSubmit) return;

    setIsSubmitting(true);
    const socket = getSocket();
    socket?.emit('answer:submit', {
      competitionId: id,
      questionId: currentQuestion._id,
      answer: selectedAnswer,
      timeSpent: timerState.totalDuration - timerState.remainingTime,
      teamId: myTeam?.id,
    });
  }, [id, currentQuestion, selectedAnswer, hasAnswered, timerState, canSubmit, myTeam]);

  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    if (hasAnswered || !timerState.isRunning || !canSubmit) return;

    if (currentQuestion?.type === 'choice') {
      setSelectedAnswer(optionId);
    }
  };

  // Team actions
  const handleCreateTeam = useCallback(async (name: string, color: string) => {
    if (!id || !participantId) return;
    try {
      const team = await competitionApi.createTeam(id, { name, color, participantId });
      setMyTeam({
        id: team.id,
        name: team.name,
        color: team.color,
        captainId: team.captainId,
        members: team.members || [],
        memberCount: team.memberCount || 1,
        maxSize: team.maxSize,
      });
      setMyRole('both');
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  }, [id, participantId]);

  const handleJoinTeam = useCallback(async (teamId: string, role?: TeamRole) => {
    if (!id || !participantId) return;
    try {
      await competitionApi.joinTeam(id, teamId, { participantId, role });
      const team = await competitionApi.getTeam(id, teamId);
      setMyTeam({
        id: team.id,
        name: team.name,
        color: team.color,
        captainId: team.captainId,
        members: team.members || [],
        memberCount: team.memberCount || team.members?.length || 0,
        maxSize: team.maxSize,
      });
      setMyRole(role || 'both');
    } catch (err) {
      console.error('Failed to join team:', err);
    }
  }, [id, participantId]);

  const handleLeaveTeam = useCallback(async () => {
    if (!id || !participantId || !myTeam) return;
    try {
      await competitionApi.leaveTeam(id, myTeam.id, { participantId });
      setMyTeam(null);
      setMyRole('both');
    } catch (err) {
      console.error('Failed to leave team:', err);
    }
  }, [id, participantId, myTeam]);

  const handleUpdateRole = useCallback(async (targetParticipantId: string, role: TeamRole) => {
    const socket = getSocket();
    socket?.emit('team:update-role', {
      competitionId: id,
      teamId: myTeam?.id,
      participantId: targetParticipantId,
      role,
    });
  }, [id, myTeam]);

  const handleKickMember = useCallback((targetParticipantId: string) => {
    if (!myTeam) return;
    kickTeamMember(myTeam.id, targetParticipantId);
  }, [myTeam]);

  const handleTransferCaptain = useCallback((newCaptainId: string) => {
    if (!myTeam) return;
    transferCaptain(myTeam.id, newCaptainId);
  }, [myTeam]);

  const handleLeaveTeamSocket = useCallback(() => {
    if (!myTeam) return;
    leaveTeam();  // leaveTeam doesn't need parameters - backend tracks which team via socket
    setMyTeam(null);
    setMyRole('both');
  }, [myTeam]);

  // Socket event handlers
  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (!id || !socket) return;

    // Join as participant
    socket.emit('join', { competitionId: id, participantId: localStorage.getItem(`competition_${id}_participantId`) });

    // Competition lifecycle
    socket.on('competition:started', (data: { phase: CompetitionPhase }) => {
      setCurrentPhase(data.phase || 'waiting');
    });

    socket.on('competition:paused', () => {
      setTimerState(prev => ({ ...prev, isRunning: false }));
    });

    socket.on('competition:resumed', () => {
      setTimerState(prev => ({ ...prev, isRunning: true }));
    });

    socket.on('competition:ended', (data: { totalScore: number; finalRank: number }) => {
      setCurrentPhase('finished');
      setTotalScore(data.totalScore);
      setRank(data.finalRank);
      competitionApi.getLeaderboard(id, 10).then(setLeaderboard);
    });

    // Phase changes
    socket.on('phase:changed', (data: { phase: CompetitionPhase }) => {
      setCurrentPhase(data.phase);
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
      setCurrentQuestion(data.question);
      setTimerState(data.timerState);
      setSelectedAnswer('');
      setHasAnswered(false);
      setFeedback(null);
      setCurrentPhase('question');
    });

    socket.on('answer:result', (data: {
      correct: boolean;
      score: number;
      totalScore: number;
      rank: number;
      correctAnswer?: string
    }) => {
      setFeedback({ correct: data.correct, score: data.score, correctAnswer: data.correctAnswer });
      setTotalScore(data.totalScore);
      setRank(data.rank);
      setHasAnswered(true);
      setIsSubmitting(false);
    });

    socket.on('answer:revealed', (data: { correctAnswer: string; explanation?: string }) => {
      setCurrentPhase('revealing');
      setFeedback(prev => prev ? {
        ...prev,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation
      } : {
        correct: false,
        score: 0,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation
      });
    });

    // Timer events - backend sends milliseconds, convert to seconds for display
    socket.on('timer:tick', (data: { remainingTime: number }) => {
      setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime / 1000) }));
    });

    socket.on('timer:started', (data: { duration: number; remainingTime?: number }) => {
      const durationInSeconds = Math.ceil((data.remainingTime || data.duration) / 1000);
      const totalInSeconds = Math.ceil(data.duration / 1000);
      setTimerState({ remainingTime: durationInSeconds, isRunning: true, totalDuration: totalInSeconds });
    });

    socket.on('timer:paused', (data: { remainingTime: number }) => {
      setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime / 1000), isRunning: false }));
    });

    socket.on('timer:resumed', (data?: { remainingTime?: number }) => {
      if (data?.remainingTime !== undefined) {
        setTimerState(prev => ({ ...prev, remainingTime: Math.ceil(data.remainingTime! / 1000), isRunning: true }));
      } else {
        setTimerState(prev => ({ ...prev, isRunning: true }));
      }
    });

    socket.on('timer:ended', () => {
      setTimerState(prev => ({ ...prev, remainingTime: 0, isRunning: false }));
    });

    // Team events
    socket.on('team:created', (data: { team: Team; teamCount: number }) => {
      setTeams(prev => [...prev, data.team]);
    });

    socket.on('team:updated', (data: { team: Team }) => {
      setTeams(prev => prev.map(t => t.id === data.team.id ? data.team : t));
      if (myTeam?.id === data.team.id) {
        setMyTeam(data.team);
        const myMember = data.team.members?.find(m => m.participantId === participantId);
        if (myMember) {
          setMyRole(myMember.role);
        }
      }
    });

    // Backend uses kebab-case for team member events
    socket.on('team:member-joined', (data: { teamId: string; member: TeamMember }) => {
      setTeams(prev => prev.map(t => {
        if (t.id === data.teamId) {
          return { ...t, members: [...(t.members || []), data.member], memberCount: t.memberCount + 1 };
        }
        return t;
      }));
    });

    socket.on('team:member-left', (data: { teamId: string; participantId: string }) => {
      setTeams(prev => prev.map(t => {
        if (t.id === data.teamId) {
          return {
            ...t,
            members: (t.members || []).filter(m => m.participantId !== data.participantId),
            memberCount: t.memberCount - 1
          };
        }
        return t;
      }));
      if (data.participantId === participantId) {
        setMyTeam(null);
        setMyRole('both');
      }
    });

    // Leaderboard events
    socket.on('leaderboard:toggle', (data: { visible: boolean }) => {
      if (data.visible) {
        setCurrentPhase('leaderboard');
        competitionApi.getLeaderboard(id, 10).then(setLeaderboard);
      }
    });

    return () => {
      socket.off('competition:started');
      socket.off('competition:paused');
      socket.off('competition:resumed');
      socket.off('competition:ended');
      socket.off('phase:changed');
      socket.off('question:show');
      socket.off('answer:result');
      socket.off('answer:revealed');
      socket.off('timer:tick');
      socket.off('timer:started');
      socket.off('timer:paused');
      socket.off('timer:resumed');
      socket.off('timer:ended');
      socket.off('team:created');
      socket.off('team:updated');
      socket.off('team:member-joined');
      socket.off('team:member-left');
      socket.off('leaderboard:toggle');
    };
  }, [id, fetchData, participantId, myTeam]);

  // Countdown timer for countdown phase
  useEffect(() => {
    if (currentPhase === 'countdown' && countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, countdownValue]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timerState.remainingTime === 0 && currentPhase === 'question' && !hasAnswered && selectedAnswer && canSubmit) {
      submitAnswer();
    }
  }, [timerState.remainingTime, currentPhase, hasAnswered, selectedAnswer, canSubmit, submitAnswer]);

  // Format time from seconds (already converted from milliseconds in event handlers)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center">
        <IconLoading size={64} state="loading" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center">
        <p className="text-xl text-[var(--color-muted)]">{t('error.notFound', 'Competition not found')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header with score and rank */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{competition.name}</h1>
          {myTeam && (
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-4 w-4 rounded"
                style={{ backgroundColor: myTeam.color }}
              />
              <span className="text-sm text-[var(--color-muted)]">{myTeam.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('competition.score', 'Score')}</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{totalScore}</p>
          </div>
          {rank > 0 && (
            <div>
              <p className="text-sm text-[var(--color-muted)]">{t('competition.rank', 'Rank')}</p>
              <p className="text-2xl font-bold">#{rank}</p>
            </div>
          )}
        </div>
      </div>

      {/* Setup Phase */}
      {currentPhase === 'setup' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <IconLoading size={48} state="loading" />
          <p className="mt-4 text-xl text-[var(--color-muted)]">
            {t('competition.preparingCompetition', 'Preparing competition...')}
          </p>
        </div>
      )}

      {/* Team Formation Phase */}
      {currentPhase === 'team-formation' && participantMode === 'team' && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-center text-2xl font-bold">
            {t('competition.teamFormationPhase', 'Team Formation')}
          </h2>
          <TeamFormation
            teams={teams}
            myTeam={myTeam}
            myParticipantId={participantId}
            roleMode={roleMode}
            allowTeamFormation={competition.settings.teamSettings?.allowTeamFormation ?? true}
            isOnsiteMode={isOnsiteMode}
            onCreateTeam={handleCreateTeam}
            onJoinTeam={handleJoinTeam}
            onLeaveTeam={isOnsiteMode ? handleLeaveTeamSocket : handleLeaveTeam}
            onUpdateRole={handleUpdateRole}
            onKickMember={handleKickMember}
            onTransferCaptain={handleTransferCaptain}
          />
        </div>
      )}

      {/* Waiting Phase */}
      {currentPhase === 'waiting' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <IconLoading size={64} state="loading" />
          <p className="mt-4 text-xl text-[var(--color-muted)]">
            {t('competition.waitingForHost', 'Waiting for host to start...')}
          </p>

          {/* On-site mode notice */}
          {isOnsiteMode && (
            <GlassCard className="mt-6 max-w-md p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-blue-400">{t('competition.onsiteMode', 'On-Site Mode')}</h4>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {t('competition.onsiteModeWaitingHint', 'Questions will be shown on the host screen. Keep an eye on the main display!')}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {myTeam && (
            <GlassCard className="mt-6 p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: myTeam.color }}
                />
                <div>
                  <p className="font-medium">{myTeam.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {myTeam.memberCount} {t('competition.members', 'members')}
                    {isCaptain && <span className="ml-2 text-[var(--color-primary)]">({t('competition.captain', 'Captain')})</span>}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Countdown Phase */}
      {currentPhase === 'countdown' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          {countdownValue > 0 ? (
            <div className="animate-pulse text-[12rem] font-bold text-[var(--color-primary)] leading-none">
              {countdownValue}
            </div>
          ) : (
            <div className="animate-bounce text-6xl font-bold text-[var(--color-accent)]">
              {t('competition.go', 'GO!')}
            </div>
          )}
        </div>
      )}

      {/* Question Phase - On-Site Mode (No question shown, watch host screen) */}
      {currentPhase === 'question' && isOnsiteMode && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
          {/* Timer */}
          <div className="flex items-center gap-3">
            <IconTimer
              size={48}
              state={timerState.isRunning ? 'active' : 'idle'}
              className={cn(timerState.remainingTime < 10 && timerState.isRunning && 'text-red-500')}
            />
            <div className={cn(
              'rounded-full px-8 py-4 text-4xl font-bold text-white',
              timerState.remainingTime < 10 && timerState.isRunning
                ? 'animate-pulse bg-[var(--color-error)]'
                : 'bg-[var(--color-primary)]'
            )}>
              {formatTime(timerState.remainingTime)}
            </div>
          </div>

          {/* Watch Host Screen Message */}
          <GlassCard className="max-w-md p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold">{t('competition.watchHostScreen', 'Watch the Host Screen')}</h2>
            <p className="text-[var(--color-muted)]">
              {t('competition.onsiteQuestionHint', 'The question is displayed on the main screen. Watch the projection for the current question!')}
            </p>
            {currentQuestion && (
              <div className="mt-4 rounded-lg bg-[var(--color-primary)]/20 p-3">
                <p className="text-sm text-[var(--color-muted)]">{t('competition.currentQuestion', 'Current Question')}</p>
                <p className="text-xl font-bold text-[var(--color-primary)]">Q{currentQuestion.number}</p>
              </div>
            )}
          </GlassCard>

          {/* Team info */}
          {myTeam && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: myTeam.color }}
                />
                <div>
                  <p className="font-medium">{myTeam.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {myTeam.memberCount} {t('competition.members', 'members')}
                    {isCaptain && <span className="ml-2 text-[var(--color-primary)]">({t('competition.captain', 'Captain')})</span>}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Question Phase - Online Mode (Show question and allow answering) */}
      {currentPhase === 'question' && !isOnsiteMode && currentQuestion && (
        <div className="space-y-6">
          {/* Timer */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <IconTimer
                size={32}
                state={timerState.isRunning ? 'active' : 'idle'}
                className={cn(timerState.remainingTime < 10 && timerState.isRunning && 'text-red-500')}
              />
              <div className={cn(
                'rounded-full px-8 py-4 text-3xl font-bold text-white',
                timerState.remainingTime < 10 && timerState.isRunning
                  ? 'animate-pulse bg-[var(--color-error)]'
                  : 'bg-[var(--color-primary)]'
              )}>
                {formatTime(timerState.remainingTime)}
              </div>
            </div>
          </div>

          {/* Role indicator for split_view mode */}
          {roleMode === 'split_view' && (
            <div className="flex justify-center">
              <div className={cn(
                'rounded-full px-4 py-2 text-sm font-medium',
                myRole === 'viewer' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              )}>
                {myRole === 'viewer' && t('competition.role.viewerOnly', 'Viewer - Share the question with your teammate!')}
                {myRole === 'submitter' && t('competition.role.submitterOnly', 'Submitter - Wait for your teammate to tell you the question!')}
                {myRole === 'both' && t('competition.role.both', 'Full Access')}
              </div>
            </div>
          )}

          {/* Question (hidden for submitter in split_view mode) */}
          {canViewQuestion ? (
            <GlassCard className="p-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded bg-[var(--color-primary)]/20 px-2 py-1 text-sm text-[var(--color-primary)]">
                  Q{currentQuestion.number}
                </span>
                <span className="text-sm text-[var(--color-muted)]">
                  {currentQuestion.points} pts
                </span>
              </div>
              <LaTeXRenderer
                content={currentQuestion.content}
                className="mb-6 text-xl leading-relaxed"
              />

              {/* Options for choice questions */}
              {currentQuestion.type === 'choice' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = selectedAnswer === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option.id)}
                        disabled={hasAnswered || !timerState.isRunning || !canSubmit}
                        className={cn(
                          'w-full rounded-lg p-4 text-left transition-all',
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-card)] hover:bg-[var(--color-card)]/80',
                          (hasAnswered || !timerState.isRunning || !canSubmit) && 'cursor-not-allowed opacity-50',
                          !canSubmit && 'cursor-not-allowed'
                        )}
                      >
                        <span className="mr-3 font-bold">{option.label}.</span>
                        <LaTeXRenderer content={option.content} className="inline" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input for blank/answer questions */}
              {(currentQuestion.type === 'blank' || currentQuestion.type === 'answer') && (
                <input
                  type="text"
                  value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={hasAnswered || !timerState.isRunning || !canSubmit}
                  placeholder={t('competition.typeAnswer', 'Type your answer...')}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-lg focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                />
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center">
              <p className="text-xl text-[var(--color-muted)]">
                {t('competition.waitForTeammate', 'Wait for your teammate to tell you the question and options!')}
              </p>
              {/* Show answer input for submitter */}
              {canSubmit && currentQuestion.type === 'choice' && (
                <div className="mt-6 space-y-3">
                  {['A', 'B', 'C', 'D'].map((label) => (
                    <button
                      key={label}
                      onClick={() => setSelectedAnswer(label)}
                      disabled={hasAnswered || !timerState.isRunning}
                      className={cn(
                        'w-full rounded-lg p-4 text-xl font-bold transition-all',
                        selectedAnswer === label
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-card)] hover:bg-[var(--color-card)]/80',
                        (hasAnswered || !timerState.isRunning) && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          )}

          {/* Submit Button */}
          {!hasAnswered && canSubmit && (
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={submitAnswer}
                disabled={!selectedAnswer || isSubmitting || !timerState.isRunning}
              >
                {isSubmitting ? t('common.submitting', 'Submitting...') : t('common.submit', 'Submit')}
              </Button>
            </div>
          )}

          {/* Viewer mode info */}
          {!canSubmit && (
            <div className="flex justify-center">
              <p className="text-sm text-[var(--color-muted)]">
                {t('competition.viewerCannotSubmit', 'As a viewer, you cannot submit answers.')}
              </p>
            </div>
          )}

          {/* Feedback */}
          {hasAnswered && feedback && (
            <div className="flex justify-center">
              <div className={cn(
                'rounded-full px-6 py-3 text-xl font-bold',
                feedback.correct
                  ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                  : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
              )}>
                {feedback.correct ? t('competition.correct', 'Correct!') : t('competition.incorrect', 'Incorrect')}
                {feedback.score > 0 && ` +${feedback.score}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revealing Phase */}
      {currentPhase === 'revealing' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <GlassCard className="max-w-lg p-8 text-center">
            <h2 className="mb-6 text-2xl font-bold">
              {t('competition.answerRevealed', 'Answer Revealed')}
            </h2>
            {feedback && (
              <>
                <div className={cn(
                  'mb-6 rounded-full px-6 py-3 text-xl font-bold',
                  feedback.correct
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
                )}>
                  {feedback.correct ? t('competition.correct', 'Correct!') : t('competition.incorrect', 'Incorrect')}
                  {feedback.score > 0 && ` +${feedback.score}`}
                </div>
                {feedback.correctAnswer && (
                  <div className="rounded-xl bg-green-500/10 p-4">
                    <p className="mb-2 text-sm text-[var(--color-muted)]">
                      {t('competition.correctAnswer', 'Correct Answer')}
                    </p>
                    <LaTeXRenderer
                      content={feedback.correctAnswer}
                      className="text-2xl font-bold text-green-500"
                    />
                  </div>
                )}
                {/* Explanation / Analysis */}
                {feedback.explanation && (
                  <div className="mt-6 rounded-xl border-l-4 border-[var(--color-primary)] bg-[var(--color-secondary)]/30 p-4 text-left">
                    <p className="mb-2 text-sm font-medium text-[var(--color-muted)]">
                      {t('competition.explanation', 'Explanation')}
                    </p>
                    <LaTeXRenderer
                      content={feedback.explanation}
                      className="text-base leading-relaxed"
                    />
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </div>
      )}

      {/* Leaderboard Phase */}
      {currentPhase === 'leaderboard' && (
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-center gap-3">
            <IconTrophy size={32} state="active" className="text-yellow-500" />
            <h2 className="text-2xl font-bold">{t('competition.leaderboard', 'Leaderboard')}</h2>
          </div>
          <GlassCard className="p-4">
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.participantId}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-3',
                    entry.participantId === participantId && 'bg-[var(--color-primary)]/20'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      'text-xl font-bold',
                      index === 0 && 'text-yellow-500',
                      index === 1 && 'text-gray-400',
                      index === 2 && 'text-orange-500'
                    )}>
                      #{entry.rank}
                    </span>
                    <span>{entry.nickname}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--color-primary)]">{entry.totalScore}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {entry.correctCount} {t('competition.correct', 'correct')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
          <p className="mt-4 text-center text-[var(--color-muted)]">
            {t('competition.waitingForNext', 'Waiting for next question...')}
          </p>
        </div>
      )}

      {/* Finished Phase */}
      {currentPhase === 'finished' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <GlassCard className="max-w-md p-8 text-center">
            <IconTrophy size={64} state="active" className="mx-auto mb-4 text-yellow-500" />
            <h2 className="mb-6 text-3xl font-bold">{t('competition.gameOver', 'Game Over!')}</h2>
            <div className="mb-4">
              <p className="text-[var(--color-muted)]">{t('competition.yourRank', 'Your Rank')}</p>
              <p className="text-5xl font-bold text-[var(--color-primary)]">#{rank}</p>
            </div>
            <div className="mb-6">
              <p className="text-[var(--color-muted)]">{t('competition.totalScore', 'Total Score')}</p>
              <p className="text-4xl font-bold">{totalScore}</p>
            </div>
            {myTeam && (
              <div className="mb-6 flex items-center justify-center gap-2">
                <div
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: myTeam.color }}
                />
                <span className="text-lg">{myTeam.name}</span>
              </div>
            )}
            <Button onClick={() => navigate(`/competitions/${id}/results`)}>
              {t('competition.viewResults', 'View Results')}
            </Button>
          </GlassCard>
        </div>
      )}

      {/* Live Leaderboard Floating Panel (during question phase when enabled) */}
      {currentPhase === 'question' && competition?.settings.showLeaderboardDuringQuestion && leaderboard.length > 0 && (
        <LiveLeaderboardPanel
          leaderboard={leaderboard}
          participantId={participantId}
        />
      )}
    </div>
  );
}

// Live Leaderboard Floating Panel Component
function LiveLeaderboardPanel({
  leaderboard,
  participantId,
}: {
  leaderboard: LeaderboardEntry[];
  participantId: string;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const displayData = leaderboard.slice(0, 5);
  const myEntry = leaderboard.find(e => e.participantId === participantId);
  const myRank = myEntry?.rank || 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <GlassCard className="overflow-hidden">
        {/* Header - always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-secondary)]/20"
        >
          <div className="flex items-center gap-2">
            <IconTrophy size={18} state="active" className="text-yellow-500" />
            <span className="text-sm font-semibold">{t('competition.liveRanking', 'Live Ranking')}</span>
          </div>
          {myRank > 0 && (
            <span className="rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
              #{myRank}
            </span>
          )}
          <svg
            className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Leaderboard content - collapsible */}
        {isExpanded && (
          <div className="w-64 border-t border-[var(--color-secondary)]/30 px-3 py-2">
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {displayData.map((entry, index) => (
                <div
                  key={entry.participantId}
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1.5 text-sm',
                    entry.participantId === participantId && 'bg-[var(--color-primary)]/20'
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={cn(
                        'w-5 flex-shrink-0 font-bold',
                        index === 0 && 'text-yellow-500',
                        index === 1 && 'text-gray-400',
                        index === 2 && 'text-orange-500'
                      )}
                    >
                      {entry.rank}
                    </span>
                    <span className="truncate" title={entry.nickname}>
                      {entry.nickname}
                    </span>
                  </div>
                  <span className="ml-2 flex-shrink-0 font-semibold text-[var(--color-primary)]">
                    {entry.totalScore}
                  </span>
                </div>
              ))}

              {/* Show my position if not in top 5 */}
              {myEntry && myRank > 5 && (
                <>
                  <div className="py-1 text-center text-xs text-[var(--color-muted)]">...</div>
                  <div className="flex items-center justify-between rounded bg-[var(--color-primary)]/20 px-2 py-1.5 text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-5 flex-shrink-0 font-bold">{myRank}</span>
                      <span className="truncate">{myEntry.nickname}</span>
                    </div>
                    <span className="ml-2 flex-shrink-0 font-semibold text-[var(--color-primary)]">
                      {myEntry.totalScore}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
