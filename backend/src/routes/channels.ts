import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/channels
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const cacheKey = `channels:${tenantId}`;

    // 1. Try Cache
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const channels = await prisma.whatsAppChannel.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    
    // 2. Save Cache (60s)
    await redis.setex(cacheKey, 60, JSON.stringify(channels));

    res.json(channels);
  } catch (error: any) {
    console.error('GET /api/channels - Error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// POST /api/channels
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { 
      name, provider, 
      phoneNumberId, wabaId, accessToken, verifyToken,
      apiKey, appName, sourceNumber 
    } = req.body;

    const channel = await prisma.whatsAppChannel.create({
      data: {
        tenantId: req.tenantId as string,
        name,
        provider,
        phoneNumberId,
        wabaId,
        accessToken,
        verifyToken,
        apiKey,
        appName,
        sourceNumber,
        status: 'DISCONNECTED'
      }
    });

    // Invalidate All Relevant Caches for this tenant
    const tId = req.tenantId as string;
    const keys = await redis.keys(`*:${tId}*`);
    if (keys.length > 0) await redis.del(...keys);

    res.status(201).json(channel);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create channel', details: error.message });
  }
});

// PUT /api/channels/:id - Update channel credentials
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { 
      name, provider, 
      phoneNumberId, wabaId, accessToken, verifyToken,
      apiKey, appName, sourceNumber 
    } = req.body;

    const channel = await prisma.whatsAppChannel.update({
      where: { 
        id,
        tenantId: req.tenantId as string
      },
      data: {
        name,
        provider,
        phoneNumberId,
        wabaId,
        accessToken,
        verifyToken,
        apiKey,
        appName,
        sourceNumber
      }
    });

    // Invalidate All Relevant Caches for this tenant
    const tId = req.tenantId as string;
    const keys = await redis.keys(`*:${tId}*`);
    if (keys.length > 0) await redis.del(...keys);

    res.json(channel);
  } catch (error: any) {
    console.error('Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel', details: error.message });
  }
});

// DELETE /api/channels/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await prisma.whatsAppChannel.delete({
      where: { 
        id,
        tenantId: req.tenantId as string
      }
    });

    // Invalidate All Relevant Caches for this tenant
    const tId = req.tenantId as string;
    const keys = await redis.keys(`*:${tId}*`);
    if (keys.length > 0) await redis.del(...keys);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

export default router;
