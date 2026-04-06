import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.DATABASE_URL?.replace('/dev?', '/campanhas?') || process.env.DATABASE_URL?.replace('/dev', '/campanhas');
const campaignId = '69d59b4d-d23d-4e50-b030-614c04a5b178';

async function main() {
  const client = new pg.Client({ connectionString: baseUrl });
  await client.connect();

  // Find a valid channel for this tenant
  const campaignRes = await client.query('SELECT "tenantId" FROM "SurveyCampaign" WHERE id = $1', [campaignId]);
  if (campaignRes.rows.length === 0) {
    console.log('❌ Campanha não encontrada.');
    await client.end();
    return;
  }
  const tenantId = campaignRes.rows[0].tenantId;

  const channelRes = await client.query('SELECT id FROM "WhatsAppChannel" WHERE "tenantId" = $1 LIMIT 1', [tenantId]);
  
  if (channelRes.rows.length === 0) {
    console.log('❓ Nenhum canal de WhatsApp encontrado para este tenant. Não é possível iniciar a campanha sem um canal.');
  } else {
    const channelId = channelRes.rows[0].id;
    await client.query(`
      UPDATE "SurveyCampaign" 
      SET 
        "whatsappChannelId" = $1, 
        "clinicName" = 'Clínica Saúde Premium', 
        "openingBody" = 'Olá! Gostaríamos de saber sua opinião sobre o nosso atendimento.', 
        "buttonYes" = '✅ Sim, participo', 
        "buttonNo" = '❌ Agora não',
        "closingMessage" = 'Obrigado por sua participação!',
        "status" = 'ACTIVE'
      WHERE id = $2
    `, [channelId, campaignId]);
    
    // Also add some options to the numeric question if it's currently empty
    await client.query(`
      UPDATE "SurveyQuestion"
      SET "options" = '["0", "1", "2", "3", "4", "5"]'
      WHERE "campaignId" = $1 AND "type" = 'nps' AND "options" = '[]'
    `, [campaignId]);

    console.log('✅ Campanha "Teste" corrigida manualmente e marcada como ATIVA.');
  }

  await client.end();
}

main().catch(console.error);
