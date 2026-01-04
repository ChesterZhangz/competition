import { get, post, put, del } from './api';
import { type CompetitionDisplaySettings } from '@/types/competition';

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: string;
  mode: string;
  participantMode?: string;
  joinCode: string;
  status: string;
  currentPhase?: string;
  currentQuestionIndex: number;
  participantCount: number;
  settings: {
    questionTimeLimit: number;
    basePoints: number;
    timeBonus: boolean;
    showLeaderboard: boolean;
    showLeaderboardDuringQuestion?: boolean;
    showCorrectAnswer: boolean;
    teamSettings?: {
      enabled: boolean;
      teamSize: number;
      minTeamSize: number;
      roleMode?: string;
    };
  };
  displaySettings?: CompetitionDisplaySettings;
  createdAt: string;
  updatedAt: string;
}

interface CompetitionQuestion {
  _id: string;
  competitionId: string;
  problemId: string;
  order: number;
  timeLimit?: number;
  points?: number;
  status: string;
}

interface CompetitionQuestionWithDetails {
  _id: string;
  order: number;
  content: string;
  type: string;
  options?: Array<{ id: string; label: string; content: string }>;
  timeLimit: number;
  points: number;
  status: string;
}

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  avatar?: string;
  totalScore: number;
  correctCount: number;
}

interface JoinResult {
  competition: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
  participant: {
    id: string;
    nickname: string;
  };
}

interface TeamMember {
  participantId: string;
  nickname: string;
  avatar?: string;
  role: 'viewer' | 'submitter' | 'both';
  isOnline: boolean;
}

interface Team {
  id: string;
  name: string;
  color: string;
  captainId: string;
  members: TeamMember[];
  memberCount: number;
  maxSize: number;
  totalScore: number;
  averageScore: number;
  correctCount: number;
  wrongCount: number;
  rank?: number;
}

interface TeamLeaderboardEntry {
  rank: number;
  team: Team;
  change?: 'up' | 'down' | 'same' | 'new';
  previousRank?: number;
}

// Referee types
export type RefereePermission =
  | 'override_score'
  | 'manual_judge'
  | 'add_comment'
  | 'pause_competition'
  | 'skip_question'
  | 'extend_time';

export interface Referee {
  userId: string;
  email: string;
  nickname?: string;
  addedAt: string;
  isOnline: boolean;
}

export interface RefereeSettings {
  enabled: boolean;
  maxReferees: number;
  permissions: RefereePermission[];
}

export interface Submission {
  _id: string;
  participantId: string;
  participantNickname: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  score: number;
  timeSpent: number;
  submittedAt: string;
  refereeOverride?: {
    overriddenBy: string;
    originalScore: number;
    newScore: number;
    comment?: string;
    overriddenAt: string;
  };
}

