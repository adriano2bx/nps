import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.DATABASE_URL?.replace('/dev?', '/campanhas?') || process.env.DATABASE_URL?.replace('/dev', '/campanhas');

async function main() {
  const client = new pg.Client({ connectionString: baseUrl });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('📋 Tabelas no banco campanhas:');
  res.rows.forEach(r => console.log(`- ${r.table_name}`));
  await client.end();
}

main().catch(console.error);
