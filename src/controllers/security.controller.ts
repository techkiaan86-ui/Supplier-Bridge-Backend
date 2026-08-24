import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generateBase32Secret, generateTotpAuthUrl, verifyTotpToken } from '../utils/totp';
import { logAudit } from '../utils/auditLogger';

// ==========================================
// 1. Two-Factor Authentication (2FA) APIs
// ==========================================

export const setup2FA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email || 'admin@supplybridge.io';

    const secret = generateBase32Secret();
    const qrCodeUrl = generateTotpAuthUrl(userEmail, secret, 'SupplyBridge PIM');

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret },
      });
    }

    res.json({
      message: '2FA setup initiated',
      secret,
      qrCodeUrl,
      otpauthUrl: qrCodeUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to setup 2FA' });
  }
};

export const verify2FA = async (req: Request, res: Response) => {
  try {
    const { token, secret } = req.body;
    const userId = req.user?.id;

    let totpSecret = secret;
    if (!totpSecret && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      totpSecret = user?.twoFactorSecret;
    }

    if (!totpSecret) {
      return res.status(400).json({ error: '2FA secret not found. Please setup 2FA first.' });
    }

    const isValid = verifyTotpToken(totpSecret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code' });
    }

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: true },
      });
    }

    await logAudit({
      userId,
      action: '2FA_ENABLED',
      details: 'User enabled Two-Factor Authentication (TOTP)',
      ipAddress: req.ip,
    });

    res.json({ message: 'Two-Factor Authentication verified and enabled successfully!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to verify 2FA' });
  }
};

export const disable2FA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: false, twoFactorSecret: null },
      });
    }
    res.json({ message: '2FA disabled successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to disable 2FA' });
  }
};

// ==========================================
// 2. IP Whitelisting APIs
// ==========================================

export const getIpWhitelist = async (req: Request, res: Response) => {
  try {
    const list = await prisma.ipWhitelist.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const isEnabledSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ipWhitelistingEnabled' },
    });

    res.json({
      enabled: isEnabledSetting?.value === 'true',
      ips: list,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch IP Whitelist' });
  }
};

export const addIpWhitelist = async (req: Request, res: Response) => {
  try {
    const { ipAddress, description } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP Address is required' });
    }

    const newIp = await prisma.ipWhitelist.create({
      data: {
        ipAddress: ipAddress.trim(),
        description: description || 'Allowed platform IP',
        status: 'active',
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'IP_WHITELIST_ADD',
      details: `Added IP ${ipAddress} to whitelist`,
      newData: newIp,
      ipAddress: req.ip,
    });

    res.status(201).json(newIp);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add IP to whitelist' });
  }
};

export const deleteIpWhitelist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.ipWhitelist.delete({ where: { id } });
    res.json({ message: 'IP address removed from whitelist' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete IP whitelist entry' });
  }
};

// ==========================================
// 3. Audit Logs APIs (Before vs After Diff)
// ==========================================

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, action } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { action: { contains: String(search) } },
        { details: { contains: String(search) } },
        { ipAddress: { contains: String(search) } },
      ];
    }
    if (action) {
      where.action = String(action);
    }

    const total = await prisma.activityLog.count({ where });
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
};
