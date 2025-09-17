#!/usr/bin/env tsx

import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { closeWorkers } from '@/jobs/workers';
import { closeQueues } from '@/jobs/queue';
import { cronService } from '@/services/cron.service';

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  try {
    await cronService.stop();
    await closeWorkers();
    await closeQueues();
    logger.info('Workers shut down successfully');
    process.exit(0);
  } catch (error) {
    logError(error as Error, { context: 'graceful-shutdown' });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  
  try {
    await cronService.stop();
    await closeWorkers();
    await closeQueues();
    logger.info('Workers shut down successfully');
    process.exit(0);
  } catch (error) {
    logError(error as Error, { context: 'graceful-shutdown' });
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(error, { context: 'uncaught-exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(new Error(`Unhandled Rejection at: ${promise}, reason: ${reason}`), {
    context: 'unhandled-rejection',
  });
  process.exit(1);
});

async function startWorkers() {
  try {
    logger.info('Starting job queue workers...');
    
    // Start the cron service
    await cronService.start();
    
    logger.info('All workers started successfully');
    logger.info('Workers are running. Press Ctrl+C to stop.');
    
    // Keep the process alive
    setInterval(() => {
      // Health check - just log that we're alive
      logger.info('Workers health check - all systems running');
    }, 300000); // Every 5 minutes
    
  } catch (error) {
    logError(error as Error, { context: 'start-workers' });
    process.exit(1);
  }
}

// Start the workers
startWorkers();
