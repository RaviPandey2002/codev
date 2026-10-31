import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { AppError } from '../utils/errors.js';

interface RateLimitConfig {
  max: number;
  windowSec: number;
  keyPrefix?: string;
  keyGenerator?: (req: FastifyRequest) => string;
}

interface InMemoryRecord {
  count: number;
  expiresAt: number;
}

class RateLimiterService {
  private redis: Redis | null = null;
  private isRedisReady: boolean = false;
  private memoryStore = new Map<string, InMemoryRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initRedis();
    this.initMemoryCleanup();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[RateLimiter] REDIS_URL not configured. Using in-memory fallback store.');
      }
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 5000,
      });

      this.redis.on('connect', () => {
        this.isRedisReady = true;
        console.info('[RateLimiter] Connected to Redis.');
      });

      this.redis.on('error', (err) => {
        this.isRedisReady = false;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[RateLimiter] Redis connection warning (falling back to memory):', err.message);
        }
      });

      this.redis.on('close', () => {
        this.isRedisReady = false;
      });

      this.redis.connect().catch((err) => {
        this.isRedisReady = false;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[RateLimiter] Failed to connect to Redis initially (using memory fallback):', err.message);
        }
      });
    } catch (err: any) {
      this.isRedisReady = false;
      console.warn('[RateLimiter] Failed to initialize Redis client:', err?.message);
    }
  }

  private initMemoryCleanup() {
    // Purge expired memory entries every 60 seconds
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.memoryStore.entries()) {
        if (now >= record.expiresAt) {
          this.memoryStore.delete(key);
        }
      }
    }, 60_000);

    // Unref timer so it does not block Node process exit during shutdown
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private async incrementRedis(key: string, windowSec: number): Promise<{ count: number; ttl: number }> {
    if (!this.redis || !this.isRedisReady) {
      throw new Error('Redis not ready');
    }

    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results || !results[0] || !results[1]) {
      throw new Error('Redis pipeline failed');
    }

    const count = results[0][1] as number;
    let ttl = results[1][1] as number;

    // If key just created or lacks TTL, set expiration
    if (count === 1 || ttl === -1) {
      await this.redis.expire(key, windowSec);
      ttl = windowSec;
    }

    return { count, ttl: Math.max(1, ttl) };
  }

  private incrementMemory(key: string, windowSec: number): { count: number; ttl: number } {
    const now = Date.now();
    const existing = this.memoryStore.get(key);

    if (!existing || now >= existing.expiresAt) {
      const expiresAt = now + windowSec * 1000;
      this.memoryStore.set(key, { count: 1, expiresAt });
      return { count: 1, ttl: windowSec };
    }

    existing.count += 1;
    const ttl = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
    return { count: existing.count, ttl };
  }

  async check(key: string, windowSec: number): Promise<{ count: number; ttl: number }> {
    if (this.redis && this.isRedisReady) {
      try {
        return await this.incrementRedis(key, windowSec);
      } catch {
        // Transparent fallback to in-memory on any runtime Redis failure
        return this.incrementMemory(key, windowSec);
      }
    }
    return this.incrementMemory(key, windowSec);
  }
}

export const rateLimiterService = new RateLimiterService();

/**
 * Fastify preHandler hook for route-level rate limiting
 */
export function rateLimit(config: RateLimitConfig) {
  const { max, windowSec, keyPrefix = 'rl', keyGenerator } = config;

  return async function rateLimitHook(req: FastifyRequest, reply: FastifyReply) {
    const identifier = keyGenerator ? keyGenerator(req) : (req.ip || '127.0.0.1');
    const storageKey = `rl:${keyPrefix}:${identifier}`;

    const { count, ttl } = await rateLimiterService.check(storageKey, windowSec);

    // Standard RFC RateLimit headers
    reply.header('RateLimit-Limit', max);
    reply.header('RateLimit-Remaining', Math.max(0, max - count));
    reply.header('RateLimit-Reset', ttl);

    if (count > max) {
      reply.header('Retry-After', ttl);
      throw new AppError(
        `Too many requests. Please try again in ${ttl} second${ttl === 1 ? '' : 's'}.`,
        429,
        'TOO_MANY_REQUESTS'
      );
    }
  };
}
