const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function seed() {
  console.log('🌱 Starting database seeding (Direct pg mode)...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL for seeding.');

    // 1. Generate IDs
    const tenantId = uuidv4();
    const userId = uuidv4();
    const channelId = uuidv4();

    // 2. Insert Tenant
    const tenantQuery = `
      INSERT INTO "Tenant" (id, name, slug, plan, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const tenantRes = await client.query(tenantQuery, [tenantId, 'Saúde Premium Clinic', 'saude-premium', 'PRO']);
    const finalTenantId = tenantRes.rows[0].id;
    console.log(`✅ Tenant created/updated: ${finalTenantId}`);

    // 3. Insert User
    const userQuery = `
      INSERT INTO "User" (id, "tenantId", name, email, "passwordHash", role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `;
    await client.query(userQuery, [userId, finalTenantId, 'Administrador Desktop', 'admin@saudepremium.com.br', 'change-me-123', 'ADMIN']);
    console.log('✅ User created (if not exists)');

    // 4. Insert WhatsApp Channel
    const channelQuery = `
      INSERT INTO "WhatsAppChannel" (id, "tenantId", name, provider, status, "phoneNumberId", "wabaId", "accessToken", "verifyToken", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `;
    await client.query(channelQuery, [
      channelId, 
      finalTenantId, 
      'Whatsapp Central', 
      'META', 
      'DISCONNECTED', 
      '1092837465', 
      '998273645', 
      'EAAC...', 
      'hvnps_abc123'
    ]);
    console.log('✅ Initial WhatsApp Channel created');

    console.log('✨ Seeding finished successfully.');
  } catch (err) {
    console.error('❌ Seeding FAILED:', err.message);
  } finally {
    await client.end();
  }
}

seed();
