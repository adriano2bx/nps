import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, tenant: { select: { name: true } } }
  });

  console.log('👥 Lista de Usuários:');
  users.forEach(u => {
    console.log(`- ${u.name} (<${u.email}>) [Tenant: ${u.tenant?.name || 'N/A'}]`);
  });

  const campaigns = await prisma.surveyCampaign.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { name: true, id: true, createdAt: true, tenant: { select: { name: true } } }
  });

  console.log('\n📊 Últimas 5 Campanhas Criadas (Global):');
  campaigns.forEach(c => {
    console.log(`- ${c.name} [ID: ${c.id}] [Criada em: ${c.createdAt}] [Tenant: ${c.tenant?.name || 'N/A'}]`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
