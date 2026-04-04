import { prisma } from '../lib/prisma.js';

async function update() {
  await prisma.surveyCampaign.updateMany({
    where: { name: 'NPS - Satisfação Geral Q1' },
    data: { 
      triggerType: 'qrcode',
      keyword: 'TESTE'
    }
  });
  console.log('Keyword TESTE set on "NPS - Satisfação Geral Q1"');
  process.exit(0);
}

update().catch(err => {
  console.error(err);
  process.exit(1);
});
