import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function clearLocks() {
  console.log('🧹 Clearing all Backend locks...');
  
  // Get all keys with lock: prefix and baileys/backend patterns
  const backendKeys = await redis.keys('*lock:backend:*');
  
  const all = [...backendKeys];
  if (all.length > 0) {
    await redis.del(all);
    console.log(`✅ Deleted ${all.length} keys:`, all);
  } else {
    console.log('No keys to delete.');
  }
  
  await redis.quit();
}

clearLocks().catch(console.error);
