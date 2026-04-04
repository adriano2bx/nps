import { surveyEngine } from '../services/survey-engine.js';
import { prisma } from '../lib/prisma.js';

async function simulate() {
  const channelId = 'a5752c82-759f-4c80-b1f9-6752fd0b5f24'; // From logs
  const tenantId = '695cd04c-0383-4c1e-81b9-9867bb53b555';   // From logs
  const testPhone = '5511999999991@s.whatsapp.net';

  console.log('--- Step 0: Setup Test Campaign ---');
  // Cleanup old test data
  await prisma.surveySession.deleteMany({ where: { contact: { phoneNumber: testPhone } } });
  
  // Create or Update a Test Campaign
  const campaign = await prisma.surveyCampaign.upsert({
    where: { tenantId_keyword: { tenantId, keyword: 'PESQUISA' } },
    update: { status: 'ACTIVE', triggerType: 'qrcode' },
    create: {
      tenantId,
      name: 'Test flow simulation',
      status: 'ACTIVE',
      triggerType: 'qrcode',
      keyword: 'PESQUISA',
      whatsappChannelId: channelId,
      openingBody: 'Opa! Que bom ter você aqui.',
      closingMessage: 'Show! Valeu pelo feedback.',
      questions: {
        create: [
          { orderIndex: 1, type: 'nps', text: 'De 0 a 10, quanto nos indica?', options: '' },
          { orderIndex: 2, type: 'open', text: 'O que podemos melhorar?', options: '' }
        ]
      }
    }
  });
  console.log(`✅ Campaign ready: ${campaign.id}`);

  console.log('--- Step 1: Starting Survey (Keyword: PESQUISA) ---');
  try {
    await surveyEngine.handleIncomingMessage(channelId, testPhone, 'PESQUISA');
  } catch (e) {
    console.log('Capture (Step 1): sendMessage blocked (expected).');
  }
  await new Promise(r => setTimeout(r, 1000));

  console.log('--- Step 2: Restarting mid-flow (Keyword: PESQUISA) ---');
  try {
    await surveyEngine.handleIncomingMessage(channelId, testPhone, 'PESQUISA');
  } catch (e) {
    console.log('Capture (Step 2): Restart triggered.');
  }
  await new Promise(r => setTimeout(r, 1000));

  console.log('--- Verification: Checking for Replaced Session ---');
  const sessionCount = await prisma.surveySession.count({
     where: { contact: { phoneNumber: testPhone } }
  });
  const closedSessions = await prisma.surveySession.count({
     where: { contact: { phoneNumber: testPhone }, status: 'CLOSED' }
  });

  console.log('Total Sessions for Contact:', sessionCount);
  console.log('Closed (Pre-empted) Sessions:', closedSessions);

  if (sessionCount >= 2 && closedSessions >= 1) {
    console.log('✅ Success: Keyword priority and session pre-emption verified!');
  } else {
    console.error('❌ Failure: Session was not pre-empted/restarted.');
  }

  console.log('--- Verification: Checking Database ---');
  const session = await prisma.surveySession.findFirst({
     where: { contact: { phoneNumber: testPhone } },
     orderBy: { startedAt: 'desc' },
     include: { responses: true }
  });

  if (session) {
    console.log('Session Status:', session.status);
    console.log('Responses Count:', session.responses.length);
    console.log('Answers:', session.responses.map(r => r.answerValue || r.answerText));
  } else {
    console.error('❌ No session found for the test phone.');
  }

  const { redis } = await import('../lib/redis.js');
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
}

simulate().catch(console.error);
