import { get, post, put, del } from './api';

interface ProblemBank {
  _id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'public' | 'shared';
  problemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Problem {
  _id: string;
  bankId: string;
  type: string;
  difficulty: string;
  content: string;
  options?: Array<{ id: string; label: string; content: string }>;
  correctAnswer: string | string[];
  answerExplanation?: string;
  tags?: Array<{ _id: string; name: string; color?: string }>;
  source?: string;
  estimatedTime?: number;
  points?: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const problemApi = {
  // Problem Banks
  banks: {
    list: (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ProblemBank>> => {
      return get<PaginatedResponse<ProblemBank>>('/problems/banks', params);
    },

    get: (id: string): Promise<ProblemBank> => {
      return get<ProblemBank>(`/problems/banks/${id}`);
    },

    create: (data: {
      name: string;
      description?: string;
      visibility?: 'private' | 'public' | 'shared';
    }): Promise<ProblemBank> => {
      return post<ProblemBank>('/problems/banks', data);
    },

    update: (id: string, data: Partial<ProblemBank>): Promise<ProblemBank> => {
      return put<ProblemBank>(`/problems/banks/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return del(`/problems/banks/${id}`);
    },
  },

  // Problems
  problems: {
    list: (params?: {
      bankId?: string;
      type?: string;
      difficulty?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Problem>> => {
      return get<PaginatedResponse<Problem>>('/problems', params);
    },

    get: (id: string): Promise<Problem> => {
      return get<Problem>(`/problems/${id}`);
    },

    create: (data: {
      bankId: string;
      type: string;
      difficulty: string;
      content: string;
      options?: Array<{ id: string; label: string; content: string }>;
      correctAnswer: string | string[];
      answerExplanation?: string;
      tags?: string[];
      source?: string;
      estimatedTime?: number;
      points?: number;
    }): Promise<Problem> => {
      return post<Problem>('/problems', data);
    },

    update: (id: string, data: Partial<Problem>): Promise<Problem> => {
      return put<Problem>(`/problems/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return del(`/problems/${id}`);
    },

    duplicate: (id: string, targetBankId: string): Promise<Problem> => {
      return post<Problem>(`/problems/${id}/duplicate`, { targetBankId });
    },

    // Batch create problems
    batchCreate: (problems: Array<{
      bankId: string;
      type: string;
      difficulty: string;
      content: string;
      options?: Array<{ id: string; label: string; content: string }>;
      correctAnswer: string | string[];
      answerExplanation?: string;
      source?: string;
      points?: number;
      estimatedTime?: number;
    }>): Promise<{ data: Problem[]; count: number }> => {
      return post<{ data: Problem[]; count: number }>('/problems/batch', { problems });
    },
  },
};
