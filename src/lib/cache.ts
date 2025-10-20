/**
 * Response Caching Utility
 * Uses in-memory cache for Lambda@Edge compatibility
 * (Lambda@Edge cannot access VPC resources like ElastiCache)
 */

// Re-export from the memory cache implementation for Lambda@Edge
export { memoryCache as cache, CacheTTL, generateCacheKey } from './memory-cache';

// Placeholder for cachedFetch to maintain API compatibility
export async function cachedFetch(url: string, options?: RequestInit, ttl?: number): Promise<Response> {
  return fetch(url, options);
}

