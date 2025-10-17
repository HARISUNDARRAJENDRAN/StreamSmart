/**
 * Response Caching Utility - AWS ElastiCache Redis Implementation
 * Production-ready distributed caching solution
 */

// Re-export from the AWS ElastiCache implementation
export { awsElastiCache as cache, CacheTTL, generateCacheKey, cachedFetch } from './aws-redis-cache';

