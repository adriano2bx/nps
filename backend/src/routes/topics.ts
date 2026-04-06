import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List topics for tenant
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const topics = await prisma.campaignTopic.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(topics);
  } catch (error) {
    console.error('[Topics Router] GET / error:', error);
    res.status(500).json({ error: 'Failed to find topics' });
  }
});

// Create topic
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Check if exists
    let topic = await prisma.campaignTopic.findUnique({
      where: {
        tenantId_name: {
          tenantId: req.tenantId!,
          name: name.trim()
        }
      }
    });

    if (!topic) {
      topic = await prisma.campaignTopic.create({
        data: {
          tenantId: req.tenantId!,
          name: name.trim(),
          color: color || '#10b981'
        }
      });
    }

    res.json(topic);
  } catch (error) {
    console.error('[Topics Router] POST / error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// Delete topic
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenantId as string;

    // 1. Check if in use
    const usage = await prisma.surveyCampaign.count({
      where: { tenantId, topicId: id }
    });

    if (usage > 0) {
      return res.status(400).json({ 
        error: 'Esta categoria não pode ser excluída pois está sendo usada em ' + usage + ' campanha(s).' 
      });
    }

    // 2. Delete
    await prisma.campaignTopic.delete({
      where: { id, tenantId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Topics Router] DELETE /:id error:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
