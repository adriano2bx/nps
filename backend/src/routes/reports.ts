import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis, setTenantCached, invalidateTenantCache } from '../lib/redis.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// --- NPS CALCULATION HELPERS ---
const getNpsCategory = (score: number | null): 'PROMOTER' | 'NEUTRAL' | 'DETRACTOR' | 'NONE' => {
  if (score === null) return 'NONE';
  const val = Math.round(score);
  if (val >= 9) return 'PROMOTER';
  if (val >= 7) return 'NEUTRAL';
  return 'DETRACTOR'; // Also handles legacy 0
};

const calculateNpsStats = (responses: { answerValue: number | null, _count?: { id: number } }[]) => {
  const filtered = responses.filter(r => r.answerValue !== null);
  
  let promoters = 0;
  let detractors = 0;
  let passives = 0;
  let total = 0;

  filtered.forEach(r => {
    const count = r._count?.id ?? 1;
    const cat = getNpsCategory(r.answerValue);
    if (cat === 'PROMOTER') promoters += count;
    else if (cat === 'DETRACTOR') detractors += count;
    else if (cat === 'NEUTRAL') passives += count;
    total += count;
  });

  if (total === 0) {
    return {
      score: 0, promoters: 0, passives: 0, detractors: 0, total: 0,
      promoterPercentage: 0, passivePercentage: 0, detractorPercentage: 0
    };
  }

  return {
    score: Math.round(((promoters - detractors) / total) * 100),
    total, promoters, passives, detractors,
    promoterPercentage: Math.round((promoters / total) * 100),
    passivePercentage: Math.round((passives / total) * 100),
    detractorPercentage: Math.round((detractors / total) * 100)
  };
};


// GET /api/reports/export
router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId as string;
    const { campaignId, startDate, endDate } = req.query;

    const where: any = { tenantId };
    if (campaignId && campaignId !== 'all') where.campaignId = campaignId as string;
    
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate as string);
      if (endDate) where.startedAt.lte = new Date(endDate as string);
    }

    const sessions = await prisma.surveySession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        contact: true,
        campaign: { select: { name: true } },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: { question: { select: { type: true, text: true } } }
        }
      }
    });

    // 1. Identify all unique questions across all sessions to build dynamic headers
    const questionMap = new Map<string, { text: string, type: string }>();
    sessions.forEach(s => {
      s.responses.forEach((r: any) => {
        if (r.question && !questionMap.has(r.questionId)) {
          questionMap.set(r.questionId, { 
            text: r.question.text, 
            type: r.question.type 
          });
        }
      });
    });

    const questionIds = Array.from(questionMap.keys());

    // 2. Build Header
    // CSV Header with BOM for UTF-8 compatibility (Excel Friendly)
    let csvData = '\uFEFF'; 
    const staticHeaders = ['Data', 'Paciente', 'Telefone', 'Campanha', 'Status'];
    const dynamicHeaders = questionIds.map(id => {
      const q = questionMap.get(id)!;
      return `[${q.type.toUpperCase()}] ${q.text}`;
    });

    csvData += [...staticHeaders, ...dynamicHeaders].join(';') + '\n';

    // 3. Build Rows
    sessions.forEach((s: any) => {
      const row = [
        new Date(s.startedAt).toLocaleString('pt-BR'),
        s.contact.name,
        s.contact.phoneNumber,
        s.campaign.name,
        s.status
      ];

      // Map each response to its corresponding question column
      questionIds.forEach(qId => {
        const resp = s.responses.find((r: any) => r.questionId === qId);
        if (resp) {
          // Priority to answerValue (numbers/nps) then answerText
          const val = resp.answerValue !== null ? resp.answerValue : (resp.answerText || '');
          row.push(String(val).replace(/[\n\r;]/g, ' '));
        } else {
          row.push(''); // Empty if question not present in this session
        }
      });

      csvData += row.join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio_completo_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvData);


  } catch (error) {
    console.error('[Export] Error generating CSV:', error);
    res.status(500).json({ error: 'Internal Server Error during export' });
  }
});

