/**
 * Request Deduplication - AWS ElastiCache Redis Implementation
 * Prevents duplicate simultaneous API requests using distributed caching
 */

import Redis from 'ioredis';

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

class DistributedRequestDeduplicator {
  private redis: Redis;
  private pending: Map<string, PendingRequest<any>> = new Map();
  private ttl: number = 5000; // 5 seconds
  private keyPrefix: string = 'streamsmart:dedup:';
  private maxRetries: number;
  private useTLS: boolean;

  constructor() {
    // Initialize Redis connection for distributed deduplication
    const host = process.env.AWS_ELASTICACHE_HOST || 'localhost';
    const tlsEnv = process.env.AWS_ELASTICACHE_TLS;
  this.useTLS = tlsEnv === 'true' || (tlsEnv !== 'false' && !['localhost', '127.0.0.1'].includes(host));
  const parsedRetries = Number(process.env.REQUEST_DEDUP_MAX_RETRIES);
  this.maxRetries = Number.isFinite(parsedRetries) && parsedRetries > 0 ? parsedRetries : 10;

    this.redis = new Redis({
      host,
      port: parseInt(process.env.AWS_ELASTICACHE_PORT || '6379'),
      password: process.env.AWS_ELASTICACHE_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      commandTimeout: 5000,
      connectTimeout: 10000,
      tls: this.useTLS ? {} : undefined,
    });

    this.redis.on('error', (error) => {
      console.error('Redis deduplication error:', error);
    });
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private sanitizePattern(pattern: string): string | null {
    if (pattern.length > 200) {
      console.warn('Dedup clear pattern too long; skipping operation');
      return null;
    }

    const safe = pattern.replace(/[^a-zA-Z0-9:_=\-*]/g, '');
    if (!safe) {
      console.warn('Dedup clear pattern became empty after sanitization; skipping');
      return null;
    }

    if (safe !== pattern) {
      console.warn('Dedup clear pattern contained unsafe characters; sanitized value will be used');
    }

    return safe;
  }

  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.pending.get(key);

    // Return existing promise if still valid (in-memory cache for performance)
    if (existing && (now - existing.timestamp) < this.ttl) {
      return existing.promise;
    }

    // Check Redis for distributed deduplication
    const redisKey = this.getKey(key);
    const lockTtlSeconds = Math.max(1, Math.ceil(this.ttl / 1000));
    let lockAcquired = false;

    try {
      for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
        const result = await this.redis.set(redisKey, '1', 'EX', lockTtlSeconds, 'NX');

        if (result) {
          lockAcquired = true;
          break;
        }

        await this.sleep(Math.min(100 * (attempt + 1), 500));

        const pendingRetry = this.pending.get(key);
        if (pendingRetry && (Date.now() - pendingRetry.timestamp) < this.ttl) {
          return pendingRetry.promise;
        }
      }

      if (!lockAcquired) {
        console.warn(`Distributed dedup retry limit reached for key ${key}. Proceeding without lock.`);
      }
    } catch (error) {
      console.error('Distributed deduplication error:', error);
      // Fall back to local deduplication only
    }

    // Create new request
    const lockHeld = lockAcquired;

    const promise = fetcher().finally(async () => {
      this.pending.delete(key);
      try {
        if (lockHeld) {
          await this.redis.del(this.getKey(key));
        }
      } catch (error) {
        console.error('Error removing deduplication lock:', error);
      }
    });

    this.pending.set(key, {
      promise,
      timestamp: now,
    });

    return promise;
  }

  async clear(pattern?: string): Promise<void> {
    // Clear local in-memory pending requests
    if (!pattern) {
      this.pending.clear();
    } else {
      const sanitizedPattern = this.sanitizePattern(pattern);
      if (!sanitizedPattern) {
        return;
      }

      const keys = Array.from(this.pending.keys());
      for (const key of keys) {
        if (key.includes(sanitizedPattern)) {
          this.pending.delete(key);
        }
      }
      pattern = sanitizedPattern;
    }

    // Clear distributed locks
    try {
      const sanitized = pattern ? this.sanitizePattern(pattern) : undefined;

      const matchPrefix = sanitized ? this.getKey(sanitized) : this.keyPrefix;
      const matchPattern = sanitized
        ? (matchPrefix.endsWith('*') ? matchPrefix : `${matchPrefix}*`)
        : `${this.keyPrefix}*`;

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
      console.error('Error clearing distributed deduplication locks:', error);
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

export const requestDedup = new DistributedRequestDeduplicator();

