import type { IProblem, DifficultyLevel } from './problem';

// Competition types
export interface ICompetition {
  _id: string;
  name: string;
  description?: string;
  type: CompetitionType;
  mode: CompetitionMode;

  // Configuration
  hostId: string;
  joinCode: string; // 6-character unique code
  settings: ICompetitionSettings;

  // Status
  status: CompetitionStatus;
  currentQuestionIndex: number;

  // Timing
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  endTime?: Date;

  // Statistics
  participantCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export type CompetitionType =
  | 'integration_bee'    // 积分比赛
  | 'fun_math'          // 趣味数学
  | 'quiz'              // 知识竞答
  | 'speed_math';       // 速算比赛

export type CompetitionMode =
  | 'onsite'            // 现场模式
  | 'online';           // 在线模式

export type CompetitionStatus =
  | 'draft'             // 草稿
  | 'ready'             // 准备就绪
  | 'ongoing'           // 进行中
  | 'paused'            // 暂停
  | 'finished';         // 已结束

export interface ICompetitionSettings {
  // Time settings
  questionTimeLimit: number; // seconds per question
  totalTimeLimit?: number; // total competition time in seconds

  // Scoring
  basePoints: number;
  timeBonus: boolean; // faster = more points
  timeBonusMultiplier?: number;
  penaltyForWrong: boolean;
  penaltyPoints?: number;

  // Display
  showLeaderboard: boolean;
  showCorrectAnswer: boolean;
  showAnswerAfterTime: boolean; // show answer after time expires

  // Participation
  maxParticipants?: number;
  allowLateJoin: boolean;
  requireNickname: boolean;
}

// Competition Question (links competition to problems)
export interface ICompetitionQuestion {
  _id: string;
  competitionId: string;
  problemId: string;
  problem?: IProblem; // populated
  order: number;

  // Override problem settings for this competition
  timeLimit?: number;
  points?: number;

  // Status
  status: QuestionStatus;
  revealedAt?: Date;

  createdAt: Date;
}

export type QuestionStatus =
  | 'pending'           // 待展示
  | 'active'            // 当前题目
  | 'revealed'          // 已公布答案
  | 'completed';        // 已完成

// Participant types
export interface ICompetitionParticipant {
  _id: string;
  competitionId: string;

  // User info (for registered users)
  userId?: string;

  // Guest info
  nickname: string;
  avatar?: string;

  // Scores
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  rank?: number;

  // Connection
  socketId?: string;
  isOnline: boolean;
  joinedAt: Date;
  lastActiveAt: Date;
}

// Submission types
export interface ICompetitionSubmission {
  _id: string;
  competitionId: string;
  questionId: string;
  participantId: string;

  // Answer
  answer: string | string[];
  isCorrect: boolean;

  // Scoring
  points: number;
  timeSpent: number; // milliseconds
  timeBonus: number;

  submittedAt: Date;
}

// Socket Event types
export interface CompetitionSocketEvents {
  // Host events
  'competition:start': { competitionId: string };
  'competition:pause': { competitionId: string };
  'competition:resume': { competitionId: string };
  'competition:end': { competitionId: string };
  'competition:next-question': { competitionId: string };
  'competition:reveal-answer': { competitionId: string; questionId: string };

  // Timer events
  'timer:start': { duration: number; questionId: string };
  'timer:tick': { remaining: number };
  'timer:ended': { questionId: string };

  // Participant events
  'participant:join': { competitionId: string; nickname: string };
  'participant:leave': { participantId: string };
  'participant:submit': { questionId: string; answer: string | string[] };

  // Broadcast events
  'question:show': { question: ICompetitionQuestion };
  'answer:reveal': { questionId: string; correctAnswer: string | string[] };
  'leaderboard:update': { leaderboard: ILeaderboardEntry[] };
  'competition:status': { status: CompetitionStatus };
}

export interface ILeaderboardEntry {
  rank: number;
  participantId: string;
  nickname: string;
  avatar?: string;
  totalScore: number;
  correctCount: number;
  lastAnswerTime?: number;
}

// Request/Response types
export interface CreateCompetitionRequest {
  name: string;
  description?: string;
  type: CompetitionType;
  mode: CompetitionMode;
  settings?: Partial<ICompetitionSettings>;
  scheduledStartTime?: Date;
}

export interface AddQuestionsRequest {
  competitionId: string;
  questions: Array<{
    problemId: string;
    timeLimit?: number;
    points?: number;
  }>;
}

export interface JoinCompetitionRequest {
  joinCode: string;
  nickname: string;
  userId?: string;
}

export interface SubmitAnswerRequest {
  competitionId: string;
  questionId: string;
  answer: string | string[];
}
