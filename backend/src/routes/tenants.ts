import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { redis } from '../lib/redis.js';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * Middleware to restrict access to MASTER_ADMIN only.
 */
const masterAdminOnly = async (req: AuthRequest, res: Response, next: any) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User ID missing from request' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user || user.role !== 'MASTER_ADMIN') {
      console.warn(`[Tenants] 🚫 Access denied for user ${req.userId} (Role: ${user?.role || 'None'})`);
      return res.status(403).json({ error: 'Acesso negado: Requer privilégios de Master Admin' });
    }

    next();
  } catch (error) {
    console.error('[Tenants] ❌ Auth Middleware Error:', error);
    res.status(500).json({ error: 'Erro interno na validação de permissões' });
  }
};

// GET /api/tenants/me - Get current tenant info
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId }
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant info' });
  }
});

// PUT /api/tenants/me - Update current tenant info (ADMIN only)
router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MASTER_ADMIN')) {
      return res.status(403).json({ error: 'Apenas administradores podem atualizar os dados da clínica' });
    }

    const { name, cnpj } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { name, cnpj }
    });

    // Invalidate caches
    const keys = await redis.keys(`*:${req.tenantId}*`);
    if (keys.length > 0) await redis.del(...keys);

    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update clinic info', details: error.message });
  }
});

// GET /api/tenants - List all tenants with stats
router.get('/', authMiddleware, masterAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { 
            users: true, 
            contacts: true, 
            campaigns: true,
            channels: true,
            responses: true
          }
        },
        campaigns: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform to include active/inactive counts
    const tenantsWithStats = tenants.map((tenant: any) => {
      const activeCampaigns = tenant.campaigns.filter((c: any) => c.status === 'ACTIVE').length;
      const inactiveCampaigns = tenant.campaigns.filter((c: any) => c.status !== 'ACTIVE').length;
      
      const { campaigns, ...counts } = tenant._count;
      
      return {
        ...tenant,
        _count: {
          ...counts,
          campaigns,
          activeCampaigns,
          inactiveCampaigns
        },
        campaigns: undefined // Remove the raw list to save bandwidth
      };
    });

    res.json(tenantsWithStats);
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// POST /api/tenants - Create new tenant with initial admin
router.post('/', authMiddleware, masterAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, plan, settings, adminEmail, adminPassword } = req.body;

    if (!name || !slug || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Nome, Slug, Email e Senha são obrigatórios' });
    }

    // 1. Check if slug already exists
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Este slug (subdomínio) já está em uso por outra empresa' });
    }

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          plan: plan || 'FREE',
          settings: settings || {}
        }
      });

      // Create Initial Admin User
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: `${name} Admin`,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN'
        }
      });

      return tenant;
    });

    console.log(`[Tenants] ✅ Nova empresa criada: ${name} (${slug})`);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Tenants] ❌ Falha ao criar empresa:', error);
    res.status(500).json({ error: 'Falha ao criar empresa', details: error.message });
  }
});

// PUT /api/tenants/:id - Update tenant
router.put('/:id', authMiddleware, masterAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, slug, plan, settings } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: id as string },
      data: {
        name,
        slug,
        plan,
        settings
      }
    });

    // Invalidate caches for this tenant
    const keys = await redis.keys(`*:${id as string}*`);
    if (keys.length > 0) await redis.del(...keys);

    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update tenant', details: error.message });
  }
});

// DELETE /api/tenants/:id
router.delete('/:id', authMiddleware, masterAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    
    // Prevent deleting the system tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: id as string } });
    if (tenant?.slug === 'system-admin') {
      return res.status(400).json({ error: 'Cannot delete system tenant' });
    }

    await prisma.tenant.delete({
      where: { id: id as string }
    });

    // Invalidate caches
    const keys = await redis.keys(`*:${id as string}*`);
    if (keys.length > 0) await redis.del(...keys);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;
