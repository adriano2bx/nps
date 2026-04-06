import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const campaignId = '69d59b4d-d23d-4e50-b030-614c04a5b178';
const baseUrl = process.env.DATABASE_URL;
const customUrl = baseUrl.replace('/dev?', '/campanhas?') || baseUrl.replace('/dev', '/campanhas');

async function main() {
  const client = new pg.Client({ connectionString: customUrl });
  
  try {
    await client.connect();
    
    // 1. Check Full Campaign Metadata
    const campaignRes = await client.query('SELECT * FROM "SurveyCampaign" WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      console.log('❌ Campanha não encontrada.');
      return;
    }
    const campaign = campaignRes.rows[0];
    console.log('📋 Detalhes da Campanha:', JSON.stringify(campaign, null, 2));

    // 2. Check Questions
    const questionsRes = await client.query('SELECT * FROM "SurveyQuestion" WHERE "campaignId" = $1 ORDER BY "orderIndex" ASC', [campaignId]);
    console.log(`\n❓ Perguntas (${questionsRes.rows.length}):`);
    questionsRes.rows.forEach(q => {
      console.log(`- [${q.id}] ${q.text} (Tipo: ${q.type}, Opções: ${q.options})`);
    });

    // 3. Check Sessions (Attempts)
    const sessionsRes = await client.query('SELECT count(*) FROM "SurveySession" WHERE "campaignId" = $1', [campaignId]);
    console.log(`\n🚀 Sessões Criadas: ${sessionsRes.rows[0].count}`);

    // 4. Check Contacts in this Tenant
    const contactsRes = await client.query('SELECT count(*) FROM "Contact" WHERE "tenantId" = $1', [campaign.tenantId]);
    console.log(`\n👥 Contatos no Tenant: ${contactsRes.rows[0].count}`);

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
