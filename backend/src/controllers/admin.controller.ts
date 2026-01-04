import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { UserRole } from '../models/user.model';

export class AdminController {
  // Get dashboard stats
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      });
    }
  }

  // List users
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, role, search, status } = req.query;

      const result = await adminService.listUsers({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        role: role as UserRole | undefined,
        search: search as string | undefined,
        status: status as 'active' | 'inactive' | 'banned' | undefined,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list users',
      });
    }
  }

  // Update user role
  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role: newRole } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Validate role
      const validRoles: UserRole[] = ['super_admin', 'admin', 'teacher', 'student', 'guest'];
      if (!validRoles.includes(newRole)) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      const user = await adminService.updateUserRole(
        userId,
        newRole,
        req.user.role as UserRole,
        req.user.userId
      );

      res.json({
        success: true,
        data: {
          _id: user._id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Update user role error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update role';
      const statusCode = message.includes('not found') ? 404 : 403;
      res.status(statusCode).json({ success: false, error: message });
    }
  }

  // Update user status
  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status: newStatus } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'banned'];
      if (!validStatuses.includes(newStatus)) {
        res.status(400).json({ success: false, error: 'Invalid status' });
        return;
      }

      const user = await adminService.updateUserStatus(
        userId,
        newStatus,
        req.user.role as UserRole,
        req.user.userId
      );

      res.json({
        success: true,
        data: {
          _id: user._id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Update user status error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update status';
      const statusCode = message.includes('not found') ? 404 : 403;
      res.status(statusCode).json({ success: false, error: message });
    }
  }

  // Get all system settings
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await adminService.getAllSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
      });
    }
  }

  // Get allowed email domains
  async getAllowedEmailDomains(req: Request, res: Response): Promise<void> {
    try {
      const domains = await adminService.getAllowedEmailDomains();
      res.json({ success: true, data: domains });
    } catch (error) {
      console.error('Get allowed email domains error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get allowed email domains',
      });
    }
  }

  // Update allowed email domains (super_admin only)
  async updateAllowedEmailDomains(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Only super_admin can update this setting
      if (req.user.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Only super admin can modify email domain restrictions',
        });
        return;
      }

      const { enabled, domains } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ success: false, error: 'enabled must be a boolean' });
        return;
      }

      if (!Array.isArray(domains)) {
        res.status(400).json({ success: false, error: 'domains must be an array' });
        return;
      }

      const setting = await adminService.updateAllowedEmailDomains(
        { enabled, domains },
        req.user.userId
      );

      res.json({ success: true, data: setting.value });
    } catch (error) {
      console.error('Update allowed email domains error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update allowed email domains',
      });
    }
  }

  // Delete user
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await adminService.deleteUser(userId, req.user.role as UserRole, req.user.userId);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      const statusCode = message.includes('not found') ? 404 : 403;
      res.status(statusCode).json({ success: false, error: message });
    }
  }
}

export const adminController = new AdminController();
