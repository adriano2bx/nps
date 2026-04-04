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
    // Info check
    if (body.object !== 'whatsapp_business_account' || !body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return res.status(200).send('Event ignored');
    }

    const message = body.entry[0].changes[0].value.messages[0];
    const from = message.from;
    const text = message.text?.body || '';

    if (!text) return res.status(200).send('No text content');

    logger.info({ channelId, from, text }, '[Webhook] Processing Meta Message');
    
    // Pass to Survey Engine
    await surveyEngine.handleIncomingMessage(channelId, from, text);

    return res.status(200).send('OK');
  } catch (error) {
    logger.error({ error, channelId }, '[Webhook] Meta Processing Error');
    return res.status(500).send('Internal Error');
  }
});

export default router;
