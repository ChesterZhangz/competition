// Problem Bank types
export interface IProblemBank {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  visibility: 'private' | 'public' | 'shared';
  sharedWith?: string[]; // User IDs
  tags?: string[];
  problemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Problem types
export interface IProblem {
  _id: string;
  bankId: string;
  type: ProblemType;
  difficulty: DifficultyLevel;

  // Content
  content: string; // LaTeX formatted
  options?: IProblemOption[]; // For multiple choice
  correctAnswer: string | string[]; // Single answer or multiple
  answerExplanation?: string;

  // Metadata
  tags?: IProblemTag[];
  source?: string;
  estimatedTime?: number; // in seconds
  points?: number;

  // Statistics
  usageCount: number;
  correctRate?: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ProblemType =
  | 'single_choice'      // 单选题
  | 'multiple_choice'    // 多选题
  | 'fill_blank'         // 填空题
  | 'integration'        // 积分题 (Integration Bee)
  | 'short_answer'       // 简答题
  | 'proof';             // 证明题

export type DifficultyLevel =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert';

export interface IProblemOption {
  id: string;
  label: string; // A, B, C, D
  content: string; // LaTeX formatted
}

export interface IProblemTag {
  _id: string;
  name: string;
  category?: string; // e.g., 'topic', 'skill', 'chapter'
  color?: string;
}

// Request/Response types
export interface CreateProblemBankRequest {
  name: string;
  description?: string;
  visibility?: 'private' | 'public' | 'shared';
  tags?: string[];
}

export interface CreateProblemRequest {
  bankId: string;
  type: ProblemType;
  difficulty: DifficultyLevel;
  content: string;
  options?: IProblemOption[];
  correctAnswer: string | string[];
  answerExplanation?: string;
  tags?: string[];
  source?: string;
  estimatedTime?: number;
  points?: number;
}

export interface UpdateProblemRequest extends Partial<CreateProblemRequest> {}

export interface ProblemQueryParams {
  bankId?: string;
  type?: ProblemType;
  difficulty?: DifficultyLevel;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
