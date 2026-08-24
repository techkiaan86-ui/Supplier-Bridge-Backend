import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReportsData = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { products: true, connections: true }
    });

    const supplierData = suppliers.map((s) => ({
      name: s.name,
      type: s.connections?.[0]?.type?.toUpperCase() || 'UNKNOWN',
      products: s.products?.length || 0,
      synced: s.products?.length || 0,
      errors: 0,
      passRate: 100,
      uptime: '100%',
    }));

    const categories = await prisma.category.findMany({
      include: { products: true }
    });

    const catalogPie = categories.map(c => ({
      name: c.name,
      value: c.products?.length || 0,
    })).filter(c => c.value > 0);

    const validationLogs = await prisma.validationLog.findMany();
    const openErrors = validationLogs.filter(v => v.status === 'open').length;
    const resolvedErrors = validationLogs.filter(v => v.status === 'resolved').length;

    const validationErrorsPie = openErrors > 0
      ? [{ name: 'Open Issues', value: openErrors }]
      : [{ name: 'Clean Catalog', value: 100 }];

    const syncJobs = await prisma.jobLog.findMany({ take: 6, orderBy: { createdAt: 'desc' } });
    const syncTrend = syncJobs.map((j, idx) => ({
      month: `Run ${idx + 1}`,
      success: j.status === 'completed' ? 100 : 0,
      failed: j.status === 'failed' ? 100 : 0,
      durationMin: 1,
    }));

    // Price changes from PricingAudit table
    const priceAudits = (prisma as any).pricingAudit ? await (prisma as any).pricingAudit.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }) : [];
    
    const priceChanges = priceAudits.map((pa: any) => ({
      sku: pa.sku || 'N/A',
      name: pa.name || `Price Revision #${pa.id.slice(0, 6)}`,
      supplier: pa.supplier || 'N/A',
      oldPrice: pa.oldPrice != null ? `$${pa.oldPrice}` : '$0.00',
      newPrice: pa.newPrice != null ? `$${pa.newPrice}` : '$0.00',
      change: pa.newPrice > pa.oldPrice ? `+$${(pa.newPrice - pa.oldPrice).toFixed(2)}` : `-$${((pa.oldPrice || 0) - (pa.newPrice || 0)).toFixed(2)}`,
      date: new Date(pa.createdAt).toLocaleString(),
    }));

    // Inventory changes from Inventory table
    const invRecords = await prisma.inventory.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { product: true }
    });
    const inventoryChanges = invRecords.map(inv => ({
      sku: inv.product?.sku || 'UNKNOWN',
      name: inv.product?.title || 'Unknown Product',
      supplier: 'Primary Supplier',
      oldStock: 0,
      newStock: inv.quantity,
      change: `${inv.quantity} units`,
      date: new Date(inv.updatedAt).toLocaleString(),
    }));

    // New products from Product table
    const newProds = await prisma.product.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { category: true, supplier: true, prices: true }
    });
    const newProducts = newProds.map(p => ({
      sku: p.sku,
      name: p.title,
      category: p.category?.name || 'Uncategorized',
      supplier: p.supplier?.name || 'Direct Supplier',
      price: `$${p.prices?.[0]?.price || 0}`,
      added: new Date(p.createdAt).toLocaleString(),
    }));

    // Publishing activity from Store table
    const stores = await prisma.store.findMany();
    const publishingActivity = stores.map(s => ({
      sku: 'ALL-CATALOG',
      name: `Full Catalog Sync (${s.name})`,
      store: s.name,
      status: 'Published',
      date: new Date().toLocaleString(),
    }));

    const totalProductsCount = await prisma.product.count();
    const totalValidationCount = validationLogs.length;
    const passRate = totalValidationCount > 0
      ? ((resolvedErrors / totalValidationCount) * 100).toFixed(1)
      : '100.0';

    res.json({
      supplierData,
      catalogPie,
      validationErrorsPie,
      syncTrend,
      priceChanges,
      inventoryChanges,
      newProducts,
      publishingActivity,
      summaryStats: {
        totalSuppliers: suppliers.length,
        totalProducts: totalProductsCount,
        totalCategories: categories.length,
        totalValidationIssues: openErrors,
        resolvedValidationCount: resolvedErrors,
        pendingValidationCount: openErrors,
        passRate: `${passRate}%`,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
};
