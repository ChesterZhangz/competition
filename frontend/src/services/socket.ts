import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useCompetitionStore } from '@/store/competitionStore';

// Socket event data types
interface JoinedEventData {
  competition: {
    id: string;
    name: string;
    type: string;
    mode: 'onsite' | 'online';
    participantMode: 'individual' | 'team';
    status: string;
    currentPhase: string;
    currentQuestionIndex: number;
    participantCount: number;
    teamCount: number;
    settings: {
      questionTimeLimit: number;
      basePoints: number;
      timeBonus: boolean;
      showLeaderboard: boolean;
      showCorrectAnswer: boolean;
      teamSettings?: {
        enabled: boolean;
        teamSize: number;
        minTeamSize: number;
      };
    };
  };
  participant: {
    id: string;
    nickname: string;
    avatar?: string;
    teamId?: string;
    role: string;
    totalScore: number;
    isCaptain?: boolean;
  };
  team?: {
    id: string;
    name: string;
    color: string;
    captainId: string;
    memberCount: number;
    maxSize: number;
    isNewTeam?: boolean;
  };
  questionCount: number;
  teams: TeamInfo[];
  leaderboard: LeaderboardItem[];
}

interface HostJoinedEventData {
  competition: {
    id: string;
    name: string;
    type: string;
    mode: 'onsite' | 'online';
    status: string;
    currentPhase: string;
    participantMode: 'individual' | 'team';
    currentQuestionIndex: number;
    questionCount: number;
    settings: Record<string, unknown>;
    timerState: {
      remainingTime: number;
      isRunning: boolean;
    };
    participantCount: number;
    teamCount: number;
    joinCode: string;
  };
  questions: QuestionData[];
  teams: TeamData[];
  leaderboard: LeaderboardItem[];
}

interface TeamInfo {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  maxSize: number;
  captainId: string;
}

interface LeaderboardItem {
  rank: number;
  participantId?: string;
  teamId?: string;
  nickname: string;
  teamName?: string;
  totalScore: number;
  correctCount?: number;
  isOnline?: boolean;
}

interface ParticipantJoinedData {
  participantId: string;
  nickname: string;
  avatar?: string;
  isOnline: boolean;
  teamId?: string;
  teamName?: string;
}

interface TeamMemberData {
  participantId: string;
  nickname: string;
  role: 'viewer' | 'submitter' | 'both';
  isOnline: boolean;
}

interface TeamData {
  id: string;
  name: string;
  color: string;
  captainId: string;
  members: TeamMemberData[];
  memberCount: number;
  maxSize?: number;
  totalScore?: number;
  averageScore?: number;
}

interface QuestionData {
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
    correctAnswer?: string | string[];
  } | null;
}

interface QuestionShowData {
  questionId: string;
  order: number;
  content: string;
  type: string;
  options?: Array<{ id: string; label: string; content: string }>;
  timeLimit: number;
  points: number;
  phase: string;
}

interface QuestionPreparingData {
  questionIndex: number;
  timeLimit: number;
  phase: string;
}

interface AnswerRevealedData {
  questionId: string;
  correctAnswer: string | string[];
  explanation?: string;
  phase: string;
}

interface CompetitionEndedData {
  endTime: string;
  phase: string;
  finalLeaderboard: LeaderboardItem[];
}

interface AnswerResultData {
  questionId: string;
  isCorrect: boolean;
  points: number;
}

interface TimerTickData {
  competitionId: string;
  remainingTime: number;  // in milliseconds
  timestamp: number;
}

interface TimerEventData {
  competitionId: string;
  questionIndex?: number;
  totalDuration?: number;
  remainingTime?: number;
  adjustment?: number;
  timestamp: number;
}

interface PhaseChangedData {
  phase: string;
  timestamp: number;
}

interface LeaderboardShowData {
  phase: string;
  leaderboard: LeaderboardItem[];
  teamLeaderboard?: TeamData[];
}

// Team join options
interface TeamJoinOptions {
  teamName: string;
  teamColor: string;
}

let socket: Socket | null = null;

export { socket };

export function getSocket(): Socket | null {
  return socket;
}

