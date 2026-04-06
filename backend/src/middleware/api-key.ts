import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

export interface ApiRequest extends Request {
  tenantId?: string;
}

/**
 * Middleware to authenticate requests using X-API-KEY header.
 * Optimized with Redis to avoid constant DB lookups for every API call.
 */
export const apiKeyMiddleware = async (req: ApiRequest, res: Response, next: NextFunction) => {
  // Skip validation for preflight requests
  if (req.method === 'OPTIONS') return next();

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'X-API-KEY header is required' });
  }

  try {
    // 1. Check Redis Cache first (hash of the key is the cache key for safety)
    // We use a simple hash of the API key to avoid storing raw keys in Redis
    const keyParts = apiKey.split('.');
    if (keyParts.length !== 2) return res.status(401).json({ error: 'Invalid API Key format' });
    
    const [tenantId, rawSecret] = keyParts;
    if (!tenantId || !rawSecret) return res.status(401).json({ error: 'Invalid API Key format' });

    const cacheKey = `api_key_valid:${tenantId}`;

    const cachedHash = await redis.get(cacheKey);
    
    if (cachedHash) {
      const isValid = await bcrypt.compare(rawSecret, cachedHash as string);
      if (isValid) {
        req.tenantId = tenantId;
        return next();
      }
    }

    // 2. DB Lookups if not in cache or if cache says it's invalid (could be a new key)
    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId }
    });

    for (const record of apiKeys) {
      if (record.keyHash) {
        const isValid = await bcrypt.compare(rawSecret, record.keyHash);
        if (isValid) {
          // Cache the verified hash for 10 minutes
          await redis.setex(cacheKey, 600, record.keyHash);
          req.tenantId = tenantId;
          return next();
        }
      }
    }

    return res.status(401).json({ error: 'Invalid API Key' });
  } catch (error) {
    console.error('[ApiKeyMiddleware] Error:', error);
    res.status(500).json({ error: 'Internal Server Error during API Key validation' });
  }
};
