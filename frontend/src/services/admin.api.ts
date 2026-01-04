import { api } from './api';

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'suspended';

export interface User {
  _id: string;
  email?: string;
  phone?: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalCompetitions: number;
  totalProblemBanks: number;
  pendingApplications: number;
  activeCompetitions: number;
  recentUsers: Array<{
    _id: string;
    nickname: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

export interface AllowedEmailDomains {
  enabled: boolean;
  domains: string[];
}

export interface SystemSetting {
  _id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const adminApi = {
  // Dashboard
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/admin/stats');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get stats');
    }
    return response.data.data;
  },

  // User management
  async listUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
    status?: UserStatus;
  }): Promise<UserListResult> {
    const response = await api.get<ApiResponse<UserListResult>>('/admin/users', { params });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to list users');
    }
    return response.data.data;
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${userId}/role`, { role });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update role');
    }
    return response.data.data;
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${userId}/status`, { status });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update status');
    }
    return response.data.data;
  },

  async deleteUser(userId: string): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/admin/users/${userId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete user');
    }
  },

  // System settings
  async getAllSettings(): Promise<SystemSetting[]> {
    const response = await api.get<ApiResponse<SystemSetting[]>>('/admin/settings');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get settings');
    }
    return response.data.data;
  },

  async getAllowedEmailDomains(): Promise<AllowedEmailDomains> {
    const response = await api.get<ApiResponse<AllowedEmailDomains>>('/admin/settings/email-domains');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get email domain settings');
    }
    return response.data.data;
  },

  async updateAllowedEmailDomains(settings: AllowedEmailDomains): Promise<AllowedEmailDomains> {
    const response = await api.put<ApiResponse<AllowedEmailDomains>>(
      '/admin/settings/email-domains',
      settings
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update email domain settings');
    }
    return response.data.data;
  },
};
