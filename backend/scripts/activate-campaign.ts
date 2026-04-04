import { prisma } from '../src/lib/prisma.js';

async function main() {
  const campaignId = '550537b7-5219-4d96-b679-780d805d3642';
  const targetChannelId = 'b35b7588-8280-43f7-b748-8162417a0d27';
  const targetTenantId = '7fc56bb1-a1c6-47dd-b29f-b45d30c03252';

  console.log(`[Activate] Updating campaign ${campaignId} to channel ${targetChannelId}...`);
  
  const updated = await prisma.surveyCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'ACTIVE',
      keyword: 'TESTE',
      whatsappChannelId: targetChannelId,
      tenantId: targetTenantId // Ensure tenant matches channel
    }
  });

  console.log('[Activate] ✅ Success:', JSON.stringify(updated, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
