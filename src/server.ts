import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './utils/prisma';
import { initWorkers } from './services/queue.service';
import { SchedulerService } from './services/scheduler.service';

const PORT = process.env.PORT || 5000;

async function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });

  try {
    // Check DB connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Auto-sync schema columns on live/local DB
    try {
      const { execSync } = require('child_process');
      const path = require('path');
      const prismaCliPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
      execSync(`node "${prismaCliPath}" db push --accept-data-loss`, { stdio: 'ignore' });
      console.log('✅ Database schema synchronized successfully');
    } catch (syncErr: any) {
      console.warn('⚠️ DB schema auto-sync notice:', syncErr.message || syncErr);
    }

    // Initialize Background Workers and Scheduler
    initWorkers();
    await SchedulerService.startScheduler();
  } catch (error: any) {
    console.warn('⚠️  Database Connection Warning:', error.message || error);
    console.warn('💡 Please configure DATABASE_URL in Railway Dashboard variables to point to your live MySQL database.');
  }
}

startServer();

// trigger nodemon restart 41