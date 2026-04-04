import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { redis } from '../lib/redis.js';

const router = Router();

/**
 * INTEGRATION MANAGEMENT (Private API)
 * Used by the frontend to manage API Keys and Webhooks.
 */

router.use(authMiddleware);

// --- API KEYS ---

router.get('/keys', async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, name: true, createdAt: true }
    });
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/keys', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const tenantId = req.tenantId!;
    
    // Generate raw secret
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(rawSecret, 10);
    
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name,
        keyHash
      }
    });

    // Return the raw key ONLY ONCE
    // Format: tenantId.rawSecret
    const fullKey = `${tenantId}.${rawSecret}`;
    
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey,
      createdAt: apiKey.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.delete('/keys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.apiKey.delete({
      where: { id: id as string, tenantId: req.tenantId as string }
    });
    
    // Invalidate cache
    await redis.del(`api_key_valid:${req.tenantId}`);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// --- WEBHOOKS ---

router.get('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    const webhooks = await prisma.tenantWebhook.findMany({
      where: { tenantId: req.tenantId }
    });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.post('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    const { url, events, active } = req.body;
    const tenantId = req.tenantId!;
    
    // Generate a default secret for HMAC if not provided
    const secret = crypto.randomBytes(24).toString('hex');
    
    const eventsStr = Array.isArray(events) ? events.join(',') : (String(events) || '');
    
    const webhook = await prisma.tenantWebhook.create({
      data: {
        tenantId,
        url,
        events: eventsStr,
        secret,
        active: active ?? true
      }
    });

    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

router.put('/webhooks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { url, events, active } = req.body;
    const eventsStr = Array.isArray(events) ? events.join(',') : (String(events) || '');
    
    const webhook = await prisma.tenantWebhook.update({
      where: { id: id as string, tenantId: req.tenantId as string },
      data: {
        url,
        events: eventsStr as string,
        active
      }
    });

    res.json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

router.delete('/webhooks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.tenantWebhook.delete({
      where: { id: id as string, tenantId: req.tenantId as string }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

export default router;
