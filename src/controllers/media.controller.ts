import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function formatMedia(m: any) {
  return {
    id: m.id,
    name: m.filename || 'Unnamed Media',
    sku: m.folder || 'SKU-' + m.id.substring(0, 4).toUpperCase(),
    type: m.type || 'Image (PNG)',
    imageUrl: m.url || 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&auto=format&fit=crop&q=80',
    status: 'active'
  };
}

export const getMedia = async (req: Request, res: Response) => {
  try {
    const rawMedia = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rawMedia.map(formatMedia));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Media' });
  }
};

export const createMedia = async (req: Request, res: Response) => {
  try {
    const { name, imageUrl, sku, type } = req.body;
    const newMedia = await prisma.media.create({
      data: {
        url: imageUrl || 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&auto=format&fit=crop&q=80',
        filename: name || 'Product Image',
        type: type || 'Image (PNG)',
        folder: sku || 'GENERAL',
        size: 1024
      }
    });
    res.status(201).json(formatMedia(newMedia));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Media' });
  }
};

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    const newMedia = await prisma.media.create({
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        type: req.file.mimetype,
        folder: 'UPLOADS',
        size: req.file.size
      }
    });

    res.status(201).json(formatMedia(newMedia));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload Media' });
  }
};

export const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, sku, type } = req.body;
    const updated = await prisma.media.update({
      where: { id },
      data: {
        filename: name !== undefined ? name : undefined,
        url: imageUrl !== undefined ? imageUrl : undefined,
        folder: sku !== undefined ? sku : undefined,
        type: type !== undefined ? type : undefined,
      }
    });
    res.json(formatMedia(updated));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Media' });
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.media.delete({ where: { id } });
    res.json({ success: true, message: 'Media asset deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Media' });
  }
};
