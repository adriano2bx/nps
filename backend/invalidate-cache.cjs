const { Client } = require('pg');
const { Redis } = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // 1. Find the tenantId
    const res = await client.query(`
      SELECT "tenantId", email FROM "User" WHERE email = 'adriano@2bx.com.br'
    `);

    if (res.rows.length === 0) {
      console.log('--- ERROR: USER_NOT_FOUND ---');
      return;
    }

    const tenantId = res.rows[0].tenantId;
    console.log(`--- FOUND: USER:adriano@2bx.com.br | TENANT_ID:${tenantId} ---`);

    // 2. Clear Redis Cache for this tenant
    const registryKey = `tenant_keys:${tenantId}`;
    const keys = await redis.smembers(registryKey);
    
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      pipeline.del(...keys);
      pipeline.del(registryKey);
      await pipeline.exec();
      console.log(`--- REDIS: Invalidated ${keys.length} keys for tenant ${tenantId} ---`);
    } else {
      console.log(`--- REDIS: No keys found for tenant ${tenantId} ---`);
    }
    
    // Also clear ANY key that might contain the tenant info (just in case they aren't in the registry)
    // Common pattern: tenant:<id>, user:<id>, etc.
    const directKeys = await redis.keys(`*${tenantId}*`);
    if (directKeys.length > 0) {
        await redis.del(...directKeys);
        console.log(`--- REDIS: Deleted ${directKeys.length} direct keys containing tenantId ---`);
    }

  } catch (err) {
    console.error('--- ERROR:', err.message);
  } finally {
    await client.end();
    await redis.disconnect();
  }
}

main();
