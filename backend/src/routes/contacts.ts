import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis, invalidateTenantCache } from '../lib/redis.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/contacts - List with simple pagination
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const tenantId = req.tenantId as string;
    const cacheKey = `contacts:${tenantId}:p${page}:l${limit}`;
    console.log(`[Contacts] Request: page=${page}, limit=${limit}, skip=${skip}, tenant=${tenantId}`);

    // 1. Try to get from Cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // 2. Count total (with 10s cache for fast pagination)
    const countCacheKey = `contacts_count:${tenantId}`;
    let totalCached = await redis.get(countCacheKey);
    let total: number;
    
    if (totalCached) {
      total = parseInt(totalCached);
    } else {
      total = await prisma.contact.count({ where: { tenantId } });
      await redis.setex(countCacheKey, 10, total.toString());
    }

    // 3. Fetch data with explicit selection
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        optOut: true,
        isMasked: true,
        createdAt: true,
        sessions: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: { startedAt: true }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const result = {
      data: contacts.map(c => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        optOut: c.optOut,
        isMasked: c.isMasked,
        lastActive: c.updatedAt,
        segments: c.segments // Include segments
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    // 2. Save to Cache (60s)
    await redis.setex(cacheKey, 60, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts - Create a new contact manually
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, phoneNumber, segmentIds } = req.body;
    const tenantId = req.tenantId as string;

    if (!name || !phoneNumber) {
      return res.status(400).json({ error: 'Name and Phone Number are required' });
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name,
        phoneNumber,
        optOut: false,
        isMasked: false,
        segments: segmentIds ? {
          connect: segmentIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: { segments: true }
    });

    await invalidateTenantCache(tenantId);
    res.status(201).json(contact);
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact', details: error.message });
  }
});

// PUT /api/contacts/:id - Update contact details
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { name, phoneNumber } = req.body;
    const tenantId = req.tenantId as string;

    const contact = await prisma.contact.findUnique({
      where: { id, tenantId }
    });

    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const updated = await prisma.contact.update({
      where: { id },
      data: { 
        name, 
        phoneNumber,
        segments: req.body.segmentIds ? {
          set: req.body.segmentIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: { segments: true }
    });

    await invalidateTenantCache(tenantId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id - Remove a contact
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenantId as string;

    await prisma.contact.delete({
      where: { id, tenantId }
    });

    await invalidateTenantCache(tenantId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// PATCH /api/contacts/:id/opt-out - Toggle opt-out status
router.patch('/:id/opt-out', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const contact = await prisma.contact.findUnique({
      where: { id, tenantId: req.tenantId as string }
    });

    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const updated = await prisma.contact.update({
      where: { id: id as string },
      data: { optOut: !contact.optOut }
    });

    // Invalidate All Relevant Caches for this tenant (Scale Optimized)
    await invalidateTenantCache(req.tenantId as string);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle opt-out' });
  }
});

// POST /api/contacts/:id/anonymize - LGPD Anonymization
router.post('/:id/anonymize', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    
    // Mask name and phone, keeps historical NPS data but removes PII
    const contact = await prisma.contact.findUnique({
      where: { id, tenantId: req.tenantId as string }
    });

    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        name: 'PACIENTE ANONIMIZADO (LGPD)',
        phoneNumber: '********',
        isMasked: true
      }
    });

    // Invalidate All Relevant Caches for this tenant (Scale Optimized)
    await invalidateTenantCache(req.tenantId as string);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to anonymize contact' });
  }
});

export default router;
