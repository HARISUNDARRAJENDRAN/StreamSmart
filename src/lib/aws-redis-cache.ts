/**
 * AWS ElastiCache Redis Implementation
 * Production-ready distributed caching solution
 */

import Redis from 'ioredis';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AWSElastiCache {
  private redis: Redis;
  private defaultTTL: number = 60 * 1000; // 1 minute default (in milliseconds)
  private keyPrefix: string = 'streamsmart:cache:';
  private useTLS: boolean;

  constructor() {
    const host = process.env.AWS_ELASTICACHE_HOST || 'localhost';
    const tlsEnv = process.env.AWS_ELASTICACHE_TLS;
    // Default to TLS for non-local endpoints unless explicitly disabled
    this.useTLS = tlsEnv === 'true' || (tlsEnv !== 'false' && !['localhost', '127.0.0.1'].includes(host));

    // Initialize Redis connection for ElastiCache
    this.redis = new Redis({
      host,
      port: parseInt(process.env.AWS_ELASTICACHE_PORT || '6379'),
      password: process.env.AWS_ELASTICACHE_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately
      commandTimeout: 5000,
      connectTimeout: 10000,
      tls: this.useTLS ? {} : undefined,
    });

    // Error handling
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to AWS ElastiCache');
    });
  }

  private serialize<T>(entry: CacheEntry<T>): string {
    return JSON.stringify(entry);
  }

  private deserialize<T>(serialized: string): CacheEntry<T> {
    try {
      const parsed = JSON.parse(serialized) as unknown;

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('data' in parsed) ||
        !('timestamp' in parsed)
      ) {
        throw new Error('Parsed cache entry is invalid');
      }

      const cacheEntry = parsed as { data: unknown; timestamp: unknown };

      if (typeof cacheEntry.timestamp !== 'number') {
        throw new Error('Cache entry timestamp is invalid');
      }

      return {
        data: cacheEntry.data as T,
        timestamp: cacheEntry.timestamp,
      };
    } catch (error) {
      console.error('Cache deserialization error:', error);
      throw new Error('Failed to deserialize cached data');
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const serializedData = this.serialize({
        data,
        timestamp: Date.now(),
      });

      const cacheKey = this.getKey(key);
      const expireSeconds = Math.floor((ttl || this.defaultTTL) / 1000);

      await this.redis.setex(cacheKey, expireSeconds, serializedData);
    } catch (error) {
      console.error('Cache set error:', error);
      // Fail silently - don't break the application if cache fails
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serializedData = await this.redis.get(this.getKey(key));
      
      if (!serializedData) {
        return null;
      }

      const entry = this.deserialize<T>(serializedData);
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async invalidate(pattern?: string): Promise<void> {
    try {
      const matchPrefix = pattern ? this.getKey(pattern) : this.keyPrefix;
      const matchPattern = `${matchPrefix}*`;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', 1000);
        cursor = nextCursor;

        if (keys.length > 0) {
          const batchSize = 500;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await this.redis.del(...batch);
          }
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(this.getKey(key));
      return exists === 1;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  async size(): Promise<number> {
    try {
      let cursor = '0';
      let total = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', `${this.keyPrefix}*`, 'COUNT', 1000);
        cursor = nextCursor;
        total += keys.length;
      } while (cursor !== '0');

      return total;
    } catch (error) {
      console.error('Cache size error:', error);
      return 0;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

// Global cache instance
export const awsElastiCache = new AWSElastiCache();

// Cache TTL presets (in milliseconds) - same as before for compatibility
export const CacheTTL = {
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000,  // 30 minutes
  HOUR: 60 * 60 * 1000,  // 1 hour
} as const;

// Helper function to generate cache keys - same as before
type CacheKeyParam = string | number | boolean | null | undefined;

export function generateCacheKey(prefix: string, params: Record<string, CacheKeyParam>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${String(params[key])}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

// Cached API wrapper - updated for async operations
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = await awsElastiCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  await awsElastiCache.set(key, data, ttl);
  return data;
}