// All socket events for cleanup
const ALL_SOCKET_EVENTS = [
  // Connection events
  'connect',
  'connect_error',
  'disconnect',
  'error',
  // Join events
  'joined',
  'host:joined',
  'display:joined',
  'referee:joined',
  // Participant events
  'participant:joined',
  'participant:left',
  // Competition control events
  'competition:started',
  'competition:paused',
  'competition:resumed',
  'competition:ended',
  // Phase events
  'phase:changed',
  // Question events
  'question:preparing',
  'question:show',
  'question:none-remaining',
  'question:pointsUpdated',
  // Answer events
  'answer:revealed',
  'answer:result',
  // Timer events
  'timer:started',
  'timer:tick',
  'timer:paused',
  'timer:resumed',
  'timer:reset',
  'timer:adjusted',
  'timer:ended',
  // Leaderboard events
  'leaderboard:update',
  'leaderboard:show',
  // Team events
  'team:created',
  'team:joined',
  'team:left',
  'team:new',
  'team:member-joined',
  'team:member-left',
  'team:role-updated',
  'team:score-updated',
  // Referee events
  'referee:online',
];

// Clean up all event listeners to prevent memory leaks
function cleanupSocketListeners(socketInstance: Socket): void {
  ALL_SOCKET_EVENTS.forEach(event => {
    socketInstance.off(event);
  });
}

