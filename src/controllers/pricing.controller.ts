import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRules = async (req: Request, res: Response) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const { name, type, value, priority, targetSupplierId, targetCategoryId, targetBrandId, active } = req.body;
    const rule = await prisma.pricingRule.create({
      data: {
        name,
        type,
        value: parseFloat(value),
        priority: priority ? parseInt(priority) : 100,
        targetSupplierId,
        targetCategoryId,
        targetBrandId,
        active: active !== undefined ? active : true,
      }
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rule' });
  }
};

export const updateRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, value, priority, targetSupplierId, targetCategoryId, targetBrandId, active } = req.body;
    
    const rule = await prisma.pricingRule.update({
      where: { id },
      data: {
        name,
        type,
        value: value !== undefined ? parseFloat(value) : undefined,
        priority: priority !== undefined ? parseInt(priority) : undefined,
        targetSupplierId,
        targetCategoryId,
        targetBrandId,
        active
      }
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.pricingRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
};

export const getAudits = async (req: Request, res: Response) => {
  try {
    let audits = await prisma.pricingAudit.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    // Seed dummy audit data if table is empty for demonstration purposes
    if (audits.length === 0) {
      const prices = await prisma.productPrice.findMany({
        include: { product: { include: { supplier: true } } },
        take: 15
      });

      if (prices.length > 0) {
        const seedData = prices.map((pp: any) => {
          const wCost = pp.cost ?? (pp.price * 0.7);
          // Simulate an old price that is different from new price (e.g. 5-15% lower)
          const oldPrice = pp.price * (1 - (Math.random() * 0.10 + 0.05));
          
          return {
            name: pp.product?.title || 'Unknown Product',
            sku: pp.product?.sku || 'Unknown SKU',
            supplier: pp.product?.supplier?.name || 'System Catalog',
            oldPrice: parseFloat(oldPrice.toFixed(2)),
            newPrice: parseFloat(pp.price.toFixed(2)),
            wholesaleCost: parseFloat(wCost.toFixed(2)),
            // Randomly assign some as pending and some as synced
            status: Math.random() > 0.3 ? 'synced' : 'pending'
          };
        });

        await prisma.pricingAudit.createMany({ data: seedData });
        
        audits = await prisma.pricingAudit.findMany({
          orderBy: { updatedAt: 'desc' }
        });
      }
    }

    const formatted = audits.map((a: any) => ({
      id: a.id,
      name: a.name,
      sku: a.sku,
      supplier: a.supplier,
      oldPrice: a.oldPrice,
      newPrice: a.newPrice,
      wholesaleCost: a.wholesaleCost,
      status: a.status,
      lastSync: new Date(a.updatedAt).toLocaleString()
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
};

export const syncPrices = async (req: Request, res: Response) => {
  try {
    // In a real flow, this would push prices to Shopify/Magento etc.
    // For now, we update all 'pending' audits to 'synced' to show the flow
    const result = await prisma.pricingAudit.updateMany({
      where: { status: 'pending' },
      data: { status: 'synced', updatedAt: new Date() }
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync prices' });
  }
};
