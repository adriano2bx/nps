import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { invalidateTenantCache } from '../lib/redis.js';

const router = Router();

// GET /api/segments - List all segments for a tenant
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId as string;
    const segments = await prisma.contactSegment.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// POST /api/segments - Create a new segment
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, color } = req.body;
    const tenantId = req.tenantId as string;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const segment = await prisma.contactSegment.create({
      data: {
        tenantId,
        name,
        description,
        color: color || '#10b981'
      }
    });

    await invalidateTenantCache(tenantId);
    res.status(201).json(segment);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A segment with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// PUT /api/segments/:id - Update a segment
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const { name, description, color } = req.body;
    const tenantId = req.tenantId as string;

    const segment = await prisma.contactSegment.update({
      where: { id: id as string, tenantId },
      data: { name, description, color }
    });

    await invalidateTenantCache(tenantId);
    res.json(segment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// DELETE /api/segments/:id - Delete a segment
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const tenantId = req.tenantId as string;

    await prisma.contactSegment.delete({
      where: { id: id as string, tenantId }
    });


    await invalidateTenantCache(tenantId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

// POST /api/segments/:id/assign - Bulk assign contacts to segment
router.post('/:id/assign', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const segmentId = req.params.id;
    const { contactIds } = req.body; // Array of contact IDs
    const tenantId = req.tenantId as string;

    if (!Array.isArray(contactIds)) return res.status(400).json({ error: 'contactIds must be an array' });

    await prisma.contactSegment.update({
      where: { id: segmentId as string, tenantId },
      data: {
        contacts: {
          connect: contactIds.map(id => ({ id }))
        }
      }
    });

    await invalidateTenantCache(tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign contacts to segment' });
  }
});

export default router;
