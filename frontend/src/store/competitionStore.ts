import { create } from 'zustand';

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: string;
  mode: string;
  participantMode?: string;
  joinCode: string;
  status: string;
  currentQuestionIndex: number;
  participantCount: number;
  settings: Record<string, unknown>;
}

interface CompetitionQuestion {
  _id: string;
  order: number;
  content: string;
  type: string;
  options?: Array<{ id: string; label: string; content: string }>;
  timeLimit: number;
  points: number;
  status: string;
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

interface Participant {
  _id: string;
  nickname: string;
  avatar?: string;
  totalScore: number;
  correctCount: number;
  rank?: number;
  isOnline: boolean;
  teamId?: string;
  isCaptain?: boolean;
}

interface TeamMember {
  participantId: string;
  nickname: string;
  role: 'viewer' | 'submitter' | 'both';
  isOnline: boolean;
}

interface Team {
  id: string;
  name: string;
  color: string;
  captainId: string;
  members?: TeamMember[];
  memberCount: number;
  maxSize?: number;
  totalScore?: number;
  averageScore?: number;
}

interface LeaderboardEntry {
  rank: number;
  participantId?: string;
  teamId?: string;
  nickname: string;
  teamName?: string;
  totalScore: number;
  correctCount?: number;
}

interface RevealedAnswer {
  correctAnswer: string | string[];
  explanation?: string;
}

interface CompetitionState {
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;
  socketError: string | null;

  // Competition data
  competitions: Competition[];
  currentCompetition: Competition | null;
  competitionsLoading: boolean;

  // Active competition state (when hosting or participating)
  isHost: boolean;
  isReferee: boolean;
  refereePermissions: string[];
  currentPhase: string;
  currentQuestion: CompetitionQuestion | null;
  questions: QuestionData[]; // All questions (for host)
  timeRemaining: number;
  timerPaused: boolean;
  participants: Participant[];
  leaderboard: LeaderboardEntry[];
  myParticipant: Participant | null;

  // Countdown state (before question shows)
  isCountingDown: boolean;
  countdownSeconds: number;

  // Answer reveal state
  revealedAnswer: RevealedAnswer | null;

  // Team state
  teams: Team[];
  myTeam: Team | null;
  teamLeaderboard: Team[];

  // Submission state
  hasSubmitted: boolean;
  lastSubmissionResult: { isCorrect: boolean; points: number } | null;

  // Connection actions
  setIsConnected: (connected: boolean) => void;
  setIsReconnecting: (reconnecting: boolean) => void;
  setSocketError: (error: string | null) => void;

  // Competition actions
  setCompetitions: (competitions: Competition[]) => void;
  setCurrentCompetition: (competition: Competition | null) => void;
  addCompetition: (competition: Competition) => void;
  updateCompetition: (id: string, updates: Partial<Competition>) => void;
  removeCompetition: (id: string) => void;
  setCompetitionsLoading: (loading: boolean) => void;

  setIsHost: (isHost: boolean) => void;
  setIsReferee: (isReferee: boolean) => void;
  setRefereePermissions: (permissions: string[]) => void;
  setCurrentPhase: (phase: string) => void;
  setCurrentQuestion: (question: CompetitionQuestion | null) => void;
  setQuestions: (questions: QuestionData[]) => void;
  setTimeRemaining: (time: number) => void;
  setTimerPaused: (paused: boolean) => void;
  decrementTime: () => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  updateParticipantOnlineStatus: (id: string, isOnline: boolean) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setMyParticipant: (participant: Participant | null) => void;

  // Countdown actions
  setIsCountingDown: (counting: boolean) => void;
  setCountdownSeconds: (seconds: number) => void;

  // Answer reveal actions
  setRevealedAnswer: (answer: RevealedAnswer | null) => void;

  // Team actions
  setTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  updateTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  setMyTeam: (team: Team | null) => void;
  addTeamMember: (teamId: string, member: TeamMember) => void;
  removeTeamMember: (teamId: string, participantId: string) => void;
  updateTeamCaptain: (teamId: string, newCaptainId: string) => void;
  updateTeamScore: (teamId: string, totalScore: number, averageScore: number) => void;
  setTeamLeaderboard: (teams: Team[]) => void;

