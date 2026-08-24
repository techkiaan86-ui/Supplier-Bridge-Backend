import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './utils/prisma';
import { initWorkers } from './services/queue.service';
import { SchedulerService } from './services/scheduler.service';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Check DB connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Initialize Background Workers and Scheduler
    initWorkers();
    await SchedulerService.startScheduler();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
}

startServer();

// trigger nodemon restart 35