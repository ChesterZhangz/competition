import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';
import { ZodError, z } from 'zod';

const sendCodeSchema = z.object({
  email: z.string().email(),
  type: z.enum(['register', 'reset']),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum(['register', 'reset']),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export class AuthController {
  // POST /api/auth/register
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const { verificationCode } = req.body;

      let result;
      if (verificationCode) {
        // Register with email verification
        result = await authService.registerWithVerification({
          ...input,
          verificationCode,
        });
      } else {
        // Register without verification (for backward compatibility or phone-based)
        result = await authService.register(input);
      }

      const { user, accessToken, refreshToken } = result;

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await authService.login(input);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
            avatar: user.avatar,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email/phone or password',
          },
        });
        return;
      }
      next(error);
    }
  }

  // POST /api/auth/refresh
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = refreshTokenSchema.parse(req.body);
      const { accessToken, refreshToken } = await authService.refreshTokens(input.refreshToken);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error && (
        error.message.includes('token') ||
        error.message.includes('Session')
      )) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_INVALID',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }

  // POST /api/auth/logout
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const sessionId = req.user?.sessionId;

      if (userId && sessionId) {
        await authService.logout(userId, sessionId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
        return;
      }

      const user = await authService.getCurrentUser(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
            avatar: user.avatar,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/guest
  async createGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nickname } = req.body;
      if (!nickname || typeof nickname !== 'string' || nickname.length < 2) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nickname must be at least 2 characters',
          },
        });
        return;
      }

      const { user, accessToken, refreshToken } = await authService.createGuestUser(nickname);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            nickname: user.nickname,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/send-code
  async sendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = sendCodeSchema.parse(req.body);
      await authService.sendVerificationCode(input.email, input.type);

      res.json({
        success: true,
        message: 'Verification code sent',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'SEND_CODE_FAILED',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }

  // POST /api/auth/verify-code
  async verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = verifyCodeSchema.parse(req.body);
      await authService.verifyCode(input.email, input.code, input.type);

      res.json({
        success: true,
        message: 'Code verified successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VERIFY_CODE_FAILED',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(input.email, input.code, input.newPassword);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'RESET_PASSWORD_FAILED',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }
}

export const authController = new AuthController();
