import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis');
});

/**
 * Tenant-scoped Cache Helpers
 * Avoids using the expensive and blocking KEYS command in multi-tenant SaaS.
 */

export const setTenantCached = async (tenantId: string, key: string, ttl: number, data: any) => {
  const pipeline = redis.pipeline();
  pipeline.setex(key, ttl, JSON.stringify(data));
  pipeline.sadd(`tenant_keys:${tenantId}`, key); // Registry of keys for this tenant
  await pipeline.exec();
};

export const invalidateTenantCache = async (tenantId: string) => {
  const registryKey = `tenant_keys:${tenantId}`;
  const keys = await redis.smembers(registryKey);
  
  if (keys.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.del(...keys);
    pipeline.del(registryKey);
    await pipeline.exec();
    console.log(`[Redis Scale] Invalidated ${keys.length} keys for tenant ${tenantId}`);
  }
};

const SERVICE_INSTANCE_ID = `${process.pid}-${Math.random().toString(36).substring(2, 9)}`;
const activeLocks = new Set<string>();

/**
 * Robust Distributed Lock using Redis
 * Multi-process/Multi-instance safe.
 */
export const getLock = async (lockKey: string, ttlMs: number): Promise<boolean> => {
  const fullKey = `lock:${lockKey}`;
  
  // Try to set the lock if it does not exist (NX)
  const result = await redis.set(fullKey, SERVICE_INSTANCE_ID, 'PX', ttlMs, 'NX');
  
  if (result === 'OK') {
    activeLocks.add(lockKey);
    return true;
  }

  // If it already exists, check if we are the owners (Idempotency)
  const currentOwner = await redis.get(fullKey);
  if (currentOwner === SERVICE_INSTANCE_ID) {
    // We already own it, so "refresh" it (just a regular SET without NX)
    await redis.set(fullKey, SERVICE_INSTANCE_ID, 'PX', ttlMs);
    activeLocks.add(lockKey);
    return true;
  }

  return false;
};

export const releaseLock = async (lockKey: string): Promise<void> => {
  const fullKey = `lock:${lockKey}`;
  const currentOwner = await redis.get(fullKey);
  if (currentOwner === SERVICE_INSTANCE_ID) {
    await redis.del(fullKey);
    activeLocks.delete(lockKey);
  }
};

/**
 * Cleanup all locks held by this instance on shutdown
 */
export const releaseAllLocks = async () => {
  if (activeLocks.size === 0) return;
  console.log(`[Redis] 🧹 Releasing ${activeLocks.size} active locks...`);
  const pipeline = redis.pipeline();
  for (const lockKey of activeLocks) {
    pipeline.del(`lock:${lockKey}`);
  }
  await pipeline.exec();
  activeLocks.clear();
};

// Graceful Shutdown Handlers
process.on('SIGINT', async () => {
  await releaseAllLocks();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await releaseAllLocks();
  process.exit(0);
});
