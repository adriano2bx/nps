import { prisma } from './src/lib/prisma.js';

async function main() {
  try {
    const responses = await prisma.surveyResponse.findMany({
      include: {
        question: true,
        session: {
          include: {
            contact: true,
            campaign: true
          }
        }
      },
      take: 5
    });

    console.log('Recent Responses Details:');
    responses.forEach(r => {
      console.log(`- ID: ${r.id}`);
      console.log(`  Question ID: ${r.questionId}`);
      console.log(`  Question Text: ${r.question?.text}`);
      console.log(`  Question Type: ${r.question?.type}`);
      console.log(`  Answer Value: ${r.answerValue}`);
      console.log(`  Answer Text: ${r.answerText}`);
      console.log(`  Tenant ID: ${r.tenantId}`);
      console.log(`  Contact: ${r.session?.contact?.name}`);
      console.log('---');
    });

    const questions = await prisma.surveyQuestion.findMany({
      take: 10
    });
    console.log('Questions in DB:');
    questions.forEach(q => {
      console.log(`- ID: ${q.id}, Type: ${q.type}, Text: ${q.text}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
