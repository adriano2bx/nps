import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

const TENANT_ID = '695cd04c-0383-4c1e-81b9-9867bb53b555';

async function seed() {
  console.log('🚀 Seeding 5 mock surveys for tenant:', TENANT_ID);

  const surveys = [
    { name: 'NPS - Atendimento Unidade Centro', clinic: 'Clínica Sorriso Centro' },
    { name: 'NPS - Atendimento Unidade Norte', clinic: 'Clínica Sorriso Norte' },
    { name: 'NPS - Pós-Cirúrgico Março', clinic: 'Centro de Reabilitação' },
    { name: 'NPS - Agendamento Digital', clinic: 'Central de Consultas' },
    { name: 'NPS - Satisfação Geral Q1', clinic: 'Grupo OdontoMax' },
  ];

  for (const s of surveys) {
    const campaign = await prisma.surveyCampaign.create({
      data: {
        tenantId: TENANT_ID,
        name: s.name,
        clinicName: s.clinic,
        triggerType: 'bulk',
        status: 'ACTIVE',
        questions: {
          create: [
            {
              orderIndex: 0,
              type: 'nps',
              text: 'Em uma escala de 0 a 10, o quanto você recomendaria nossos serviços?',
              options: '[]',
            },
            {
              orderIndex: 1,
              type: 'text',
              text: 'Qual o principal motivo da sua nota?',
              options: '[]',
            }
          ]
        }
      },
      include: { questions: true }
    });

    console.log(`Created Campaign: ${campaign.name} (${campaign.id})`);

    // Ensure we have at least one contact for this tenant
    let contact = await prisma.contact.findFirst({ where: { tenantId: TENANT_ID } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Usuário de Teste',
          phoneNumber: '5511999999999',
        }
      });
    }

    // Create 20 mock sessions for each
    for (let i = 0; i < 20; i++) {
      const score = Math.floor(Math.random() * 11);
      const isPromoter = score >= 9;
      const isPassive = score >= 7 && score <= 8;
      
      const session = await prisma.surveySession.create({
        data: {
          tenantId: TENANT_ID,
          campaignId: campaign.id,
          contactId: contact!.id,
          status: 'CLOSED',
          startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
          closedAt: new Date(),
          responses: {
            create: [
              {
                tenantId: TENANT_ID,
                questionId: campaign.questions[0].id,
                answerValue: score,
              },
              {
                tenantId: TENANT_ID,
                questionId: campaign.questions[1].id,
                answerText: isPromoter ? 'Excelente atendimento!' : isPassive ? 'Bom, mas pode melhorar.' : 'Demorou muito para me atender.',
              }
            ]
          }
        }
      });
    }
    console.log(`Added 20 responses to ${campaign.name}`);
  }

  console.log('✅ Done!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
