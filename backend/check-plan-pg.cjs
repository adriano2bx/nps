const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Check user and tenant
    const res = await client.query(`
      SELECT u.email, t.id, t.name, t.plan 
      FROM "User" u 
      JOIN "Tenant" t ON u."tenantId" = t.id 
      WHERE u.email = 'adriano@2bx.com.br';
    `);

    if (res.rows.length === 0) {
      console.log('--- DB_CHECK: USER_NOT_FOUND ---');
    } else {
      res.rows.forEach(r => {
        console.log(`--- DB_CHECK: USER:${r.email} | TENANT:${r.name} | PLAN:${r.plan} ---`);
      });
    }

  } catch (err) {
    console.error('--- DB_CHECK: ERROR:', err.message);
  } finally {
    await client.end();
  }
}

main();