// Setup common event listeners for all connection types
function setupCommonEventListeners(socketInstance: Socket): void {
  const store = useCompetitionStore.getState;

  // Competition control events
  socketInstance.on('competition:started', (data: { startTime: string; phase: string }) => {
    store().updateCompetitionStatus('ongoing');
    store().setCurrentPhase(data.phase);
  });

  socketInstance.on('competition:paused', (data: { timestamp: number }) => {
    store().updateCompetitionStatus('paused');
    console.log('Competition paused at:', data.timestamp);
  });

  socketInstance.on('competition:resumed', (data: { timestamp: number }) => {
    store().updateCompetitionStatus('ongoing');
    console.log('Competition resumed at:', data.timestamp);
  });

  socketInstance.on('competition:ended', (data: CompetitionEndedData) => {
    store().updateCompetitionStatus('finished');
    store().setCurrentPhase('finished');
    store().setLeaderboard(data.finalLeaderboard);
  });

  // Phase events
  socketInstance.on('phase:changed', (data: PhaseChangedData) => {
    store().setCurrentPhase(data.phase);
  });

  // Question events
  socketInstance.on('question:preparing', (data: QuestionPreparingData) => {
    store().setCurrentPhase(data.phase);
    store().setIsCountingDown(true);
    store().setCountdownSeconds(3);
  });

  socketInstance.on('question:show', (data: QuestionShowData) => {
    store().setCurrentQuestion({
      _id: data.questionId,
      order: data.order,
      content: data.content,
      type: data.type,
      options: data.options,
      timeLimit: data.timeLimit,
      points: data.points,
      status: 'active',
    });
    store().setTimeRemaining(data.timeLimit); // timeLimit is in seconds
    store().setCurrentPhase(data.phase);
    store().setIsCountingDown(false);
    store().setHasSubmitted(false);
    store().setLastSubmissionResult(null);
  });

  socketInstance.on('question:pointsUpdated', (data: { questionId: string; points: number }) => {
    const currentQuestion = store().currentQuestion;
    if (currentQuestion && currentQuestion._id === data.questionId) {
      store().setCurrentQuestion({
        ...currentQuestion,
        points: data.points,
      });
    }
  });

  socketInstance.on('question:none-remaining', () => {
    console.log('No more questions remaining');
  });

  // Answer events
  socketInstance.on('answer:revealed', (data: AnswerRevealedData) => {
    store().setCurrentPhase(data.phase);
    store().setRevealedAnswer({
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
    });
  });

  socketInstance.on('answer:result', (data: AnswerResultData) => {
    store().setHasSubmitted(true);
    store().setLastSubmissionResult({
      isCorrect: data.isCorrect,
      points: data.points,
    });
  });

  // Timer events - convert milliseconds to seconds for display
  socketInstance.on('timer:started', (data: TimerEventData) => {
    if (data.remainingTime !== undefined) {
      store().setTimeRemaining(Math.ceil(data.remainingTime / 1000));
    }
  });

  socketInstance.on('timer:tick', (data: TimerTickData) => {
    // Convert milliseconds to seconds
    store().setTimeRemaining(Math.ceil(data.remainingTime / 1000));
  });

  socketInstance.on('timer:paused', (data: TimerEventData) => {
    if (data.remainingTime !== undefined) {
      store().setTimeRemaining(Math.ceil(data.remainingTime / 1000));
    }
    store().setTimerPaused(true);
  });

  socketInstance.on('timer:resumed', (data: TimerEventData) => {
    if (data.remainingTime !== undefined) {
      store().setTimeRemaining(Math.ceil(data.remainingTime / 1000));
    }
    store().setTimerPaused(false);
  });

  socketInstance.on('timer:reset', (data: TimerEventData) => {
    if (data.remainingTime !== undefined) {
      store().setTimeRemaining(Math.ceil(data.remainingTime / 1000));
    }
  });

  socketInstance.on('timer:adjusted', (data: TimerEventData) => {
    if (data.remainingTime !== undefined) {
      store().setTimeRemaining(Math.ceil(data.remainingTime / 1000));
    }
  });

  socketInstance.on('timer:ended', () => {
    store().setTimeRemaining(0);
  });

  // Leaderboard events
  socketInstance.on('leaderboard:update', (data: { leaderboard: LeaderboardItem[] }) => {
    store().setLeaderboard(data.leaderboard);
  });

  socketInstance.on('leaderboard:show', (data: LeaderboardShowData) => {
    store().setCurrentPhase(data.phase);
    store().setLeaderboard(data.leaderboard);
    if (data.teamLeaderboard) {
      store().setTeamLeaderboard(data.teamLeaderboard);
    }
  });

  // Participant events
  socketInstance.on('participant:joined', (data: ParticipantJoinedData) => {
    store().addParticipant({
      _id: data.participantId,
      nickname: data.nickname,
      avatar: data.avatar,
      teamId: data.teamId,
      totalScore: 0,
      correctCount: 0,
      isOnline: data.isOnline,
    });
  });

  socketInstance.on('participant:left', (data: { participantId: string }) => {
    store().removeParticipant(data.participantId);
  });

  // Team events - using correct event names from backend
  socketInstance.on('team:created', (data: { team: TeamData }) => {
    store().addTeam({
      id: data.team.id,
      name: data.team.name,
      color: data.team.color,
      captainId: data.team.captainId,
      memberCount: data.team.memberCount || data.team.members?.length || 1,
      maxSize: data.team.maxSize,
      members: data.team.members,
    });
  });

  socketInstance.on('team:new', (data: { team: TeamInfo }) => {
    store().addTeam({
      id: data.team.id,
      name: data.team.name,
      color: data.team.color,
      captainId: data.team.captainId,
      memberCount: data.team.memberCount,
      maxSize: data.team.maxSize,
    });
  });

  socketInstance.on('team:joined', (data: { team: TeamData }) => {
    store().setMyTeam({
      id: data.team.id,
      name: data.team.name,
      color: data.team.color,
      captainId: data.team.captainId,
      memberCount: data.team.memberCount || data.team.members?.length || 1,
      maxSize: data.team.maxSize,
      members: data.team.members,
    });
  });

  socketInstance.on('team:left', () => {
    store().setMyTeam(null);
  });

  // Backend uses kebab-case for team member events
  socketInstance.on('team:member-joined', (data: { teamId: string; member: TeamMemberData }) => {
    store().addTeamMember(data.teamId, data.member);
  });

  socketInstance.on('team:member-left', (data: { teamId: string; participantId: string }) => {
    store().removeTeamMember(data.teamId, data.participantId);
  });

  socketInstance.on('team:role-updated', (data: { participantId: string; role: string }) => {
    console.log('Team role updated:', data);
  });

  socketInstance.on('team:score-updated', (data: { teamId: string; totalScore: number; averageScore: number }) => {
    store().updateTeamScore(data.teamId, data.totalScore, data.averageScore);
  });

  // Error handling
  socketInstance.on('error', (data: { message: string }) => {
    console.error('Socket error:', data.message);
    store().setSocketError(data.message);
  });

  // Disconnect handling
  socketInstance.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', reason);
    store().setIsConnected(false);

    // If the disconnection was not initiated by us, try to indicate reconnecting status
    if (reason === 'io server disconnect' || reason === 'transport close') {
      store().setIsReconnecting(true);
    }
  });

  // Reconnection events
  socketInstance.io.on('reconnect', (attemptNumber: number) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    store().setIsConnected(true);
    store().setIsReconnecting(false);
  });

  socketInstance.io.on('reconnect_attempt', (attemptNumber: number) => {
    console.log('Reconnection attempt', attemptNumber);
    store().setIsReconnecting(true);
  });

  socketInstance.io.on('reconnect_failed', () => {
    console.log('Reconnection failed');
    store().setIsReconnecting(false);
    store().setSocketError('Failed to reconnect. Please refresh the page.');
  });
}

