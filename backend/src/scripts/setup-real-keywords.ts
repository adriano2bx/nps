import { prisma } from '../lib/prisma.js';

const TENANT_ID = '695cd04c-0383-4c1e-81b9-9867bb53b555';
const CHANNEL_ID = 'a5752c82-759f-4c80-b1f9-6752fd0b5f24';

const setup = [
  { name: 'NPS - Atendimento Unidade Centro', keyword: 'CENTRO' },
  { name: 'NPS - Atendimento Unidade Norte', keyword: 'NORTE' },
  { name: 'NPS - Pós-Cirúrgico Março', keyword: 'CIRURGICO' },
  { name: 'NPS - Agendamento Digital', keyword: 'AGENDA' },
  { name: 'NPS - Satisfação Geral Q1', keyword: 'Geral' }, // Using 'Geral' since 'TESTE' was on this one before, but lets clear it
];

async function run() {
  console.log('🛠 Configuring 5 surveys with keywords...');

  for (const s of setup) {
    const updated = await prisma.surveyCampaign.updateMany({
      where: { 
        tenantId: TENANT_ID,
        name: s.name 
      },
      data: {
        triggerType: 'qrcode',
        keyword: s.keyword,
        whatsappChannelId: CHANNEL_ID,
        closingMessage: 'Muito obrigado por sua participação! Sua opinião nos ajuda a melhorar cada vez mais. 🙏✨',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ ${s.name} -> Keyword: ${s.keyword}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
