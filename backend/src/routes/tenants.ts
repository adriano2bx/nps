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
    const user = await (prisma.user as any).findUnique({
      where: { id: req.userId }
    });

    if (!user || user.role !== 'MASTER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Master Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

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
            channels: true
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

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Admin email and password are required for new companies' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          plan: plan || 'FREE',
          settings: settings || {}
        }
      });

      // 2. Create Initial Admin User
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: `${name} Admin`,
          email: adminEmail,
          passwordHash,
          role: 'ADMIN' // Default admin for the new tenant
        }
      });

      return tenant;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Failed to create tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant', details: error.message });
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
