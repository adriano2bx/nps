import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis, setTenantCached, invalidateTenantCache } from '../lib/redis.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { surveyQueue } from '../lib/queue.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * Normaliza o tipo de uma pergunta antes de salvar.
 * Se uma pergunta for do tipo 'list' ou 'choice' mas todas as suas opções
 * forem números inteiros de 0 a 10, ela é automaticamente reclassificada
 * como 'nps' para garantir que apareça corretamente no dashboard.
 */
function normalizeQuestionType(q: any): { type: string; options: string } {
  const opts = Array.isArray(q.options) ? q.options : [];
  let resolvedType = q.type;

  if ((q.type === 'list' || q.type === 'choice') && opts.length > 0) {
    const allNumeric = opts.every((o: any) => {
      const n = parseInt(String(o).trim(), 10);
      return !isNaN(n) && n >= 0 && n <= 10;
    });
    if (allNumeric) {
      resolvedType = 'nps';
      console.log(`[Campaigns] ✅ Auto-normalizado pergunta '${q.text?.substring(0, 30)}' de '${q.type}' para 'nps' (opções numéricas 0-10 detectadas).`);
    }
  }

  return {
    type: resolvedType,
    options: resolvedType === 'nps' ? '[]' : JSON.stringify(opts)
  };
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../storage/uploads');
    if (!fs.existsSync(uploadDir)) fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WEBP are allowed.'));
    }
  }
});

router.post('/upload', authMiddleware, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Generate public URL
    // Meta Cloud API needs a public URL. 
    // We assume the host is correctly set (esp. in Easypanel/Docker)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/storage/uploads/${req.file.filename}`;
    
    res.json({ 
      url: imageUrl,
      filename: req.file.filename 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Middleware to use the temporary tenant if auth is skipped or for compatibility
// but now we'll prioritize the authMiddleware's tenantId.
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const cacheKey = `campaigns:${tenantId}`;

    // 1. Try Cache
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const campaigns = await prisma.surveyCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        topic: true,
        _count: {
          select: { questions: true, sessions: true }
        }
      }
    });

    // 2. Save to Cache (60s) — registered in tenant registry for proper invalidation
    await setTenantCached(tenantId, cacheKey, 60, campaigns);

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { 
    name, type, channelId, 
    clinicName, phone, header, footer,
    openingBody, buttonYes, buttonNo, closingMessage,
    isHsm, triggerType, keyword, waNumber, mediaPath,
    templateName, ctaLabel, ctaLink, supportName, supportPhone,
    delay, timeout, windowStart, windowEnd, resend, scheduledAt,
    questions 
  } = req.body;

  try {
    const campaign = await prisma.$transaction(async (tx: any) => {
      const tenantId = req.tenantId as string;
      const newCampaign = await tx.surveyCampaign.create({
        data: {
          tenantId: req.tenantId!,
          name,
          type: type || 'SURVEY',
          whatsappChannelId: channelId,
          topicId: req.body.topicId,
          clinicName,
          phone,
          header,
          footer,
          openingBody,
          buttonYes,
          buttonNo,
          closingMessage,
          isHsm: isHsm === 'true' || isHsm === true,
          triggerType: triggerType || 'active',
          keyword,
          waNumber,
          mediaPath,
          templateName,
          ctaLabel,
          ctaLink,
          supportName,
          supportPhone,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          delay: delay ? parseInt(delay, 10) : 60,
          timeout: timeout ? parseInt(timeout, 10) : 1440,
          windowStart: windowStart || '08:00',
          windowEnd: windowEnd || '20:00',
          resend: resend ? parseInt(resend, 10) : 1,
          status: 'DRAFT',
          questions: {
            create: (questions || []).map((q: any, i: number) => {
              const { type, options } = normalizeQuestionType(q);
              return {
                orderIndex: i,
                type,
                text: q.text,
                required: q.required ?? true,
                options
              };
            })
          }
        },
        include: {
          questions: true
        }
      });
      return newCampaign;
    });

    // Invalidate All Relevant Caches for this tenant (Scale Optimized)
    await invalidateTenantCache(req.tenantId as string);

    res.status(201).json(campaign);
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign', details: error.message });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { 
        id,
        tenantId: req.tenantId as string
      },
      include: {
        topic: true,
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await prisma.surveyCampaign.delete({
      where: { 
        id,
        tenantId: req.tenantId as string
      }
    });

    // Invalidate All Relevant Caches for this tenant (Scale Optimized)
    await invalidateTenantCache(req.tenantId as string);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    
    const campaign = await prisma.surveyCampaign.update({
      where: { 
        id,
        tenantId: req.tenantId as string
      },
      data: { status }
    });
    
    console.log(`[Campaigns] ✅ Status updated to ${status} for campaign ${id}`);
    
    // Invalidate All Relevant Caches for this tenant (Scale Optimized)
    await invalidateTenantCache(req.tenantId as string);

    res.json(campaign);
  } catch (error: any) {
    console.error(`[Campaigns] ❌ Failed to update status:`, error);
    res.status(500).json({ error: 'Failed to update campaign status', details: error.message });
  }
});

