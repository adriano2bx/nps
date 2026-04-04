import { Queue } from 'bullmq';
import { redis } from './redis.js';

// Central Queue for NPS Surveys
export const surveyQueue = new Queue('nps-surveys', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // Keep Redis clean
    removeOnFail: false,   // Keep for debugging
  }
});

console.log('✅ BullMQ Survey Queue Initialized');
