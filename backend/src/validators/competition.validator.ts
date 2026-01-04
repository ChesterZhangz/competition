import { z } from 'zod';

const competitionSettingsSchema = z.object({
  questionTimeLimit: z.number().positive().optional(),
  totalTimeLimit: z.number().positive().optional(),
  basePoints: z.number().positive().optional(),
  timeBonus: z.boolean().optional(),
  timeBonusMultiplier: z.number().positive().optional(),
  penaltyForWrong: z.boolean().optional(),
  penaltyPoints: z.number().nonnegative().optional(),
  showLeaderboard: z.boolean().optional(),
  showLeaderboardDuringQuestion: z.boolean().optional(),
  showCorrectAnswer: z.boolean().optional(),
  showAnswerAfterTime: z.boolean().optional(),
  maxParticipants: z.number().positive().optional(),
  allowLateJoin: z.boolean().optional(),
  requireNickname: z.boolean().optional(),
  participantMode: z.enum(['individual', 'team']).optional(),
  teamSize: z.number().positive().optional(),
  minTeamSize: z.number().positive().optional(),
  teamRoleMode: z.string().optional(),
}).optional();

const refereeSettingsSchema = z.object({
  enabled: z.boolean(),
  maxReferees: z.number().positive().max(10).optional(),
  permissions: z.array(z.enum([
    'manual_judge',
    'override_score',
    'add_comment',
    'extend_time',
    'pause_competition',
    'skip_question',
  ])).optional(),
}).optional();

const displaySettingsSchema = z.object({
  layout: z.enum(['single', 'grid', 'list']).optional(),
  theme: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
  }).optional(),
  showTimer: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  showLeaderboard: z.boolean().optional(),
  showParticipantCount: z.boolean().optional(),
  questionsPerPage: z.number().positive().optional(),
  animationSpeed: z.enum(['slow', 'normal', 'fast']).optional(),
}).optional();

export const createCompetitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['integration_bee', 'fun_math', 'quiz', 'speed_math']),
  mode: z.enum(['onsite', 'online']),
  participantMode: z.enum(['individual', 'team']).optional(),
  settings: competitionSettingsSchema,
  displaySettings: displaySettingsSchema,
  refereeSettings: refereeSettingsSchema,
  scheduledStartTime: z.string().datetime().optional(),
});

export const updateCompetitionSchema = createCompetitionSchema.partial();

export const addQuestionsSchema = z.object({
  questions: z.array(z.object({
    problemId: z.string().min(1),
    timeLimit: z.number().positive().optional(),
    points: z.number().positive().optional(),
  })).min(1),
});

export const joinCompetitionSchema = z.object({
  joinCode: z.string().length(6).toUpperCase(),
  nickname: z.string().min(2).max(50),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.union([z.string(), z.array(z.string())]),
});

// Type exports
export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
export type AddQuestionsInput = z.infer<typeof addQuestionsSchema>;
export type JoinCompetitionInput = z.infer<typeof joinCompetitionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
