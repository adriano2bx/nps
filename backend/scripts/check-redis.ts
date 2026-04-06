import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL as string);

async function main() {
  const keys = await redis.keys('*');
  console.log(`📦 Chaves encontradas no Redis (${keys.length}):`);
  
  for (const key of keys) {
    if (key.startsWith('sess:') || key.startsWith('auth:')) {
      const val = await redis.get(key);
      console.log(`- ${key}: ${val}`);
    } else {
       console.log(`- ${key}`);
    }
  }

  await redis.quit();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
