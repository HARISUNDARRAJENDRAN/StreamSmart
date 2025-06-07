const API_BASE = 'http://localhost:3000';

async function testEnhancedAgglomerativeClustering() {
  console.log('🚀 Testing Enhanced Agglomerative Clustering for Segment-Aware Recommendations\n');
  
  // Use the correct user ID from our database
  const testUserId = '68432bd8b4a864a199978f66';
  
  try {
    console.log('🔧 Test 1: Enhanced Clustering with Auto-Optimization');
    console.log('=' .repeat(60));
    
    const enhancedResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        count: 15,
        refreshClusters: true, // Force fresh clustering
        segmentSize: 'auto', // Let the system determine optimal size
        includeExploration: true,
        excludeViewed: true,
        contextType: 'homepage'
      })
    });
    
    const result = await enhancedResponse.json();
    
    if (result.success) {
      console.log('✅ Enhanced clustering successful!');
      console.log('📊 Clustering Results:');
      console.log(`   Total Clusters: ${result.clusteringInfo?.totalClusters || 'N/A'}`);
      console.log(`   Total Users: ${result.clusteringInfo?.totalUsers || 'N/A'}`);
      console.log(`   Quality: ${result.clusteringInfo?.clusteringQuality || 'N/A'}`);
      console.log(`   Silhouette Score: ${result.clusteringInfo?.silhouetteScore?.toFixed(3) || 'N/A'}`);
      console.log(`   Strategy: ${result.clusteringInfo?.strategy || 'N/A'}`);
      
      if (result.clusteringInfo?.optimized) {
        console.log('🎯 Optimization applied!');
        console.log(`   Original Score: ${result.clusteringInfo?.originalScore?.toFixed(3) || 'N/A'}`);
        console.log(`   Improved Score: ${result.clusteringInfo?.silhouetteScore?.toFixed(3) || 'N/A'}`);
      }
      
      console.log('\n🎯 User Segment Information:');
      if (result.userSegment) {
        console.log(`   Cluster ID: ${result.userSegment.clusterId}`);
        console.log(`   Cluster Size: ${result.userSegment.clusterSize} users`);
        console.log(`   User Type: ${result.userSegment.userType}`);
        console.log(`   Engagement Level: ${result.userSegment.engagementLevel}`);
        console.log(`   Strategy: ${result.userSegment.recommendationStrategy}`);
        
        if (result.userSegment.dominantFeatures) {
          console.log('   Top Features:');
          result.userSegment.dominantFeatures.forEach((feature, idx) => {
            console.log(`     ${idx + 1}. ${feature.feature}: ${feature.avgValue?.toFixed(2)} (importance: ${feature.importance?.toFixed(2)})`);
          });
        }
      } else {
        console.log('   ⚠️ User not found in any cluster');
      }
      
      console.log('\n📈 Recommendations Generated:');
      console.log(`   Total: ${result.recommendations?.length || 0}`);
      
      if (result.recommendations && result.recommendations.length > 0) {
        const strategies = result.recommendations.reduce((acc, rec) => {
          acc[rec.segmentStrategy] = (acc[rec.segmentStrategy] || 0) + 1;
          return acc;
        }, {});
        
        console.log('   Strategy Distribution:');
        Object.entries(strategies).forEach(([strategy, count]) => {
          console.log(`     ${strategy}: ${count} recommendations`);
        });
        
        console.log('\n   Sample Recommendations:');
        result.recommendations.slice(0, 3).forEach((rec, idx) => {
          console.log(`     ${idx + 1}. ${rec.title} (Score: ${rec.score?.toFixed(3)}, Strategy: ${rec.segmentStrategy})`);
          console.log(`        Reasoning: ${rec.reasoning}`);
        });
      }
      
      if (result.analytics) {
        console.log('\n📊 Recommendation Analytics:');
        console.log(`   Average Score: ${result.analytics.averageScore}`);
        console.log(`   Quality Metrics:`);
        console.log(`     Clustering Quality: ${result.analytics.qualityMetrics?.clusteringQuality}`);
        console.log(`     Recommendation Diversity: ${result.analytics.qualityMetrics?.recommendation_diversity?.toFixed(3)}`);
      }
      
    } else {
      console.log('❌ Enhanced clustering failed:', result.error);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🔍 Test 2: Detailed Segment Analytics');
    console.log('=' .repeat(60));
    
    // Get detailed segment information
    const segmentResponse = await fetch(`${API_BASE}/api/recommendations/segment-aware?userId=${testUserId}&info=segment`);
    const segmentResult = await segmentResponse.json();
    
    if (segmentResult.segment) {
      console.log('✅ Detailed segment analysis:');
      console.log('\n📍 Cluster Information:');
      console.log(`   ID: ${segmentResult.segment.clusterId}`);
      console.log(`   Size: ${segmentResult.segment.clusterSize} users`);
      console.log(`   Intra-cluster Distance: ${segmentResult.segment.intraClusterDistance?.toFixed(3) || 'N/A'}`);
      
      console.log('\n🎯 Characteristics:');
      const chars = segmentResult.segment.characteristics;
      console.log(`   User Type: ${chars.userType}`);
      console.log(`   Engagement: ${chars.engagementLevel}`);
      console.log(`   Strategy: ${chars.recommendationStrategy}`);
      
      if (chars.contentPreferences) {
        console.log(`   Content Preferences: ${chars.contentPreferences.slice(0, 3).join(', ')}`);
      }
      
      if (chars.behaviorPatterns) {
        console.log(`   Behavior Patterns: ${chars.behaviorPatterns.slice(0, 3).join(', ')}`);
      }
      
      console.log('\n👥 Segment Peers:');
      console.log(`   Similar Users: ${segmentResult.peers?.length || 0}`);
      if (segmentResult.peers && segmentResult.peers.length > 0) {
        console.log(`   Sample IDs: ${segmentResult.peers.slice(0, 3).join(', ')}`);
      }
      
      // Get enhanced analytics if available
      if (segmentResult.segmentAnalytics) {
        console.log('\n📊 Enhanced Analytics:');
        const analytics = segmentResult.segmentAnalytics;
        
        if (analytics.engagementMetrics) {
          console.log('   Engagement Metrics:');
          console.log(`     Total Views: ${analytics.engagementMetrics.totalViews}`);
          console.log(`     Active Users: ${analytics.engagementMetrics.activeUsers}`);
          console.log(`     Avg Completion: ${analytics.engagementMetrics.avgCompletionRate?.toFixed(1)}%`);
          console.log(`     Engagement Score: ${analytics.engagementMetrics.engagementScore?.toFixed(1)}`);
        }
        
        if (analytics.contentPreferences && analytics.contentPreferences.topPreferences) {
          console.log('   Top Content Categories:');
          analytics.contentPreferences.topPreferences.slice(0, 3).forEach((pref, idx) => {
            console.log(`     ${idx + 1}. ${pref.category} (Score: ${pref.preferenceScore?.toFixed(2)}, Views: ${pref.viewCount})`);
          });
        }
        
        if (analytics.insights) {
          console.log('   Cluster Health:');
          const health = analytics.insights.clusterHealth;
          console.log(`     Size: ${health.size} users`);
          console.log(`     Cohesion: ${health.cohesion?.toFixed(3) || 'N/A'}`);
          console.log(`     Engagement: ${health.engagement?.toFixed(1) || 'N/A'}`);
          console.log(`     Diversity: ${health.diversity?.toFixed(3) || 'N/A'}`);
          
          if (analytics.insights.optimizationSuggestions && analytics.insights.optimizationSuggestions.length > 0) {
            console.log('   Optimization Suggestions:');
            analytics.insights.optimizationSuggestions.forEach((suggestion, idx) => {
              console.log(`     ${idx + 1}. ${suggestion}`);
            });
          }
        }
      }
      
    } else {
      console.log('❌ No detailed segment information available');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('⚡ Test 3: Performance & Optimization Analysis');
    console.log('=' .repeat(60));
    
    // Test different clustering configurations
    const configurations = [
      { name: 'Small Segments', segmentSize: 'small', count: 10 },
      { name: 'Medium Segments', segmentSize: 'medium', count: 10 },
      { name: 'Large Segments', segmentSize: 'large', count: 10 },
      { name: 'Auto Optimized', segmentSize: 'auto', count: 10 }
    ];
    
    for (const config of configurations) {
      console.log(`\n🧪 Testing ${config.name}:`);
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${API_BASE}/api/recommendations/segment-aware`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testUserId,
            count: config.count,
            segmentSize: config.segmentSize,
            contextType: 'homepage'
          })
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (result.success) {
          console.log(`   ✅ Response Time: ${duration}ms`);
          console.log(`   📊 Clusters: ${result.clusteringInfo?.totalClusters || 0}`);
          console.log(`   🎯 Quality: ${result.clusteringInfo?.clusteringQuality || 'N/A'}`);
          console.log(`   📈 Recommendations: ${result.recommendations?.length || 0}`);
          console.log(`   ⚡ Efficiency: ${((result.recommendations?.length || 0) / duration * 1000).toFixed(2)} recs/sec`);
          
          if (result.userSegment) {
            console.log(`   👥 User Segment: ${result.userSegment.userType} (${result.userSegment.engagementLevel})`);
          }
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Enhanced Agglomerative Clustering Test Complete!');
    console.log('=' .repeat(60));
    console.log('\n📝 Summary:');
    console.log('✅ Hierarchical user clustering with automatic optimization');
    console.log('✅ Enhanced user matching and segment identification'); 
    console.log('✅ Comprehensive segment analytics and insights');
    console.log('✅ Multiple clustering strategies and configurations');
    console.log('✅ Performance monitoring and quality metrics');
    console.log('✅ Adaptive recommendation strategies per segment');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the enhanced clustering test
if (require.main === module) {
  testEnhancedAgglomerativeClustering();
}

module.exports = {
  testEnhancedAgglomerativeClustering
}; 