import { prisma } from '../lib/prisma.js';

async function list() {
  const campaigns = await prisma.surveyCampaign.findMany({
    where: { 
      tenantId: '695cd04c-0383-4c1e-81b9-9867bb53b555',
      status: 'ACTIVE'
    },
    select: { name: true, keyword: true, triggerType: true }
  });
  console.log('--- Active Survey Keywords ---');
  campaigns.forEach(c => {
    if (c.keyword) {
      console.log(`- ${c.keyword}: ${c.name} (${c.triggerType})`);
    } else {
      console.log(`- (No Keyword): ${c.name} (${c.triggerType})`);
    }
  });
  process.exit(0);
}

list().catch(err => {
  console.error(err);
  process.exit(1);
});
