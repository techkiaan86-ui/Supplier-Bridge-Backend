import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { importQueue } from './queue.service';

const prisma = new PrismaClient();
const scheduledTasks = new Map<string, cron.ScheduledTask>();

export class SchedulerService {
  /**
   * Loads all active supplier schedules and registers them with node-cron.
   */
  static async startScheduler() {
    console.log('🔄 Initializing synchronization scheduler...');
    
    // Clear existing tasks if restarting
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks.clear();

    try {
      const schedules = await prisma.supplierSchedule.findMany({
        where: { isActive: true },
        include: { supplier: true }
      });

      for (const schedule of schedules) {
        if (!cron.validate(schedule.cronExpression)) {
          console.warn(`⚠️ Invalid cron expression for schedule ${schedule.id}: ${schedule.cronExpression}`);
          continue;
        }

        const task = cron.schedule(schedule.cronExpression, async () => {
          console.log(`⏰ Triggering scheduled sync for Supplier: ${schedule.supplier.name} (${schedule.dataType})`);
          
          // Enqueue an import job. The importQueue worker will handle fetching and processing.
          await importQueue.add('scheduled-import', {
            supplierId: schedule.supplierId,
            dataType: schedule.dataType,
            triggeredBy: 'Scheduler',
            scheduleId: schedule.id
          }, {
            jobId: `import-${schedule.supplierId}-${Date.now()}`,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            }
          });
        });

        scheduledTasks.set(schedule.id, task);
      }
      
      console.log(`✅ Scheduler active with ${scheduledTasks.size} configured schedules.`);
      
      // Setup a background task to refresh schedules periodically (e.g. every 5 minutes)
      // to pick up any changes made via the UI without restarting the server.
      cron.schedule('*/5 * * * *', () => {
        this.startScheduler();
      });

    } catch (error) {
      console.error('❌ Failed to start scheduler:', error);
    }
  }
}
