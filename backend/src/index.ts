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
import webhookRoutes from './routes/webhooks.js';
import integrationRoutes from './routes/integrations.js';
import integrationMgmtRoutes from './routes/integrations-mgmt.js';
import { setupSurveyWorker } from './workers/survey-worker.js';
import { setupCleanupWorker } from './workers/cleanup-worker.js';
import { setupWebhookWorker } from './workers/webhook-worker.js';
import { baileysManager } from './services/baileys-manager.js';

import { setupGlobalLogger, logger } from './lib/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { getLock, releaseLock } from './lib/redis.js';

// Setup global console overrides before anything else runs fully
setupGlobalLogger();

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

// Static storage (Publicly accessible for Meta Cloud API)
const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../storage');
if (!fs.existsSync(storagePath)) fs.ensureDirSync(storagePath);
if (!fs.existsSync(path.join(storagePath, 'uploads'))) fs.ensureDirSync(path.join(storagePath, 'uploads'));

app.use('/storage', express.static(storagePath));

// 404 specific for storage (to avoid SPA catch-all sending HTML for missing images)
app.use('/storage', (req, res) => {
  logger.warn({ url: req.originalUrl, path: req.path }, '[Storage] 404 - File Not Found');
  res.status(404).send('File Not Found');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/baileys', baileysRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/v1', integrationRoutes);
app.use('/api/integrations', integrationMgmtRoutes);

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

// --- SERVE FRONTEND STATIC FILES ---
// The frontend 'dist' will be in the project root if deployed via single container
// Adjust path based on your deployment structure (e.g., ../../../frontend/dist)
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  console.log(`[Static] 📦 Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));
  
  // Catch-all route to serve index.html (SPA support)
  app.get('*splat', (req, res, next) => {
    // If it's an API request, static asset, or storage, do not serve index.html
    if (req.path.startsWith('/api') || req.path.startsWith('/storage')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.warn(`[Static] ⚠️  Frontend path not found: ${frontendPath}`);
}


app.listen(port, async () => {
  logger.info(`🚀 Server ready at http://localhost:${port}`);
  
  // Initialize BullMQ and Cleanup Workers
  setupSurveyWorker();
  setupCleanupWorker();
  setupWebhookWorker();

  // Try to acquire master lock and initialize Baileys
  await tryAcquireLock(() => {
    baileysManager.init();
  });
});
