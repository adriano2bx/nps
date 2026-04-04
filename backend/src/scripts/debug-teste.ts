import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('🔍 Debugging campaign: TESTE');
  
  const campaigns = await prisma.surveyCampaign.findMany({
    where: {
      keyword: {
         equals: 'TESTE',
         mode: 'insensitive'
      }
    },
    include: {
      whatsappChannel: true
    }
  });

  if (campaigns.length === 0) {
    console.error('❌ No campaign found with keyword "TESTE".');
    // List all active keywords to help the user
    const actives = await prisma.surveyCampaign.findMany({
      where: { status: 'ACTIVE' },
      select: { name: true, keyword: true, triggerType: true }
    });
    console.log('Active Keywords available:', actives);
  } else {
    campaigns.forEach(c => {
      console.log('--- Campaign found ---');
      console.log('ID:', c.id);
      console.log('Name:', c.name);
      console.log('Status:', c.status);
      console.log('TriggerType:', c.triggerType);
      console.log('Keyword (DB):', `"${c.keyword}"`);
      console.log('Channel ID:', c.whatsappChannelId);
      console.log('Channel Name:', c.whatsappChannel?.name);
      console.log('Provider:', c.whatsappChannel?.provider);
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