/**
 * Connect to competition as a participant
 */
export function connectToCompetition(
  joinCode: string,
  nickname: string,
  teamOptions?: TeamJoinOptions
): Promise<{ competitionId: string; teamId?: string; isCaptain?: boolean }> {
  return new Promise((resolve, reject) => {
    // Disconnect and clean up previous socket if exists
    if (socket) {
      cleanupSocketListeners(socket);
      socket.disconnect();
    }

    const { accessToken } = useAuthStore.getState();

    socket = io('/competition', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const store = useCompetitionStore.getState;

    // Set up event listeners
    socket.on('connect', () => {
      console.log('Socket connected, joining competition...');
      store().setIsConnected(true);
      store().setIsReconnecting(false);

      socket?.emit('join', {
        joinCode,
        nickname,
        teamName: teamOptions?.teamName,
        teamColor: teamOptions?.teamColor,
      });
    });

    socket.on('joined', (data: JoinedEventData) => {
      store().setCurrentCompetition({
        _id: data.competition.id,
        name: data.competition.name,
        mode: data.competition.mode,
        type: data.competition.type,
        participantMode: data.competition.participantMode,
        status: data.competition.status,
        currentQuestionIndex: data.competition.currentQuestionIndex,
        settings: data.competition.settings,
        description: '',
        joinCode: '',
        participantCount: data.competition.participantCount,
      });

      store().setCurrentPhase(data.competition.currentPhase);

      store().setMyParticipant({
        _id: data.participant.id,
        nickname: data.participant.nickname,
        avatar: data.participant.avatar,
        teamId: data.participant.teamId,
        isCaptain: data.participant.isCaptain,
        totalScore: data.participant.totalScore || 0,
        correctCount: 0,
        isOnline: true,
      });

      store().setLeaderboard(data.leaderboard);
      store().setTeams(data.teams.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        captainId: t.captainId,
        memberCount: t.memberCount,
        maxSize: t.maxSize,
      })));

      // Store team info if in team mode
      if (data.team) {
        store().setMyTeam({
          id: data.team.id,
          name: data.team.name,
          color: data.team.color,
          captainId: data.team.captainId,
          memberCount: data.team.memberCount,
          maxSize: data.team.maxSize,
        });
      }

      // Resolve the promise with the competition ID and team info
      resolve({
        competitionId: data.competition.id,
        teamId: data.team?.id,
        isCaptain: data.participant.isCaptain,
      });
    });

    // Handle connection error
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      store().setIsConnected(false);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    // Handle join error (only for initial join)
    const errorHandler = (data: { message: string }) => {
      socket?.off('error', errorHandler);
      reject(new Error(data.message));
    };
    socket.on('error', errorHandler);

    // Set up common event listeners
    setupCommonEventListeners(socket);
  });
}

/**
 * Connect to competition as a host
 */
export function connectAsHost(
  competitionId: string
): Promise<{ competition: HostJoinedEventData['competition']; questions: QuestionData[] }> {
  return new Promise((resolve, reject) => {
    // Disconnect and clean up previous socket if exists
    if (socket) {
      cleanupSocketListeners(socket);
      socket.disconnect();
    }

    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
      reject(new Error('Not authenticated. Please log in.'));
      return;
    }

    socket = io('/competition', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const store = useCompetitionStore.getState;

    socket.on('connect', () => {
      console.log('Socket connected, joining as host...');
      store().setIsConnected(true);
      store().setIsReconnecting(false);

      socket?.emit('join:host', { competitionId });
    });

    socket.on('host:joined', (data: HostJoinedEventData) => {
      store().setIsHost(true);
      store().setCurrentCompetition({
        _id: data.competition.id,
        name: data.competition.name,
        mode: data.competition.mode,
        type: data.competition.type,
        participantMode: data.competition.participantMode,
        status: data.competition.status,
        currentQuestionIndex: data.competition.currentQuestionIndex,
        settings: data.competition.settings as Record<string, unknown>,
        description: '',
        joinCode: data.competition.joinCode,
        participantCount: data.competition.participantCount,
      });

      store().setCurrentPhase(data.competition.currentPhase);
      store().setLeaderboard(data.leaderboard);
      store().setQuestions(data.questions);

      if (data.competition.timerState?.remainingTime) {
        store().setTimeRemaining(Math.ceil(data.competition.timerState.remainingTime / 1000));
      }

      resolve({
        competition: data.competition,
        questions: data.questions,
      });
    });

    // Handle connection error
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      store().setIsConnected(false);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    // Handle join error
    const errorHandler = (data: { message: string }) => {
      socket?.off('error', errorHandler);
      reject(new Error(data.message));
    };
    socket.on('error', errorHandler);

    // Set up common event listeners
    setupCommonEventListeners(socket);
  });
}

