import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getLogs = async (req: Request, res: Response) => {
  try {
    let activityLogs = await prisma.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    let supplierLogs = await prisma.supplierLog.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });



    const formattedActivity = activityLogs.map(l => ({
      id: l.id,
      timestamp: l.createdAt,
      logType: 'User Activity Logs',
      supplier: 'System',
      store: 'SupplyBridge PIM',
      module: 'System',
      severity: 'Info',
      message: l.action,
      status: 'Success',
      details: l.details || '',
      ip: l.ipAddress || '127.0.0.1',
      userId: l.user?.email || l.userId || 'system',
    }));

    const formattedSupplier = supplierLogs.map(l => ({
      id: l.id,
      timestamp: l.createdAt,
      logType: 'Sync Logs',
      supplier: l.supplier?.name || 'Supplier',
      store: 'Storefront',
      module: 'Catalog',
      severity: l.status === 'error' ? 'Error' : 'Info',
      message: l.action,
      status: l.status === 'error' ? 'Failed' : 'Success',
      details: l.details || '',
      ip: '127.0.0.1',
      userId: 'system_daemon',
    }));

    const allLogs = [...formattedActivity, ...formattedSupplier].sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json(allLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
};

export const createLog = async (req: Request, res: Response) => {
  try {
    const { action, details } = req.body;
    const newLog = await prisma.activityLog.create({
      data: {
        action: action || 'System Event Triggered',
        details: details || null,
        ipAddress: req.ip || '127.0.0.1',
      }
    });
    res.status(201).json(newLog);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create log entry' });
  }
};

export const clearLogs = async (req: Request, res: Response) => {
  try {
    await prisma.activityLog.deleteMany();
    await prisma.supplierLog.deleteMany();
    res.json({ message: 'All system logs cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear logs' });
  }
};
