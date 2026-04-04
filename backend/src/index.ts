import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';
import channelRoutes from './routes/channels.js';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import reportRoutes from './routes/reports.js';
import contactRoutes from './routes/contacts.js';
import segmentRoutes from './routes/segments.js';
import tenantRoutes from './routes/tenants.js';
import baileysRoutes from './routes/baileys.js';
import { setupSurveyWorker } from './workers/survey-worker.js';
import { setupCleanupWorker } from './workers/cleanup-worker.js';
import { baileysManager } from './services/baileys-manager.js';

import { setupGlobalLogger, logger } from './lib/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { getLock, releaseLock } from './lib/redis.js';

// Setup global console overrides before anything else runs fully
setupGlobalLogger();

import fs from 'fs-extra';
import path from 'path';

dotenv.config();

// --- ROBUST PROCESS LOCK (REDIS) ---
const PROCESS_LOCK_KEY = 'backend:master_process';
const LOCK_TTL = 30000; // 30 seconds

let isMaster = false;

const tryAcquireLock = async (onAcquired: () => void) => {
  const attemptAcquisition = async () => {
    const acquired = await getLock(PROCESS_LOCK_KEY, LOCK_TTL);
    if (acquired && !isMaster) {
      console.log('[ProcessLock] 👑 Successfully acquired master lock. Starting Baileys services.');
      isMaster = true;
      onAcquired();
    } else if (!acquired && !isMaster) {
       const ownerId = await (await import('./lib/redis.js')).redis.get(`lock:${PROCESS_LOCK_KEY}`);
       console.warn(`[ProcessLock] 🚨 Another instance is managing sessions (Owner: ${ownerId}). Waiting for takeover...`);
    }
    return acquired;
  };

  // Initial attempt
  await attemptAcquisition();
  
  // Continuous heartbeating and retrying
  setInterval(async () => {
     await attemptAcquisition();
  }, 10000);
};
// ----------------------------

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(compression());
app.use(express.json());

// API Request Logger Middleware
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/baileys', baileysRoutes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, async () => {
  logger.info(`🚀 Server ready at http://localhost:${port}`);
  
  // Initialize BullMQ and Cleanup Workers
  setupSurveyWorker();
  setupCleanupWorker();

  // Try to acquire master lock and initialize Baileys
  await tryAcquireLock(() => {
    baileysManager.init();
  });
});
