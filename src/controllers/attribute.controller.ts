import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAttributes = async (req: Request, res: Response) => {
  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const data = attributes.map(a => ({
      id: a.id,
      name: a.name,
      group: a.group || '',
      type: a.type,
      values: a.dynamicValues ? JSON.parse(a.dynamicValues) : [],
      productCount: 0,
      createdAt: a.createdAt.toISOString()
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Attributes' });
  }
};

export const createAttribute = async (req: Request, res: Response) => {
  try {
    const { name, group, type, values } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const created = await prisma.attribute.create({
      data: {
        name,
        group: group || null,
        type: type || 'text',
        dynamicValues: values ? JSON.stringify(values) : null
      }
    });

    res.status(201).json({
      id: created.id,
      name: created.name,
      group: created.group || '',
      type: created.type,
      values: created.dynamicValues ? JSON.parse(created.dynamicValues) : [],
      productCount: 0,
      createdAt: created.createdAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Attribute' });
  }
};

export const updateAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, group, type, values } = req.body;

    const updated = await prisma.attribute.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(group !== undefined && { group }),
        ...(type !== undefined && { type }),
        ...(values !== undefined && { dynamicValues: JSON.stringify(values) })
      }
    });

    res.json({
      id: updated.id,
      name: updated.name,
      group: updated.group || '',
      type: updated.type,
      values: updated.dynamicValues ? JSON.parse(updated.dynamicValues) : [],
      productCount: 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Attribute' });
  }
};

export const deleteAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.attribute.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Attribute' });
  }
};
