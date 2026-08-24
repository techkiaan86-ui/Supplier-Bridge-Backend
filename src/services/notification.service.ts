import { PrismaClient, NotificationType, Severity, Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../utils/prisma';
import { EmailService } from './email.service';

export interface SSEClient {
  res: Response;
  userId?: string;
  roleName?: string;
}

export class NotificationService {
  private static sseClients: SSEClient[] = [];

  // --- SSE Management ---
  static addSSEClient(res: Response, user: { userId?: string; roleName?: string }) {
    this.sseClients.push({ res, ...user });
  }

  static removeSSEClient(res: Response) {
    this.sseClients = this.sseClients.filter((c) => c.res !== res);
  }

  private static broadcast(notification: any) {
    const data = `data: ${JSON.stringify(notification)}\n\n`;

    this.sseClients.forEach((client) => {
      if (this.canViewNotification(notification, client.roleName)) {
        client.res.write(data);
      }
    });
  }

  // --- RBAC Check ---
  private static canViewNotification(notification: any, roleName?: string): boolean {
    if (!roleName) return false;
    const role = roleName.toLowerCase().replace(/ /g, '_');

    if (role === 'platform_owner' || role === 'administrator') return true;

    if (role === 'catalog_manager') {
      const allowed = [
        'NEW_PRODUCT', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
        'VALIDATION_REQUIRED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'VALIDATION_ERROR',
        'PRICE_CHANGE', 'PRICE_MISSING', 'INVENTORY_WARNING', 'INVENTORY_UPDATED',
        'INVENTORY_MISSING', 'MISSING_IMAGES', 'DUPLICATE_SKU', 'DUPLICATE_UPC',
      ];
      return allowed.includes(notification.type);
    }

    if (role === 'integration_manager') {
      const allowed = [
        'FAILED_SYNC', 'FAILED_IMPORT', 'SUPPLIER_CONNECTION_FAILURE', 'API_FAILURE',
        'FTP_FAILURE', 'CRITICAL_SYSTEM_ERROR', 'SUCCESSFUL_SYNC', 'SUPPLIER_OFFLINE',
        'API_ERROR', 'FTP_ERROR', 'SUPPLIER_ADDED', 'SUPPLIER_UPDATED', 'SUPPLIER_ONLINE',
        'SYNC_STARTED', 'SYNC_COMPLETED', 'SFTP_ERROR', 'SOAP_ERROR', 'STORE_CONNECTED',
        'STORE_DISCONNECTED', 'IMPORT_STARTED', 'IMPORT_COMPLETED', 'IMPORT_FAILED',
      ];
      return allowed.includes(notification.type);
    }

    if (role === 'operations_staff') {
      const allowed = [
        'INVENTORY_WARNING', 'INVENTORY_UPDATED', 'INVENTORY_MISSING',
        'VALIDATION_REQUIRED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'VALIDATION_ERROR',
      ];
      return allowed.includes(notification.type);
    }

    return true;
  }

  private static getRBACFilter(roleName?: string): Prisma.NotificationWhereInput {
    if (!roleName) return {};
    const role = roleName.toLowerCase().replace(/ /g, '_');

    if (role === 'platform_owner' || role === 'administrator') return {};

    if (role === 'catalog_manager') {
      return {
        type: {
          in: [
            'NEW_PRODUCT', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
            'VALIDATION_REQUIRED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'VALIDATION_ERROR',
            'PRICE_CHANGE', 'PRICE_MISSING', 'INVENTORY_WARNING', 'INVENTORY_UPDATED',
            'INVENTORY_MISSING', 'MISSING_IMAGES', 'DUPLICATE_SKU', 'DUPLICATE_UPC',
          ],
        },
      };
    }

    if (role === 'integration_manager') {
      return {
        type: {
          in: [
            'FAILED_SYNC', 'FAILED_IMPORT', 'SUPPLIER_CONNECTION_FAILURE', 'API_FAILURE',
            'FTP_FAILURE', 'CRITICAL_SYSTEM_ERROR', 'SUCCESSFUL_SYNC', 'SUPPLIER_OFFLINE',
            'API_ERROR', 'FTP_ERROR', 'SUPPLIER_ADDED', 'SUPPLIER_UPDATED', 'SUPPLIER_ONLINE',
            'SYNC_STARTED', 'SYNC_COMPLETED', 'SFTP_ERROR', 'SOAP_ERROR', 'STORE_CONNECTED',
            'STORE_DISCONNECTED', 'IMPORT_STARTED', 'IMPORT_COMPLETED', 'IMPORT_FAILED',
          ],
        },
      };
    }

    return {};
  }

  // --- Notification Preferences Matrix ---

  static DEFAULT_EVENT_TYPES = [
    { key: 'FAILED_IMPORT', name: 'Failed Imports', defaultEmail: true, defaultInApp: true },
    { key: 'FAILED_SYNC', name: 'Failed Synchronizations', defaultEmail: true, defaultInApp: true },
    { key: 'SUPPLIER_CONNECTION_FAILURE', name: 'Supplier Connection Failures', defaultEmail: true, defaultInApp: true },
    { key: 'API_FAILURE', name: 'API Gateway Failures', defaultEmail: true, defaultInApp: true },
    { key: 'FTP_FAILURE', name: 'FTP / SFTP Transfer Failures', defaultEmail: true, defaultInApp: true },
    { key: 'VALIDATION_ERROR', name: 'Product Validation Errors', defaultEmail: false, defaultInApp: true },
    { key: 'CRITICAL_SYSTEM_ERROR', name: 'Critical System Errors', defaultEmail: true, defaultInApp: true },
    { key: 'SUCCESSFUL_SYNC', name: 'Successful Sync Completion', defaultEmail: false, defaultInApp: true },
  ];

  static async getPreferences(params: { userId?: string; role?: string }) {
    const { userId, role } = params;

    const existing = await prisma.notificationPreference.findMany({
      where: {
        OR: [{ userId: userId || undefined }, { role: role || undefined }],
      },
    });

    const map: Record<string, any> = {};
    existing.forEach((p) => {
      map[p.eventType] = p;
    });

    return this.DEFAULT_EVENT_TYPES.map((evt) => {
      const saved = map[evt.key];
      return {
        eventType: evt.key,
        name: evt.name,
        emailEnabled: saved ? saved.emailEnabled : evt.defaultEmail,
        inAppEnabled: saved ? saved.inAppEnabled : evt.defaultInApp,
        slackEnabled: saved ? saved.slackEnabled : false,
        teamsEnabled: saved ? saved.teamsEnabled : false,
        smsEnabled: saved ? saved.smsEnabled : false,
      };
    });
  }

  static async updatePreferences(
    params: { userId?: string; role?: string },
    preferences: Array<{
      eventType: string;
      emailEnabled: boolean;
      inAppEnabled: boolean;
      slackEnabled?: boolean;
      teamsEnabled?: boolean;
      smsEnabled?: boolean;
    }>
  ) {
    const { userId, role } = params;

    const results = [];
    for (const pref of preferences) {
      const updated = await prisma.notificationPreference.upsert({
        where: {
          userId_role_eventType: {
            userId: userId || 'default',
            role: role || 'administrator',
            eventType: pref.eventType,
          },
        },
        update: {
          emailEnabled: pref.emailEnabled,
          inAppEnabled: pref.inAppEnabled,
          slackEnabled: pref.slackEnabled || false,
          teamsEnabled: pref.teamsEnabled || false,
          smsEnabled: pref.smsEnabled || false,
        },
        create: {
          userId: userId || 'default',
          role: role || 'administrator',
          eventType: pref.eventType,
          emailEnabled: pref.emailEnabled,
          inAppEnabled: pref.inAppEnabled,
          slackEnabled: pref.slackEnabled || false,
          teamsEnabled: pref.teamsEnabled || false,
          smsEnabled: pref.smsEnabled || false,
        },
      });
      results.push(updated);
    }
    return results;
  }

  // --- Core CRUD & Event Dispatcher ---

  static async getNotifications(params: {
    userId?: string;
    roleName?: string;
    page: number;
    limit: number;
    search?: string;
    filterType?: string;
    severity?: string;
    unreadOnly?: boolean;
  }) {
    const { roleName, page, limit, search, filterType, severity, unreadOnly } = params;
    const rbacFilter = this.getRBACFilter(roleName);

    const where: Prisma.NotificationWhereInput = {
      AND: [rbacFilter],
    };

    if (search) {
      where.AND = [
        ...(where.AND as Prisma.NotificationWhereInput[]),
        {
          OR: [
            { title: { contains: search } },
            { message: { contains: search } },
            { module: { contains: search } },
          ],
        },
      ];
    }

    if (filterType && filterType !== 'all') {
      where.type = filterType as NotificationType;
    }

    if (severity && severity !== 'all') {
      where.severity = severity as Severity;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUnreadCount(params: { userId?: string; roleName?: string }) {
    const { roleName } = params;
    const rbacFilter = this.getRBACFilter(roleName);

    return prisma.notification.count({
      where: {
        AND: [rbacFilter],
        isRead: false,
      },
    });
  }

  static async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  static async markAllRead() {
    return prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  static async deleteNotification(id: string) {
    return prisma.notification.delete({
      where: { id },
    });
  }

  static async createNotification(data: {
    title: string;
    message: string;
    type: NotificationType;
    severity: Severity;
    module?: string;
    referenceId?: string;
    actionUrl?: string;
    metadata?: string;
  }) {
    // 1. Create In-App Notification
    const notification = await prisma.notification.create({
      data,
    });

    // 2. Broadcast via Real-time SSE
    this.broadcast(notification);

    // 3. Dispatch Email Alert if Email is enabled for this event type
    try {
      const pref = await prisma.notificationPreference.findFirst({
        where: { eventType: String(data.type) },
      });

      const emailEnabled = pref ? pref.emailEnabled : true; // Default to true for critical events

      if (emailEnabled) {
        // Trigger Email Notification
        EmailService.sendEmail({
          to: 'admin@supplybridge.io',
          subject: `[${data.severity}] ${data.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: ${data.severity === 'CRITICAL' ? '#dc2626' : '#4f46e5'}; font-size: 18px;">
                ${data.title}
              </h2>
              <p style="color: #475569; font-size: 14px;">${data.message}</p>
              <div style="margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b;">
                <strong>Module:</strong> ${data.module || 'System'}<br/>
                <strong>Severity:</strong> ${data.severity}<br/>
                <strong>Timestamp:</strong> ${new Date().toLocaleString()}
              </div>
            </div>
          `,
        }).catch((err) => console.error('Email dispatch error:', err));
      }
    } catch (err) {
      console.error('Error checking notification preferences for email dispatch:', err);
    }

    return notification;
  }

  // --- Automated Helper Triggers for System Events ---

  static async triggerEvent(
    type: NotificationType,
    title: string,
    message: string,
    severity: Severity = Severity.INFO,
    metadata?: any
  ) {
    return this.createNotification({
      title,
      message,
      type,
      severity,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }

  static async triggerSupplierOffline(supplierName: string) {
    return this.triggerSupplierConnectionFailure(supplierName, 'API/FTP Endpoint', 'Supplier server offline');
  }

  static async triggerApiError(apiName: string, errorMessage: string) {
    return this.triggerApiFailure(apiName, 500, errorMessage);
  }

  static async triggerFtpError(ftpHost: string, errorDetails: string) {
    return this.triggerFtpFailure(ftpHost, 'feed.csv', errorDetails);
  }

  static async triggerInventoryWarning(productName: string, sku: string, currentStock: number) {
    return this.triggerEvent(
      'INVENTORY_WARNING' as NotificationType,
      `Low Stock Warning: ${productName}`,
      `Inventory level for SKU ${sku} dropped to ${currentStock}.`,
      Severity.WARNING,
      { productName, sku, currentStock }
    );
  }

  static async triggerNewProduct(supplierName: string, count: number) {
    return this.triggerEvent(
      'NEW_PRODUCT' as NotificationType,
      `New Products Added: ${supplierName}`,
      `${count} new catalog items imported from supplier ${supplierName}.`,
      Severity.INFO,
      { supplierName, count }
    );
  }

  static async triggerPriceChange(supplierName: string, productName: string, oldPrice: number, newPrice: number) {
    return this.triggerEvent(
      'PRICE_CHANGE' as NotificationType,
      `Price Change: ${productName}`,
      `Supplier ${supplierName} updated price for ${productName} from $${oldPrice} to $${newPrice}.`,
      Severity.INFO,
      { supplierName, productName, oldPrice, newPrice }
    );
  }

  static async triggerValidationRequired(details: string) {
    return this.triggerEvent(
      'VALIDATION_REQUIRED' as NotificationType,
      'Catalog Validation Required',
      details,
      Severity.WARNING,
      { details }
    );
  }

  static async triggerFailedImport(filename: string, reason: string, recordCount: number) {
    return this.triggerEvent(
      'FAILED_IMPORT' as NotificationType,
      `Import Failed: ${filename}`,
      `Catalog import failed for ${filename}. ${recordCount} records affected. Reason: ${reason}`,
      Severity.CRITICAL,
      { filename, reason, recordCount, retryAction: 'IMPORT_RETRY' }
    );
  }

  static async triggerFailedSync(supplierName: string, time: string, reason: string, retryCount: number = 1) {
    return this.triggerEvent(
      'FAILED_SYNC' as NotificationType,
      `Sync Failed: ${supplierName}`,
      `Synchronization with supplier ${supplierName} failed at ${time}. Attempt #${retryCount}. Reason: ${reason}`,
      Severity.CRITICAL,
      { supplierName, time, reason, retryCount, retryAction: 'SYNC_RETRY' }
    );
  }

  static async triggerSupplierConnectionFailure(supplierName: string, endpoint: string, errorDetails: string) {
    return this.triggerEvent(
      'SUPPLIER_CONNECTION_FAILURE' as NotificationType,
      `Supplier Offline: ${supplierName}`,
      `Connection drop detected for supplier ${supplierName} at endpoint ${endpoint}. ${errorDetails}`,
      Severity.CRITICAL,
      { supplierName, endpoint, errorDetails, retryAction: 'RECONNECT_SUPPLIER' }
    );
  }

  static async triggerApiFailure(apiName: string, statusCode: number, errorMessage: string) {
    return this.triggerEvent(
      'API_FAILURE' as NotificationType,
      `API Gateway Error: ${apiName}`,
      `API endpoint ${apiName} failed with status code ${statusCode}. ${errorMessage}`,
      Severity.ERROR,
      { apiName, statusCode, errorMessage }
    );
  }

  static async triggerFtpFailure(ftpHost: string, filename: string, errorDetails: string) {
    return this.triggerEvent(
      'FTP_FAILURE' as NotificationType,
      `FTP Transfer Failed: ${ftpHost}`,
      `Failed to transfer ${filename} via SFTP host ${ftpHost}. ${errorDetails}`,
      Severity.ERROR,
      { ftpHost, filename, errorDetails, retryAction: 'FTP_RETRY' }
    );
  }

  static async triggerValidationError(productSku: string, missingFields: string[]) {
    return this.triggerEvent(
      'VALIDATION_ERROR' as NotificationType,
      `Validation Error: Product SKU ${productSku}`,
      `Product validation failed for SKU ${productSku}. Missing mandatory fields: ${missingFields.join(', ')}`,
      Severity.WARNING,
      { productSku, missingFields, openProductAction: true }
    );
  }

  static async triggerCriticalSystemError(component: string, errorMsg: string, stackTrace?: string) {
    return this.triggerEvent(
      'CRITICAL_SYSTEM_ERROR' as NotificationType,
      `Critical System Error in ${component}`,
      `A critical system exception occurred in ${component}: ${errorMsg}`,
      Severity.CRITICAL,
      { component, errorMsg, stackTrace }
    );
  }

  static async triggerSuccessfulSync(supplierName: string, itemApproved: number, durationSeconds: number) {
    return this.triggerEvent(
      'SUCCESSFUL_SYNC' as NotificationType,
      `Sync Completed: ${supplierName}`,
      `Successfully synchronized ${itemApproved} catalog items from ${supplierName} in ${durationSeconds}s.`,
      Severity.INFO,
      { supplierName, itemApproved, durationSeconds }
    );
  }
}
