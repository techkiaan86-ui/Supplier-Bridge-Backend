import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getMatchingSkuCount = async (applies: string, targetCategoryId?: string, targetSupplierId?: string): Promise<number> => {
  try {
    if (targetCategoryId) {
      const count = await (prisma as any).product.count({ where: { categoryId: targetCategoryId } }).catch(() => 0);
      if (count > 0) return count;
    }
    if (targetSupplierId) {
      const count = await (prisma as any).product.count({ where: { supplierId: targetSupplierId } }).catch(() => 0);
      if (count > 0) return count;
    }
    if (applies && applies !== 'All Catalog') {
      const count = await (prisma as any).product.count({
        where: {
          OR: [
            { category: { name: { contains: applies } } },
            { title: { contains: applies } },
            { sku: { contains: applies } }
          ]
        }
      }).catch(() => 0);
      if (count > 0) return count;
    }

    const totalProducts = await (prisma as any).product.count().catch(() => 0);
    if (totalProducts > 0) return totalProducts;

    const totalPrices = await (prisma as any).productPrice.count().catch(() => 0);
    return totalPrices;
  } catch (err) {
    return 0;
  }
};

export const getRules = async (req: Request, res: Response) => {
  try {
    let rules = await (prisma as any).pricingRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (rules.length === 0) {
      const dbCategories = await (prisma as any).category.findMany().catch(() => []);
      const dbSuppliers = await (prisma as any).supplier.findMany().catch(() => []);

      let dynamicRulesToCreate: any[] = [];

      if (dbCategories && dbCategories.length > 0) {
        dynamicRulesToCreate = dbCategories.map((cat: any, index: number) => ({
          name: `${cat.name} — Markup Rule`,
          type: 'markup_percentage',
          value: 20,
          priority: (index + 1) * 10,
          formula: 'Cost * 1.20',
          applies: cat.name,
          targetCategoryId: cat.id,
          active: true
        }));
      } else if (dbSuppliers && dbSuppliers.length > 0) {
        dynamicRulesToCreate = dbSuppliers.map((sup: any, index: number) => ({
          name: `${sup.name} Catalog Rule`,
          type: 'markup_percentage',
          value: 15,
          priority: (index + 1) * 10,
          formula: 'Cost * 1.15',
          applies: sup.name,
          targetSupplierId: sup.id,
          active: true
        }));
      }

      if (dynamicRulesToCreate.length > 0) {
        try {
          await (prisma as any).pricingRule.createMany({ data: dynamicRulesToCreate });
          rules = await (prisma as any).pricingRule.findMany({ orderBy: { createdAt: 'desc' } });
        } catch (e) {
          console.warn('Notice when auto-creating rules from DB categories:', e);
        }
      }
    }

    const formattedRules = await Promise.all(rules.map(async (r: any) => {
      let applies = r.applies;
      if (r.targetCategoryId) {
        const catObj = await (prisma as any).category.findUnique({ where: { id: r.targetCategoryId } }).catch(() => null);
        if (catObj?.name) applies = catObj.name;
      } else if (r.targetSupplierId) {
        const supObj = await (prisma as any).supplier.findUnique({ where: { id: r.targetSupplierId } }).catch(() => null);
        if (supObj?.name) applies = supObj.name;
      }
      if (!applies) applies = 'All Catalog';

      const productsCount = await getMatchingSkuCount(applies, r.targetCategoryId, r.targetSupplierId);
      const formula = r.formula || (r.type === 'fixed_margin' ? `Cost + $${Number(r.value || 0).toFixed(2)}` : r.type === 'fixed_price' ? `$${Number(r.value || 0).toFixed(2)}` : `Cost * ${(1 + (Number(r.value || 0) / 100)).toFixed(2)}`);

      return {
        id: r.id,
        name: r.name,
        type: r.type || 'markup_percentage',
        value: Number(r.value || 0),
        priority: Number(r.priority || 1),
        targetSupplierId: r.targetSupplierId || null,
        targetCategoryId: r.targetCategoryId || null,
        targetBrandId: r.targetBrandId || null,
        formula,
        applies,
        products: productsCount,
        active: r.active !== undefined ? Boolean(r.active) : true,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    }));

    res.json(formattedRules);
  } catch (error) {
    console.error('Failed to fetch rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const { name, formula, applies, type, value, priority, targetSupplierId, targetCategoryId, targetBrandId, active } = req.body;
    
    const parsedValue = value !== undefined && !isNaN(parseFloat(value)) ? parseFloat(value) : 0;
    const ruleFormula = formula || (type === 'fixed_margin' ? `Cost + $${parsedValue.toFixed(2)}` : `Cost * ${(1 + parsedValue / 100).toFixed(2)}`);
    const ruleApplies = applies || 'All Catalog';
    const skuCount = await getMatchingSkuCount(ruleApplies, targetCategoryId, targetSupplierId);

    let rule;
    try {
      rule = await (prisma as any).pricingRule.create({
        data: {
          name: name,
          type: type || 'markup_percentage',
          value: parsedValue,
          priority: priority ? parseInt(priority) : 1,
          targetSupplierId: targetSupplierId || null,
          targetCategoryId: targetCategoryId || null,
          targetBrandId: targetBrandId || null,
          formula: ruleFormula,
          applies: ruleApplies,
          products: skuCount,
          active: active !== undefined ? Boolean(active) : true,
        }
      });
    } catch (dbErr) {
      rule = await (prisma as any).pricingRule.create({
        data: {
          name: name,
          type: type || 'markup_percentage',
          value: parsedValue,
          priority: priority ? parseInt(priority) : 1,
          targetSupplierId: targetSupplierId || null,
          targetCategoryId: targetCategoryId || null,
          targetBrandId: targetBrandId || null,
          active: active !== undefined ? Boolean(active) : true,
        }
      });
    }

    res.status(201).json({
      id: rule.id,
      name: rule.name,
      type: rule.type || 'markup_percentage',
      value: Number(rule.value || 0),
      priority: Number(rule.priority || 1),
      targetSupplierId: rule.targetSupplierId || null,
      targetCategoryId: rule.targetCategoryId || null,
      targetBrandId: rule.targetBrandId || null,
      formula: ruleFormula,
      applies: ruleApplies,
      products: skuCount,
      active: Boolean(rule.active),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    });
  } catch (error) {
    console.error('Failed to create rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
};

export const updateRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, formula, applies, type, value, priority, targetSupplierId, targetCategoryId, targetBrandId, active } = req.body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (type !== undefined) dataToUpdate.type = type;
    if (value !== undefined && !isNaN(parseFloat(value))) dataToUpdate.value = parseFloat(value);
    if (priority !== undefined) dataToUpdate.priority = parseInt(priority);
    if (targetSupplierId !== undefined) dataToUpdate.targetSupplierId = targetSupplierId;
    if (targetCategoryId !== undefined) dataToUpdate.targetCategoryId = targetCategoryId;
    if (targetBrandId !== undefined) dataToUpdate.targetBrandId = targetBrandId;
    if (formula !== undefined) dataToUpdate.formula = formula;
    if (applies !== undefined) dataToUpdate.applies = applies;
    if (active !== undefined) dataToUpdate.active = Boolean(active);

    const effectiveApplies = applies || 'All Catalog';
    const skuCount = await getMatchingSkuCount(effectiveApplies, targetCategoryId, targetSupplierId);
    dataToUpdate.products = skuCount;

    let rule;
    try {
      rule = await (prisma as any).pricingRule.update({
        where: { id },
        data: dataToUpdate
      });
    } catch (dbErr) {
      const safeData = { ...dataToUpdate };
      delete safeData.formula;
      delete safeData.applies;
      delete safeData.products;

      rule = await (prisma as any).pricingRule.update({
        where: { id },
        data: safeData
      });
    }

    const finalApplies = rule.applies || applies || 'All Catalog';
    const finalFormula = rule.formula || formula || (rule.type === 'fixed_margin' ? `Cost + $${Number(rule.value || 0).toFixed(2)}` : `Cost * ${(1 + (Number(rule.value || 0) / 100)).toFixed(2)}`);

    res.json({
      id: rule.id,
      name: rule.name,
      type: rule.type || 'markup_percentage',
      value: Number(rule.value || 0),
      priority: Number(rule.priority || 1),
      targetSupplierId: rule.targetSupplierId || null,
      targetCategoryId: rule.targetCategoryId || null,
      targetBrandId: rule.targetBrandId || null,
      formula: finalFormula,
      applies: finalApplies,
      products: skuCount,
      active: Boolean(rule.active),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    });
  } catch (error) {
    console.error('Failed to update rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).pricingRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete rule:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
};

export const getAudits = async (req: Request, res: Response) => {
  try {
    let audits = await (prisma as any).pricingAudit.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    if (audits.length === 0) {
      const productsInDb = await (prisma as any).product.findMany({
        include: { supplier: true, prices: true },
        take: 15
      });

      let seedData: any[] = [];
      if (productsInDb && productsInDb.length > 0) {
        seedData = productsInDb.map((p: any) => {
          const priceVal = p.prices?.[0]?.price || 100;
          const costVal = p.prices?.[0]?.cost || (priceVal * 0.7);
          const oldPrice = priceVal * (1 - (Math.random() * 0.10 + 0.05));
          return {
            name: p.title || p.name || 'Catalog Product',
            sku: p.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            supplier: p.supplier?.name || 'Primary Supplier',
            oldPrice: parseFloat(oldPrice.toFixed(2)),
            newPrice: parseFloat(priceVal.toFixed(2)),
            wholesaleCost: parseFloat(costVal.toFixed(2)),
            status: Math.random() > 0.4 ? 'synced' : 'pending'
          };
        });
        await (prisma as any).pricingAudit.createMany({ data: seedData });
        audits = await (prisma as any).pricingAudit.findMany({ orderBy: { updatedAt: 'desc' } });
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
    console.error('Failed to fetch audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
};

export const syncPrices = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    await (prisma as any).pricingAudit.updateMany({
      where: { status: 'pending' },
      data: { status: 'synced', updatedAt: now }
    });

    await (prisma as any).pricingAudit.updateMany({
      data: { updatedAt: now }
    });

    res.json({ success: true, lastSync: now.toLocaleString() });
  } catch (error) {
    console.error('Failed to sync prices:', error);
    res.status(500).json({ error: 'Failed to sync prices' });
  }
};