export const competitionApi = {
  // Competition CRUD
  list: (params?: { page?: number; limit?: number; status?: string }): Promise<{ items: Competition[]; total: number }> => {
    return get<{ items: Competition[]; total: number }>('/competitions', params);
  },

  get: (id: string): Promise<Competition> => {
    return get<Competition>(`/competitions/${id}`);
  },

  getByJoinCode: (joinCode: string): Promise<{
    id: string;
    name: string;
    description?: string;
    type: string;
    mode: string;
    participantMode?: string;
    status: string;
    participantCount: number;
    settings: {
      maxParticipants?: number;
      allowLateJoin: boolean;
      teamSettings?: {
        enabled: boolean;
        teamSize: number;
        minTeamSize: number;
      };
    };
  }> => {
    return get(`/competitions/code/${joinCode}`);
  },

  create: (data: {
    name: string;
    description?: string;
    type: string;
    mode: string;
    participantMode?: string;
    settings?: Partial<Competition['settings']>;
    displaySettings?: CompetitionDisplaySettings;
    refereeSettings?: {
      enabled: boolean;
      maxReferees: number;
      permissions: string[];
    };
  }): Promise<Competition> => {
    return post<Competition>('/competitions', data);
  },

  update: (id: string, data: Partial<Competition>): Promise<Competition> => {
    return put<Competition>(`/competitions/${id}`, data);
  },

  delete: (id: string): Promise<void> => {
    return del(`/competitions/${id}`);
  },

  // Questions
  getQuestions: (competitionId: string): Promise<CompetitionQuestionWithDetails[]> => {
    return get<CompetitionQuestionWithDetails[]>(`/competitions/${competitionId}/questions`);
  },

  getQuestionsBasic: (competitionId: string): Promise<CompetitionQuestion[]> => {
    return get<CompetitionQuestion[]>(`/competitions/${competitionId}/questions?basic=true`);
  },

  addQuestions: (
    competitionId: string,
    questions: Array<{ problemId: string; timeLimit?: number; points?: number }>
  ): Promise<CompetitionQuestion[]> => {
    return post<CompetitionQuestion[]>(`/competitions/${competitionId}/questions`, { questions });
  },

  removeQuestion: (competitionId: string, questionId: string): Promise<void> => {
    return del(`/competitions/${competitionId}/questions/${questionId}`);
  },

  // Participation
  join: (joinCode: string, nickname: string): Promise<JoinResult> => {
    return post<JoinResult>('/competitions/join', { joinCode, nickname });
  },

  getLeaderboard: (competitionId: string, limit?: number): Promise<LeaderboardEntry[]> => {
    return get<LeaderboardEntry[]>(`/competitions/${competitionId}/leaderboard`, { limit });
  },

  // Competition Control
  start: (competitionId: string): Promise<void> => {
    return post(`/competitions/${competitionId}/start`);
  },

  pause: (competitionId: string): Promise<void> => {
    return post(`/competitions/${competitionId}/pause`);
  },

  resume: (competitionId: string): Promise<void> => {
    return post(`/competitions/${competitionId}/resume`);
  },

  end: (competitionId: string): Promise<void> => {
    return post(`/competitions/${competitionId}/end`);
  },

  updatePhase: (competitionId: string, phase: string): Promise<void> => {
    return put(`/competitions/${competitionId}/phase`, { phase });
  },

  // Timer Control
  startTimer: (competitionId: string, duration: number): Promise<void> => {
    return post(`/competitions/${competitionId}/timer/start`, { duration });
  },

  pauseTimer: (competitionId: string): Promise<void> => {
    return post(`/competitions/${competitionId}/timer/pause`);
  },

  resumeTimer: (competitionId: string): Promise<void> => {
    return post(`/competitions/${competitionId}/timer/resume`);
  },

  adjustTimer: (competitionId: string, adjustment: number): Promise<void> => {
    return put(`/competitions/${competitionId}/timer/adjust`, { adjustment });
  },

  // Teams
  getTeams: (competitionId: string): Promise<Team[]> => {
    return get<Team[]>(`/competitions/${competitionId}/teams`);
  },

  getTeam: (competitionId: string, teamId: string): Promise<Team> => {
    return get<Team>(`/competitions/${competitionId}/teams/${teamId}`);
  },

  createTeam: (competitionId: string, data: { name: string; color: string; participantId: string }): Promise<Team> => {
    return post<Team>(`/competitions/${competitionId}/teams`, data);
  },

  joinTeam: (competitionId: string, teamId: string, data: { participantId: string; role?: string }): Promise<void> => {
    return post(`/competitions/${competitionId}/teams/${teamId}/join`, data);
  },

  leaveTeam: (competitionId: string, teamId: string, data: { participantId: string }): Promise<void> => {
    return post(`/competitions/${competitionId}/teams/${teamId}/leave`, data);
  },

  disbandTeam: (competitionId: string, teamId: string): Promise<void> => {
    return del(`/competitions/${competitionId}/teams/${teamId}`);
  },

  getTeamLeaderboard: (competitionId: string, limit?: number): Promise<TeamLeaderboardEntry[]> => {
    return get<TeamLeaderboardEntry[]>(`/competitions/${competitionId}/teams/leaderboard`, { limit });
  },

  // Referee Management
  getReferees: (competitionId: string): Promise<Referee[]> => {
    return get<Referee[]>(`/competitions/${competitionId}/referees`);
  },

  addReferee: (competitionId: string, email: string): Promise<Referee> => {
    return post<Referee>(`/competitions/${competitionId}/referees`, { email });
  },

  removeReferee: (competitionId: string, refereeUserId: string): Promise<void> => {
    return del(`/competitions/${competitionId}/referees/${refereeUserId}`);
  },

  checkRefereeStatus: (competitionId: string): Promise<{ isReferee: boolean; refereeEnabled: boolean; permissions: RefereePermission[] }> => {
    return get(`/competitions/${competitionId}/referee/check`);
  },

  overrideScore: (
    competitionId: string,
    submissionId: string,
    newScore: number,
    comment?: string
  ): Promise<void> => {
    return post(`/competitions/${competitionId}/referee/override-score`, {
      submissionId,
      newScore,
      comment,
    });
  },

  manualJudge: (
    competitionId: string,
    submissionId: string,
    isCorrect: boolean,
    comment?: string
  ): Promise<void> => {
    return post(`/competitions/${competitionId}/referee/manual-judge`, {
      submissionId,
      isCorrect,
      comment,
    });
  },

  getQuestionSubmissions: (competitionId: string, questionId: string): Promise<Submission[]> => {
    return get<Submission[]>(`/competitions/${competitionId}/questions/${questionId}/submissions`);
  },
};
