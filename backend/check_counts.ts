import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const responses = await prisma.surveyResponse.count();
  const questions = await prisma.surveyQuestion.findMany({
    select: { id: true, type: true }
  });
  const npsResponses = await prisma.surveyResponse.count({
    where: { question: { type: 'nps' } }
  });

  console.log('Total responses:', responses);
  console.log('NPS responses (with type:nps filter):', npsResponses);
  console.log('Questions types:', questions.map(q => q.type));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
