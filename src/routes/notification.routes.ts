import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// SSE endpoint
router.get('/stream', authenticate, NotificationController.streamNotifications);

// REST APIs
router.get('/', authenticate, NotificationController.getNotifications);
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);

// Preferences Matrix APIs
router.get('/preferences', authenticate, NotificationController.getPreferences);
router.put('/preferences', authenticate, NotificationController.updatePreferences);

// Quick Test Trigger Endpoint
router.post('/trigger-test', authenticate, NotificationController.triggerTestNotification);

// Item Status Actions
router.patch('/read-all', authenticate, NotificationController.markAllRead);
router.patch('/:id/read', authenticate, NotificationController.markAsRead);
router.delete('/:id', authenticate, NotificationController.deleteNotification);

export default router;
