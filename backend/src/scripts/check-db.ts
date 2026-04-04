import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('--- Checking Active Campaigns ---');
  const campaigns = await prisma.surveyCampaign.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, keyword: true, status: true, whatsappChannelId: true }
  });
  console.log(JSON.stringify(campaigns, null, 2));

  console.log('--- Checking Channels ---');
  const channels = await prisma.whatsAppChannel.findMany({
    select: { id: true, name: true, phoneNumberId: true }
  });
  console.log(JSON.stringify(channels, null, 2));

  process.exit(0);
}

main().catch(console.error);
