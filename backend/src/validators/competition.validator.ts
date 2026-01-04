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
  showCorrectAnswer: z.boolean().optional(),
  showAnswerAfterTime: z.boolean().optional(),
  maxParticipants: z.number().positive().optional(),
  allowLateJoin: z.boolean().optional(),
  requireNickname: z.boolean().optional(),
}).optional();

export const createCompetitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['integration_bee', 'fun_math', 'quiz', 'speed_math']),
  mode: z.enum(['onsite', 'online']),
  settings: competitionSettingsSchema,
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
