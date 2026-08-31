import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getCachedOrFetch } from '../services/redis.service';

const prisma = new PrismaClient();

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const fetchMetrics = async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const [
        totalUsers,
        activeUsers,
        totalSuppliers,
        connectedSuppliersCount,
        totalStores,
        connectedStores,
        totalProducts,
        activeProducts,
        publishedProducts,
        missingImages,
        missingCategories,
        missingPricing,
        duplicateProducts,
        productsImportedToday,
        productsReadyToPublish,
        productsAwaitingReview,
        runningJobs,
        waitingJobs,
        failedJobs,
        completedJobs,
        suppliersAddedThisWeek,
        pendingValidationCount,
        storesList,
        supplierSyncLogs,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'active' } }),
        prisma.supplier.count({ where: { deletedAt: null } }),
        prisma.supplierConnection.count({ where: { status: 'connected' } }),
        prisma.store.count(),
        prisma.store.count({ where: { connectionStatus: { in: ['connected', 'active'] } } }),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.product.count({ where: { status: { not: 'archived' }, deletedAt: null } }),
        prisma.product.count({ where: { status: 'published', deletedAt: null } }),
        prisma.product.count({ where: { images: { none: {} }, deletedAt: null } }),
        prisma.product.count({ where: { categoryId: null, deletedAt: null } }),
        prisma.product.count({ where: { prices: { none: {} }, deletedAt: null } }),
        prisma.validationLog.count({ where: { issue: { contains: 'Duplicate' }, status: 'open' } }),
        prisma.product.count({ where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null } }),
        prisma.product.count({ where: { status: 'ready', deletedAt: null } }),
        prisma.product.count({ where: { status: 'draft', deletedAt: null } }),
        prisma.jobLog.count({ where: { status: 'running' } }),
        prisma.jobLog.count({ where: { status: 'pending' } }),
        prisma.jobLog.count({ where: { status: 'failed' } }),
        prisma.jobLog.count({ where: { status: 'completed' } }),
        prisma.supplier.count({ where: { createdAt: { gte: weekStart }, deletedAt: null } }),
        prisma.validationLog.count({ where: { status: 'open' } }),
        prisma.store.findMany({ select: { id: true, name: true, connectionStatus: true, syncStatus: true, lastSync: true } }),
        prisma.supplierSync.findMany({ take: 3, orderBy: { createdAt: 'desc' } }),
      ]);

      const connectedSuppliers = connectedSuppliersCount > 0 
        ? connectedSuppliersCount 
        : await prisma.supplier.count({ where: { status: 'active', deletedAt: null } });

      // Calculate Sync Chart Data (Last 7 days) with REAL DATA ONLY (No Math.random!)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        
        const imported = await prisma.product.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd }, deletedAt: null }
        });
        const failed = await prisma.jobLog.count({
          where: { status: 'failed', createdAt: { gte: dayStart, lte: dayEnd } }
        });
        const updated = await prisma.product.count({
          where: { updatedAt: { gte: dayStart, lte: dayEnd }, createdAt: { lt: dayStart }, deletedAt: null }
        });
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        chartData.push({
          name: i === 0 ? 'Today' : days[d.getDay()],
          imported,
          failed,
          updated,
        });
      }

      // Calculate Supplier Distribution
      const supplierProductCounts = await prisma.product.groupBy({
        by: ['supplierId'],
        _count: { id: true },
        where: { supplierId: { not: null }, deletedAt: null }
      });
      
      const supplierIds = supplierProductCounts.map(sp => sp.supplierId as string);
      const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } });
      const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
      
      const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];
      const supplierData = supplierProductCounts.map((sp, i) => ({
        name: supplierMap.get(sp.supplierId as string) || 'Unassigned Supplier',
        value: sp._count.id,
        color: colors[i % colors.length]
      }));

      // Calculate Combined Activities from ActivityLog & SupplierLog & JobLog
      const [activityLogs, supplierLogs, jobLogs] = await Promise.all([
        prisma.activityLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: true }
        }),
        prisma.supplierLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { supplier: true }
        }),
        prisma.jobLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const formattedActivities = [
        ...activityLogs.map(l => ({
          id: `act_${l.id}`,
          user: l.user ? l.user.name : 'System User',
          action: l.action,
          target: l.details || l.entityType || 'Platform',
          time: l.createdAt.toISOString(),
          createdAt: l.createdAt,
          type: 'info'
        })),
        ...supplierLogs.map(l => ({
          id: `sup_${l.id}`,
          user: l.supplier ? l.supplier.name : 'Supplier Feed',
          action: l.action,
          target: l.details || 'Sync Task',
          time: l.createdAt.toISOString(),
          createdAt: l.createdAt,
          type: l.status === 'success' ? 'success' : (l.status === 'error' ? 'error' : 'info')
        })),
        ...jobLogs.map(l => ({
          id: `job_${l.id}`,
          user: 'Background Worker',
          action: `Job ${l.queueName}`,
          target: l.status === 'failed' ? (l.error || 'Execution Error') : `Progress ${l.progress}%`,
          time: l.createdAt.toISOString(),
          createdAt: l.createdAt,
          type: l.status === 'completed' ? 'success' : (l.status === 'failed' ? 'error' : 'warning')
        }))
      ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

      // Multi-Store Status array
      const stores = storesList.map(s => ({
        id: s.id,
        label: s.name,
        ok: s.connectionStatus === 'connected' || s.connectionStatus === 'active',
        syncStatus: s.syncStatus,
        lastSync: s.lastSync ? s.lastSync.toISOString() : null
      }));

      // Synchronization Channels status
      const inventorySyncLast = supplierSyncLogs.find(s => s.inventoryStatus)?.createdAt;
      const pricingSyncLast = supplierSyncLogs.find(s => s.pricingStatus)?.createdAt;
      const imageSyncLast = supplierSyncLogs.find(s => s.imageStatus)?.createdAt;

      const formatAgo = (date?: Date) => {
        if (!date) return 'No sync yet';
        const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs} hr ago`;
        return `${Math.floor(diffHrs / 24)} days ago`;
      };

      const syncChannels = [
        { label: 'Inventory Sync', status: failedJobs > 5 ? 'degraded' : 'healthy', last: formatAgo(inventorySyncLast) },
        { label: 'Pricing Sync', status: 'healthy', last: formatAgo(pricingSyncLast) },
        { label: 'Image Sync', status: missingImages > 20 ? 'degraded' : 'healthy', last: formatAgo(imageSyncLast) },
      ];

      return {
        totalUsers,
        activeUsers,
        totalSuppliers,
        disconnectedSuppliers: Math.max(0, totalSuppliers - connectedSuppliers),
        connectedSuppliers,
        suppliersAddedThisWeek,
        totalStores,
        connectedStores,
        totalProducts,
        activeProducts,
        publishedProducts,
        missingImages,
        missingCategories,
        missingPricing,
        duplicateProducts,
        productsImportedToday,
        productsReadyToPublish,
        productsAwaitingReview,
        pendingProducts: pendingValidationCount,
        runningJobs,
        waitingJobs,
        completedJobs,
        failedJobs,
        syncStatus: failedJobs > 0 ? 'Degraded' : 'Optimal',
        lastUpdated: now.toISOString(),
        chartData,
        supplierData,
        activities: formattedActivities,
        stores,
        syncChannels
      };
    };

    // Cache for 3 seconds for fast updates
    const metrics = await getCachedOrFetch('dashboard:platform_owner:stats', fetchMetrics, 3);

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