/**
 * Connect to competition as a display screen
 */
export function connectAsDisplay(competitionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket) {
      cleanupSocketListeners(socket);
      socket.disconnect();
    }

    const { accessToken } = useAuthStore.getState();

    socket = io('/competition', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const store = useCompetitionStore.getState;

    socket.on('connect', () => {
      console.log('Socket connected, joining as display...');
      store().setIsConnected(true);
      socket?.emit('join:display', { competitionId });
    });

    socket.on('display:joined', (data: { competition: HostJoinedEventData['competition'] }) => {
      store().setCurrentCompetition({
        _id: data.competition.id,
        name: data.competition.name,
        mode: data.competition.mode,
        type: data.competition.type,
        participantMode: data.competition.participantMode,
        status: data.competition.status,
        currentQuestionIndex: data.competition.currentQuestionIndex,
        settings: data.competition.settings as Record<string, unknown>,
        description: '',
        joinCode: data.competition.joinCode,
        participantCount: data.competition.participantCount,
      });
      store().setCurrentPhase(data.competition.currentPhase);
      resolve();
    });

    socket.on('connect_error', (error) => {
      reject(new Error(`Connection failed: ${error.message}`));
    });

    const errorHandler = (data: { message: string }) => {
      socket?.off('error', errorHandler);
      reject(new Error(data.message));
    };
    socket.on('error', errorHandler);

    setupCommonEventListeners(socket);
  });
}

// Referee joined event data type
interface RefereeJoinedEventData {
  competition: {
    id: string;
    name: string;
    type: string;
    mode: 'onsite' | 'online';
    status: string;
    currentPhase: string;
    participantMode: 'individual' | 'team';
    currentQuestionIndex: number;
    questionCount: number;
    settings: Record<string, unknown>;
    timerState: {
      remainingTime: number;
      isRunning: boolean;
    };
    participantCount: number;
    teamCount: number;
  };
  permissions: string[];
  questions: QuestionData[];
  leaderboard: LeaderboardItem[];
}

/**
 * Connect to competition as a referee
 */
