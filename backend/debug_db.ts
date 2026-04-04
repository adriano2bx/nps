import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- CHANNELS ---');
  const channels = await prisma.whatsAppChannel.findMany();
  console.log(JSON.stringify(channels, null, 2));

  console.log('--- CAMPAIGNS ---');
  const campaigns = await prisma.surveyCampaign.findMany();
  console.log(JSON.stringify(campaigns, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
