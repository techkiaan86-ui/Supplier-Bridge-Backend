import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCategorys = async (req: Request, res: Response) => {
  try {
    const rawCategories = await prisma.category.findMany({
      include: { products: true }
    });

    const data = rawCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId || undefined,
      description: c.seoDescription || '',
      productCount: c.products?.length || 0,
      status: c.status === 'active' ? 'active' : 'inactive',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, parentId, description, status } = req.body;
    const newCategory = await prisma.category.create({ 
      data: {
        name,
        slug,
        parentId: parentId || null,
        seoDescription: description,
        status
      }
    });
    res.status(201).json(newCategory);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, parentId, description, status } = req.body;
    const updated = await prisma.category.update({
      where: { id },
      data: { name, slug, parentId: parentId || null, seoDescription: description, status }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for associated products
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `This category is currently used by ${productCount} products and cannot be deleted.` });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Category' });
  }
};
