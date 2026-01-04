import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notifications for current user
router.get('/', notificationController.getNotifications.bind(notificationController));

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

// Mark all as read
router.post('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

// Delete all notifications
router.delete('/all', notificationController.deleteAllNotifications.bind(notificationController));

// Mark specific notification as read
router.post('/:id/read', notificationController.markAsRead.bind(notificationController));

// Delete specific notification
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

export default router;
