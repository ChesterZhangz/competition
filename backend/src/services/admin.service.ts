import { User, IUserDocument, UserRole } from '../models/user.model';
import {
  SystemSettings,
  ISystemSettingsDocument,
  SETTING_KEYS,
  AllowedEmailDomainsValue,
} from '../models/system-settings.model';

// Helper function to escape regex special characters to prevent ReDoS attacks
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Maximum pagination limit to prevent abuse
const MAX_PAGINATION_LIMIT = 100;

interface UserListQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
  status?: 'active' | 'inactive' | 'banned';
}

interface UserListResult {
  users: Array<{
    _id: unknown;
    email?: string;
    phone?: string;
    nickname: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'banned';
    emailVerified?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DashboardStats {
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
    createdAt: Date;
  }>;
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  teacher: 60,
  student: 40,
  guest: 20,
};

export class AdminService {
  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('nickname email role createdAt')
        .lean(),
    ]);

    // These would be populated from actual collections
    // For now, returning placeholder values
    return {
      totalUsers,
      totalCompetitions: 0,
      totalProblemBanks: 0,
      pendingApplications: 0,
      activeCompetitions: 0,
      recentUsers: recentUsers.map((u) => ({
        _id: u._id.toString(),
        nickname: u.nickname,
        email: u.email || '',
        role: u.role,
        createdAt: u.createdAt,
      })),
    };
  }

  // List users with pagination and filters
  async listUsers(query: UserListQuery): Promise<UserListResult> {
    const { page = 1, role, search, status } = query;
    // Enforce maximum pagination limit to prevent abuse
    const limit = Math.min(query.limit || 20, MAX_PAGINATION_LIMIT);
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      // Escape regex special characters to prevent ReDoS attacks
      const escapedSearch = escapeRegExp(search);
      filter.$or = [
        { email: { $regex: escapedSearch, $options: 'i' } },
        { nickname: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update user role
  async updateUserRole(
    userId: string,
    newRole: UserRole,
    operatorRole: UserRole,
    operatorId: string
  ): Promise<IUserDocument> {
    // Find the target user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent self-demotion for super_admin
    if (userId === operatorId && user.role === 'super_admin' && newRole !== 'super_admin') {
      throw new Error('Super admin cannot demote themselves');
    }

    // Check permission: operator must have higher or equal role than target's current and new role
    const operatorLevel = ROLE_HIERARCHY[operatorRole];
    const targetCurrentLevel = ROLE_HIERARCHY[user.role];
    const targetNewLevel = ROLE_HIERARCHY[newRole];

    // Only super_admin can manage super_admin or admin
    if (user.role === 'super_admin' && operatorRole !== 'super_admin') {
      throw new Error('Only super admin can modify another super admin');
    }

    // Admin cannot promote to super_admin
    if (newRole === 'super_admin' && operatorRole !== 'super_admin') {
      throw new Error('Only super admin can grant super admin role');
    }

    // Admin cannot modify other admins
    if (user.role === 'admin' && operatorRole === 'admin') {
      throw new Error('Admin cannot modify another admin');
    }

    // Cannot promote to a level equal or higher than operator (except super_admin can do anything)
    if (operatorRole !== 'super_admin' && targetNewLevel >= operatorLevel) {
      throw new Error('Cannot promote user to a role equal or higher than your own');
    }

    user.role = newRole;
    await user.save();

    return user;
  }

  // Update user status
  async updateUserStatus(
    userId: string,
    newStatus: 'active' | 'inactive' | 'banned',
    operatorRole: UserRole,
    operatorId: string
  ): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent self-suspension
    if (userId === operatorId) {
      throw new Error('Cannot change your own status');
    }

    // Only super_admin can suspend admin or super_admin
    if (
      (user.role === 'admin' || user.role === 'super_admin') &&
      operatorRole !== 'super_admin'
    ) {
      throw new Error('Only super admin can change admin or super admin status');
    }

    user.status = newStatus;
    await user.save();

    return user;
  }

  // Get system setting by key
  async getSetting(key: string): Promise<ISystemSettingsDocument | null> {
    return SystemSettings.findOne({ key });
  }

  // Get all system settings
  async getAllSettings(): Promise<ISystemSettingsDocument[]> {
    return SystemSettings.find().sort({ key: 1 });
  }

  // Update or create a system setting
  async upsertSetting(
    key: string,
    value: unknown,
    description: string | undefined,
    userId: string
  ): Promise<ISystemSettingsDocument> {
    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      {
        $set: {
          value,
          description,
          updatedBy: userId,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    return setting;
  }

  // Get allowed email domains setting
  async getAllowedEmailDomains(): Promise<AllowedEmailDomainsValue> {
    const setting = await this.getSetting(SETTING_KEYS.ALLOWED_EMAIL_DOMAINS);
    if (!setting) {
      // Default: disabled, no restrictions
      return {
        enabled: false,
        domains: [],
      };
    }
    return setting.value as AllowedEmailDomainsValue;
  }

  // Update allowed email domains
  async updateAllowedEmailDomains(
    value: AllowedEmailDomainsValue,
    userId: string
  ): Promise<ISystemSettingsDocument> {
    // Validate and normalize domains
    const normalizedDomains = value.domains
      .map((d) => d.toLowerCase().trim())
      .filter((d) => d.length > 0);

    // Validate domain format
    for (const domain of normalizedDomains) {
      if (!this.isValidDomainFormat(domain)) {
        throw new Error(`Invalid domain format: ${domain}`);
      }
    }

    return this.upsertSetting(
      SETTING_KEYS.ALLOWED_EMAIL_DOMAINS,
      {
        enabled: value.enabled,
        domains: normalizedDomains,
      },
      'Allowed email domains for registration',
      userId
    );
  }

  // Check if email is allowed to register
  async isEmailAllowed(email: string): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await this.getAllowedEmailDomains();

    // If not enabled, all emails are allowed
    if (!settings.enabled) {
      return { allowed: true };
    }

    // If enabled but no domains specified, no one can register
    if (settings.domains.length === 0) {
      return {
        allowed: false,
        reason: 'Registration is currently restricted',
      };
    }

    // Check if email domain matches any allowed domain
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return {
        allowed: false,
        reason: 'Invalid email format',
      };
    }

    const isAllowed = settings.domains.some((allowedDomain) => {
      // Support wildcard matching: *.edu.cn matches any subdomain
      if (allowedDomain.startsWith('*.')) {
        const suffix = allowedDomain.slice(1); // Remove the *
        return emailDomain.endsWith(suffix) || emailDomain === allowedDomain.slice(2);
      }
      return emailDomain === allowedDomain;
    });

    if (isAllowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Email domain @${emailDomain} is not allowed. Allowed domains: ${settings.domains.join(', ')}`,
    };
  }

  // Validate domain format
  private isValidDomainFormat(domain: string): boolean {
    // Allow wildcards like *.edu.cn
    const domainPattern = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    return domainPattern.test(domain);
  }

  // Delete a user (soft delete by setting status to 'banned')
  async deleteUser(userId: string, operatorRole: UserRole, operatorId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent self-deletion
    if (userId === operatorId) {
      throw new Error('Cannot delete your own account');
    }

    // Only super_admin can delete admin or super_admin
    if (
      (user.role === 'admin' || user.role === 'super_admin') &&
      operatorRole !== 'super_admin'
    ) {
      throw new Error('Only super admin can delete admin or super admin accounts');
    }

    user.status = 'banned';
    await user.save();
  }
}

export const adminService = new AdminService();
