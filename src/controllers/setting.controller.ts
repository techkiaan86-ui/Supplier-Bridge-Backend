import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service';
import { logAudit } from '../utils/auditLogger';

const prisma = new PrismaClient();

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settingsList = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      platformName: settingsMap['platformName'] || 'SupplyBridge Enterprise PIM',
      currency: settingsMap['currency'] || 'USD',
      timezone: settingsMap['timezone'] || 'UTC',
      dateFormat: settingsMap['dateFormat'] || 'MM/DD/YYYY',
      maintenanceMode: settingsMap['maintenanceMode'] === 'true',
      maintenanceMessage: settingsMap['maintenanceMessage'] || '',
      apiKey: settingsMap['apiKey'] || 'sb_live_k3y_99482710384',
      ftpHost: settingsMap['ftpHost'] || 'ftp.supplybridge.io',
      ftpMaxConnections: settingsMap['ftpMaxConnections'] || '10',
      ftpTimeout: settingsMap['ftpTimeout'] || '60',
      ftpMaxSize: settingsMap['ftpMaxSize'] || '500',
      ftpPassive: settingsMap['ftpPassive'] !== 'false',
      ftpSsl: settingsMap['ftpSsl'] !== 'false',
      cronSchedule: settingsMap['cronSchedule'] || '0 * * * *',
      smtpEmail: settingsMap['smtpEmail'] || 'notifications@supplybridge.io',
      securityMfa: settingsMap['securityMfa'] !== 'false',
      emailProvider: settingsMap['emailProvider'] || 'SMTP',
      smtpHost: settingsMap['smtpHost'] || 'smtp.sendgrid.net',
      smtpPort: settingsMap['smtpPort'] || '587',
      smtpUsername: settingsMap['smtpUsername'] || 'apikey',
      sessionTimeoutMinutes: settingsMap['sessionTimeoutMinutes'] || '30',
      passwordExpiryDays: settingsMap['passwordExpiryDays'] || '90',
      ipWhitelistingEnabled: settingsMap['ipWhitelistingEnabled'] === 'true',
      inventorySyncSchedule: settingsMap['inventorySyncSchedule'] || 'Every 6 hours',
      pricingSyncSchedule: settingsMap['pricingSyncSchedule'] || 'Every 12 hours',
      imageSyncSchedule: settingsMap['imageSyncSchedule'] || 'Daily at midnight',
      storefrontMedSyncSchedule: settingsMap['storefrontMedSyncSchedule'] || 'Every 12 hours',
      storefrontUnlSyncSchedule: settingsMap['storefrontUnlSyncSchedule'] || 'Every 6 hours',
      fullCatalogSyncSchedule: settingsMap['fullCatalogSyncSchedule'] || 'Weekly (Sunday 02:00)',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch system settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settingsData = req.body;
    
    // Fetch old settings for audit log
    const oldSettingsList = await prisma.systemSetting.findMany({
      where: { key: { in: Object.keys(settingsData) } }
    });
    const oldSettings: Record<string, string> = {};
    oldSettingsList.forEach(s => { oldSettings[s.key] = s.value; });

    const newSettings: Record<string, string> = {};
    let hasChanges = false;

    for (const [key, value] of Object.entries(settingsData)) {
      const valStr = typeof value === 'boolean' ? String(value) : String(value || '');
      
      if (oldSettings[key] !== valStr) {
        hasChanges = true;
      }
      newSettings[key] = valStr;

      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: valStr },
        create: { key, value: valStr },
      });
    }

    if (hasChanges) {
      await logAudit({
        userId: req.user?.id,
        action: 'SETTINGS_UPDATED',
        details: 'System settings were updated',
        oldData: JSON.stringify(oldSettings),
        newData: JSON.stringify(newSettings),
        ipAddress: req.ip,
      });
    }

    res.json({ message: 'Settings saved successfully', settings: settingsData });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update system settings' });
  }
};

export const sendTestEmailController = async (req: Request, res: Response) => {
  try {
    const { targetEmail } = req.body;
    const email = targetEmail || req.user?.email || 'admin@supplybridge.io';

    const result = await EmailService.sendTestEmail(email);
    if (result.success) {
      res.json({ message: `Test email sent successfully to ${email}`, result });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send test email' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
};
