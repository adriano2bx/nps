import { prisma } from '../lib/prisma.js';
import { invalidateTenantCache } from '../lib/redis.js';

/**
 * Cleanup Worker
 * Periodicamente encontra sessões 'OPEN' que excederam o timeout da campanha
 * e as fecha para evitar acúmulo de sessões "zumbis".
 */
export const setupCleanupWorker = () => {
  // Executa a cada 5 minutos
  setInterval(async () => {
    try {
      console.log('[CleanupWorker] 🧹 Checking for expired sessions...');
      
      const openSessions = await prisma.surveySession.findMany({
        where: { status: 'OPEN' },
        include: { campaign: true }
      });

      let closedCount = 0;
      const affectedTenants = new Set<string>();

      for (const session of openSessions) {
        const timeoutMinutes = session.campaign.timeout || 1440; // Default 24h
        const now = new Date();
        const startedAt = new Date(session.startedAt);
        const diffMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);

        if (diffMinutes > timeoutMinutes) {
          await prisma.surveySession.update({
            where: { id: session.id },
            data: { 
              status: 'CLOSED', 
              closedAt: now 
            }
          });
          closedCount++;
          affectedTenants.add(session.tenantId);
        }
      }

      if (closedCount > 0) {
        console.log(`[CleanupWorker] ✅ Closed ${closedCount} expired sessions.`);
        for (const tenantId of affectedTenants) {
          await invalidateTenantCache(tenantId);
        }
      }

    } catch (error) {
      console.error('[CleanupWorker] ❌ Error during cleanup:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
};
