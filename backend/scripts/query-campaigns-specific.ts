import { prisma } from '../src/lib/prisma.js';

async function main() {
  const campaigns = await prisma.surveyCampaign.findMany({
    where: {
      whatsappChannelId: 'b35b7588-8280-43f7-b748-8162417a0d27'
    }
  });
  console.log('Campaigns for channel b35b...:', JSON.stringify(campaigns, null, 2));

  const allWithKeywords = await prisma.surveyCampaign.findMany({
    where: {
      keyword: { not: null }
    }
  });
  console.log('Campaigns with keywords:', JSON.stringify(allWithKeywords, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
