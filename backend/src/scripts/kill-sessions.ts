import { prisma } from '../lib/prisma.js';
import { invalidateTenantCache } from '../lib/redis.js';

async function main() {
  console.log('🧹 Cleaning up all OPEN sessions...');
  
  // Find tenants affected to invalidate their catch
  const sessions = await prisma.surveySession.findMany({
    where: { status: 'OPEN' },
    select: { tenantId: true }
  });
  const uniqueTenants = [...new Set(sessions.map(s => s.tenantId))];

  const result = await prisma.surveySession.updateMany({
    where: { status: 'OPEN' },
    data: { 
      status: 'CLOSED', 
      closedAt: new Date() 
    }
  });

  // Invalidate cache for all affected tenants
  for (const tenantId of uniqueTenants) {
    await invalidateTenantCache(tenantId);
  }

  console.log(`✅ Success! Killed ${result.count} open sessions across ${uniqueTenants.length} tenants.`);
  
  const { redis } = await import('../lib/redis.js');
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error killing sessions:', err);
  process.exit(1);
});
