/**
 * Cache Integration Test
 * Tests the AWS ElastiCache Redis integration
 */

import { awsElastiCache, CacheTTL, generateCacheKey } from './aws-redis-cache';

async function testCacheIntegration() {
  console.log('Testing AWS ElastiCache Redis integration...');

  try {
    // Test basic set/get operations
    const testData = { message: 'Hello Redis!', timestamp: Date.now() };
    const key = generateCacheKey('test', { type: 'integration-test' });

    await awsElastiCache.set(key, testData, CacheTTL.SHORT);
    console.log('✓ Cache set successful');

    const retrieved = await awsElastiCache.get(key);
    if (retrieved && retrieved.message === testData.message) {
      console.log('✓ Cache get successful');
    } else {
      console.error('✗ Cache get failed');
      return false;
    }

    // Test cache invalidation
    await awsElastiCache.invalidate(`test:type=integration-test`);
    const afterInvalidate = await awsElastiCache.get(key);
    if (afterInvalidate === null) {
      console.log('✓ Cache invalidation successful');
    } else {
      console.error('✗ Cache invalidation failed');
      return false;
    }

    // Test cache health
    const isHealthy = await awsElastiCache.isHealthy();
    if (isHealthy) {
      console.log('✓ Redis health check passed');
    } else {
      console.log('⚠ Redis health check failed (may be offline)');
    }

    console.log('Cache integration test completed successfully!');
    return true;

  } catch (error) {
    console.error('Cache integration test failed:', error);
    return false;
  }
}

// Test function for request deduplication
async function testRequestDeduplication() {
  console.log('Testing request deduplication...');

  try {
    const { requestDedup } = await import('./request-dedup');
    
    const testKey = 'dedup-test-key';
    let callCount = 0;

    // Simulate simultaneous requests
    const promises = Array(3).fill(null).map(async (_, index) => {
      return await requestDedup.dedupe(testKey, async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
        return `result-${index}`;
      });
    });

    const results = await Promise.all(promises);
    
    // Should have only called the fetch function once
    if (callCount === 1) {
      console.log('✓ Request deduplication successful');
      console.log(`All requests returned result: ${results[0]}`);
    } else {
      console.error(`✗ Request deduplication failed - function called ${callCount} times`);
      return false;
    }

    // Test clearing
    await requestDedup.clear(testKey);
    console.log('✓ Request deduplication clear successful');

    return true;
  } catch (error) {
    console.error('Request deduplication test failed:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    console.log('Starting cache system tests...\n');
    
    const cacheTest = await testCacheIntegration();
    console.log('');
    const dedupTest = await testRequestDeduplication();
    console.log('');

    if (cacheTest && dedupTest) {
      console.log('🎉 All cache system tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed');
      process.exit(1);
    }
  })();
}

export { testCacheIntegration, testRequestDeduplication };
