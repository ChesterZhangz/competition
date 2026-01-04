import { Request, Response, NextFunction } from 'express';
import { problemService } from '../services/problem.service';
import { problemBankService } from '../services/problem-bank.service';
import {
  createProblemBankSchema,
  updateProblemBankSchema,
  createProblemSchema,
  updateProblemSchema,
  problemQuerySchema,
  batchCreateProblemsSchema,
} from '../validators/problem.validator';
import { ZodError } from 'zod';

export class ProblemController {
  // Problem Banks

  // POST /api/problem-banks
  async createBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createProblemBankSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const bank = await problemBankService.create(input, userId);
      res.status(201).json({
        success: true,
        data: bank,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      next(error);
    }
  }

  // GET /api/problem-banks
  async listBanks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await problemBankService.list(userId, { page, limit, search });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/problem-banks/:id
  async getBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = req.params.id;
      const userId = req.user?.userId;

      const bank = await problemBankService.getById(bankId, userId);
      if (!bank) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem bank not found' } });
        return;
      }

      res.json({
        success: true,
        data: bank,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/problem-banks/:id
  async updateBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = req.params.id;
      const input = updateProblemBankSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const bank = await problemBankService.update(bankId, input, userId);
      if (!bank) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem bank not found' } });
        return;
      }

      res.json({
        success: true,
        data: bank,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // DELETE /api/problem-banks/:id
  async deleteBank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = req.params.id;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const deleted = await problemBankService.delete(bankId, userId);
      if (!deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem bank not found' } });
        return;
      }

      res.json({
        success: true,
        message: 'Problem bank deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // Problems

  // POST /api/problems
  async createProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createProblemSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const problem = await problemService.create(input, userId);
      res.status(201).json({
        success: true,
        data: problem,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // GET /api/problems
  async listProblems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = problemQuerySchema.parse(req.query);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const result = await problemService.list(query, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      next(error);
    }
  }

  // GET /api/problems/:id
  async getProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const problemId = req.params.id;
      const userId = req.user?.userId;

      const problem = await problemService.getById(problemId, userId);
      if (!problem) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem not found' } });
        return;
      }

      res.json({
        success: true,
        data: problem,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/problems/:id
  async updateProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const problemId = req.params.id;
      const input = updateProblemSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const problem = await problemService.update(problemId, input, userId);
      if (!problem) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem not found' } });
        return;
      }

      res.json({
        success: true,
        data: problem,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // DELETE /api/problems/:id
  async deleteProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const problemId = req.params.id;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const deleted = await problemService.delete(problemId, userId);
      if (!deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem not found' } });
        return;
      }

      res.json({
        success: true,
        message: 'Problem deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // POST /api/problems/:id/duplicate
  async duplicateProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const problemId = req.params.id;
      const { targetBankId } = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      if (!targetBankId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'targetBankId is required' } });
        return;
      }

      const duplicate = await problemService.duplicate(problemId, targetBankId, userId);
      res.status(201).json({
        success: true,
        data: duplicate,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }

  // POST /api/problems/batch
  async batchCreateProblems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = batchCreateProblemsSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const problems = await problemService.createBatch(input.problems, userId);
      res.status(201).json({
        success: true,
        data: problems,
        count: problems.length,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
        return;
      }
      next(error);
    }
  }
}

export const problemController = new ProblemController();
