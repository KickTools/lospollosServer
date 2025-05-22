// src/services/logCleanupService.js
import { CronJob } from 'cron';
import { cleanupOldLogs } from '../utils/logger.js';
import { logger } from '../utils/logger.js';

export default class LogCleanupService {
  constructor() {
    // Run cleanup job daily at midnight
    this.job = new CronJob('0 0 * * *', async () => {
      logger.info('Running log cleanup job');
      await cleanupOldLogs();
    });
  }

  start() {
    this.job.start();
    logger.info('Log cleanup scheduled job started');
  }

  stop() {
    this.job.stop();
    logger.info('Log cleanup scheduled job stopped');
  }
}