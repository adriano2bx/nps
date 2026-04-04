import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🌱 Gerando dados de teste...');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'saude-premium' }
  });

  if (!tenant) {
    console.error('❌ Tenant saude-premium não encontrado. Execute o seed inicial primeiro.');
    return;
  }

  // 1. Criar Canais se não existirem
  const channel = await prisma.whatsAppChannel.findFirst({
    where: { tenantId: tenant.id }
  });

  // 2. Criar uma Campanha de Teste
  const campaign = await prisma.surveyCampaign.create({
    data: {
      name: 'NPS Pós-Consulta Março/2026',
      tenantId: tenant.id,
      status: 'ACTIVE',
      whatsappChannelId: channel?.id,
      openingBody: 'Olá! Como foi sua consulta hoje?',
      closingMessage: 'Obrigado pelo seu feedback!',
      questions: {
        create: [
          {
            orderIndex: 0,
            type: 'nps',
            text: 'De 0 a 10, o quanto você recomendaria nossa clínica?',
            required: true,
            options: ''
          },
          {
            orderIndex: 1,
            type: 'text',
            text: 'Qual o principal motivo da sua nota?',
            required: false,
            options: ''
          }
        ]
      }
    },
    include: { questions: true }
  });

  const npsQuestion = campaign.questions.find(q => q.type === 'nps')!;
  const textQuestion = campaign.questions.find(q => q.type === 'text')!;

  // 3. Criar Contatos e Respostas (Promotores, Detratores, Neutros)
  const sampleData = [
    { name: 'Adriano Souza', phone: '5511999998888', score: 10, comment: 'Atendimento excelente!' },
    { name: 'Beatriz Lima', phone: '5511988887777', score: 9, comment: 'Muito bom, recomendo.' },
    { name: 'Carlos Mendes', phone: '5511977776666', score: 7, comment: 'Poderia ser mais rápido na recepção.' },
    { name: 'Daniela Ferro', phone: '5511966665555', score: 8, comment: 'Gostei do médico.' },
    { name: 'Eduardo Rocha', phone: '5511955554444', score: 5, comment: 'Atrasou muito o horário marcado.' },
    { name: 'Fernanda Luz', phone: '5511944443333', score: 3, comment: 'Tive problemas no agendamento.' },
    { name: 'Gustavo Silva', phone: '5511933332222', score: 10, comment: 'Tudo perfeito.' },
    { name: 'Helena Costa', phone: '5511922221111', score: 9, comment: 'Ótima infraestrutura.' },
  ];

  for (const data of sampleData) {
    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        phoneNumber: data.phone,
        tenantId: tenant.id
      }
    });

    const session = await prisma.surveySession.create({
      data: {
        campaignId: campaign.id,
        contactId: contact.id,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
        responses: {
          create: [
            {
              questionId: npsQuestion.id,
              answerValue: data.score,
            },
            {
              questionId: textQuestion.id,
              answerText: data.comment,
            }
          ]
        }
      }
    });

    console.log(`✅ Gerado: ${contact.name} - Nota: ${data.score}`);
  }

  console.log('✨ Dados de teste inseridos com sucesso.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
