import { Request, Response, NextFunction } from 'express';
import { teacherApplicationService } from '../services/teacher-application.service';
import { z } from 'zod';

const submitApplicationSchema = z.object({
  reason: z.string().min(10).max(500),
});

const reviewApplicationSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().max(500).optional(),
});

export class TeacherApplicationController {
  /**
   * Submit a teacher application (student only)
   */
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
        return;
      }

      const { reason } = submitApplicationSchema.parse(req.body);
      const application = await teacherApplicationService.submitApplication(userId, reason);

      res.status(201).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors },
        });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: { code: 'APPLICATION_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Get all applications (admin only)
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const result = await teacherApplicationService.getApplications(
        status as 'pending' | 'approved' | 'rejected' | undefined,
        parseInt(page as string, 10),
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's applications
   */
  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
        return;
      }

      const applications = await teacherApplicationService.getUserApplications(userId);

      res.json({
        success: true,
        data: { applications },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Review an application (admin only)
   */
  async review(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewerId = req.user?.userId;
      if (!reviewerId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
        return;
      }

      const { id } = req.params;
      const { action, reviewNote } = reviewApplicationSchema.parse(req.body);

      const application = await teacherApplicationService.reviewApplication(
        id,
        reviewerId,
        action,
        reviewNote
      );

      res.json({
        success: true,
        data: { application },
        message: `Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors },
        });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: { code: 'REVIEW_FAILED', message: error.message },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Check if current user has pending application
   */
  async checkPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
        return;
      }

      const hasPending = await teacherApplicationService.hasPendingApplication(userId);

      res.json({
        success: true,
        data: { hasPending },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const teacherApplicationController = new TeacherApplicationController();