  setHasSubmitted: (submitted: boolean) => void;
  setLastSubmissionResult: (result: { isCorrect: boolean; points: number } | null) => void;

  updateCompetitionStatus: (status: string) => void;

  reset: () => void;
  resetActiveState: () => void;
}

const initialState = {
  // Connection state
  isConnected: false,
  isReconnecting: false,
  socketError: null,

  // Competition data
  competitions: [],
  currentCompetition: null,
  competitionsLoading: false,

  // Active competition state
  isHost: false,
  isReferee: false,
  refereePermissions: [],
  currentPhase: '',
  currentQuestion: null,
  questions: [],
  timeRemaining: 0,
  timerPaused: false,
  participants: [],
  leaderboard: [],
  myParticipant: null,

  // Countdown state
  isCountingDown: false,
  countdownSeconds: 0,

  // Answer reveal state
  revealedAnswer: null,

  // Team state
  teams: [],
  myTeam: null,
  teamLeaderboard: [],

  // Submission state
  hasSubmitted: false,
  lastSubmissionResult: null,
};

export const useCompetitionStore = create<CompetitionState>((set) => ({
  ...initialState,

  // Connection actions
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  setSocketError: (error) => set({ socketError: error }),

  // Competition actions
  setCompetitions: (competitions) => set({ competitions }),
  setCurrentCompetition: (competition) => set({ currentCompetition: competition }),
  addCompetition: (competition) =>
    set((state) => ({ competitions: [...state.competitions, competition] })),
  updateCompetition: (id, updates) =>
    set((state) => ({
      competitions: state.competitions.map((c) =>
        c._id === id ? { ...c, ...updates } : c
      ),
      currentCompetition:
        state.currentCompetition?._id === id
          ? { ...state.currentCompetition, ...updates }
          : state.currentCompetition,
    })),
  removeCompetition: (id) =>
    set((state) => ({
      competitions: state.competitions.filter((c) => c._id !== id),
      currentCompetition:
        state.currentCompetition?._id === id ? null : state.currentCompetition,
    })),
  setCompetitionsLoading: (loading) => set({ competitionsLoading: loading }),

  setIsHost: (isHost) => set({ isHost }),
  setIsReferee: (isReferee) => set({ isReferee }),
  setRefereePermissions: (permissions) => set({ refereePermissions: permissions }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setCurrentQuestion: (question) =>
    set({ currentQuestion: question, hasSubmitted: false, lastSubmissionResult: null, revealedAnswer: null }),
  setQuestions: (questions) => set({ questions }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setTimerPaused: (paused) => set({ timerPaused: paused }),
  decrementTime: () =>
    set((state) => ({ timeRemaining: Math.max(0, state.timeRemaining - 1) })),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((state) => {
      // Check if participant already exists
      const exists = state.participants.some(p => p._id === participant._id);
      if (exists) {
        return {
          participants: state.participants.map(p =>
            p._id === participant._id ? { ...p, ...participant } : p
          ),
        };
      }
      return { participants: [...state.participants, participant] };
    }),
  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((p) => p._id !== id),
    })),
  updateParticipantOnlineStatus: (id, isOnline) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p._id === id ? { ...p, isOnline } : p
      ),
    })),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setMyParticipant: (participant) => set({ myParticipant: participant }),

  // Countdown actions
  setIsCountingDown: (counting) => set({ isCountingDown: counting }),
  setCountdownSeconds: (seconds) => set({ countdownSeconds: seconds }),

  // Answer reveal actions
  setRevealedAnswer: (answer) => set({ revealedAnswer: answer }),

  // Team actions
  setTeams: (teams) => set({ teams }),
  addTeam: (team) =>
    set((state) => {
      // Check if team already exists
      const exists = state.teams.some(t => t.id === team.id);
      if (exists) {
        return {
          teams: state.teams.map(t => t.id === team.id ? { ...t, ...team } : t),
        };
      }
      return { teams: [...state.teams, team] };
    }),
  updateTeam: (team) =>
    set((state) => ({
      teams: state.teams.map((t) => t.id === team.id ? team : t),
      myTeam: state.myTeam?.id === team.id ? team : state.myTeam,
    })),
  removeTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((t) => t.id !== teamId),
      myTeam: state.myTeam?.id === teamId ? null : state.myTeam,
    })),
  setMyTeam: (team) => set({ myTeam: team }),
  addTeamMember: (teamId, member) =>
    set((state) => ({
      teams: state.teams.map((t) => {
        if (t.id === teamId) {
          const existingMembers = t.members || [];
          // Check if member already exists
          const memberExists = existingMembers.some(m => m.participantId === member.participantId);
          if (memberExists) {
            return {
              ...t,
              members: existingMembers.map(m =>
                m.participantId === member.participantId ? { ...m, ...member } : m
              ),
              // Don't increment memberCount when member already exists (update case)
            };
          }
          return {
            ...t,
            members: [...existingMembers, member],
            memberCount: t.memberCount + 1,
          };
        }
        return t;
      }),
      myTeam: state.myTeam?.id === teamId
        ? (() => {
            const existingMembers = state.myTeam.members || [];
            const memberExists = existingMembers.some(m => m.participantId === member.participantId);
            return {
              ...state.myTeam,
              members: memberExists
                ? existingMembers.map(m =>
                    m.participantId === member.participantId ? { ...m, ...member } : m
                  )
                : [...existingMembers, member],
              // Only increment memberCount when adding new member, not updating existing
              memberCount: memberExists ? state.myTeam.memberCount : state.myTeam.memberCount + 1,
            };
          })()
        : state.myTeam,
    })),
  removeTeamMember: (teamId, participantId) =>
    set((state) => ({
      teams: state.teams.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            members: (t.members || []).filter((m) => m.participantId !== participantId),
            memberCount: Math.max(0, t.memberCount - 1),
          };
        }
        return t;
      }),
      myTeam: state.myTeam?.id === teamId
        ? {
            ...state.myTeam,
            members: (state.myTeam.members || []).filter((m) => m.participantId !== participantId),
            memberCount: Math.max(0, state.myTeam.memberCount - 1),
          }
        : state.myTeam,
    })),
  updateTeamCaptain: (teamId, newCaptainId) =>
    set((state) => ({
      teams: state.teams.map((t) => {
        if (t.id === teamId) {
          return { ...t, captainId: newCaptainId };
        }
        return t;
      }),
      myTeam: state.myTeam?.id === teamId
        ? { ...state.myTeam, captainId: newCaptainId }
        : state.myTeam,
      myParticipant: state.myParticipant
        ? {
            ...state.myParticipant,
            isCaptain: state.myParticipant._id === newCaptainId,
          }
        : null,
    })),
  updateTeamScore: (teamId, totalScore, averageScore) =>
    set((state) => ({
      teams: state.teams.map((t) => {
        if (t.id === teamId) {
          return { ...t, totalScore, averageScore };
        }
        return t;
      }),
      myTeam: state.myTeam?.id === teamId
        ? { ...state.myTeam, totalScore, averageScore }
        : state.myTeam,
    })),
  setTeamLeaderboard: (teams) => set({ teamLeaderboard: teams }),

  setHasSubmitted: (submitted) => set({ hasSubmitted: submitted }),
  setLastSubmissionResult: (result) => set({ lastSubmissionResult: result }),

  updateCompetitionStatus: (status) =>
    set((state) => ({
      currentCompetition: state.currentCompetition
        ? { ...state.currentCompetition, status }
        : null,
    })),

  reset: () => set(initialState),

  resetActiveState: () =>
    set({
      currentQuestion: null,
      questions: [],
      timeRemaining: 0,
      timerPaused: false,
      hasSubmitted: false,
      lastSubmissionResult: null,
      isCountingDown: false,
      countdownSeconds: 0,
      revealedAnswer: null,
      currentPhase: '',
    }),
}));
