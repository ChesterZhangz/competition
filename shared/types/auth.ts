// User role type - must match backend user.model.ts
export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'guest';

// User types
export interface IUser {
  _id: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'banned';
  emailVerified?: boolean;
  oauthProviders?: IOAuthProvider[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthProvider {
  provider: 'google' | 'github' | 'wechat';
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
}

// Session types
export interface ISession {
  _id: string;
  userId: string;
  refreshToken: string;
  deviceInfo?: IDeviceInfo;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface IDeviceInfo {
  userAgent: string;
  platform?: string;
  browser?: string;
  os?: string;
}

// Verification code types
export interface IVerificationCode {
  _id: string;
  target: string; // email or phone
  targetType: 'email' | 'phone';
  code: string;
  purpose: 'register' | 'login' | 'reset_password' | 'bind';
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

// Auth request/response types
export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  nickname: string;
  verificationCode?: string;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<IUser, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Token payload types
export interface TokenPayload {
  userId: string;
  email?: string;
  role: string;
  sessionId: string;
}
