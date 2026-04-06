import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const campaigns = await prisma.surveyCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      tenant: { select: { name: true } },
      _count: { select: { questions: true } }
    }
  });

  if (campaigns.length === 0) {
    console.log('📭 Nenhuma campanha encontrada no banco de dados.');
    return;
  }

  console.log('✨ Campanhas Encontradas (da mais recente para a mais antiga):');
  campaigns.forEach(c => {
    console.log(`- "${c.name}" [Status: ${c.status}] [Criada em: ${c.createdAt}] [Tenant: ${c.tenant?.name}] [Perguntas: ${c._count.questions}]`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
