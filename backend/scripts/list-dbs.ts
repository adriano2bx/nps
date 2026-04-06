import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

// Extract base connection string (no DB name)
const baseUrl = connectionString.substring(0, connectionString.lastIndexOf('/') + 1) + 'postgres';

async function main() {
  const client = new pg.Client({ connectionString: baseUrl });
  await client.connect();
  
  const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
  console.log('📦 Bancos de Dados no Servidor:');
  res.rows.forEach(row => {
    console.log(`- ${row.datname}`);
  });
  
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
