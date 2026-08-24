import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ingestSupplierFeed } from '../services/feedParser.service';

const prisma = new PrismaClient();

export const getImports = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const data = jobs.map(j => ({
      id: j.id,
      supplierId: 's1',
      supplierName: j.logs?.split('for supplier ')?.[1] || 'Supplier Feed',
      connectionType: j.source.toLowerCase(),
      fileName: j.logs?.split('from file ')?.[1]?.split(' for ')?.[0] || `feed_${j.id.slice(0, 4)}.${j.source.toLowerCase()}`,
      totalRecords: j.recordsProcessed + j.recordsFailed,
      processedRecords: j.recordsProcessed,
      failedRecords: j.recordsFailed,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Import Jobs' });
  }
};

export const createImport = async (req: Request, res: Response) => {
  try {
    const { supplierId, connectionType, fileName, fileContent } = req.body;
    const targetSupplierId = supplierId || (await prisma.supplier.findFirst())?.id || 's1';

    if (fileContent && typeof fileContent === 'string') {
      const result = await ingestSupplierFeed(targetSupplierId, connectionType || 'csv', fileName || 'feed.csv', fileContent);
      return res.status(201).json({
        id: `job_${Date.now()}`,
        supplierId: targetSupplierId,
        supplierName: result.supplierName,
        connectionType: (connectionType || 'csv').toLowerCase(),
        fileName: fileName || `feed_${Date.now()}.${(connectionType || 'csv').toLowerCase()}`,
        totalRecords: result.total,
        processedRecords: result.total,
        failedRecords: 0,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    }

    const job = await prisma.importJob.create({
      data: {
        source: (connectionType || 'CSV').toUpperCase(),
        type: 'Products Feed',
        status: 'completed',
        recordsProcessed: 1,
        recordsFailed: 0,
        logs: `Manual import job triggered for ${fileName || 'catalog.csv'}`,
      }
    });

    res.status(201).json({
      id: job.id,
      supplierId: targetSupplierId,
      supplierName: req.body.supplierName || 'TechParts International',
      connectionType: (connectionType || 'csv').toLowerCase(),
      fileName: fileName || `feed_${Date.now()}.${(connectionType || 'csv').toLowerCase()}`,
      totalRecords: 1,
      processedRecords: 1,
      failedRecords: 0,
      status: 'completed',
      createdAt: job.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Import Job' });
  }
};

export const updateImport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.importJob.update({
      where: { id },
      data: {
        status: req.body.status || 'completed',
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Import Job' });
  }
};
