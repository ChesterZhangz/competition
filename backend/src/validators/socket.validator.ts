import { z } from 'zod';

// Common schemas
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
const joinCodeSchema = z.string().length(6, 'Join code must be 6 characters');
const nicknameSchema = z.string().min(1, 'Nickname is required').max(50, 'Nickname too long');

// Join event schemas
export const joinSchema = z.object({
  joinCode: joinCodeSchema,
  nickname: nicknameSchema,
  teamName: z.string().max(50).optional(),
  teamColor: z.string().max(20).optional(),
});

export const joinHostSchema = z.object({
  competitionId: objectIdSchema,
});

export const joinDisplaySchema = z.object({
  competitionId: objectIdSchema,
});

export const joinRefereeSchema = z.object({
  competitionId: objectIdSchema,
});

// Competition control schemas
export const competitionControlSchema = z.object({
  competitionId: objectIdSchema,
});

export const questionNextSchema = z.object({
  competitionId: objectIdSchema,
});

export const questionShowNowSchema = z.object({
  competitionId: objectIdSchema,
  questionIndex: z.number().int().min(0),
});

export const questionUpdatePointsSchema = z.object({
  competitionId: objectIdSchema,
  questionId: objectIdSchema,
  points: z.number().int().min(0).max(10000),
});

export const answerRevealSchema = z.object({
  competitionId: objectIdSchema,
  questionId: objectIdSchema,
});

// Answer submission schema
export const answerSubmitSchema = z.object({
  questionId: objectIdSchema,
  answer: z.union([
    z.string().max(1000),
    z.array(z.string().max(100)).max(10),
  ]),
  timeSpent: z.number().min(0).max(3600000), // max 1 hour in ms
  teamId: objectIdSchema.optional(),
});

// Timer control schemas
export const timerStartSchema = z.object({
  competitionId: objectIdSchema,
  duration: z.number().int().min(1000).max(3600000), // 1s to 1h in ms
});

export const timerPauseSchema = z.object({
  competitionId: objectIdSchema,
});

export const timerResumeSchema = z.object({
  competitionId: objectIdSchema,
});

export const timerResetSchema = z.object({
  competitionId: objectIdSchema,
  duration: z.number().int().min(1000).max(3600000).optional(),
});

export const timerAdjustSchema = z.object({
  competitionId: objectIdSchema,
  adjustment: z.number().int().min(-3600000).max(3600000), // -1h to +1h in ms
});

// Phase control schema
export const phaseChangeSchema = z.object({
  competitionId: objectIdSchema,
  phase: z.enum([
    'setup',
    'team-formation',
    'waiting',
    'countdown',
    'question',
    'revealing',
    'leaderboard',
    'finished',
  ]),
});

// Leaderboard schema
export const leaderboardShowSchema = z.object({
  competitionId: objectIdSchema,
});

export const leaderboardToggleSchema = z.object({
  competitionId: objectIdSchema,
  visible: z.boolean(),
});

// Team schemas
export const teamCreateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
});

export const teamJoinSchema = z.object({
  teamId: objectIdSchema,
  role: z.enum(['viewer', 'submitter', 'both']).optional(),
});

export const teamUpdateRoleSchema = z.object({
  participantId: objectIdSchema,
  role: z.enum(['viewer', 'submitter', 'both']),
});

export const teamKickSchema = z.object({
  teamId: objectIdSchema,
  participantId: objectIdSchema,
});

export const teamTransferCaptainSchema = z.object({
  teamId: objectIdSchema,
  newCaptainId: objectIdSchema,
});

// Type exports for use in socket handlers
export type JoinData = z.infer<typeof joinSchema>;
export type JoinHostData = z.infer<typeof joinHostSchema>;
export type JoinDisplayData = z.infer<typeof joinDisplaySchema>;
export type JoinRefereeData = z.infer<typeof joinRefereeSchema>;
export type CompetitionControlData = z.infer<typeof competitionControlSchema>;
export type QuestionNextData = z.infer<typeof questionNextSchema>;
export type QuestionShowNowData = z.infer<typeof questionShowNowSchema>;
export type QuestionUpdatePointsData = z.infer<typeof questionUpdatePointsSchema>;
export type AnswerRevealData = z.infer<typeof answerRevealSchema>;
export type AnswerSubmitData = z.infer<typeof answerSubmitSchema>;
export type TimerStartData = z.infer<typeof timerStartSchema>;
export type TimerPauseData = z.infer<typeof timerPauseSchema>;
export type TimerResumeData = z.infer<typeof timerResumeSchema>;
export type TimerResetData = z.infer<typeof timerResetSchema>;
export type TimerAdjustData = z.infer<typeof timerAdjustSchema>;
export type PhaseChangeData = z.infer<typeof phaseChangeSchema>;
export type LeaderboardShowData = z.infer<typeof leaderboardShowSchema>;
export type TeamCreateData = z.infer<typeof teamCreateSchema>;
export type TeamJoinData = z.infer<typeof teamJoinSchema>;
export type TeamUpdateRoleData = z.infer<typeof teamUpdateRoleSchema>;
export type TeamKickData = z.infer<typeof teamKickSchema>;
export type TeamTransferCaptainData = z.infer<typeof teamTransferCaptainSchema>;

// Validation helper function
export function validateSocketData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  eventName: string
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  console.error(`Socket validation failed for ${eventName}:`, errorMessages);
  return { success: false, error: `Invalid data for ${eventName}: ${errorMessages}` };
}
