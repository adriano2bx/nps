import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { baileysManager } from '../services/baileys-manager.js';

const router = Router();

// GET /api/baileys/:channelId/status
router.get('/:channelId/status', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const tenantId = req.tenantId as string;

  try {
    const cId = channelId as string;
    const tId = tenantId as string;

    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: cId, tenantId: tId }
    });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const session = baileysManager.getSession(cId);

    res.json({
      status: session?.status || 'DISCONNECTED',
      qr: session?.qr,
      error: session?.error
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch status', details: error.message });
  }
});

// POST /api/baileys/:channelId/connect
router.post('/:channelId/connect', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const tenantId = req.tenantId as string;

  try {
    const cId = channelId as string;
    const tId = tenantId as string;

    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: cId, tenantId: tId }
    });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    // Mark as CONNECTING in DB immediately
    await prisma.whatsAppChannel.update({
      where: { id: cId },
      data: { status: 'CONNECTING' }
    });

    // Start background connection
    baileysManager.connect(cId, tId).catch(console.error);

    res.json({ success: true, message: 'Connection process started' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to start connection', details: error.message });
  }
});

// DELETE /api/baileys/:channelId/logout
router.delete('/:channelId/logout', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const tenantId = req.tenantId as string;

  try {
    const cId = channelId as string;
    const tId = tenantId as string;

    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: cId, tenantId: tId }
    });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    await baileysManager.logout(cId, tId);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to logout', details: error.message });
  }
});

// POST /api/baileys/:channelId/test-send  — Sandbox test dispatch
router.post('/:channelId/test-send', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const tenantId = req.tenantId as string;
  const { phone, text } = req.body;

  if (!phone || !text) {
    return res.status(400).json({ error: 'Missing phone or text in request body' });
  }

  try {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId, tenantId }
    });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    await baileysManager.sendMessage(channelId, tenantId, phone, text);

    console.log(`[Baileys Test] ✅ Sandbox message sent to ${phone} via channel ${channelId}`);
    res.json({ success: true, message: `Test message sent to ${phone}` });
  } catch (error: any) {
    console.error('[Baileys Test] ❌ Failed:', error);
    res.status(500).json({ error: 'Failed to send test message', details: error.message });
  }
});

// POST /api/baileys/:channelId/debug-inbound - Simulate an incoming message for testing
router.post('/:channelId/debug-inbound', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };
  const tenantId = req.tenantId as string;
  const { phone, text } = req.body;

  if (!phone || !text) {
    return res.status(400).json({ error: 'Missing phone or text in request body' });
  }

  try {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId, tenantId }
    });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const { surveyEngine } = await import('../services/survey-engine.js');
    await surveyEngine.handleIncomingMessage(channelId, phone, text);

    res.json({ success: true, message: 'Simulated inbound message processed. Check logs for details.' });
  } catch (error: any) {
    console.error('[Baileys Debug] ❌ Simulation failed:', error);
    res.status(500).json({ error: 'Failed to simulate inbound message', details: error.message });
  }
});

export default router;
