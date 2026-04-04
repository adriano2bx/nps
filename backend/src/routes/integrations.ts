import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { apiKeyMiddleware, ApiRequest } from '../middleware/api-key.js';
import { webhookService } from '../services/webhook-service.js';

const router = Router();

/**
 * PUBLIC API V1 - Integration Endpoints
 * All routes here require X-API-KEY header.
 */

router.use(apiKeyMiddleware);

/**
 * POST /api/v1/trigger
 * Triggers a survey campaign for a specific phone number.
 * Body: { campaignId, phoneNumber, contactName? }
 */
router.post('/trigger', async (req: ApiRequest, res: Response) => {
  const { campaignId, phoneNumber, contactName } = req.body;
  const tenantId = req.tenantId!;

  try {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: campaignId, tenantId }
    });

    if (!campaign || campaign.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Active campaign not found' });
    }

    // Upsert Contact
    let contact = await prisma.contact.findFirst({
        where: { tenantId, phoneNumber }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId,
          name: contactName || `API (${phoneNumber})`,
          phoneNumber
        }
      });
    }

    // Check for existing OPEN session to avoid spamming
    const existing = await prisma.surveySession.findFirst({
        where: { 
            tenantId, 
            status: 'OPEN', 
            contactId: contact.id, 
            campaignId: campaign.id 
        }
    });

    if (existing) {
        return res.status(409).json({ error: 'There is already an open session for this contact/campaign' });
    }

    // Create Session (SurveyEngine handles the rest via its logic if we trigger it)
    // For now, we'll use a simplified version of SurveyEngine's startNewSession pattern
    // or just import SurveyEngine.
    const { surveyEngine } = await import('../services/survey-engine.js');
    
    // We simulate an inbound message or a manual trigger
    // Actually SurveyEngine.startNewSession is private, but I can call handleIncomingMessage
    // with a "trigger" keyword if I add one.
    // Better: I'll make a public trigger method in SurveyEngine later.
    // For now, I'll just use the logic directly or call a new public method.
    
    // @ts-ignore - Accessing private for now, will fix visibility in next step
    await surveyEngine.startNewSession(tenantId, campaign.whatsappChannelId!, phoneNumber, campaign);

    res.json({ success: true, message: 'Survey triggered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to trigger survey', details: error.message });
  }
});

/**
 * POST /api/v1/contacts/upsert
 * High-speed contact syncing from external CRM.
 */
router.post('/contacts/upsert', async (req: ApiRequest, res: Response) => {
  const { name, phoneNumber, segmentNames } = req.body;
  const tenantId = req.tenantId!;

  try {
    // 1. Get or create segments
    const segmentIds: string[] = [];
    if (segmentNames && Array.isArray(segmentNames)) {
      for (const sName of segmentNames) {
        const seg = await prisma.contactSegment.upsert({
          where: { tenantId_name: { tenantId, name: sName } },
          update: {},
          create: { tenantId, name: sName }
        });
        segmentIds.push(seg.id);
      }
    }

    // 2. Upsert Contact
    const contact = await prisma.contact.upsert({
      where: { 
          // Assuming we use phoneNumber as unique key for upsert in integrations
          // Need to handle uniqueness properly in schema if not done
          id: (await prisma.contact.findFirst({ where: { tenantId, phoneNumber } }))?.id || 'new'
      },
      update: {
        name,
        segments: { set: segmentIds.map(id => ({ id })) }
      },
      create: {
        tenantId,
        name,
        phoneNumber,
        segments: { connect: segmentIds.map(id => ({ id })) }
      }
    });

    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to upsert contact', details: error.message });
  }
});

/**
 * GET /api/v1/metrics/nps
 * Current NPS score for the tenant.
 */
router.get('/metrics/nps', async (req: ApiRequest, res: Response) => {
  const tenantId = req.tenantId!;

  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { tenantId, answerValue: { not: null } },
      select: { answerValue: true }
    });

    const values = responses.map(r => r.answerValue!);
    const total = values.length;
    
    if (total === 0) return res.json({ nps: 0, total: 0 });

    const promoters = values.filter(v => v >= 9).length;
    const detractors = values.filter(v => v <= 6).length;
    const nps = ((promoters - detractors) / total) * 100;

    res.json({
      nps: Math.round(nps),
      total,
      promoters,
      detractors,
      passives: total - promoters - detractors
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
