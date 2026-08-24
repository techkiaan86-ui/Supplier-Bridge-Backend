import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export const NotificationController = {
  getNotifications: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      const roleName = user?.role?.name || user?.roleName || user?.role;

      const { page = 1, limit = 50, search, filterType, severity, unreadOnly } = req.query;

      const result = await NotificationService.getNotifications({
        userId,
        roleName,
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        filterType: filterType as string,
        severity: severity as string,
        unreadOnly: unreadOnly === 'true',
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications', details: error.message, stack: error.stack });
    }
  },

  getUnreadCount: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      const roleName = user?.role?.name || user?.roleName || user?.role;

      const count = await NotificationService.getUnreadCount({ userId, roleName });
      res.status(200).json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  },

  markAsRead: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await NotificationService.markAsRead(id);
      res.status(200).json({ message: 'Marked as read' });
    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  },

  markAllRead: async (req: Request, res: Response) => {
    try {
      await NotificationService.markAllRead();
      res.status(200).json({ message: 'All marked as read' });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  },

  deleteNotification: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await NotificationService.deleteNotification(id);
      res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  },

  getPreferences: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      const role = user?.role?.name || user?.roleName || user?.role || 'administrator';

      const preferences = await NotificationService.getPreferences({ userId, role });
      res.status(200).json(preferences);
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences', details: error.message });
    }
  },

  updatePreferences: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      const role = user?.role?.name || user?.roleName || user?.role || 'administrator';
      const { preferences } = req.body;

      const updated = await NotificationService.updatePreferences({ userId, role }, preferences);
      res.status(200).json({ message: 'Notification preferences saved successfully', preferences: updated });
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences', details: error.message });
    }
  },

  triggerTestNotification: async (req: Request, res: Response) => {
    try {
      const { eventType } = req.body;

      let notification;
      switch (eventType) {
        case 'FAILED_IMPORT':
          notification = await NotificationService.triggerFailedImport('medical_catalog_2026.csv', 'Invalid SKU structure at row 42', 150);
          break;
        case 'FAILED_SYNC':
          notification = await NotificationService.triggerFailedSync('MedTech Supplies FTP', new Date().toLocaleTimeString(), 'Connection Timeout (60s)', 2);
          break;
        case 'SUPPLIER_CONNECTION_FAILURE':
          notification = await NotificationService.triggerSupplierConnectionFailure('GlobalMed Corp', 'https://api.globalmed.io/v2/catalog', '503 Service Unavailable');
          break;
        case 'API_FAILURE':
          notification = await NotificationService.triggerApiFailure('Shopify Middleware Webhook', 504, 'Gateway Timeout while pushing product updates');
          break;
        case 'FTP_FAILURE':
          notification = await NotificationService.triggerFtpFailure('sftp.medtechsupplier.com', 'inventory_feed_august.xml', 'Authentication Handshake Failed');
          break;
        case 'VALIDATION_ERROR':
          notification = await NotificationService.triggerValidationError('MED-SKU-99042', ['Manufacturer Name', 'UPC Code', 'Unit Price']);
          break;
        default:
          notification = await NotificationService.triggerFailedSync('Demo Supplier', new Date().toLocaleTimeString(), 'Test Trigger Alert', 1);
      }

      res.status(200).json({ message: 'Test notification triggered successfully', notification });
    } catch (error: any) {
      console.error('Error triggering test notification:', error);
      res.status(500).json({ error: 'Failed to trigger test notification', details: error.message });
    }
  },

  streamNotifications: (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = user?.id || user?.userId;
    const roleName = user?.role?.name || user?.roleName || user?.role;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(': connected\n\n');

    NotificationService.addSSEClient(res, { userId, roleName });

    req.on('close', () => {
      NotificationService.removeSSEClient(res);
    });
  },
};
