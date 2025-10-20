/**
 * In-Memory Cache for Lambda@Edge
 * Since Lambda@Edge cannot access VPC resources (like ElastiCache),
 * we use an in-memory cache that persists across invocations
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private keyPrefix: string = 'streamsmart:';

  constructor() {
    this.cache = new Map();
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async set<T>(key: string, data: T, ttl: number = 60000): Promise<void> {
    try {
      const cacheKey = this.getKey(key);
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Cleanup old entries periodically (every 100 sets)
      if (this.cache.size % 100 === 0) {
        this.cleanup();
      }
    } catch (error) {
      console.error('Memory cache set error:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getKey(key);
      const entry = this.cache.get(cacheKey);

      if (!entry) {
        return null;
      }

      if (this.isExpired(entry)) {
        this.cache.delete(cacheKey);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error('Memory cache get error:', error);
      return null;
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = Array.from(this.cache.keys());
      const matchingKeys = keys.filter((k) => k.includes(pattern));

      for (const key of matchingKeys) {
        this.cache.delete(key);
      }
    } catch (error) {
      console.error('Memory cache invalidate error:', error);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const memoryCache = new MemoryCache();

// Export TTL constants for consistency
export const CacheTTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
};

export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join(':');
  return `${prefix}:${sortedParams}`;
}
