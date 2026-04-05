import { Router, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { apiKeyMiddleware, ApiRequest } from '../middleware/api-key.js';
import { validate } from '../middleware/validate.js';
import { webhookService } from '../services/webhook-service.js';

const router = Router();

/**
 * PUBLIC API V1 - Integration Endpoints
 * All routes here require X-API-KEY header.
 */

router.use(apiKeyMiddleware);

// Integration Specific Rate Limits
const triggerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 triggers per minute
  message: { error: 'Limite de disparos atingido. Tente novamente em 1 minuto.' }
});

const metricsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 metric requests per minute
  message: { error: 'Muitas requisições de métricas. Tente novamente em 1 minuto.' }
});

// Validation Schemas
const triggerSchema = z.object({
  body: z.object({
    campaignId: z.string().uuid('ID de campanha inválido'),
    phoneNumber: z.string().min(8, 'Número de telefone inválido'),
    contactName: z.string().optional()
  })
});

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-KEY
 */

/**
 * @swagger
 * /api/v1/campaigns:
 *   get:
 *     summary: Lista todas as campanhas ativas
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista de campanhas
 *       401:
 *         description: Chave de API inválida ou ausente
 */

/**
 * GET /api/v1/campaigns
 * Lists all active survey campaigns.
 */
router.get('/campaigns', async (req: ApiRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    const campaigns = await prisma.surveyCampaign.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        keyword: true,
        triggerType: true,
        createdAt: true
      }
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * @swagger
 * /api/v1/trigger:
 *   post:
 *     summary: Dispara uma pesquisa para um número de telefone
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               campaignId:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               contactName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pesquisa disparada com sucesso
 *       404:
 *         description: Campanha não encontrada
 *       409:
 *         description: Sessão já aberta para este contato
 */
router.post('/trigger', triggerLimiter, validate(triggerSchema), async (req: ApiRequest, res: Response) => {
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

    // Create Session
    const { surveyEngine } = await import('../services/survey-engine.js');
    await surveyEngine.startNewSession(tenantId, campaign.whatsappChannelId!, phoneNumber, campaign);

    res.json({ success: true, message: 'Survey triggered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to trigger survey', details: error.message });
  }
});

/**
 * @swagger
 * /api/v1/contacts/upsert:
 *   post:
 *     summary: Cria ou atualiza um contato e seus segmentos
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               segmentNames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
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

    // 2. Upsert Contact (Using the new unique constraint on [tenantId, phoneNumber])
    const contact = await prisma.contact.upsert({
      where: { 
          tenantId_phoneNumber: { tenantId, phoneNumber }
      } as any,
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
 * @swagger
 * /api/v1/metrics/nps:
 *   get:
 *     summary: Obtém métricas de NPS em tempo real
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de NPS
 */
router.get('/metrics/nps', metricsLimiter, async (req: ApiRequest, res: Response) => {
  const tenantId = req.tenantId!;

  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { tenantId, answerValue: { not: null } },
      select: { answerValue: true }
    });

    const values = responses.map(r => r.answerValue!);
    const total = values.length;
    
    if (total === 0) return res.json({ nps: 0, total: 0 });

    // 0-5 Scale Logic
    const promoters = values.filter(v => v >= 5).length;
    const detractors = values.filter(v => v <= 3).length;
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
