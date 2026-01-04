import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconLoading } from '@/components/icons/feedback/IconLoading';
import { IconTrophy } from '@/components/icons/competition/IconTrophy';
import { IconTimer } from '@/components/icons/competition/IconTimer';
import { LaTeXRenderer } from '@/components/ui/latex-renderer';
import { competitionApi } from '@/services/competition.api';
import { ensureValidToken } from '@/services/api';
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
  type: 'choice' | 'blank' | 'answer' | 'integral';
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

interface ScoreAdjustment {
  id: string;
  targetName: string;
  adjustment: number;
  reason?: string;
  timestamp: Date;
}

// User role types for the live page
type UserRole = 'host' | 'referee' | 'display';

export function CompetitionLivePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);

  // Role from URL query param: ?role=host or ?role=referee
  const requestedRole = searchParams.get('role') as UserRole | null;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('display');
  const [totalQuestions, setTotalQuestions] = useState(0);
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
  const [isPaused, setIsPaused] = useState(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Score adjustment state
  const [showScorePanel, setShowScorePanel] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'participant' | 'team'; id: string; name: string; score: number } | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [scoreAdjustments, setScoreAdjustments] = useState<ScoreAdjustment[]>([]);

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

    if (!id) return;

    // Create socket connection with authentication - AUTO-DETECT host role
    const initSocket = async () => {
      let token: string | null = null;

      // Always try to get auth token to auto-detect if user is host
      try {
        token = await ensureValidToken();
        console.log('Got auth token, will try to join as host');
      } catch {
        console.log('No valid token, joining as display only');
      }

      const socket = io('/competition', {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      // Auto-detect: if user is logged in, try to join as host first
      socket.on('connect', () => {
        console.log('Live page socket connected');
        if (token) {
          // If logged in, try joining as host first (backend will verify if user is actually host)
          if (requestedRole === 'referee') {
            socket.emit('join:referee', { competitionId: id });
          } else {
            // Default: try to join as host if logged in
            socket.emit('join:host', { competitionId: id });
          }
        } else {
          socket.emit('join:display', { competitionId: id });
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Live page socket connection error:', error);
      });

      socket.on('error', (data: { message: string }) => {
        console.error('Live page socket error:', data.message);
        // If join failed (not authorized as host/referee), fall back to display mode
        if (userRole !== 'display') {
          console.log('Falling back to display mode');
          setUserRole('display');
          socket.emit('join:display', { competitionId: id });

          // Show notification about why fallback happened
          if (data.message.includes('Referee feature is not enabled')) {
            setErrorNotification(t('competition.referee.featureDisabled', 'Referee feature is not enabled for this competition'));
          } else if (data.message.includes('not a referee')) {
            setErrorNotification(t('competition.referee.notAuthorized', 'You are not authorized as a referee'));
          } else if (data.message.includes('not the host')) {
            setErrorNotification(t('competition.notHost', 'You are not the host of this competition'));
          }

          // Auto-dismiss notification after 5 seconds
          setTimeout(() => setErrorNotification(null), 5000);
        }
      });

      // Handle host:joined - set role and get full competition data
      socket.on('host:joined', (data: {
        competition: {
          currentPhase: CompetitionPhase;
          currentQuestionIndex: number;
          questionCount: number;
          status: string;
          timerState?: {
            remainingTime: number;
            isRunning: boolean;
            totalDuration?: number;
          };
        };
        questions: Array<{
          id: string;
          order: number;
          status: string;
          points: number;
          timeLimit: number;
          problem?: {
            id: string;
            content: string;
            type: string;
            options?: Array<{ id: string; label: string; content: string }>;
          };
        }>;
      }) => {
        console.log('Joined as host');
        setUserRole('host');
        setCurrentPhase(data.competition.currentPhase);
        setCurrentQuestionIndex(data.competition.currentQuestionIndex);
        setTotalQuestions(data.competition.questionCount);
        setIsPaused(data.competition.status === 'paused');

        if (data.competition.timerState) {
          const ts = data.competition.timerState;
          setTimerState({
            remainingTime: Math.ceil((ts.remainingTime || 0) / 1000),
            isRunning: ts.isRunning || false,
            totalDuration: Math.ceil((ts.totalDuration || 60000) / 1000),
          });
        }

        // Set questions and find current question
        if (data.questions && data.questions.length > 0) {
          const convertedQuestions = data.questions.map((q, i) => ({
            _id: q.id,
            number: i + 1,
            content: q.problem?.content || '',
            type: (q.problem?.type || 'choice') as 'choice' | 'blank' | 'answer' | 'integral',
            options: q.problem?.options,
            timeLimit: q.timeLimit,
            points: q.points,
          }));
          setQuestions(convertedQuestions);

          // Set current question if in question phase
          if (data.competition.currentQuestionIndex >= 0) {
            const cq = convertedQuestions.find(q => q.number === data.competition.currentQuestionIndex + 1);
            if (cq) setCurrentQuestion(cq);
          }
        }
      });

      // Handle referee:joined
      socket.on('referee:joined', (data: {
        competition: {
          currentPhase: CompetitionPhase;
          currentQuestionIndex: number;
          questionCount: number;
        };
      }) => {
        console.log('Joined as referee');
        setUserRole('referee');
        setCurrentPhase(data.competition.currentPhase);
        setCurrentQuestionIndex(data.competition.currentQuestionIndex);
        setTotalQuestions(data.competition.questionCount);
      });

    // Handle display:joined response - get current state including question
    socket.on('display:joined', (data: {
        competition: {
          currentPhase: CompetitionPhase;
          currentQuestionIndex: number;
          timerState?: {
            remainingTime: number;
            isRunning: boolean;
            totalDuration?: number;
          };
        };
        currentQuestion?: {
          questionId: string;
          order: number;
          content: string;
          type: string;
          options?: Array<{ id: string; label: string; content: string }>;
          timeLimit: number;
          points: number;
        };
        questions?: Array<{
          id: string;
          order: number;
          status: string;
          points: number;
          timeLimit: number;
          problem?: {
            id: string;
            content: string;
            type: string;
            options?: Array<{ id: string; label: string; content: string }>;
          };
        }>;
      }) => {
        // Set current phase from server
        if (data.competition.currentPhase) {
          setCurrentPhase(data.competition.currentPhase);
        }
        if (data.competition.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(data.competition.currentQuestionIndex);
        }

        // Set timer state from server (convert ms to seconds)
        if (data.competition.timerState) {
          const ts = data.competition.timerState;
          setTimerState({
            remainingTime: Math.ceil((ts.remainingTime || 0) / 1000),
            isRunning: ts.isRunning || false,
            totalDuration: Math.ceil((ts.totalDuration || 60000) / 1000),
          });
        }

        // Set current question if available
        console.log('Display joined:', {
          phase: data.competition.currentPhase,
          questionIndex: data.competition.currentQuestionIndex,
          hasCurrentQuestion: !!data.currentQuestion
        });
        if (data.currentQuestion) {
          console.log('Setting currentQuestion from display:joined:', data.currentQuestion);
          setCurrentQuestion({
            _id: data.currentQuestion.questionId,
            number: data.currentQuestion.order,
            content: data.currentQuestion.content,
            type: data.currentQuestion.type as 'choice' | 'blank' | 'answer' | 'integral',
            options: data.currentQuestion.options,
            timeLimit: data.currentQuestion.timeLimit,
            points: data.currentQuestion.points,
          });
        }

        // Update questions list if provided
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions.map((q, i) => ({
            _id: q.id,
            number: i + 1,
            content: q.problem?.content || '',
            type: (q.problem?.type || 'choice') as 'choice' | 'blank' | 'answer' | 'integral',
            options: q.problem?.options,
            timeLimit: q.timeLimit,
            points: q.points,
          })));
        }
      });

      // Competition lifecycle events
      socket.on('competition:started', (data: { phase: CompetitionPhase }) => {
        setCurrentPhase(data.phase || 'waiting');
      });

      socket.on('competition:paused', () => {
        setTimerState(prev => ({ ...prev, isRunning: false }));
        setIsPaused(true);
      });

      socket.on('competition:resumed', () => {
        setTimerState(prev => ({ ...prev, isRunning: true }));
        setIsPaused(false);
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

      // Question events - match backend data format
      socket.on('question:show', (data: {
        questionId: string;
        order: number;
        content: string;
        type: string;
        options?: Array<{ id: string; label: string; content: string }>;
        timeLimit: number;
        points: number;
        phase: string;
      }) => {
        console.log('Display: Received question:show event:', data);
        setCurrentQuestionIndex(data.order);
        setCurrentQuestion({
          _id: data.questionId,
          number: data.order,
          content: data.content,
          type: data.type as 'choice' | 'blank' | 'answer' | 'integral',
          options: data.options,
          timeLimit: data.timeLimit,
          points: data.points,
        });
        // Timer will be updated by timer:started event
        setTimerState(prev => ({
          ...prev,
          totalDuration: data.timeLimit,
          remainingTime: data.timeLimit,
          isRunning: true,
        }));
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

      // Timer adjusted (when host adds/removes time)
      socket.on('timer:adjusted', (data: { remainingTime: number; adjustment: number }) => {
        const remainingSeconds = Math.ceil(data.remainingTime / 1000);
        console.log('Timer adjusted:', data.adjustment / 1000, 'seconds, new remaining:', remainingSeconds);
        setTimerState(prev => ({ ...prev, remainingTime: remainingSeconds }));
      });

      socket.on('timer:ended', (data: { phase?: string }) => {
        setTimerState(prev => ({ ...prev, remainingTime: 0, isRunning: false }));
        // When timer ends, automatically switch to revealing phase (hide question, show "time's up")
        if (data?.phase) {
          setCurrentPhase(data.phase as CompetitionPhase);
        } else {
          setCurrentPhase('revealing');
        }
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
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id, fetchData, requestedRole]);

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

  // Host control handlers
  const handleNextQuestion = useCallback(() => {
    if (socketRef.current && (userRole === 'host')) {
      socketRef.current.emit('question:next', { competitionId: id });
    }
  }, [id, userRole]);

  const handleRevealAnswer = useCallback(() => {
    if (socketRef.current && userRole === 'host') {
      socketRef.current.emit('answer:reveal', { competitionId: id });
    }
  }, [id, userRole]);

  const handleShowLeaderboard = useCallback(() => {
    if (socketRef.current && userRole === 'host') {
      socketRef.current.emit('leaderboard:toggle', { competitionId: id, visible: true });
    }
  }, [id, userRole]);

  const handleBackToQuestion = useCallback(() => {
    if (socketRef.current && userRole === 'host') {
      socketRef.current.emit('phase:change', { competitionId: id, phase: 'question' });
      setCurrentPhase('question');
    }
  }, [id, userRole]);

  const handlePause = useCallback(() => {
    if (socketRef.current && userRole === 'host') {
      socketRef.current.emit('competition:pause', { competitionId: id });
    }
  }, [id, userRole]);

  const handleResume = useCallback(() => {
    if (socketRef.current && userRole === 'host') {
      socketRef.current.emit('competition:resume', { competitionId: id });
    }
  }, [id, userRole]);

  const handleTimerAdjust = useCallback((seconds: number) => {
    if (socketRef.current && userRole === 'host') {
      // Backend expects 'adjustment' in milliseconds
      socketRef.current.emit('timer:adjust', { competitionId: id, adjustment: seconds * 1000 });
    }
  }, [id, userRole]);

  const handleEndCompetition = useCallback(() => {
    if (socketRef.current && userRole === 'host') {
      socketRef.current.emit('competition:end', { competitionId: id });
    }
  }, [id, userRole]);

  // Score adjustment handler - works for both host and referee
  const handleScoreAdjust = useCallback(() => {
    if (!socketRef.current || !selectedTarget || adjustmentValue === 0) return;

    socketRef.current.emit('score:addBonus', {
      competitionId: id,
      participantId: selectedTarget.id,
      bonusPoints: adjustmentValue,
      reason: adjustmentReason || undefined,
    });

    // Add to local history
    setScoreAdjustments(prev => [{
      id: `adj-${Date.now()}`,
      targetName: selectedTarget.name,
      adjustment: adjustmentValue,
      reason: adjustmentReason,
      timestamp: new Date(),
    }, ...prev]);

    // Reset form
    setSelectedTarget(null);
    setAdjustmentValue(0);
    setAdjustmentReason('');
  }, [id, selectedTarget, adjustmentValue, adjustmentReason]);

  // Get the join URL for QR code
  const joinUrl = useMemo(() => {
    if (!competition) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/competition/join/${competition.joinCode}`;
  }, [competition]);

  // Check if user is host or referee (can control/adjust)
  const canControl = userRole === 'host' || userRole === 'referee';

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

  // Determine if we should show the three-column layout
  const showThreeColumnLayout = canControl && currentPhase !== 'setup' && currentPhase !== 'waiting' && currentPhase !== 'team-formation';

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: colors.background, color: colors.text }}>
      {/* Paused Overlay - Full screen when competition is paused */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="mb-8 flex items-center justify-center">
                <PauseCircleIcon className="h-32 w-32 animate-pulse text-yellow-500" />
              </div>
              <h1 className="text-6xl font-bold text-yellow-500">
                {t('competition.paused', '比赛已暂停')}
              </h1>
              <p className="mt-6 text-2xl text-yellow-400/80">
                {t('competition.pausedHint', '请等待主持人继续比赛...')}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Notification */}
      <AnimatePresence>
        {errorNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-red-500 px-6 py-3 text-white shadow-lg"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorNotification}</span>
              <button
                onClick={() => setErrorNotification(null)}
                className="ml-2 hover:opacity-80"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar - Only for host/referee */}
      {canControl && (
        <div
          className="flex shrink-0 items-center justify-between px-6 py-3"
          style={{ backgroundColor: colors.primary }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">{competition.name}</h1>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm text-white">
              {userRole === 'host' ? t('competition.hostMode', '主持人模式') : t('competition.refereeMode', '裁判模式')}
            </span>
          </div>

          {/* Timer and Controls for Host */}
          {userRole === 'host' && (
            <div className="flex items-center gap-4">
              {/* Timer Display */}
              <div className="flex items-center gap-2">
                <IconTimer
                  size={24}
                  state={timerState.isRunning ? 'active' : 'idle'}
                  className={cn('text-white', timerState.remainingTime < 10 && timerState.isRunning && 'text-red-300')}
                />
                <span
                  className={cn(
                    'font-mono text-2xl font-bold text-white',
                    timerState.remainingTime < 10 && timerState.isRunning && 'text-red-300'
                  )}
                >
                  {formatTime(timerState.remainingTime)}
                </span>
              </div>

              {/* Timer Adjust */}
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleTimerAdjust(-10)} className="text-white hover:bg-white/20">-10s</Button>
                <Button size="sm" variant="ghost" onClick={() => handleTimerAdjust(10)} className="text-white hover:bg-white/20">+10s</Button>
                <Button size="sm" variant="ghost" onClick={() => handleTimerAdjust(30)} className="text-white hover:bg-white/20">+30s</Button>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-white/30" />

              {/* Control Buttons */}
              {isPaused ? (
                <Button onClick={handleResume} size="sm" className="bg-green-600 hover:bg-green-700">
                  <PlayIcon className="mr-1 h-4 w-4" />
                  {t('competition.resume', '继续')}
                </Button>
              ) : (
                <Button onClick={handlePause} size="sm" variant="outline" className="border-white/50 text-white hover:bg-white/20">
                  <PauseIcon className="mr-1 h-4 w-4" />
                  {t('competition.pause', '暂停')}
                </Button>
              )}

              {currentPhase === 'question' && (
                <Button onClick={handleRevealAnswer} size="sm" className="bg-white/20 hover:bg-white/30 text-white">
                  <CheckIcon className="mr-1 h-4 w-4" />
                  {t('competition.revealAnswer', '揭晓答案')}
                </Button>
              )}

              {currentPhase !== 'leaderboard' && (
                <Button onClick={handleShowLeaderboard} size="sm" variant="outline" className="border-white/50 text-white hover:bg-white/20">
                  <IconTrophy size={16} className="mr-1" />
                  {t('competition.showLeaderboard', '排行榜')}
                </Button>
              )}

              {(currentPhase === 'leaderboard' || currentPhase === 'revealing') && (
                <Button onClick={handleBackToQuestion} size="sm" variant="outline" className="border-white/50 text-white hover:bg-white/20">
                  <BackIcon className="mr-1 h-4 w-4" />
                  {t('competition.backToQuestion', '返回题目')}
                </Button>
              )}

              <Button
                onClick={handleNextQuestion}
                size="sm"
                disabled={currentQuestionIndex >= (totalQuestions || questions.length) - 1}
                className="bg-white text-[var(--color-primary)] hover:bg-white/90"
              >
                {currentQuestionIndex < 0
                  ? t('competition.startFirstQuestion', '开始答题')
                  : t('competition.nextQuestion', '下一题')}
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>

              <Button onClick={handleEndCompetition} size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-500/20">
                {t('competition.end', '结束')}
              </Button>
            </div>
          )}

          {/* Referee Info */}
          {userRole === 'referee' && (
            <div className="flex items-center gap-4 text-white">
              <span>{t('competition.question', '问题')} {currentQuestionIndex + 1} / {totalQuestions || questions.length}</span>
              <div className="flex items-center gap-2">
                <IconTimer size={20} state={timerState.isRunning ? 'active' : 'idle'} />
                <span className="font-mono font-bold">{formatTime(timerState.remainingTime)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {canControl && displaySettings.showProgress && currentPhase !== 'setup' && currentPhase !== 'waiting' && (
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

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1">
        {/* Left Sidebar - Leaderboard (for host/referee) */}
        {showThreeColumnLayout && (
          <div
            className="w-72 shrink-0 overflow-auto border-r"
            style={{ borderColor: colors.secondary + '40' }}
          >
            <LeaderboardSidebar
              leaderboard={leaderboard}
              teamLeaderboard={teamLeaderboard}
              participantMode={participantMode}
              colors={colors}
              onSelectTarget={(target) => {
                setSelectedTarget(target);
                setShowScorePanel(true);
              }}
              selectedTarget={selectedTarget}
            />
          </div>
        )}

        {/* Center Content - Main Display */}
        <div className="flex min-w-0 flex-1 flex-col">
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
              showHeader={!canControl}
            />
          )}

          {/* Answer Revealing / Time's Up */}
          {currentPhase === 'revealing' && (
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
        </div>

        {/* Right Sidebar - Score Adjustment Panel (for host/referee) */}
        <AnimatePresence>
          {showThreeColumnLayout && showScorePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden border-l"
              style={{ borderColor: colors.secondary + '40' }}
            >
              <ScoreAdjustmentPanel
                colors={colors}
                selectedTarget={selectedTarget}
                adjustmentValue={adjustmentValue}
                adjustmentReason={adjustmentReason}
                scoreAdjustments={scoreAdjustments}
                onAdjustmentValueChange={setAdjustmentValue}
                onAdjustmentReasonChange={setAdjustmentReason}
                onSubmitAdjustment={handleScoreAdjust}
                onClearSelection={() => setSelectedTarget(null)}
                onClose={() => setShowScorePanel(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Score Panel Button (when panel is hidden) */}
      {showThreeColumnLayout && !showScorePanel && (
        <button
          onClick={() => setShowScorePanel(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg"
          style={{ backgroundColor: colors.primary }}
        >
          <GavelIcon className="h-5 w-5 text-white" />
          <span className="text-sm font-medium text-white">{t('competition.adjustScore', '调整分数')}</span>
        </button>
      )}

      {/* QR Code Corner Display (when not in setup/finished and not in control mode) */}
      {!canControl && currentPhase !== 'setup' && currentPhase !== 'finished' && currentPhase !== 'waiting' && currentPhase !== 'team-formation' && (
        <QRCodeCorner joinCode={competition.joinCode} joinUrl={joinUrl} colors={colors} />
      )}

      {/* Display-only header (when not host/referee) */}
      {!canControl && (currentPhase === 'question' || currentPhase === 'revealing' || currentPhase === 'leaderboard') && (
        <div className="fixed left-4 top-4 z-40 flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: colors.background + 'dd' }}>
          <span className="font-mono text-sm" style={{ color: colors.text }}>
            {t('competition.questionOf', 'Question {{current}} of {{total}}', {
              current: currentQuestionIndex + 1,
              total: questions.length || totalQuestions,
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// Leaderboard Sidebar Component
function LeaderboardSidebar({
  leaderboard,
  teamLeaderboard,
  participantMode,
  colors,
  onSelectTarget,
  selectedTarget,
}: {
  leaderboard: LeaderboardEntry[];
  teamLeaderboard: TeamLeaderboardEntry[];
  participantMode: 'individual' | 'team';
  colors: CustomThemeColors;
  onSelectTarget: (target: { type: 'participant' | 'team'; id: string; name: string; score: number }) => void;
  selectedTarget: { type: 'participant' | 'team'; id: string; name: string; score: number } | null;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center gap-2">
        <IconTrophy size={20} state="active" className="text-yellow-500" />
        <h3 className="font-semibold" style={{ color: colors.text }}>
          {participantMode === 'team'
            ? t('simulation.teamStandings', '队伍排名')
            : t('simulation.leaderboard', '排行榜')}
        </h3>
      </div>

      <p className="mb-3 text-xs" style={{ color: colors.text + '60' }}>
        {t('competition.clickToAdjustScore', '点击选择要调整分数的参与者')}
      </p>

      <div className="flex-1 space-y-2 overflow-auto">
        {participantMode === 'team' && teamLeaderboard.length > 0
          ? teamLeaderboard.map((entry) => {
              const isSelected = selectedTarget?.type === 'team' && selectedTarget?.id === entry.team.id;
              return (
                <button
                  key={entry.team.id}
                  onClick={() => onSelectTarget({
                    type: 'team',
                    id: entry.team.id,
                    name: entry.team.name,
                    score: entry.team.totalScore,
                  })}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
                    isSelected && 'ring-2'
                  )}
                  style={{
                    backgroundColor: isSelected ? colors.primary + '20' : entry.team.color + '15',
                    borderLeft: `4px solid ${entry.team.color}`,
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': colors.primary,
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: entry.team.color }}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" style={{ color: colors.text }}>
                      {entry.team.name}
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '70' }}>
                      {entry.team.members?.length || 0} {t('simulation.members', '成员')}
                    </p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: colors.primary }}>
                    {entry.team.totalScore}
                  </span>
                </button>
              );
            })
          : leaderboard.map((entry) => {
              const isSelected = selectedTarget?.type === 'participant' && selectedTarget?.id === entry.participantId;
              return (
                <button
                  key={entry.participantId}
                  onClick={() => onSelectTarget({
                    type: 'participant',
                    id: entry.participantId,
                    name: entry.nickname,
                    score: entry.totalScore,
                  })}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
                    isSelected && 'ring-2'
                  )}
                  style={{
                    backgroundColor: isSelected ? colors.primary + '20' : colors.secondary + '20',
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': colors.primary,
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor:
                        entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#94a3b8' : entry.rank === 3 ? '#cd7f32' : colors.secondary,
                      color: entry.rank <= 3 ? 'white' : colors.text,
                    }}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" style={{ color: colors.text }}>
                      {entry.nickname}
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '70' }}>
                      {entry.correctCount} {t('competition.correct', '正确')}
                    </p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: colors.primary }}>
                    {entry.totalScore}
                  </span>
                </button>
              );
            })}

        {leaderboard.length === 0 && teamLeaderboard.length === 0 && (
          <div className="py-8 text-center text-sm" style={{ color: colors.text + '60' }}>
            {t('competition.noParticipantsYet', '暂无参与者')}
          </div>
        )}
      </div>
    </div>
  );
}

// Score Adjustment Panel Component
function ScoreAdjustmentPanel({
  colors,
  selectedTarget,
  adjustmentValue,
  adjustmentReason,
  scoreAdjustments,
  onAdjustmentValueChange,
  onAdjustmentReasonChange,
  onSubmitAdjustment,
  onClearSelection,
  onClose,
}: {
  colors: CustomThemeColors;
  selectedTarget: { type: 'participant' | 'team'; id: string; name: string; score: number } | null;
  adjustmentValue: number;
  adjustmentReason: string;
  scoreAdjustments: ScoreAdjustment[];
  onAdjustmentValueChange: (value: number) => void;
  onAdjustmentReasonChange: (reason: string) => void;
  onSubmitAdjustment: () => void;
  onClearSelection: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold" style={{ color: colors.text }}>
          <GavelIcon className="h-5 w-5" style={{ color: colors.primary }} />
          {t('simulation.scoreAdjustment', '分数调整')}
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-gray-500/20"
        >
          <XIcon className="h-4 w-4" style={{ color: colors.text }} />
        </button>
      </div>

      {/* Score Adjustment Form */}
      <div
        className="mb-4 rounded-xl p-4"
        style={{ backgroundColor: colors.secondary + '20' }}
      >
        {selectedTarget ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: colors.text }}>
                {t('simulation.target', '目标')}:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: colors.primary }}>
                  {selectedTarget.name}
                </span>
                <button
                  onClick={onClearSelection}
                  className="rounded p-1 transition-colors"
                  style={{ backgroundColor: colors.secondary + '30' }}
                >
                  <XIcon className="h-3 w-3" style={{ color: colors.text }} />
                </button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm" style={{ color: colors.text + '80' }}>
                {t('competition.currentScore', '当前分数')}: <span className="font-bold" style={{ color: colors.accent }}>{selectedTarget.score}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm" style={{ color: colors.text }}>
                {t('simulation.adjustment', '调整')}
              </label>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onAdjustmentValueChange(adjustmentValue - 10)}
                  className="flex h-10 w-12 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                >
                  -10
                </button>
                <button
                  onClick={() => onAdjustmentValueChange(adjustmentValue - 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: '#ef444410', color: '#ef4444' }}
                >
                  -1
                </button>
                <input
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => onAdjustmentValueChange(parseInt(e.target.value) || 0)}
                  className="w-20 rounded-lg border p-2 text-center font-mono text-lg font-bold"
                  style={{
                    borderColor: colors.secondary,
                    backgroundColor: colors.background,
                    color: adjustmentValue > 0 ? '#22c55e' : adjustmentValue < 0 ? '#ef4444' : colors.text,
                  }}
                />
                <button
                  onClick={() => onAdjustmentValueChange(adjustmentValue + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: '#22c55e10', color: '#22c55e' }}
                >
                  +1
                </button>
                <button
                  onClick={() => onAdjustmentValueChange(adjustmentValue + 10)}
                  className="flex h-10 w-12 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}
                >
                  +10
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm" style={{ color: colors.text }}>
                {t('simulation.reason', '原因')} ({t('common.optional', '可选')})
              </label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => onAdjustmentReasonChange(e.target.value)}
                placeholder={t('simulation.reasonPlaceholder', '输入原因...') as string}
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
              {adjustmentValue > 0 ? '+' : ''}{adjustmentValue} {t('simulation.applyAdjustment', '应用调整')}
            </Button>
          </div>
        ) : (
          <p className="py-4 text-center text-sm" style={{ color: colors.text + '60' }}>
            {t('simulation.selectTarget', '从左侧列表选择要调整分数的参与者')}
          </p>
        )}
      </div>

      {/* Adjustment History */}
      <div className="flex-1 overflow-auto">
        <h3 className="mb-2 text-sm font-medium" style={{ color: colors.text }}>
          {t('simulation.adjustmentHistory', '调整记录')}
        </h3>
        {scoreAdjustments.length === 0 ? (
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {t('simulation.noAdjustments', '暂无调整记录')}
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
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-8 flex h-32 w-32 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary + '20' }}
      >
        <IconLoading size={48} state="loading" />
      </motion.div>
      <h1 className="mb-4 text-4xl font-bold" style={{ color: colors.text }}>
        {competition.name}
      </h1>
      <p className="text-xl" style={{ color: colors.text + '80' }}>
        {t('competition.preparingCompetition', '正在准备比赛...')}
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
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-5xl font-bold" style={{ color: colors.text }}>
        {competition.name}
      </h1>

      <div className="mb-8 text-center">
        <p className="mb-4 text-2xl" style={{ color: colors.accent }}>
          {t('competition.teamFormationPhase', '组队阶段')}
        </p>
        <p className="text-lg" style={{ color: colors.text + '80' }}>
          {t('competition.formYourTeams', '请组建你的团队！')}
        </p>
      </div>

      {/* QR Code and Join Code */}
      <div className="mb-8 flex items-center gap-12">
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <QRCodeSVG value={joinUrl} size={200} level="M" />
        </div>
        <div className="text-center">
          <p className="mb-2 text-lg" style={{ color: colors.text + '80' }}>
            {t('competition.joinWithCode', '使用代码加入')}
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
            {t('competition.participants', '参与者')}
          </p>
        </div>
        <div>
          <p className="text-4xl font-bold" style={{ color: colors.primary }}>
            {teamCount}
          </p>
          <p style={{ color: colors.text + '80' }}>
            {t('competition.teams', '队伍')}
          </p>
        </div>
      </div>

      {/* Team List */}
      {teams.length > 0 && (
        <div className="w-full max-w-4xl">
          <h3 className="mb-4 text-xl font-semibold" style={{ color: colors.text }}>
            {t('competition.formedTeams', '已组建队伍')}
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {teams.map((team) => (
              <motion.div
                key={team.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
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
                    {team.memberCount} {t('competition.members', '成员')}
                  </p>
                </div>
              </motion.div>
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
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-5xl font-bold"
        style={{ color: colors.text }}
      >
        {competition.name}
      </motion.h1>

      {/* QR Code */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-8 rounded-3xl bg-white p-8 shadow-2xl"
      >
        <QRCodeSVG value={joinUrl} size={280} level="M" />
      </motion.div>

      <div className="mb-12 text-center">
        <p className="mb-4 text-2xl" style={{ color: colors.text + '80' }}>
          {t('competition.joinWith', '使用代码加入')}
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
              <motion.p
                key={participantCount}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-5xl font-bold"
                style={{ color: colors.accent }}
              >
                {participantCount}
              </motion.p>
              <p className="mt-2 text-xl" style={{ color: colors.text + '80' }}>
                {t('competition.participantsJoined', '人已加入')}
              </p>
            </div>
            <div>
              <motion.p
                key={teamCount}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-5xl font-bold"
                style={{ color: colors.primary }}
              >
                {teamCount}
              </motion.p>
              <p className="mt-2 text-xl" style={{ color: colors.text + '80' }}>
                {t('competition.teamsFormed', '队伍已组建')}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-3xl">
            <motion.span
              key={participantCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="font-bold"
              style={{ color: colors.accent }}
            >
              {participantCount}
            </motion.span>
            <span className="ml-3" style={{ color: colors.text + '80' }}>
              {t('competition.participantsJoined', '人已加入')}
            </span>
          </p>
        )}
      </div>

      <div className="mt-12 flex gap-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colors.accent }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }}
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
    <div className="flex flex-1 flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {countdownValue > 0 ? (
          <motion.div
            key={countdownValue}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="text-[20rem] font-bold leading-none"
            style={{ color: colors.primary }}
          >
            {countdownValue}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-8xl font-bold"
            style={{ color: colors.accent }}
          >
            {t('competition.go', 'GO!')}
          </motion.div>
        )}
      </AnimatePresence>
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
  showHeader = true,
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
  showHeader?: boolean;
}) {
  const { t } = useTranslation();
  const isLowTime = timerState.remainingTime < 10 && timerState.isRunning;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header with timer and progress (only for display mode) */}
      {showHeader && (
        <div
          className="flex shrink-0 items-center justify-between px-8 py-4"
          style={{ backgroundColor: colors.primary }}
        >
          <div className="text-white">
            {displaySettings.showQuestionNumber && (
              <span className="text-xl font-medium">
                {t('competition.questionOf', '问题 {{current}} / {{total}}', {
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
              <motion.div
                className={cn(
                  'rounded-full px-6 py-3 text-3xl font-bold text-white',
                  isLowTime && 'animate-pulse'
                )}
                style={{
                  backgroundColor: isLowTime ? '#ef4444' : colors.accent,
                }}
                animate={isLowTime ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {formatTime(timerState.remainingTime)}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar (only for display mode) */}
      {showHeader && displaySettings.showProgress && (
        <div className="h-2 shrink-0" style={{ backgroundColor: colors.secondary + '40' }}>
          <motion.div
            className="h-full"
            style={{ backgroundColor: colors.accent }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Timer bar for host/referee mode */}
      {!showHeader && (
        <div className="h-2 shrink-0" style={{ backgroundColor: colors.secondary + '30' }}>
          <motion.div
            className="h-full"
            style={{ backgroundColor: isLowTime ? '#ef4444' : colors.accent }}
            animate={{ width: `${(timerState.remainingTime / timerState.totalDuration) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Questions content based on layout */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-8">
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

// Single Question View with LaTeX - Improved for different question types
function SingleQuestionView({
  question,
  colors,
  displaySettings,
}: {
  question: CurrentQuestion;
  colors: CustomThemeColors;
  displaySettings: CompetitionDisplaySettings;
}) {
  const { t } = useTranslation();
  const optionColors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-5xl flex-col items-center"
    >
      {/* Question number badge */}
      {displaySettings.showQuestionNumber && (
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
          style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
        >
          {question.number}
        </div>
      )}

      {/* Question type indicator */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="rounded-full px-4 py-1 text-sm font-medium"
          style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
        >
          {question.type === 'choice' && t('problem.type.choice', '选择题')}
          {question.type === 'blank' && t('problem.type.blank', '填空题')}
          {question.type === 'answer' && t('problem.type.answer', '解答题')}
          {question.type === 'integral' && t('problem.type.integral', '积分题')}
        </span>
        <span className="text-lg font-medium" style={{ color: colors.accent }}>
          {question.points} {t('competition.points', '分')}
        </span>
      </div>

      {/* Question content with LaTeX */}
      <LaTeXRenderer
        content={question.content}
        className="mb-8 max-w-4xl text-center text-3xl leading-relaxed md:text-4xl"
        style={{ color: colors.text }}
      />

      {/* Options for choice questions */}
      {question.type === 'choice' && question.options && (
        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
          {question.options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 rounded-xl p-5 text-white"
              style={{ backgroundColor: optionColors[index % optionColors.length] }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {option.label}
              </span>
              <LaTeXRenderer content={option.content} className="text-xl" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Hint for fill-in-blank and integral questions */}
      {(question.type === 'blank' || question.type === 'integral') && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: colors.secondary + '20' }}
        >
          <p className="text-lg" style={{ color: colors.text + '80' }}>
            {question.type === 'integral'
              ? t('competition.enterIntegral', '请输入原函数（不含 +C）')
              : t('competition.enterAnswer', '请输入答案')}
          </p>
        </div>
      )}

      {/* Hint for answer questions */}
      {question.type === 'answer' && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: colors.secondary + '20' }}
        >
          <p className="text-lg" style={{ color: colors.text + '80' }}>
            {t('competition.writeAnswer', '请在答题纸上写出完整解答过程')}
          </p>
        </div>
      )}
    </motion.div>
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
      className="grid w-full gap-6"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {questions.map((question, index) => (
        <motion.div
          key={question._id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <QuestionCard
            question={question}
            colors={colors}
            displaySettings={displaySettings}
          />
        </motion.div>
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
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {questions.map((question, index) => (
        <motion.div
          key={question._id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <QuestionCard
            question={question}
            colors={colors}
            displaySettings={displaySettings}
            horizontal
          />
        </motion.div>
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
            {question.type === 'choice' && t('problem.type.choice', '选择题')}
            {question.type === 'blank' && t('problem.type.blank', '填空题')}
            {question.type === 'answer' && t('problem.type.answer', '解答题')}
            {question.type === 'integral' && t('problem.type.integral', '积分题')}
          </span>
          <span className="text-sm" style={{ color: colors.text + '80' }}>
            {question.points} {t('competition.points', '分')}
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
  question: CurrentQuestion | null;
  colors: CustomThemeColors;
}) {
  const { t } = useTranslation();

  // If no question or no correct answer, show "Time's Up" screen
  if (!question || !question.correctAnswer) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        {/* Time's Up Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-8 flex h-32 w-32 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.accent + '20' }}
        >
          <TimerIcon className="h-16 w-16" style={{ color: colors.accent }} />
        </motion.div>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4 text-5xl font-bold"
          style={{ color: colors.accent }}
        >
          {t('competition.timeUp', '时间到！')}
        </motion.h2>
        <p className="text-2xl" style={{ color: colors.text + '80' }}>
          {t('competition.waitingForReveal', '等待主持人公布答案...')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: '#22c55e20' }}
      >
        <CheckIcon className="h-12 w-12 text-green-500" />
      </motion.div>

      <h2 className="mb-8 text-3xl font-bold" style={{ color: colors.text }}>
        {t('competition.answerRevealed', '正确答案')}
      </h2>

      {/* Question */}
      <div
        className="mb-8 max-w-3xl rounded-2xl p-8"
        style={{ backgroundColor: colors.secondary + '20' }}
      >
        <LaTeXRenderer
          content={question.content}
          className="text-center text-2xl"
          style={{ color: colors.text }}
        />
      </div>

      {/* Correct Answer */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <div
          className="rounded-xl px-12 py-6"
          style={{ backgroundColor: '#22c55e20' }}
        >
          {question.type === 'choice' && question.options ? (
            <div className="flex items-center gap-4">
              <span className="text-6xl font-bold text-green-500">
                {question.correctAnswer}
              </span>
              <span className="text-2xl" style={{ color: colors.text }}>
                <LaTeXRenderer
                  content={question.options.find(o => o.label === question.correctAnswer)?.content || ''}
                  className="inline"
                />
              </span>
            </div>
          ) : (
            <LaTeXRenderer
              content={question.correctAnswer || ''}
              className="text-4xl font-bold text-green-500"
            />
          )}
        </div>
      </motion.div>

      {/* Explanation / Analysis */}
      {question.explanation && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 w-full max-w-3xl"
        >
          <p className="mb-4 text-xl" style={{ color: colors.text + '80' }}>
            {t('competition.explanation', '解析')}
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
        </motion.div>
      )}
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
        subtext: `${e.team.members?.length || 0} ${t('competition.members', '成员')}`,
        color: e.team.color,
      }))
    : leaderboard.map(e => ({
        id: e.participantId,
        rank: e.rank,
        name: e.nickname,
        score: e.totalScore,
        subtext: `${e.correctCount} ${t('competition.correct', '正确')}`,
      }));

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex items-center gap-4"
      >
        <IconTrophy size={48} state="active" className="text-yellow-500" />
        <h2 className="text-4xl font-bold" style={{ color: colors.text }}>
          {isEnded
            ? t('competition.finalResults', '最终结果')
            : t('competition.leaderboard', '排行榜')}
        </h2>
      </motion.div>

      <div className="w-full max-w-2xl space-y-4">
        {displayData.slice(0, 10).map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-center justify-between rounded-xl p-6 transition-all',
              index === 0 && 'scale-105',
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
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold"
                style={{
                  backgroundColor:
                    index === 0 ? '#fbbf24' :
                    index === 1 ? '#9ca3af' :
                    index === 2 ? '#cd7f32' :
                    colors.secondary,
                  color: index < 3 ? 'white' : colors.text,
                }}
              >
                {entry.rank}
              </span>
              {'color' in entry && (
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: entry.color as string }}
                />
              )}
              <span className="text-2xl font-medium" style={{ color: colors.text }}>
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
          </motion.div>
        ))}
      </div>

      {isEnded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-2xl"
          style={{ color: colors.text + '60' }}
        >
          {t('competition.thanksForParticipating', '感谢参与！')}
        </motion.div>
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
      className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-xl p-3"
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

// Icon Components
type IconProps = { className?: string; style?: React.CSSProperties };

function PlayIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function PauseCircleIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="10" y1="15" x2="10" y2="9" />
      <line x1="14" y1="15" x2="14" y2="9" />
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

function ChevronRightIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
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

function BackIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
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
