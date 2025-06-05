import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { clusteringFeatureService } from '@/services/clusteringFeatureService';
import { agglomerativeClusteringService } from '@/services/agglomerativeClusteringService';
import { segmentAwareRecommendationService } from '@/services/segmentAwareRecommendationService';
import { dataPreprocessingService } from '@/services/dataPreprocessingService';
import User from '@/models/User';
import UserViewingHistory from '@/models/UserViewingHistory';

// Add CORS headers for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

// POST: Get segment-aware recommendations for a user
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userId,
      count = 10,
      excludeViewed = true,
      includeExploration = true,
      contextType = 'homepage',
      refreshClusters = false,
      clusteringConfig = {},
      segmentSize = 'auto' // 'small', 'medium', 'large', 'auto'
    } = await request.json();

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`🎯 Generating segment-aware recommendations for user: ${userId}`);
    console.log(`📊 Config: ${count} recommendations, context: ${contextType}`);

    // Step 1: Determine clustering scope based on segment size preference
    const clusteringScope = await determineClusteringScope(userId, segmentSize);
    
    console.log(`🔍 Clustering scope: ${clusteringScope.userIds.length} users (${clusteringScope.strategy})`);

    // Step 2: Get or create user clusters
    let userClusters;
    if (refreshClusters || !clusteringScope.useCache) {
      userClusters = await generateFreshClusters(clusteringScope.userIds, clusteringConfig);
    } else {
      // Try to get cached clusters or generate new ones
      userClusters = await getOrGenerateClusters(clusteringScope.userIds, clusteringConfig);
    }

    console.log(`📈 Generated ${userClusters.clusters.length} user clusters`);

    // Step 3: Generate segment-aware recommendations
    const recommendationRequest = {
      userId,
      count,
      excludeViewed,
      includeExploration,
      contextType: contextType as 'homepage' | 'category' | 'search' | 'video_page'
    };

    const recommendations = await segmentAwareRecommendationService.getRecommendations(
      recommendationRequest,
      userClusters.clusters
    );

    // Step 4: Get user's segment information
    const userSegment = userClusters.clusters.find(cluster => 
      cluster.userIds.includes(userId)
    );

    // Step 5: Calculate recommendation analytics
    const analytics = await calculateRecommendationAnalytics(
      recommendations,
      userSegment,
      userClusters
    );

    // Step 6: Get segment insights
    const segmentInsights = userSegment ? 
      await getSegmentInsights(userSegment, userClusters.clusters) : null;

    const response = {
      success: true,
      recommendations,
      userSegment: userSegment ? {
        clusterId: userSegment.clusterId,
        clusterSize: userSegment.clusterSize,
        userType: userSegment.characteristics.userType,
        engagementLevel: userSegment.characteristics.engagementLevel,
        recommendationStrategy: userSegment.characteristics.recommendationStrategy,
        dominantFeatures: userSegment.characteristics.dominantFeatures.slice(0, 3)
      } : null,
      segmentInsights,
      analytics,
      clusteringInfo: {
        totalClusters: userClusters.clusters.length,
        totalUsers: userClusters.metadata.totalUsers,
        clusteringQuality: userClusters.metadata.clusteringQuality,
        silhouetteScore: userClusters.metadata.silhouetteScore,
        strategy: clusteringScope.strategy
      },
      metadata: {
        userId,
        requestTime: new Date().toISOString(),
        count: recommendations.length,
        contextType,
        excludedViewed: excludeViewed,
        explorationIncluded: includeExploration
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('❌ Segment-aware recommendations error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

// GET: Get user's segment information and recommendation strategies
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const info = searchParams.get('info');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (info === 'segment') {
      // Get user's current segment information
      const clusteringScope = await determineClusteringScope(userId, 'auto');
      const userClusters = await getOrGenerateClusters(clusteringScope.userIds, {});
      
      const userSegment = userClusters.clusters.find(cluster => 
        cluster.userIds.includes(userId)
      );

      if (!userSegment) {
        return NextResponse.json({
          userId,
          segment: null,
          message: 'User not assigned to any segment'
        }, { headers: corsHeaders });
      }

      const segmentAnalytics = await segmentAwareRecommendationService.getSegmentAnalytics(
        userSegment.clusterId
      );

      return NextResponse.json({
        userId,
        segment: {
          clusterId: userSegment.clusterId,
          clusterSize: userSegment.clusterSize,
          characteristics: userSegment.characteristics,
          centroid: userSegment.centroid,
          intraClusterDistance: userSegment.intraClusterDistance
        },
        segmentAnalytics,
        peers: userSegment.userIds.filter(id => id !== userId).slice(0, 10),
        recommendationEngine: segmentAnalytics?.recommendationEngine
      }, { headers: corsHeaders });
    }

    // Default: Return service information
    return NextResponse.json({
      service: 'Segment-Aware Recommendations',
      status: 'active',
      userId,
      features: [
        'Hierarchical user clustering',
        'Segment-based collaborative filtering',
        'Personalized content-based recommendations',
        'Exploration and discovery recommendations',
        'Context-aware suggestion delivery',
        'Real-time segment analytics'
      ],
      supportedContexts: ['homepage', 'category', 'search', 'video_page'],
      segmentTypes: [
        'binge_watcher',
        'active_explorer', 
        'focused_learner',
        'content_explorer',
        'casual_viewer'
      ],
      clusteringMethods: ['agglomerative', 'k-means', 'dbscan'],
      version: '1.0.0'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ GET segment info error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper Functions

async function determineClusteringScope(userId: string, segmentSize: string) {
  let userIds: string[] = [];
  let strategy = '';

  switch (segmentSize) {
    case 'small':
      // Use recent active users (last 7 days)
      const recentUsers = await UserViewingHistory.distinct('userId', {
        viewStartTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      userIds = recentUsers.slice(0, 50);
      strategy = 'recent_active_users';
      break;

    case 'medium':
      // Use active users (last 30 days)
      const activeUsers = await UserViewingHistory.distinct('userId', {
        viewStartTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      userIds = activeUsers.slice(0, 200);
      strategy = 'monthly_active_users';
      break;

    case 'large':
      // Use all users with viewing history
      const allActiveUsers = await UserViewingHistory.distinct('userId');
      userIds = allActiveUsers.slice(0, 1000);
      strategy = 'all_active_users';
      break;

    case 'auto':
    default:
      // Adaptive clustering based on user activity level
      const userActivity = await UserViewingHistory.countDocuments({ userId });
      
      if (userActivity > 50) {
        // Highly active user - use large scope for better precision
        const largeScope = await UserViewingHistory.distinct('userId');
        userIds = largeScope.slice(0, 500);
        strategy = 'adaptive_large_scope';
      } else if (userActivity > 10) {
        // Moderately active - medium scope
        const mediumScope = await UserViewingHistory.distinct('userId', {
          viewStartTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
        userIds = mediumScope.slice(0, 200);
        strategy = 'adaptive_medium_scope';
      } else {
        // Low activity - small scope with similar users
        const similarUsers = await UserViewingHistory.distinct('userId', {
          viewStartTime: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
        });
        userIds = similarUsers.slice(0, 100);
        strategy = 'adaptive_small_scope';
      }
      break;
  }

  // Ensure target user is included
  if (!userIds.includes(userId)) {
    userIds.unshift(userId);
  }

  return {
    userIds,
    strategy,
    useCache: segmentSize === 'auto' && userIds.length < 300
  };
}

async function getOrGenerateClusters(userIds: string[], clusteringConfig: any) {
  try {
    // In a production system, you might want to cache clusters
    // For now, we'll generate fresh clusters each time
    return await generateFreshClusters(userIds, clusteringConfig);
  } catch (error) {
    console.error('Error getting clusters:', error);
    throw error;
  }
}

async function generateFreshClusters(userIds: string[], clusteringConfig: any) {
  // Get preprocessed user features
  const processedFeatures = await dataPreprocessingService.preprocessUsersInBatch(userIds, 100);
  
  if (processedFeatures.length < 2) {
    throw new Error('Insufficient user data for clustering');
  }

  // Engineer clustering features
  const clusteringFeatures = await clusteringFeatureService.engineerClusteringFeatures(
    processedFeatures
  );

  // Prepare for clustering
  const clusteringData = clusteringFeatureService.prepareForClustering(
    clusteringFeatures,
    undefined, // Use default objective
    true // Scale features
  );

  // Determine optimal number of clusters
  const numClusters = Math.min(
    Math.max(3, Math.floor(Math.sqrt(clusteringData.features.length / 2))),
    8
  );

  // Perform clustering
  const config = {
    numClusters,
    linkageCriteria: 'ward' as const,
    distanceMetric: 'euclidean' as const,
    minClusterSize: 2,
    maxClusters: 8,
    ...clusteringConfig
  };

  return await agglomerativeClusteringService.performClustering(clusteringData, config);
}

async function calculateRecommendationAnalytics(
  recommendations: any[],
  userSegment: any,
  clusteringResult: any
) {
  const strategyDistribution = recommendations.reduce((acc, rec) => {
    acc[rec.segmentStrategy] = (acc[rec.segmentStrategy] || 0) + 1;
    return acc;
  }, {});

  const avgScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length;

  const analytics = {
    totalRecommendations: recommendations.length,
    averageScore: Number(avgScore.toFixed(3)),
    strategyDistribution,
    segmentInfo: userSegment ? {
      clusterId: userSegment.clusterId,
      clusterSize: userSegment.clusterSize,
      userType: userSegment.characteristics.userType,
      engagementLevel: userSegment.characteristics.engagementLevel
    } : null,
    qualityMetrics: {
      clusteringQuality: clusteringResult.metadata.clusteringQuality,
      silhouetteScore: clusteringResult.metadata.silhouetteScore,
      recommendation_diversity: calculateRecommendationDiversity(recommendations)
    }
  };

  return analytics;
}

function calculateRecommendationDiversity(recommendations: any[]): number {
  const strategies = new Set(recommendations.map(r => r.segmentStrategy));
  return strategies.size / recommendations.length;
}

async function getSegmentInsights(userSegment: any, allClusters: any[]) {
  const insights = {
    segmentProfile: {
      name: `${userSegment.characteristics.userType.replace('_', ' ').toUpperCase()} Segment`,
      description: generateSegmentDescription(userSegment.characteristics),
      size: userSegment.clusterSize,
      relativeSize: `${((userSegment.clusterSize / allClusters.reduce((sum, c) => sum + c.clusterSize, 0)) * 100).toFixed(1)}%`
    },
    behaviorPatterns: userSegment.characteristics.behaviorPatterns,
    contentPreferences: userSegment.characteristics.contentPreferences,
    recommendationApproach: {
      strategy: userSegment.characteristics.recommendationStrategy,
      description: getStrategyDescription(userSegment.characteristics.recommendationStrategy)
    },
    similarUsers: userSegment.clusterSize - 1, // Excluding the user themselves
    dominantFeatures: userSegment.characteristics.dominantFeatures.slice(0, 5)
  };

  return insights;
}

function generateSegmentDescription(characteristics: any): string {
  const { userType, engagementLevel } = characteristics;
  
  const descriptions = {
    binge_watcher: 'Users who consume content in long, continuous sessions',
    active_explorer: 'Users who actively search and explore diverse content',
    focused_learner: 'Users who prefer high-quality, educational content',
    content_explorer: 'Users who browse across multiple content categories',
    casual_viewer: 'Users who consume popular content casually'
  };

  return `${descriptions[userType] || 'Users with mixed viewing patterns'} with ${engagementLevel} engagement levels.`;
}

function getStrategyDescription(strategy: string): string {
  const strategies = {
    playlist_and_series_focused: 'Recommendations emphasize series continuity and playlist completion',
    diversity_and_discovery_focused: 'Recommendations promote content discovery and variety',
    quality_and_completion_focused: 'Recommendations prioritize high-quality, engaging content',
    personalized_deep_recommendations: 'Highly personalized recommendations based on detailed preferences',
    popular_and_trending_focused: 'Recommendations feature popular and trending content'
  };

  return strategies[strategy] || 'Balanced recommendation approach across multiple factors';
} 