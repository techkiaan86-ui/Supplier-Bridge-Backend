import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getVariants = async (req: Request, res: Response) => {
  try {
    const rawVariants = await prisma.variant.findMany({
      where: {
        sku: { startsWith: 'VARTYPE_' }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = rawVariants.map(v => ({
      id: v.id,
      name: v.color || 'Unnamed',
      values: v.dynamicOptions ? JSON.parse(v.dynamicOptions) : [],
      productCount: 0,
      createdAt: v.createdAt.toISOString()
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Variants' });
  }
};

export const createVariant = async (req: Request, res: Response) => {
  try {
    const { name, values } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Ensure a dummy system product exists to satisfy the foreign key constraint
    let systemProduct = await prisma.product.findFirst({
      where: { sku: 'SYSTEM_VARIANTS_HOLDER' }
    });

    if (!systemProduct) {
      systemProduct = await prisma.product.create({
        data: {
          sku: 'SYSTEM_VARIANTS_HOLDER',
          title: 'System Variants Holder',
          status: 'archived'
        }
      });
    }

    const created = await prisma.variant.create({
      data: {
        productId: systemProduct.id,
        sku: `VARTYPE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        color: name,
        dynamicOptions: JSON.stringify(values || [])
      }
    });

    res.status(201).json({
      id: created.id,
      name: created.color,
      values: created.dynamicOptions ? JSON.parse(created.dynamicOptions) : [],
      productCount: 0,
      createdAt: created.createdAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Variant' });
  }
};

export const updateVariant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, values } = req.body;

    const updated = await prisma.variant.update({
      where: { id },
      data: {
        ...(name !== undefined && { color: name }),
        ...(values !== undefined && { dynamicOptions: JSON.stringify(values) })
      }
    });

    res.json({
      id: updated.id,
      name: updated.color,
      values: updated.dynamicOptions ? JSON.parse(updated.dynamicOptions) : [],
      productCount: 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Variant' });
  }
};

export const deleteVariant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.variant.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Variant' });
  }
};

