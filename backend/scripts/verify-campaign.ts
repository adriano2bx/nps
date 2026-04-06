import { prisma } from '../src/lib/prisma.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const email = 'flavio@gmail.com';
  
  // Use 'campanhas' database instead of 'dev'
  const customUrl = process.env.DATABASE_URL?.replace('/dev?', '/campanhas?') || process.env.DATABASE_URL?.replace('/dev', '/campanhas');
  const prismaCustom = new PrismaClient({
    datasourceUrl: customUrl
  });

  // 1. Encontrar o usuário e seu tenantId
  const user = await prismaCustom.user.findUnique({
    where: { email },
    select: { tenantId: true, name: true }
  });

  if (!user) {
    console.log(`❌ Usuário com email ${email} não encontrado no banco 'campanhas'.`);
    await prismaCustom.$disconnect();
    return;
  }

  console.log(`🔍 Usuário encontrado: ${user.name} (Tenant ID: ${user.tenantId})`);

  // 2. Buscar a campanha mais recente para este tenant
  const campaign = await prismaCustom.surveyCampaign.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { questions: true }
      }
    }
  });

  if (!campaign) {
    console.log(`❌ Nenhuma campanha encontrada para o Tenant ID: ${user.tenantId} no banco 'campanhas'`);
    await prismaCustom.$disconnect();
    return;
  }

  console.log(`✅ Campanha mais recente encontrada no banco 'campanhas':`);
  console.log(`- Nome: ${campaign.name}`);
  console.log(`- ID: ${campaign.id}`);
  console.log(`- Status: ${campaign.status}`);
  console.log(`- Tipo: ${campaign.type}`);
  console.log(`- Perguntas: ${campaign._count.questions}`);
  console.log(`- Criada em: ${campaign.createdAt}`);
  console.log(`- Canal WA ID: ${campaign.whatsappChannelId || 'N/A'}`);

  await prismaCustom.$disconnect();
}


main().catch((e) => {
  console.error(e);
  process.exit(1);
});
