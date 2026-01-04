import { post, get } from './api';

interface User {
  id: string;
  email?: string;
  phone?: string;
  nickname: string;
  role: string;
  avatar?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  // Register new user (with email verification)
  register: (data: {
    email?: string;
    phone?: string;
    password: string;
    nickname: string;
    verificationCode?: string;
  }): Promise<AuthResponse> => {
    return post<AuthResponse>('/auth/register', data);
  },

  // Login
  login: (data: {
    email?: string;
    phone?: string;
    password: string;
  }): Promise<AuthResponse> => {
    return post<AuthResponse>('/auth/login', data);
  },

  // Refresh token
  refreshToken: (refreshToken: string): Promise<TokenResponse> => {
    return post<TokenResponse>('/auth/refresh', { refreshToken });
  },

  // Logout
  logout: (): Promise<void> => {
    return post('/auth/logout');
  },

  // Get current user
  me: (): Promise<{ user: User }> => {
    return get<{ user: User }>('/auth/me');
  },

  // Create guest user
  createGuest: (nickname: string): Promise<AuthResponse> => {
    return post<AuthResponse>('/auth/guest', { nickname });
  },

  // Send verification code for registration
  sendVerificationCode: (email: string): Promise<void> => {
    return post('/auth/send-code', { email, type: 'register' });
  },

  // Send password reset code
  sendResetCode: (email: string): Promise<void> => {
    return post('/auth/send-code', { email, type: 'reset' });
  },

  // Verify reset code (check if valid before allowing password reset)
  verifyResetCode: (email: string, code: string): Promise<void> => {
    return post('/auth/verify-code', { email, code, type: 'reset' });
  },

  // Reset password with verification code
  resetPassword: (email: string, code: string, newPassword: string): Promise<void> => {
    return post('/auth/reset-password', { email, code, newPassword });
  },
};