export function connectAsReferee(
  competitionId: string
): Promise<{ competition: RefereeJoinedEventData['competition']; permissions: string[]; questions: QuestionData[] }> {
  return new Promise((resolve, reject) => {
    // Disconnect and clean up previous socket if exists
    if (socket) {
      cleanupSocketListeners(socket);
      socket.disconnect();
    }

    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
      reject(new Error('Not authenticated. Please log in.'));
      return;
    }

    socket = io('/competition', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const store = useCompetitionStore.getState;

    socket.on('connect', () => {
      console.log('Socket connected, joining as referee...');
      store().setIsConnected(true);
      store().setIsReconnecting(false);

      socket?.emit('join:referee', { competitionId });
    });

    socket.on('referee:joined', (data: RefereeJoinedEventData) => {
      store().setIsReferee(true);
      store().setCurrentCompetition({
        _id: data.competition.id,
        name: data.competition.name,
        mode: data.competition.mode,
        type: data.competition.type,
        participantMode: data.competition.participantMode,
        status: data.competition.status,
        currentQuestionIndex: data.competition.currentQuestionIndex,
        settings: data.competition.settings,
        description: '',
        joinCode: '',
        participantCount: data.competition.participantCount,
      });

      store().setCurrentPhase(data.competition.currentPhase);
      store().setLeaderboard(data.leaderboard);
      store().setQuestions(data.questions);
      store().setRefereePermissions(data.permissions);

      if (data.competition.timerState?.remainingTime) {
        store().setTimeRemaining(Math.ceil(data.competition.timerState.remainingTime / 1000));
      }

      resolve({
        competition: data.competition,
        permissions: data.permissions,
        questions: data.questions,
      });
    });

    // Handle connection error
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      store().setIsConnected(false);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    // Handle join error
    const errorHandler = (data: { message: string }) => {
      socket?.off('error', errorHandler);
      reject(new Error(data.message));
    };
    socket.on('error', errorHandler);

    // Set up common event listeners
    setupCommonEventListeners(socket);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    cleanupSocketListeners(socket);
    socket.disconnect();
    socket = null;
  }

  const store = useCompetitionStore.getState();
  store.setIsConnected(false);
  store.setIsReconnecting(false);
}

// ===== HOST ACTIONS =====
// Using correct event names that match backend: competition.socket.ts

export function startCompetition(competitionId: string): void {
  socket?.emit('competition:start', { competitionId });
}

export function pauseCompetition(competitionId: string): void {
  socket?.emit('competition:pause', { competitionId });
}

export function resumeCompetition(competitionId: string): void {
  socket?.emit('competition:resume', { competitionId });
}

export function endCompetition(competitionId: string): void {
  socket?.emit('competition:end', { competitionId });
}

export function nextQuestion(competitionId: string): void {
  socket?.emit('question:next', { competitionId });
}

export function showQuestionNow(competitionId: string, questionIndex: number): void {
  socket?.emit('question:show-now', { competitionId, questionIndex });
}

export function revealAnswer(competitionId: string, questionId: string): void {
  socket?.emit('answer:reveal', { competitionId, questionId });
}

export function updateQuestionPoints(competitionId: string, questionId: string, points: number): void {
  socket?.emit('question:updatePoints', { competitionId, questionId, points });
}

export function changePhase(competitionId: string, phase: string): void {
  socket?.emit('phase:change', { competitionId, phase });
}

export function showLeaderboard(competitionId: string): void {
  socket?.emit('leaderboard:show', { competitionId });
}

// ===== TIMER CONTROL (Host only) =====

export function startTimer(competitionId: string, duration: number): void {
  socket?.emit('timer:start', { competitionId, duration });
}

export function pauseTimer(competitionId: string): void {
  socket?.emit('timer:pause', { competitionId });
}

export function resumeTimer(competitionId: string): void {
  socket?.emit('timer:resume', { competitionId });
}

export function resetTimer(competitionId: string, duration?: number): void {
  socket?.emit('timer:reset', { competitionId, duration });
}

export function adjustTimer(competitionId: string, adjustment: number): void {
  socket?.emit('timer:adjust', { competitionId, adjustment });
}

// ===== PARTICIPANT ACTIONS =====

export function submitAnswer(questionId: string, answer: string | string[], timeSpent: number): void {
  socket?.emit('answer:submit', { questionId, answer, timeSpent });
}

// ===== TEAM ACTIONS =====

export function createTeam(name: string, color?: string): void {
  socket?.emit('team:create', { name, color });
}

export function joinTeam(teamId: string, role?: 'viewer' | 'submitter' | 'both'): void {
  socket?.emit('team:join', { teamId, role });
}

export function leaveTeam(): void {
  socket?.emit('team:leave');
}

export function updateTeamMemberRole(participantId: string, role: 'viewer' | 'submitter' | 'both'): void {
  socket?.emit('team:update-role', { participantId, role });
}

// Legacy team actions - for backwards compatibility if needed
export function kickTeamMember(teamId: string, participantId: string): void {
  socket?.emit('team:kick', { teamId, participantId });
}

export function transferCaptain(teamId: string, newCaptainId: string): void {
  socket?.emit('team:transfer-captain', { teamId, newCaptainId });
}

// ===== EVENT SUBSCRIPTION HELPERS =====

/**
 * Subscribe to a socket event and return an unsubscribe function
 */
export function onSocketEvent<T = unknown>(
  event: string,
  callback: (data: T) => void
): () => void {
  if (!socket) {
    console.warn('Socket not connected, cannot subscribe to event:', event);
    return () => {};
  }

  socket.on(event, callback);

  return () => {
    socket?.off(event, callback);
  };
}

/**
 * Check if socket is currently connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

