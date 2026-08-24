import { Request, Response } from 'express';
import { PrismaClient, NotificationType, Severity } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { syncQueue } from '../services/queue.service';

import { getDynamicStockForSku } from '../utils/stock.util';

const prisma = new PrismaClient();

// --- Sync Jobs (BullMQ / JobLog) ---
export const getSyncJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.jobLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const data = jobs.map(j => {
      const isManual = !j.jobId.includes('scheduled-');
      
      return {
        id: j.id,
        type: j.queueName.toLowerCase() || 'full',
        name: `${j.queueName} Job`,
        status: j.status === 'completed' ? 'completed' : j.status === 'failed' ? 'failed' : 'running',
        progress: j.progress || (j.status === 'completed' ? 100 : 0),
        processedItems: j.status === 'completed' ? 100 : Math.floor(((j.progress || 0) / 100) * 100),
        totalItems: 100, // Normally extracted from job result
        failedItems: j.status === 'failed' ? 1 : 0,
        startedAt: j.createdAt,
        completedAt: j.completedAt || undefined,
        triggeredBy: isManual ? 'Manual Trigger' : 'Automated Pipeline',
        canRetry: j.status === 'failed',
        logs: [j.result || j.error || 'Job is running or executed successfully'],
      };
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Sync Jobs' });
  }
};

export const createSyncJob = async (req: Request, res: Response) => {
  try {
    const { name, type, storeId } = req.body;
    
    if (!storeId) {
      // Find a default store if not provided
      const store = await prisma.store.findFirst();
      if (!store) throw new Error("No connected store found to sync to.");
      req.body.storeId = store.id;
    }

    let jobId = `sync-manual-${Date.now()}`;
    try {
      const job = await syncQueue.add('manual-sync', {
        storeId: req.body.storeId,
        syncType: type || 'FULL',
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });
      jobId = job.id || jobId;
      
      res.status(201).json({
        id: jobId,
        type: type || 'full',
        name: name || 'Manual Catalog Resync',
        status: 'pending',
        progress: 0,
        processedItems: 0,
        totalItems: 0,
        failedItems: 0,
        startedAt: new Date(),
        triggeredBy: 'Manual Trigger',
        canRetry: true,
        logs: ['Job enqueued successfully'],
      });
    } catch (queueError: any) {
      console.warn('Failed to enqueue sync job (Redis might be down):', queueError.message);
      res.status(201).json({
        id: jobId,
        type: type || 'full',
        name: name || 'Manual Catalog Resync',
        status: 'pending',
        progress: 0,
        processedItems: 0,
        totalItems: 0,
        failedItems: 0,
        startedAt: new Date(),
        triggeredBy: 'Manual Trigger',
        canRetry: true,
        logs: ['Job triggered but queue unavailable locally'],
      });
    }

    NotificationService.triggerEvent(
      NotificationType.SYNC_STARTED,
      'Sync Enqueued',
      `${type || 'Full Catalog'} sync was manually enqueued.`,
      Severity.INFO,
      { jobId, type: type || 'full' }
    ).catch(console.error);

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to trigger Sync Job' });
  }
};

// --- Inventory Sync ---
export const getInventorySync = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        supplier: true,
        supplierSources: true,
        inventory: true,
        storeMappings: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    const data = products.map(p => {
      const buffer = 5;
      const srcStock = p.supplierSources?.reduce((sum, s) => sum + (s.inventory || 0), 0) || 0;
      const invQuantity = p.inventory?.[0]?.quantity || 0;
      const rawStock = Math.max(srcStock, invQuantity);
      const supplierStock = getDynamicStockForSku(p.sku, rawStock);
      const storefrontStock = Math.max(0, supplierStock - buffer);

      return {
        id: p.id,
        name: p.title || 'Catalog Item',
        sku: p.sku,
        supplier: p.supplier?.name || 'Cardinal Health At Home',
        supplierStock: supplierStock,
        buffer,
        storefrontStock: storefrontStock,
        syncStatus: 'Synced',
        lastSync: p.updatedAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Inventory Sync' });
  }
};

export const triggerInventorySync = async (req: Request, res: Response) => {
  try {
    const store = await prisma.store.findFirst();
    if (!store) throw new Error("No connected store found to sync to.");

    try {
      await syncQueue.add('inventory-sync', { storeId: store.id, syncType: 'INVENTORY' });
      res.json({ message: 'Inventory sync job enqueued successfully' });
    } catch (queueError: any) {
      console.warn('Failed to enqueue inventory sync (Redis might be down):', queueError.message);
      res.json({ message: 'Inventory sync triggered (Queue unavailable locally)' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to enqueue inventory sync' });
  }
};

// --- Image Sync ---
export const getImageSync = async (req: Request, res: Response) => {
  try {
    const images = await prisma.productImage.findMany({
      include: { product: { include: { supplier: true, storeMappings: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const data = images.map((img) => {
      const isSynced = img.product?.storeMappings?.some(m => m.syncStatus === 'synced');
      let status = isSynced ? 'CDN Cached' : 'Pending Upload';

      return {
        id: img.id,
        product: img.product?.title || 'Product Asset',
        sku: img.product?.sku || 'SKU-IMG',
        supplier: img.product?.supplier?.name || 'System Catalog',
        imageType: img.isFeatured ? 'Hero' : 'Gallery',
        rawUrl: img.url,
        cdnUrl: img.url,
        resolution: 'Unknown',
        fileSize: 'Unknown',
        compressionRatio: 'N/A',
        status: status,
        lastSync: img.createdAt,
      };
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch images status' });
  }
};

export const triggerImageSync = async (req: Request, res: Response) => {
  try {
    const store = await prisma.store.findFirst();
    if (!store) throw new Error("No connected store found to sync to.");

    try {
      await syncQueue.add('image-sync', { storeId: store.id, syncType: 'IMAGES' });
      res.json({ message: 'Image sync job enqueued successfully' });
    } catch (queueError: any) {
      console.warn('Failed to enqueue image sync (Redis might be down):', queueError.message);
      res.json({ message: 'Image sync triggered (Queue unavailable locally)' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to enqueue image sync' });
  }
};

// --- Cardinal Health Sync ---
export const triggerCardinalSync = async (req: Request, res: Response) => {
  try {
    const { CardinalSyncService } = await import('../services/cardinalSync.service');
    const query = (req.body.query || req.query.query || 'Coloplast') as string;
    const result = await CardinalSyncService.runFullCardinalSync(undefined, query);
    res.json(result);
  } catch (error: any) {
    console.error('Cardinal Sync Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to execute Cardinal Health sync' });
  }
};

