import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { SupplierConnectorService } from './supplierConnector.service';
import { ingestSupplierFeed } from './feedParser.service';
import { StorefrontConnectorService } from './storefrontConnector.service';

const prisma = new PrismaClient();

let hasLoggedRedisWarning = false;

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 2) {
      if (!hasLoggedRedisWarning) {
        console.warn('⚠️  [Redis] Connection refused. Background queues will be disabled locally until Redis is running.');
        hasLoggedRedisWarning = true;
      }
      return null; // Stop retrying after 2 attempts
    }
    return Math.min(times * 500, 2000);
  },
});

const quietError = (err: any) => {
  if (
    err.code === 'ECONNREFUSED' || 
    err.message?.includes('ECONNREFUSED') || 
    (err instanceof AggregateError && err.errors.some(e => e.code === 'ECONNREFUSED'))
  ) {
    return;
  }
  console.error('[Redis/Queue Error]', err.message || err);
};

connection.on('error', quietError);

// Create Queues
export const importQueue = new Queue('ImportQueue', { connection });
export const syncQueue = new Queue('SyncQueue', { connection });
export const publishQueue = new Queue('PublishQueue', { connection });
export const validationQueue = new Queue('ValidationQueue', { connection });

[importQueue, syncQueue, publishQueue, validationQueue].forEach(q => q.on('error', quietError));

// Initialize Workers
export const initWorkers = () => {
  const importWorker = new Worker('ImportQueue', async (job: Job) => {
    console.log(`[ImportQueue] Processing Job: ${job.id}`);
    const { supplierId, dataType, triggeredBy } = job.data;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { connections: true, credentials: true }
    });

    if (!supplier || !supplier.connections.length) {
      throw new Error(`Supplier ${supplierId} not found or has no connections configured.`);
    }

    const conn = supplier.connections[0];
    const cred = supplier.credentials[0];

    // Fetch data via Connector
    const rawData = await SupplierConnectorService.fetchSupplierData(conn, cred);
    
    // Ingest data
    const result = await ingestSupplierFeed(
      supplierId,
      conn.type,
      `${supplier.name}_feed_${Date.now()}`,
      rawData
    );

    // Enqueue into SyncQueue automatically after successful ingest
    await syncQueue.add('auto-sync', { supplierId, type: 'full' });

    return { status: 'success', totalProcessed: result.total, supplierName: result.supplierName };
  }, { connection, concurrency: 2 });

  const syncWorker = new Worker('SyncQueue', async (job: Job) => {
    console.log(`[SyncQueue] Processing Job: ${job.id}`);
    
    // Find all distinct active stores and enqueue publish jobs
    const stores = await prisma.store.findMany({ where: { connectionStatus: 'active' } });
    let queuedCount = 0;
    
    for (const store of stores) {
      await publishQueue.add('publish-store', { storeId: store.id, syncType: job.data.type || 'FULL' });
      queuedCount++;
    }

    return { status: 'success', storesQueued: queuedCount };
  }, { connection, concurrency: 2 });

  const publishWorker = new Worker('PublishQueue', async (job: Job) => {
    console.log(`[PublishQueue] Processing Job: ${job.id}`);
    const { storeId, syncType } = job.data;
    
    // Perform actual push to storefront
    const result = await StorefrontConnectorService.pushSyncStore({
      storeId,
      syncType: syncType || 'FULL'
    });

    return { status: 'success', pushedProductsCount: result.pushedProductsCount };
  }, { connection, concurrency: 5 });


  // --- Event Listeners for JobLog tracking ---
  const updateJobLog = async (job: Job, status: string, result?: string, error?: string, progress?: number) => {
    // Determine Queue Name based on the worker/job
    let queueName = job.queueName || 'Unknown';
    if (job.name === 'scheduled-import') queueName = 'Import';
    
    const existingLog = await prisma.jobLog.findFirst({ where: { jobId: job.id! } });
    if (existingLog) {
      await prisma.jobLog.update({
        where: { id: existingLog.id },
        data: {
          status,
          result: result || existingLog.result,
          error: error || existingLog.error,
          progress: progress !== undefined ? progress : existingLog.progress,
          completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
        }
      });
    } else {
      await prisma.jobLog.create({
        data: {
          jobId: job.id!,
          queueName,
          status,
          result,
          error,
          progress: progress || 0,
        }
      });
    }
  };

  importWorker.on('active', (job) => updateJobLog(job, 'running', undefined, undefined, 10));
  importWorker.on('completed', (job, result) => updateJobLog(job, 'completed', JSON.stringify(result), undefined, 100));
  importWorker.on('failed', (job, err) => updateJobLog(job!, 'failed', undefined, err.message, 0));
  importWorker.on('error', quietError);

  syncWorker.on('active', (job) => updateJobLog(job, 'running', undefined, undefined, 10));
  syncWorker.on('completed', (job, result) => updateJobLog(job, 'completed', JSON.stringify(result), undefined, 100));
  syncWorker.on('failed', (job, err) => updateJobLog(job!, 'failed', undefined, err.message, 0));
  syncWorker.on('error', quietError);

  publishWorker.on('active', (job) => updateJobLog(job, 'running', undefined, undefined, 10));
  publishWorker.on('completed', (job, result) => updateJobLog(job, 'completed', JSON.stringify(result), undefined, 100));
  publishWorker.on('error', quietError);
  publishWorker.on('failed', (job, err) => updateJobLog(job!, 'failed', undefined, err.message, 0));

  console.log('✅ BullMQ Workers initialized for Import, Sync, and Publish queues.');
};
