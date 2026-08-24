import prisma from './prisma';

export interface AuditLogOptions {
  userId?: string;
  action: string;
  details?: string;
  entityType?: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}

export async function logAudit({
  userId,
  action,
  details,
  entityType,
  entityId,
  oldData,
  newData,
  ipAddress,
}: AuditLogOptions) {
  try {
    const oldStr = oldData ? (typeof oldData === 'string' ? oldData : JSON.stringify(oldData)) : null;
    const newStr = newData ? (typeof newData === 'string' ? newData : JSON.stringify(newData)) : null;

    return await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details || `${action} performed`,
        entityType,
        entityId,
        oldData: oldStr,
        newData: newStr,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
}