// GET /api/reports/dashboard
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId as string;
    const cacheKey = `dashboard:${tenantId}`;

    // 1. Try to get from Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }
    
    // Default to All Time unless specified in query
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const filterObj = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const sessionFilterObj = Object.keys(dateFilter).length > 0 ? { startedAt: dateFilter } : {};

    // Fetch stats, distribution and recent responses in parallel using denormalized indices
    const [statsResult, distributionResult, campaigns, recentResponses] = await Promise.all([
      // 1. Basic Stats (NPS) using aggregations on denormalized table
      prisma.surveyResponse.aggregate({
        where: {
          tenantId,
          ...filterObj,
          answerValue: { not: null }
        },
        _count: { id: true },
        _min: { answerValue: true },
        _max: { answerValue: true }
      }),
      // 2. NPS Distribution using groupBy on denormalized table
      prisma.surveyResponse.groupBy({
        by: ['answerValue'],
        where: {
          tenantId,
          ...filterObj,
          answerValue: { not: null }
        },
        _count: { id: true }
      }),
      // 3. Campaigns for scores
      prisma.surveyCampaign.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          sessions: {
            where: sessionFilterObj,
            select: {
              responses: {
                select: { answerValue: true }
              }
            }
          }
        }
      }),
      // 4. Recent responses (Fixed: Filter by date range and NPS score)
      prisma.surveyResponse.findMany({
        where: { 
          tenantId,
          ...filterObj,
          answerValue: { not: null }
        },
        include: {
          session: { 
            include: { 
              contact: true, 
              campaign: true,
              responses: {
                where: { question: { type: 'text' } },
                take: 1
              }
            } 
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // --- PROCESS NPS STATS & DISTRIBUTION ---
    const stats = calculateNpsStats(distributionResult as any);

    const distribution = Array(11).fill(0);
    distributionResult.forEach((item: any) => {
      const val = Math.round(item.answerValue || 0);
      const count = item._count?.id || 0;
      if (val >= 0 && val <= 10) distribution[val] += count;
    });


    // --- TIME SERIES ---
    const timeSeriesData = await prisma.surveyResponse.findMany({
      where: {
        tenantId,
        ...filterObj,
        answerValue: { not: null }
      },
      select: {
        answerValue: true,
        createdAt: true
      }
    });

    const groups: Record<string, { promoters: number, detractors: number, total: number }> = {};
    (timeSeriesData as any[]).forEach(r => {
      const date = r.createdAt.toISOString().split('T')[0];
      const cat = getNpsCategory(r.answerValue);
      const group = groups[date] || { promoters: 0, detractors: 0, total: 0 };
      group.total++;
      if (cat === 'PROMOTER') group.promoters++;
      else if (cat === 'DETRACTOR') group.detractors++;
      groups[date] = group;
    });

    const timeSeries = Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]: [string, any]) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        score: data.total > 0 ? Math.round(((data.promoters - data.detractors) / data.total) * 100) : 0
      }));

    // --- PROCESS CAMPAIGN STATS ---
    const byCampaign = campaigns.map((c: any) => {
      const campaignResponses: any[] = [];
      c.sessions.forEach((s: any) => {
        s.responses.forEach((r: any) => {
          if (r.answerValue !== null) campaignResponses.push(r);
        });
      });
      const cStats = calculateNpsStats(campaignResponses);
      return {
        name: c.name,
        total: cStats.total,
        score: cStats.score
      };
    }).filter((c: any) => c.total > 0);

    const result = {
      stats,
      distribution: distribution.map((count: any, index: number) => ({ score: index, count })),
      timeSeries,
      byCampaign,
      recent: (recentResponses as any[]).map((r: any) => ({
        id: r.id,
        contactName: r.session?.contact?.name || 'Paciente',
        campaignName: r.session?.campaign?.name || 'NPS',
        score: r.answerValue,
        comment: r.session?.responses?.find((resp: any) => resp.answerText)?.answerText || r.answerText,
        createdAt: r.createdAt
      }))
    };

    // 4. Save to Cache (Reduced to 30s for better real-time perception)
    await setTenantCached(tenantId, cacheKey, 30, result);

    res.json(result);
  } catch (error) {
    console.error('Unified dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/reports/detailed - Lightweight List of sessions only
router.get('/detailed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { campaignId, scoreCategory, startDate, endDate } = req.query;
    const tenantId = req.tenantId as string;
    
    // Cache key specific to the list results
    const cacheKey = `reports_list:${tenantId}:${page}:${limit}:${campaignId || ''}:${scoreCategory || ''}:${startDate || ''}:${endDate || ''}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    
    const where: any = { tenantId };
    
    if (campaignId && campaignId !== 'all') {
      where.campaignId = campaignId as string;
    }

    if (scoreCategory && scoreCategory !== 'all') {
      const respWhere: any = {};
      if (scoreCategory === 'promoter') respWhere.answerValue = { gte: 9 };
      else if (scoreCategory === 'neutral') respWhere.answerValue = { gte: 7, lte: 8 };
      else if (scoreCategory === 'detractor') respWhere.answerValue = { lte: 6 };
      
      where.responses = { some: respWhere };
    }

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate as string);
      if (endDate) where.startedAt.lte = new Date(endDate as string);
    }

    // 1. Efficient Count
    const countCacheKey = `count_reports_list:${tenantId}:${campaignId || ''}:${scoreCategory || ''}:${startDate || ''}:${endDate || ''}`;
    let totalCached = await redis.get(countCacheKey);
    let total: number;
    
    if (totalCached) {
      total = parseInt(JSON.parse(totalCached));
    } else {
      total = await prisma.surveySession.count({ where });
      await setTenantCached(tenantId, countCacheKey, 60, total.toString());
    }

    // 2. Fetch both the necessary 10 sessions for THIS page AND filtered stats for the header
    const statsWhere: any = { 
      tenantId, 
      answerValue: { not: null } 
    };
    
    if (campaignId && campaignId !== 'all') {
      statsWhere.session = { campaignId };
    }
    
    if (startDate || endDate) {
      statsWhere.createdAt = {}; // or use session: { startedAt: ... } if session-based
      if (startDate) statsWhere.createdAt.gte = new Date(startDate as string);
      if (endDate) statsWhere.createdAt.lte = new Date(endDate as string);
    }

    const [statsResult, distributionResult, sessions] = await Promise.all([
      prisma.surveyResponse.aggregate({
        where: statsWhere,
        _count: { id: true }
      }),
      prisma.surveyResponse.groupBy({
        by: ['answerValue'],
        where: statsWhere,
        _count: { id: true }
      }),
      prisma.surveySession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
          contact: { select: { name: true, phoneNumber: true, isMasked: true } },
          campaign: { select: { name: true } },
          responses: {
            where: { 
              OR: [
                { answerValue: { not: null } }, 
                { AND: [{ answerText: { not: null } }, { answerText: { not: '' } }] }
              ]
            },
            select: { answerValue: true, answerText: true, question: { select: { type: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    ]);

    // Calculate Stats for the header cards
    const fullStats = calculateNpsStats(distributionResult as any);
    const stats = {
      score: fullStats.score,
      total: fullStats.total,
      promoterPercentage: fullStats.promoterPercentage,
      detractorPercentage: fullStats.detractorPercentage
    };

    const result = {
      data: (sessions as any[]).map((s: any) => {
        // For the list view, we still show the first NPS score found
        const npsResponse = s.responses.find((r: any) => r.answerValue !== null);
        const commentResponse = s.responses.find((r: any) => r.answerText !== null && r.answerText !== '');
        
        return {
          id: s.id,
          name: s.contact.name || 'Anônimo',
          phone: s.contact.phoneNumber,
          campaign: s.campaign.name,
          score: npsResponse ? npsResponse.answerValue : 0,
          response: commentResponse ? commentResponse.answerText : (npsResponse?.answerText || ''),
          date: s.startedAt,
          status: s.status,
          isMasked: s.contact.isMasked
        };
      }),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      stats
    };

    await setTenantCached(tenantId, cacheKey, 60, result);
    res.json(result);
  } catch (error) {
    console.error('Detailed report error:', error);
    res.status(500).json({ error: 'Failed to fetch detailed report' });
  }
});

// GET /api/reports/stats - Heavy NPS Aggregation (Heavily Cached)
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { campaignId, startDate, endDate } = req.query;
    
    // Unique cache key for global stats
    const cacheKey = `reports_stats:${tenantId}:${campaignId || ''}:${startDate || ''}:${endDate || ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const where: any = { tenantId, answerValue: { not: null } };
    if (campaignId && campaignId !== 'all') where.session = { campaignId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [statsResult, distributionResult] = await Promise.all([
      prisma.surveyResponse.aggregate({
        where,
        _count: { id: true }
      }),
      prisma.surveyResponse.groupBy({
        by: ['answerValue'],
        where,
        _count: { id: true }
      })
    ]);

    const stats = calculateNpsStats(distributionResult as any);

    await setTenantCached(tenantId, cacheKey, 60, stats);
    res.json(stats);
  } catch (error) {
    console.error('NPS Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch NPS statistics' });
  }
});
router.get('/nps-stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId as string;
    const cacheKey = `reports_nps_stats:${tenantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const responses = await prisma.surveyResponse.findMany({
      where: {
        tenantId,
        answerValue: { not: null }
      },
      select: {
        answerValue: true
      }
    });

    const result = calculateNpsStats(responses);

    await setTenantCached(tenantId, cacheKey, 60, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

// GET /api/reports/distribution
router.get('/distribution', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId as string;
    const cacheKey = `reports_distribution:${tenantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const responses = await prisma.surveyResponse.findMany({
      where: {
        tenantId,
        answerValue: { not: null }
      },
      select: {
        answerValue: true
      }
    });

    const distribution = Array(11).fill(0);
    responses.forEach((r: any) => {
      const val = Math.round(r.answerValue || 0);
      if (val >= 0 && val <= 10) distribution[val]++;
    });

    const result = distribution.map((count, index) => ({ score: index, count }));
    await setTenantCached(tenantId, cacheKey, 60, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate distribution' });
  }
});

// GET /api/reports/session/:id - Detailed session view with history
router.get('/session/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenantId as string;

    // 1. Fetch current session with all its responses and question texts
    const session = await prisma.surveySession.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        campaign: { select: { name: true } },
        responses: {
          include: { question: { select: { text: true, type: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // 2. Fetch History: All OTHER sessions from this same contact
    const history = await prisma.surveySession.findMany({
      where: { 
        contactId: session.contactId, 
        tenantId,
        id: { not: id } // Exclude current
      },
      include: {
        campaign: { select: { name: true } },
        responses: {
          where: { answerValue: { not: null } },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 10 // Last 10 interaction points
    });

    res.json({
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        campaignName: session.campaign.name,
        contact: {
          id: session.contact.id,
          name: session.contact.name,
          phone: session.contact.phoneNumber,
          isMasked: session.contact.isMasked
        },
        responses: session.responses.map((r: any) => ({
          question: r.question.text,
          type: r.question.type,
          value: r.answerValue,
          text: r.answerText,
          createdAt: r.createdAt
        }))
      },
      history: history.map((h: any) => ({
        id: h.id,
        campaignName: h.campaign.name,
        date: h.startedAt,
        score: h.responses[0]?.answerValue || null
      }))
    });
  } catch (error) {
    console.error('Session detail error:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// Anonymize session
router.post('/anonymize-session/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    const tenantId = req.tenantId as string;
    
    const session = await prisma.surveySession.findFirst({
      where: { id: sessionId, tenantId },
      select: { contactId: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    await prisma.contact.update({
      where: { id: session.contactId, tenantId },
      data: {
        name: 'PACIENTE ANONIMIZADO (LGPD)',
        phoneNumber: '********',
        isMasked: true
      }
    });

    // Invalidate All Relevant Caches for this tenant (Scale Optimized)
    await invalidateTenantCache(tenantId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to anonymize' });
  }
});

// DELETE /api/reports/session/:sessionId
router.delete('/session/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    const tenantId = req.tenantId as string;

    const session = await prisma.surveySession.findFirst({
      where: { id: sessionId, tenantId }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    await prisma.surveySession.delete({ where: { id: sessionId } });

    // Invalidate Cache (Scale Optimized)
    await invalidateTenantCache(tenantId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
