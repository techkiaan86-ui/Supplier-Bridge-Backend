import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { verifyAccessToken } from '../utils/jwt';

export const checkMaintenanceMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fullUrl = (req.originalUrl || req.url || req.path || '').toLowerCase();

    // Always allow Auth & Settings endpoints so Admin can log in, view, and save settings
    if (fullUrl.includes('/auth') || fullUrl.includes('/settings')) {
      return next();
    }

    // 1. Fetch Maintenance Mode setting from database
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'maintenanceMode' },
    });

    const isMaintenanceOn = setting?.value === 'true';

    // If Maintenance Mode is OFF, proceed normally
    if (!isMaintenanceOn) {
      return next();
    }

    // 2. Check if user is authenticated and is an Admin / Platform Owner
    let user = req.user;

    if (!user) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
      } else if (req.query?.token) {
        token = req.query.token as string;
      }

      if (token) {
        try {
          const decoded = verifyAccessToken(token);
          if (decoded?.id) {
            user = await prisma.user.findUnique({
              where: { id: decoded.id },
              include: { role: true },
            });
            if (user) {
              req.user = user;
            }
          }
        } catch (err) {
          // Token verification failed
        }
      }
    }

    const headerRole = (req.headers['x-user-role'] as string) || '';
    const roleName = user?.role?.name || headerRole || '';
    const isAdmin =
      roleName === 'Platform Owner' ||
      roleName === 'Admin' ||
      roleName === 'Administrator' ||
      roleName === 'Super Admin' ||
      roleName === 'platform_owner' ||
      roleName === 'administrator';

    if (isAdmin) {
      // Admins bypass maintenance mode
      return next();
    }

    // Non-admin user or unauthenticated request blocked with 503
    return res.status(503).json({
      error: 'System is currently under maintenance. Access is restricted to administrators.',
      maintenanceMode: true,
    });
  } catch (error) {
    // On unexpected error, do not break system access
    console.error('Maintenance middleware error:', error);
    next();
  }
};
