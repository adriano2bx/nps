import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🌱 Gerando CENTENAS de dados de teste...');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'saude-premium' }
  });

  if (!tenant) {
    console.error('❌ Tenant saude-premium não encontrado.');
    return;
  }

  const channel = await prisma.whatsAppChannel.findFirst({
    where: { tenantId: tenant.id }
  });

  // Reutilizar ou criar campanha
  let campaign = await prisma.surveyCampaign.findFirst({
    where: { name: 'NPS Global 2026', tenantId: tenant.id },
    include: { questions: true }
  });

  if (!campaign) {
    campaign = await prisma.surveyCampaign.create({
      data: {
        name: 'NPS Global 2026',
        tenantId: tenant.id,
        status: 'ACTIVE',
        whatsappChannelId: channel?.id,
        questions: {
          create: [
            { orderIndex: 0, type: 'nps', text: 'Nota de recomendação?', required: true, options: '' },
            { orderIndex: 1, type: 'text', text: 'Por que?', required: false, options: '' }
          ]
        }
      },
      include: { questions: true }
    });
  }

  const npsQ = campaign.questions.find(q => q.type === 'nps')!;
  const textQ = campaign.questions.find(q => q.type === 'text')!;

  const firstNames = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio', 'Gislaine', 'Hugo', 'Iris', 'João', 'Kelly', 'Lucas', 'Maya', 'Nuno', 'Olivia', 'Paulo', 'Rosa', 'Samuel', 'Tais', 'Vitor'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];
  const comments = [
    'Ótimo atendimento!', 'Médico muito atencioso.', 'A recepção demorou um pouco.', 'Instalações excelentes.', 
    'Preço justo.', 'Recomendo a todos.', 'O cafezinho estava frio.', 'Não gostei do atraso.', 
    'Fui muito bem tratado.', 'Sempre impecável.', 'Ambiente limpo.', 'A atendente foi grossa.',
    'Voltarei com certeza.', 'Nota 10!', 'Poderia ser melhor.', 'Equipe de parabéns.'
  ];

  console.log('⏳ Inserindo 200 registros...');

  for (let i = 0; i < 200; i++) {
    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const phone = `55119${Math.floor(10000000 + Math.random() * 90000000)}`;
    const score = Math.floor(Math.random() * 11); // 0 a 10
    const comment = score >= 9 ? comments[Math.floor(Math.random() * 5)] : (score <= 6 ? comments[Math.floor(Math.random() * 5) + 5] : comments[Math.floor(Math.random() * comments.length)]);

    const contact = await prisma.contact.create({
      data: { name, phoneNumber: phone, tenantId: tenant.id }
    });

    await prisma.surveySession.create({
      data: {
        tenantId: tenant.id,
        campaignId: campaign.id,
        contactId: contact.id,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - Math.floor(Math.random() * 2592000000)), // Últimos 30 dias
        responses: {
          create: [
            { tenantId: tenant.id, questionId: npsQ.id, answerValue: score },
            { tenantId: tenant.id, questionId: textQ.id, answerText: comment }
          ]
        }
      }
    });

    if (i % 50 === 0) console.log(`🚀 Progresso: ${i}/200`);
  }

  console.log('✨ 200 registros inseridos com sucesso!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
