import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getBrands = async (req: Request, res: Response) => {
  try {
    const rawBrands = await prisma.brand.findMany({
      include: { products: true }
    });

    const data = rawBrands.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.name.toLowerCase().replace(/ /g, '-'),
      logo: b.logo || undefined,
      description: b.description || '',
      productCount: b.products?.length || 0,
      status: b.status === 'active' ? 'active' : 'inactive',
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Brands' });
  }
};

export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, status, logo } = req.body;
    const newBrand = await prisma.brand.create({ 
      data: {
        name,
        description,
        status,
        logo
      }
    });
    res.status(201).json(newBrand);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Brand' });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, status, logo } = req.body;
    const updated = await prisma.brand.update({
      where: { id },
      data: { name, description, status, logo }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Brand' });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for associated products
    const productCount = await prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `This brand is currently used by ${productCount} products and cannot be deleted.` });
    }

    await prisma.brand.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Brand' });
  }
};
