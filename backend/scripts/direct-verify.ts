import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const email = 'flavio@gmail.com';
const baseUrl = process.env.DATABASE_URL;

if (!baseUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const customUrl = baseUrl.replace('/dev?', '/campanhas?') || baseUrl.replace('/dev', '/campanhas');

async function main() {
  console.log(`📡 Conectando ao banco 'campanhas' em: ${customUrl}`);
  const client = new pg.Client({ connectionString: customUrl });
  
  try {
    await client.connect();
    
    // 1. Verificar se o usuário existe
    const userRes = await client.query('SELECT id, "tenantId", name FROM "User" WHERE email = $1', [email]);
    
    if (userRes.rows.length === 0) {
      console.log(`❌ Usuário '${email}' não encontrado no banco 'campanhas'.`);
      
      // Listar todos os usuários para ajudar
      const allUsers = await client.query('SELECT email FROM "User" LIMIT 10');
      console.log('👥 Alguns usuários no banco campanhas:');
      allUsers.rows.forEach(u => console.log(`- ${u.email}`));
      
      return;
    }
    
    const user = userRes.rows[0];
    console.log(`🔍 Usuário encontrado: ${user.name} (Tenant ID: ${user.tenantId})`);
    
    // 2. Buscar a campanha mais recente
    const campaignRes = await client.query(`
      SELECT id, name, status, type, "createdAt", "whatsappChannelId"
      FROM "SurveyCampaign"
      WHERE "tenantId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [user.tenantId]);
    
    if (campaignRes.rows.length === 0) {
      console.log(`❌ Nenhuma campanha encontrada para o Tenant ID: ${user.tenantId} no banco 'campanhas'`);
      return;
    }
    
    const campaign = campaignRes.rows[0];
    console.log(`✅ Campanha mais recente encontrada no banco 'campanhas':`);
    console.log(`- Nome: ${campaign.name}`);
    console.log(`- ID: ${campaign.id}`);
    console.log(`- Status: ${campaign.status}`);
    console.log(`- Tipo: ${campaign.type}`);
    console.log(`- Criada em: ${campaign.createdAt}`);
    console.log(`- Canal WA ID: ${campaign.whatsappChannelId || 'N/A'}`);
    
  } catch (err) {
    console.error('❌ Erro durante a verificação:', err);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
