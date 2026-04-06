import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const userCount = await prisma.user.count();
  const tenantCount = await prisma.tenant.count();
  const campaignCount = await prisma.surveyCampaign.count();
  const questionCount = await prisma.surveyQuestion.count();
  const sessionCount = await prisma.surveySession.count();

  console.log('📊 Contagem de Registros:');
  console.log(`- Usuários: ${userCount}`);
  console.log(`- Tenantes: ${tenantCount}`);
  console.log(`- Campanhas: ${campaignCount}`);
  console.log(`- Perguntas: ${questionCount}`);
  console.log(`- Sessões: ${sessionCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
