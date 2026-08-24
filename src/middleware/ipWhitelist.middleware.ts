import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const checkIpWhitelist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if IP whitelisting is enabled in settings
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ipWhitelistingEnabled' },
    });

    if (setting?.value !== 'true') {
      return next();
    }

    const clientIp = (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    ).trim();

    // Always allow localhost IPs for dev
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
      return next();
    }

    const matchedIp = await prisma.ipWhitelist.findFirst({
      where: {
        ipAddress: clientIp,
        status: 'active',
      },
    });

    if (!matchedIp) {
      return res.status(403).json({
        error: `IP address ${clientIp} is not authorized by platform IP Whitelist rules.`,
        clientIp,
      });
    }

    next();
  } catch (error) {
    console.error('IP Whitelist check error:', error);
    next();
  }
};