// PUT /api/campaigns/:id - Full update (metadata + questions)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const tenantId = req.tenantId as string;
  const { 
    name, type, channelId, 
    clinicName, phone, header, footer,
    openingBody, buttonYes, buttonNo, closingMessage,
    isHsm, triggerType, keyword, waNumber, mediaPath,
    templateName, ctaLabel, ctaLink, supportName, supportPhone,
    delay, timeout, windowStart, windowEnd, resend, scheduledAt,
    questions 
  } = req.body;

  try {
    const campaign = await prisma.$transaction(async (tx: any) => {
      // 1. Verify existence
      const existing = await tx.surveyCampaign.findUnique({
        where: { id, tenantId }
      });
      if (!existing) throw new Error('Campaign not found');

      // 2. Update Campaign Metadata
      const updatedCampaign = await tx.surveyCampaign.update({
        where: { id },
        data: {
          name,
          type: type || existing.type,
          whatsappChannelId: channelId,
          topicId: req.body.topicId,
          clinicName,
          phone,
          header,
          footer,
          openingBody,
          buttonYes,
          buttonNo,
          closingMessage,
          isHsm: isHsm === 'true' || isHsm === true,
          triggerType: triggerType || existing.triggerType,
          keyword,
          waNumber,
          mediaPath,
          templateName,
          ctaLabel,
          ctaLink,
          supportName,
          supportPhone,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          delay: delay ? parseInt(delay, 10) : (existing.delay || 60),
          timeout: timeout ? parseInt(timeout, 10) : (existing.timeout || 1440),
          windowStart: windowStart || existing.windowStart || '08:00',
          windowEnd: windowEnd || existing.windowEnd || '20:00',
          resend: resend ? parseInt(resend, 10) : (existing.resend || 1),
        }
      });

      // 3. Simple Question Sync: Delete all and re-create (cleaner for complex re-ordering)
      // Only do this if questions are provided in the payload
      if (questions && Array.isArray(questions)) {
        await tx.surveyQuestion.deleteMany({
          where: { campaignId: id }
        });

        await tx.surveyQuestion.createMany({
          data: questions.map((q: any, i: number) => {
            const { type, options } = normalizeQuestionType(q);
            return {
              campaignId: id,
              orderIndex: i,
              type,
              text: q.text,
              required: q.required ?? true,
              options
            };
          })
        });
      }

      return await tx.surveyCampaign.findUnique({
        where: { id },
        include: { questions: true }
      });
    });

    await invalidateTenantCache(tenantId);
    res.json(campaign);
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign', details: error.message });
  }
});

// POST /api/campaigns/:id/trigger - Trigger NPS distribution
router.post('/:id/trigger', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenantId as string;
    const { contactIds } = req.body; // Optional: specific contacts to trigger

    // 1. Fetch Campaign
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id, tenantId }
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // 2. Fetch contacts if not provided
      let targets: string[] = contactIds;
      if (!targets || targets.length === 0) {
        const whereClause: any = { tenantId, optOut: false };
        if (campaign.topicId) {
          whereClause.topicOptOuts = { none: { topicId: campaign.topicId } };
        }
        
        const allContacts = await prisma.contact.findMany({
          where: whereClause,
          select: { id: true }
        });
        targets = allContacts.map((c: any) => c.id);
      }

    if (targets.length === 0) {
      return res.status(400).json({ error: 'No valid contacts to trigger' });
    }

    // 3. Enqueue Jobs (Efficient bulk add)
    const jobs = targets.map((contactId: any) => ({
      name: 'send-nps',
      data: { tenantId, campaignId: id, contactId },
      opts: { jobId: `${id}:${contactId}:${Date.now()}` } // Deduplication if needed
    }));

    await surveyQueue.addBulk(jobs);

    // 4. Update campaign status
    await prisma.surveyCampaign.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    // 5. Invalidate Cache
    await invalidateTenantCache(tenantId);

    console.log(`[Queue] Enqueued ${targets.length} survey jobs for campaign ${id}`);

    res.json({ 
      success: true, 
      message: `Enqueued ${targets.length} survey sessions for processing`,
      jobCount: targets.length
    });

  } catch (error) {
    console.error('[Trigger Error]:', error);
    res.status(500).json({ error: 'Failed to trigger campaign processing' });
  }
});

export default router;
