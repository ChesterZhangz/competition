import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireMinRole, requireRoles } from '../middlewares/role.middleware';

const router = Router();

// All admin routes require authentication and at least admin role
router.use(authenticate);
router.use(requireMinRole('admin'));

// Dashboard stats
router.get('/stats', adminController.getStats.bind(adminController));

// User management
router.get('/users', adminController.listUsers.bind(adminController));
router.put('/users/:userId/role', adminController.updateUserRole.bind(adminController));
router.put('/users/:userId/status', adminController.updateUserStatus.bind(adminController));
router.delete('/users/:userId', adminController.deleteUser.bind(adminController));

// System settings (all admins can view, but only super_admin can modify email domains)
router.get('/settings', adminController.getSettings.bind(adminController));

// Email domain settings
router.get('/settings/email-domains', adminController.getAllowedEmailDomains.bind(adminController));
router.put(
  '/settings/email-domains',
  requireRoles('super_admin'),  // Only super_admin can modify
  adminController.updateAllowedEmailDomains.bind(adminController)
);

export default router;
