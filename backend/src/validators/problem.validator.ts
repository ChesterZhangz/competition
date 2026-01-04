import { z } from 'zod';

const problemOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  content: z.string().min(1),
});

export const createProblemBankSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'public', 'shared']).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProblemBankSchema = createProblemBankSchema.partial();

export const createProblemSchema = z.object({
  bankId: z.string().min(1),
  type: z.enum(['single_choice', 'multiple_choice', 'fill_blank', 'integration', 'short_answer', 'proof']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  content: z.string().min(1),
  options: z.array(problemOptionSchema).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  answerExplanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  estimatedTime: z.number().positive().optional(),
  points: z.number().positive().optional(),
});

export const updateProblemSchema = createProblemSchema.partial().omit({ bankId: true });

export const problemQuerySchema = z.object({
  bankId: z.string().optional(),
  type: z.enum(['single_choice', 'multiple_choice', 'fill_blank', 'integration', 'short_answer', 'proof']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// Batch create schema
export const batchCreateProblemsSchema = z.object({
  problems: z.array(createProblemSchema).min(1).max(100),
});

// Type exports
export type CreateProblemBankInput = z.infer<typeof createProblemBankSchema>;
export type UpdateProblemBankInput = z.infer<typeof updateProblemBankSchema>;
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type ProblemQueryInput = z.infer<typeof problemQuerySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type BatchCreateProblemsInput = z.infer<typeof batchCreateProblemsSchema>;
