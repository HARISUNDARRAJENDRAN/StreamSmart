const API_BASE = 'http://localhost:3000';

async function testSegmentAwareRecommendations() {
  console.log('🧪 Testing Segment-Aware Recommendation System\n');
  
  // Test user ID - updated with actual user ID from database
  const testUserId = '68432bd8b4a864a199978f66';
  
  try {
    // Test 1: Basic segment-aware recommendations
    console.log('📊 Test 1: Basic Segment-Aware Recommendations');
    const basicResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        count: 10,
        contextType: 'homepage'
      })
    });
    
    const basicResult = await basicResponse.json();
    console.log('✅ Status:', basicResponse.status);
    console.log('📈 Recommendations count:', basicResult.recommendations?.length || 0);
    console.log('🎯 User segment:', basicResult.userSegment?.userType || 'None');
    console.log('🔢 Total clusters:', basicResult.clusteringInfo?.totalClusters || 0);
    console.log('📊 Clustering quality:', basicResult.clusteringInfo?.clusteringQuality || 'N/A');
    console.log('');
    
    // Test 2: Different segment sizes
    console.log('📊 Test 2: Different Segment Sizes');
    const segmentSizes = ['small', 'medium', 'large', 'auto'];
    
    for (const size of segmentSizes) {
      console.log(`Testing segment size: ${size}`);
      const response = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          count: 5,
          segmentSize: size,
          contextType: 'homepage'
        })
      });
      
      const result = await response.json();
      console.log(`  ✅ ${size}: ${result.recommendations?.length || 0} recommendations, ${result.clusteringInfo?.totalClusters || 0} clusters`);
    }
    console.log('');
    
    // Test 3: Different context types
    console.log('📊 Test 3: Context-Aware Recommendations');
    const contexts = ['homepage', 'category', 'search', 'video_page'];
    
    for (const context of contexts) {
      console.log(`Testing context: ${context}`);
      const response = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          count: 8,
          contextType: context,
          includeExploration: true
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const strategies = result.recommendations?.reduce((acc, rec) => {
          acc[rec.segmentStrategy] = (acc[rec.segmentStrategy] || 0) + 1;
          return acc;
        }, {});
        console.log(`  ✅ ${context}: ${result.recommendations?.length || 0} recommendations`);
        console.log(`     Strategies: ${Object.keys(strategies || {}).join(', ')}`);
      } else {
        console.log(`  ❌ ${context}: Error - ${result.error}`);
      }
    }
    console.log('');
    
    // Test 4: Segment information endpoint
    console.log('📊 Test 4: User Segment Information');
    const segmentResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware?userId=${testUserId}&info=segment`);
    const segmentResult = await segmentResponse.json();
    
    if (segmentResult.segment) {
      console.log('✅ User segment found:');
      console.log('  📍 Cluster ID:', segmentResult.segment.clusterId);
      console.log('  👥 Cluster size:', segmentResult.segment.clusterSize);
      console.log('  🏷️ User type:', segmentResult.segment.characteristics?.userType);
      console.log('  📊 Engagement:', segmentResult.segment.characteristics?.engagementLevel);
      console.log('  🎯 Strategy:', segmentResult.segment.characteristics?.recommendationStrategy);
      console.log('  👥 Similar users:', segmentResult.peers?.length || 0);
    } else {
      console.log('❌ No segment information found');
    }
    console.log('');
    
    // Test 5: Service information
    console.log('📊 Test 5: Service Information');
    const serviceResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware?userId=${testUserId}`);
    const serviceResult = await serviceResponse.json();
    
    console.log('✅ Service:', serviceResult.service);
    console.log('📊 Status:', serviceResult.status);
    console.log('🔧 Features:', serviceResult.features?.length || 0);
    console.log('📱 Contexts:', serviceResult.supportedContexts?.join(', '));
    console.log('👥 Segment types:', serviceResult.segmentTypes?.join(', '));
    console.log('');
    
    // Test 6: Advanced clustering configuration
    console.log('📊 Test 6: Advanced Clustering Configuration');
    const advancedResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        count: 12,
        refreshClusters: true,
        clusteringConfig: {
          numClusters: 5,
          linkageCriteria: 'ward',
          distanceMetric: 'euclidean',
          minClusterSize: 3
        },
        includeExploration: true,
        excludeViewed: true
      })
    });
    
    const advancedResult = await advancedResponse.json();
    if (advancedResult.success) {
      console.log('✅ Advanced configuration applied');
      console.log('📈 Recommendations:', advancedResult.recommendations?.length || 0);
      console.log('🎯 Average score:', advancedResult.analytics?.averageScore || 'N/A');
      console.log('📊 Strategy distribution:', Object.keys(advancedResult.analytics?.strategyDistribution || {}).join(', '));
      console.log('🔍 Recommendation diversity:', advancedResult.analytics?.qualityMetrics?.recommendation_diversity || 'N/A');
      
      if (advancedResult.segmentInsights) {
        console.log('💡 Segment insights:');
        console.log('  📛 Profile:', advancedResult.segmentInsights.segmentProfile?.name);
        console.log('  📝 Description:', advancedResult.segmentInsights.segmentProfile?.description);
        console.log('  📊 Relative size:', advancedResult.segmentInsights.segmentProfile?.relativeSize);
        console.log('  🎯 Approach:', advancedResult.segmentInsights.recommendationApproach?.strategy);
      }
    } else {
      console.log('❌ Advanced configuration failed:', advancedResult.error);
    }
    console.log('');
    
    // Test 7: Error handling
    console.log('📊 Test 7: Error Handling');
    
    // Test missing userId
    const noUserResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 10 })
    });
    console.log('✅ Missing userId status:', noUserResponse.status);
    
    // Test invalid userId
    const invalidUserResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'invalid_id', count: 10 })
    });
    console.log('✅ Invalid userId status:', invalidUserResponse.status);
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Test');
  const testUserId = '68432bd8b4a864a199978f66';
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        count: 20,
        segmentSize: 'medium',
        includeExploration: true
      })
    });
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`📊 Recommendations generated: ${result.recommendations?.length || 0}`);
    console.log(`🎯 Processing efficiency: ${((result.recommendations?.length || 0) / duration * 1000).toFixed(2)} recs/sec`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testSegmentAwareRecommendations();
  await performanceTest();
}

// Execute if running directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testSegmentAwareRecommendations,
  performanceTest,
  runAllTests
}; 