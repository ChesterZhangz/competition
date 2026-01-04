import { Router } from 'express';
import { teacherApplicationController } from '../controllers/teacher-application.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRoles, requireAdmin } from '../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student routes
router.post('/', requireRoles('student'), teacherApplicationController.submit.bind(teacherApplicationController));
router.get('/mine', teacherApplicationController.getMine.bind(teacherApplicationController));
router.get('/check-pending', teacherApplicationController.checkPending.bind(teacherApplicationController));

// Admin routes
router.get('/', requireAdmin, teacherApplicationController.getAll.bind(teacherApplicationController));
router.post('/:id/review', requireAdmin, teacherApplicationController.review.bind(teacherApplicationController));

export default router;
