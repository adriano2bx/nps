import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantId = '2277c900-f366-4d46-a617-b59f4895eab4'; 
  
  console.log('�� Gerando 500 registros para o tenant:', tenantId);

  const campaignNames = [
    'Pós-Consulta Morumbi', 'NPS Anual 2026', 'Check-up Preventivo', 
    'Feedback Exames', 'Maternidade Visão', 'Pronto Atendimento',
    'Ambulatório Central', 'Telemedicina Qualidade', 'Nutrição Clínica',
    'Agendamento Centralizado'
  ];

  const now = new Date();
  let totalCreated = 0;

  for (const name of campaignNames) {
    console.log(`📦 Criando campanha e 50 respostas: ${name}`);
    const campaign = await prisma.surveyCampaign.create({
      data: {
        name,
        tenantId,
        status: 'active',
        questions: {
          createMany: {
            data: [
              { orderIndex: 0, type: 'nps', text: 'De 0 a 10, quanto você recomenda?', options: '' },
              { orderIndex: 1, type: 'text', text: 'Por que você deu essa nota?', options: '', required: false }
            ]
          }
        }
      },
      include: { questions: true }
    });

    const npsQ = campaign.questions.find(q => q.type === 'nps')!;
    const textQ = campaign.questions.find(q => q.type === 'text')!;

    for (let i = 0; i < 50; i++) {
       const daysAgo = Math.floor(Math.random() * 180);
       const date = new Date();
       date.setDate(now.getDate() - daysAgo);

       const contact = await prisma.contact.create({
         data: {
           name: `Paciente ${uuidv4().substring(0, 5)}`,
           phoneNumber: `55119${Math.floor(10000000 + Math.random() * 90000000)}`,
           tenantId
         }
       });

       const session = await prisma.surveySession.create({
         data: {
           tenantId,
           campaignId: campaign.id,
           contactId: contact.id,
           status: 'completed',
           startedAt: date
         }
       });

       const rand = Math.random();
       let score = 10;
       if (rand < 0.15) score = Math.floor(Math.random() * 7);
       else if (rand < 0.3) score = Math.floor(Math.random() * 2) + 7;
       else score = Math.floor(Math.random() * 2) + 9;

       await prisma.surveyResponse.create({
         data: {
           tenantId,
           sessionId: session.id,
           questionId: npsQ.id,
           answerValue: score,
           createdAt: date
         }
       });

       if (Math.random() > 0.4) {
         await prisma.surveyResponse.create({
           data: {
             tenantId,
             sessionId: session.id,
             questionId: textQ.id,
             answerText: 'Comentário de teste para análise.',
             createdAt: date
           }
         });
       }
       totalCreated++;
    }
  }
  console.log(`✅ Concluído. ${totalCreated} registros gerados.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
