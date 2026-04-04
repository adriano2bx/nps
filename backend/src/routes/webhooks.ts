import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { surveyEngine } from '../services/survey-engine.js';

const router = Router();

/**
 * GET Webhook Verification (Meta requirements)
 */
router.get('/meta/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel) return res.status(404).send('Channel not found');

    if (mode === 'subscribe' && token === channel.verifyToken) {
      logger.info({ channelId }, '[Webhook] Meta Verification Successful');
      return res.status(200).send(challenge);
    } else {
      logger.warn({ channelId, receivedToken: token, expected: channel.verifyToken }, '[Webhook] Meta Verification Failed');
      return res.status(403).send('Forbidden');
    }
  } catch (error) {
    logger.error({ error }, '[Webhook] Meta Verification Error');
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * POST Webhook Incoming Messages (Meta Cloud API)
 */
router.post('/meta/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const body = req.body;

  try {
    // 1. Handle Status Updates (Enterprise Tracking)
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statusUpdate = body.entry[0].changes[0].value.statuses[0];
      const wamid = statusUpdate.id;
      const status = statusUpdate.status.toUpperCase(); // DELIVERED, READ, etc.

      logger.info({ wamid, status, channelId }, '[Webhook] Status Update Received');

      await prisma.surveyMessageLog.updateMany({
        where: { waMessageId: wamid },
        data: { status }
      }).catch(e => logger.error({ e, wamid }, '[Webhook] Error updating message status'));

      return res.status(200).send('OK');
    }

    // 2. Handle Incoming Messages
    if (body.object !== 'whatsapp_business_account' || !body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return res.status(200).send('Event ignored');
    }

    const msg = body.entry[0].changes[0].value.messages[0];
    const from = msg.from;
    
    // Extract text (standard text or interactive button/list reply)
    let text = msg.text?.body || '';
    if (msg.type === 'interactive') {
      if (msg.interactive?.button_reply) {
        text = msg.interactive.button_reply.title || msg.interactive.button_reply.id;
      } else if (msg.interactive?.list_reply) {
        text = msg.interactive.list_reply.title || msg.interactive.list_reply.id;
      }
    }

    if (!text) {
      logger.info({ msgType: msg.type, from }, '[Webhook] No text content found in Meta message');
      return res.status(200).send('No text content');
    }

    logger.info({ channelId, from, text, msgType: msg.type }, '[Webhook] Processing Meta Message');
    
    // Pass to Survey Engine
    await surveyEngine.handleIncomingMessage(channelId, from, text);

    return res.status(200).send('OK');
  } catch (error) {
    logger.error({ error, channelId }, '[Webhook] Meta Processing Error');
    return res.status(500).send('Internal Error');
  }
});

export default router;
