import { create } from 'zustand';

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

interface ProblemState {
  // Banks
  banks: ProblemBank[];
  problemBanks: ProblemBank[]; // Alias for banks
  currentBank: ProblemBank | null;
  banksLoading: boolean;
  isLoading: boolean; // Alias for banksLoading

  // Problems
  problems: Problem[];
  currentProblem: Problem | null;
  problemsLoading: boolean;
  problemsTotal: number;
  problemsPage: number;

  // Actions
  setBanks: (banks: ProblemBank[]) => void;
  setProblemBanks: (banks: ProblemBank[]) => void; // Alias for setBanks
  setCurrentBank: (bank: ProblemBank | null) => void;
  addBank: (bank: ProblemBank) => void;
  updateBank: (id: string, updates: Partial<ProblemBank>) => void;
  removeBank: (id: string) => void;
  setBanksLoading: (loading: boolean) => void;
  setIsLoading: (loading: boolean) => void; // Alias for setBanksLoading

  setProblems: (problems: Problem[], total: number, page: number) => void;
  setCurrentProblem: (problem: Problem | null) => void;
  addProblem: (problem: Problem) => void;
  updateProblem: (id: string, updates: Partial<Problem>) => void;
  removeProblem: (id: string) => void;
  setProblemsLoading: (loading: boolean) => void;

  reset: () => void;
}

export const useProblemStore = create<ProblemState>((set) => ({
  banks: [],
  problemBanks: [], // Alias for banks
  currentBank: null,
  banksLoading: false,
  isLoading: false, // Alias for banksLoading

  problems: [],
  currentProblem: null,
  problemsLoading: false,
  problemsTotal: 0,
  problemsPage: 1,

  setBanks: (banks) => set({ banks, problemBanks: banks }),
  setProblemBanks: (banks) => set({ banks, problemBanks: banks }), // Alias
  setCurrentBank: (bank) => set({ currentBank: bank }),
  addBank: (bank) => set((state) => ({
    banks: [...state.banks, bank],
    problemBanks: [...state.problemBanks, bank],
  })),
  updateBank: (id, updates) =>
    set((state) => {
      const updatedBanks = state.banks.map((b) => (b._id === id ? { ...b, ...updates } : b));
      return {
        banks: updatedBanks,
        problemBanks: updatedBanks,
        currentBank:
          state.currentBank?._id === id
            ? { ...state.currentBank, ...updates }
            : state.currentBank,
      };
    }),
  removeBank: (id) =>
    set((state) => {
      const filteredBanks = state.banks.filter((b) => b._id !== id);
      return {
        banks: filteredBanks,
        problemBanks: filteredBanks,
        currentBank: state.currentBank?._id === id ? null : state.currentBank,
      };
    }),
  setBanksLoading: (loading) => set({ banksLoading: loading, isLoading: loading }),
  setIsLoading: (loading) => set({ banksLoading: loading, isLoading: loading }), // Alias

  setProblems: (problems, total, page) =>
    set({ problems, problemsTotal: total, problemsPage: page }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  addProblem: (problem) =>
    set((state) => ({
      problems: [...state.problems, problem],
      problemsTotal: state.problemsTotal + 1,
    })),
  updateProblem: (id, updates) =>
    set((state) => ({
      problems: state.problems.map((p) => (p._id === id ? { ...p, ...updates } : p)),
      currentProblem:
        state.currentProblem?._id === id
          ? { ...state.currentProblem, ...updates }
          : state.currentProblem,
    })),
  removeProblem: (id) =>
    set((state) => ({
      problems: state.problems.filter((p) => p._id !== id),
      problemsTotal: state.problemsTotal - 1,
      currentProblem: state.currentProblem?._id === id ? null : state.currentProblem,
    })),
  setProblemsLoading: (loading) => set({ problemsLoading: loading }),

  reset: () =>
    set({
      banks: [],
      problemBanks: [],
      currentBank: null,
      banksLoading: false,
      isLoading: false,
      problems: [],
      currentProblem: null,
      problemsLoading: false,
      problemsTotal: 0,
      problemsPage: 1,
    }),
}));
