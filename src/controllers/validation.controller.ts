import { Request, Response } from 'express';
import { PrismaClient, NotificationType, Severity } from '@prisma/client';
import { runProductValidation } from '../utils/validationEngine';
import { NotificationService } from '../services/notification.service';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// Helper: extract errorType from issue string "[type] msg"
// ─────────────────────────────────────────────────────────
function extractErrorType(issue: string): string {
  const match = issue.match(/^\[([^\]]+)\]/);
  return match ? match[1] : 'unknown';
}

// ─────────────────────────────────────────────────────────
// GET /api/validation
// Returns validation items grouped per product
// Each item = one product with its array of error issues
// ─────────────────────────────────────────────────────────
export const getValidationItems = async (req: Request, res: Response) => {
  try {
    // Fetch all non-resolved validation logs (open + rejected)
    const logs = await prisma.validationLog.findMany({
      where: { entityType: 'Product' },
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) {
      return res.json([]);
    }

    // Collect all unique productIds
    const productIds = [...new Set(logs.map(l => l.entityId))];

    // Fetch product details in bulk
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        supplier: true,
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Group logs by productId
    const grouped = new Map<string, typeof logs>();
    for (const log of logs) {
      if (!grouped.has(log.entityId)) grouped.set(log.entityId, []);
      grouped.get(log.entityId)!.push(log);
    }

    const result = productIds.map(productId => {
      const product = productMap.get(productId);
      const productLogs = grouped.get(productId) || [];

      const openLogs = productLogs.filter(l => l.status === 'open');
      const resolvedLogs = productLogs.filter(l => l.status === 'resolved');
      const rejectedLogs = productLogs.filter(l => l.status === 'rejected');

      // Determine overall status for this product group
      let status: string;
      if (openLogs.length > 0) {
        status = 'pending';
      } else if (rejectedLogs.length > 0 && resolvedLogs.length === 0) {
        status = 'rejected';
      } else if (resolvedLogs.length > 0 && openLogs.length === 0) {
        status = 'approved';
      } else {
        status = 'pending';
      }

      const errors = openLogs.map(l => ({
        id: l.id,
        type: extractErrorType(l.issue),
        message: l.issue.replace(/^\[[^\]]+\]\s*/, ''), // strip [type] prefix
        severity: 'error' as const,
      }));

      return {
        id: productId,
        productName: product?.title || `Product #${productId.slice(0, 8)}`,
        supplierSku: product?.sku || `SKU-${productId.slice(0, 6).toUpperCase()}`,
        supplierName: product?.supplier?.name || 'System',
        status,
        errors,
        warnings: [],
        reviewedBy: null,
        reviewedAt: resolvedLogs[0]?.resolvedAt || null,
        lastCheckedAt: productLogs[0]?.createdAt || new Date(),
        createdAt: product?.createdAt || productLogs[0]?.createdAt || new Date(),
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Validation Items' });
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/validation/run/:productId
// Manually trigger re-validation for a specific product
// ─────────────────────────────────────────────────────────
export const runValidationForProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    await runProductValidation(productId, prisma);
    res.json({ message: `Validation completed for product ${productId}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to trigger validation check' });
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/validation/:productId/resolve
// Approve: mark all open issues for a product as resolved
// ─────────────────────────────────────────────────────────
export const resolveProductValidation = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    // Block approval if there are still open issues
    const openIssues = await prisma.validationLog.findMany({
      where: { entityId: productId, entityType: 'Product', status: 'open' },
    });

    if (openIssues.length > 0) {
      return res.status(400).json({
        error: `Cannot approve — product has ${openIssues.length} unresolved validation issue(s). Fix the issues first.`,
        openIssueCount: openIssues.length,
      });
    }

    await prisma.validationLog.updateMany({
      where: { entityId: productId, entityType: 'Product', status: { not: 'open' } },
      data: { status: 'resolved', resolvedAt: new Date() },
    });

    NotificationService.triggerEvent(
      NotificationType.VALIDATION_PASSED,
      'Validation Approved',
      `Product ${productId} has passed validation and is approved.`,
      Severity.INFO,
      { productId }
    ).catch(console.error);

    res.json({ message: 'Product approved — all validation issues resolved.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to approve product validation' });
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/validation/:productId/reject
// Reject: mark all open issues for a product as rejected
// ─────────────────────────────────────────────────────────
export const rejectProductValidation = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    await prisma.validationLog.updateMany({
      where: { entityId: productId, entityType: 'Product' },
      data: { status: 'rejected' },
    });

    NotificationService.triggerEvent(
      NotificationType.VALIDATION_FAILED,
      'Validation Rejected',
      `Product ${productId} was rejected due to validation failures.`,
      Severity.WARNING,
      { productId }
    ).catch(console.error);

    res.json({ message: 'Product rejected — validation issues marked as rejected.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reject product validation' });
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/validation/:id
// Delete a single validation log entry
// ─────────────────────────────────────────────────────────
export const deleteValidationItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.validationLog.delete({ where: { id } });
    res.json({ message: 'Validation log entry deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete validation log' });
  }
};
