import { prisma } from '../src/lib/prisma.js';

async function main() {
  const campaigns = await prisma.surveyCampaign.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      triggerType: true,
      keyword: true,
      whatsappChannelId: true,
      tenantId: true
    }
  });
  console.log(JSON.stringify(campaigns, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
