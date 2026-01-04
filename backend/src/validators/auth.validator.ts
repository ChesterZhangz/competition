import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(50),
  verificationCode: z.string().length(6).optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const sendVerificationCodeSchema = z.object({
  target: z.string().min(1, 'Target is required'),
  targetType: z.enum(['email', 'phone']),
  purpose: z.enum(['register', 'login', 'reset_password', 'bind']),
});

export const verifyCodeSchema = z.object({
  target: z.string().min(1, 'Target is required'),
  code: z.string().length(6, 'Code must be 6 characters'),
  purpose: z.enum(['register', 'login', 'reset_password', 'bind']),
});

export const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(50).optional(),
  avatar: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type SendVerificationCodeInput = z.infer<typeof sendVerificationCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
