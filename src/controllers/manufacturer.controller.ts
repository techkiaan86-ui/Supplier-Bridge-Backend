import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getManufacturers = async (req: Request, res: Response) => {
  try {
    const rawManufacturers = await prisma.manufacturer.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const data = rawManufacturers.map(m => ({
      id: m.id,
      name: m.company, // mapped to name
      description: m.country || '', // mapped to description
      status: m.status === 'active' ? 'active' : 'inactive',
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Manufacturers' });
  }
};

export const createManufacturer = async (req: Request, res: Response) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Manufacturer name is required' });
    }

    const companyName = name.trim();

    // Check if manufacturer with this name already exists
    const all = await prisma.manufacturer.findMany();
    const existing = all.find(m => m.company.toLowerCase() === companyName.toLowerCase());

    if (existing) {
      return res.status(400).json({ error: `A manufacturer with the name "${companyName}" already exists.` });
    }

    const newManufacturer = await prisma.manufacturer.create({ 
      data: {
        company: companyName,
        country: description ? description.trim() : null,
        status: status || 'active'
      }
    });

    return res.status(201).json({
      id: newManufacturer.id,
      name: newManufacturer.company,
      description: newManufacturer.country || '',
      status: newManufacturer.status === 'active' ? 'active' : 'inactive'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A manufacturer with this name already exists.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to create Manufacturer' });
  }
};

export const updateManufacturer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Manufacturer name is required' });
    }

    const companyName = name.trim();

    // Check if name belongs to another manufacturer
    const all = await prisma.manufacturer.findMany();
    const existing = all.find(m => m.company.toLowerCase() === companyName.toLowerCase() && m.id !== id);

    if (existing) {
      return res.status(400).json({ error: `A manufacturer with the name "${companyName}" already exists.` });
    }

    const updated = await prisma.manufacturer.update({
      where: { id },
      data: { 
        company: companyName, 
        country: description ? description.trim() : null, 
        status: status || 'active'
      }
    });

    return res.json({
      id: updated.id,
      name: updated.company,
      description: updated.country || '',
      status: updated.status === 'active' ? 'active' : 'inactive'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A manufacturer with this name already exists.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to update Manufacturer' });
  }
};

export const deleteManufacturer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for associated products
    const productCount = await prisma.product.count({ where: { manufacturerId: id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `This manufacturer is currently used by ${productCount} products and cannot be deleted.` });
    }

    await prisma.manufacturer.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Manufacturer' });
  }
};


