import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { dataPreprocessingService } from '@/services/dataPreprocessingService';
import { clusteringFeatureService, CLUSTERING_OBJECTIVES, ClusteringObjective } from '@/services/clusteringFeatureService';

// POST: Generate clustering features for user segmentation
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userIds,
      objective, // Optional: specific clustering objective
      includeCorrelationAnalysis = true,
      scaleFeatures = true,
      batchSize = 100
    } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    console.log(`Processing clustering features for ${userIds.length} users`);

    // Step 1: Get processed user features from preprocessing service
    const processedFeatures = await dataPreprocessingService.preprocessUsersInBatch(
      userIds, 
      batchSize
    );

    if (processedFeatures.length === 0) {
      return NextResponse.json(
        { error: 'No valid user data found for clustering' },
        { status: 404 }
      );
    }

    // Step 2: Engineer clustering-specific features
    const clusteringFeatures = await clusteringFeatureService.engineerClusteringFeatures(
      processedFeatures
    );

    // Step 3: Find the clustering objective if specified
    let selectedObjective: ClusteringObjective | undefined;
    if (objective) {
      selectedObjective = CLUSTERING_OBJECTIVES.find(obj => obj.name === objective);
      if (!selectedObjective) {
        return NextResponse.json(
          { 
            error: `Invalid clustering objective. Available: ${CLUSTERING_OBJECTIVES.map(o => o.name).join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    // Step 4: Prepare features for clustering algorithm
    const clusteringData = clusteringFeatureService.prepareForClustering(
      clusteringFeatures,
      selectedObjective,
      scaleFeatures
    );

    // Step 5: Calculate feature correlations if requested
    let correlationAnalysis;
    if (includeCorrelationAnalysis) {
      correlationAnalysis = clusteringFeatureService.calculateFeatureCorrelations(clusteringFeatures);
    }

    // Step 6: Calculate feature importance statistics
    const featureStats = calculateFeatureStatistics(clusteringFeatures);

    return NextResponse.json({
      success: true,
      data: {
        clusteringData,
        rawFeatures: clusteringFeatures, // Include raw features for analysis
        correlationAnalysis
      },
      metadata: {
        totalUsers: userIds.length,
        processedUsers: clusteringFeatures.length,
        featureCount: clusteringData.featureNames.length,
        objective: selectedObjective?.name,
        scalingApplied: scaleFeatures,
        processedAt: new Date().toISOString()
      },
      statistics: {
        featureStats,
        clusteringRecommendations: generateClusteringRecommendations(
          clusteringFeatures, 
          correlationAnalysis
        )
      },
      availableObjectives: CLUSTERING_OBJECTIVES.map(obj => ({
        name: obj.name,
        description: obj.description,
        featureCount: Object.keys(obj.featureWeights).length
      }))
    });

  } catch (error) {
    console.error('Error generating clustering features:', error);
    return NextResponse.json(
      { error: 'Failed to generate clustering features' },
      { status: 500 }
    );
  }
}

// GET: Get available clustering objectives and feature information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeExample = searchParams.get('includeExample') === 'true';

    const objectives = CLUSTERING_OBJECTIVES.map(obj => ({
      name: obj.name,
      description: obj.description,
      featureCount: Object.keys(obj.featureWeights).length,
      topFeatures: Object.entries(obj.featureWeights)
        .sort(([,a], [,b]) => (b || 0) - (a || 0))
        .slice(0, 5)
        .map(([feature, weight]) => ({ feature, weight }))
    }));

    const featureDescriptions = getFeatureDescriptions();

    let exampleData;
    if (includeExample) {
      // Generate example feature values for demonstration
      exampleData = generateExampleFeatures();
    }

    return NextResponse.json({
      success: true,
      data: {
        availableObjectives: objectives,
        featureDescriptions,
        totalFeatures: Object.keys(featureDescriptions).length,
        exampleData
      },
      clusteringGuidance: {
        recommendedFeatureCount: "15-25 features for optimal clustering",
        scalingRecommendation: "Standard scaling recommended for mixed feature types",
        distanceMetrics: [
          { name: "euclidean", description: "Good for continuous features, sensitive to outliers" },
          { name: "manhattan", description: "More robust to outliers" },
          { name: "cosine", description: "Good for high-dimensional sparse data" }
        ],
        linkageCriteria: [
          { name: "ward", description: "Minimizes within-cluster variance (requires euclidean)" },
          { name: "complete", description: "Maximum distance between clusters" },
          { name: "average", description: "Average distance between all points" }
        ]
      }
    });

  } catch (error) {
    console.error('Error getting clustering information:', error);
    return NextResponse.json(
      { error: 'Failed to get clustering information' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateFeatureStatistics(features: any[]) {
  if (features.length === 0) return {};

  const featureNames = Object.keys(features[0]).filter(key => key !== 'userId');
  const stats: Record<string, any> = {};

  featureNames.forEach(featureName => {
    const values = features.map(f => f[featureName] as number).filter(v => !isNaN(v));
    
    if (values.length > 0) {
      stats[featureName] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((sum, v) => sum + v, 0) / values.length,
        std: Math.sqrt(values.reduce((sum, v) => {
          const diff = v - (values.reduce((s, val) => s + val, 0) / values.length);
          return sum + diff * diff;
        }, 0) / values.length),
        nullCount: features.length - values.length
      };
    }
  });

  return stats;
}

function generateClusteringRecommendations(features: any[], correlationAnalysis?: any) {
  const recommendations = [];

  // Sample size recommendation
  if (features.length < 50) {
    recommendations.push({
      type: 'warning',
      message: `Small sample size (${features.length}). Consider collecting more data for stable clustering.`,
      suggestion: 'Aim for at least 100-200 users for reliable segmentation'
    });
  }

  // Highly correlated features warning
  if (correlationAnalysis?.highlyCorrelated.length > 0) {
    recommendations.push({
      type: 'info',
      message: `${correlationAnalysis.highlyCorrelated.length} highly correlated feature pairs detected.`,
      suggestion: 'Consider removing redundant features to improve clustering quality',
      details: correlationAnalysis.highlyCorrelated.slice(0, 3)
    });
  }

  // Feature distribution analysis
  const featureStats = calculateFeatureStatistics(features);
  const lowVarianceFeatures = Object.entries(featureStats)
    .filter(([_, stats]: [string, any]) => stats.std < 0.1)
    .map(([name]) => name);

  if (lowVarianceFeatures.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${lowVarianceFeatures.length} features have low variance.`,
      suggestion: 'Low variance features may not contribute to meaningful clusters',
      details: lowVarianceFeatures.slice(0, 5)
    });
  }

  // Clustering algorithm recommendations
  if (features.length < 500) {
    recommendations.push({
      type: 'suggestion',
      message: 'Recommended clustering parameters for your dataset size:',
      details: {
        linkage: 'ward',
        distance_metric: 'euclidean',
        min_cluster_size: Math.max(2, Math.floor(features.length * 0.05)),
        max_clusters: Math.min(10, Math.floor(features.length / 10))
      }
    });
  }

  return recommendations;
}

function getFeatureDescriptions() {
  return {
    // Engagement & Activity Features
    engagementIntensity: "Overall engagement level combining completion, hover, search, and rating behaviors (0-1)",
    platformActivityLevel: "Relative activity level compared to other users (0-1)",
    sessionDepthScore: "Depth of interaction within viewing sessions (0-1)",
    contentExplorationRate: "Tendency to explore diverse content vs stick to familiar (0-1)",
    interactionConsistency: "Regularity and consistency of platform usage (0-1)",
    
    // Content Consumption Patterns
    contentCompletionTendency: "Likelihood to finish content they start watching (0-1)",
    bingeWatchingScore: "Tendency for long, multi-video viewing sessions (0-1)",
    contentDiversityIndex: "Variety in content consumption using Shannon entropy (0-1)",
    qualityPreferenceScore: "Preference for high-quality, well-rated content (0-1)",
    difficultyPreferenceLevel: "Preference for complex or challenging content (0-1)",
    contentVelocity: "Speed of content consumption relative to completion (0-1)",
    
    // Discovery & Search Behavior
    searchDrivenDiscovery: "Reliance on search vs browsing for content discovery (0-1)",
    queryComplexityScore: "Sophistication and complexity of search queries (0-1)",
    searchSuccessEfficiency: "Effectiveness at finding relevant content through search (0-1)",
    recommendationReceptivity: "Tendency to follow platform recommendations (0-1)",
    
    // Feedback & Rating Patterns
    ratingFrequency: "How often user provides ratings relative to dataset (0-1)",
    ratingCriticalness: "Tendency to give harsh vs lenient ratings (0-1)",
    feedbackDetailLevel: "Depth and detail of reviews and feedback (0-1)",
    watchlistManagementStyle: "How organized and effective with watchlist management (0-1)",
    
    // Temporal Usage Patterns
    peakUsageTimePreference: "Consistency in preferred viewing times (0-1)",
    weekendUsagePattern: "Weekend vs weekday usage pattern (0=weekday, 1=weekend)",
    usageTemporalSpread: "Whether usage is concentrated or distributed over time (0-1)",
    
    // Social & Interaction Features
    platformLoyalty: "Long-term engagement and commitment to platform (0-1)",
    contentInteractionDepth: "Depth of interaction through hover, click, explore behaviors (0-1)",
    userMaturityLevel: "Experience and sophistication on the platform (0-1)"
  };
}

function generateExampleFeatures() {
  return {
    casual_user: {
      engagementIntensity: 0.3,
      contentCompletionTendency: 0.6,
      bingeWatchingScore: 0.2,
      searchDrivenDiscovery: 0.4,
      ratingFrequency: 0.1,
      userMaturityLevel: 0.3
    },
    power_user: {
      engagementIntensity: 0.9,
      contentCompletionTendency: 0.85,
      bingeWatchingScore: 0.7,
      searchDrivenDiscovery: 0.8,
      ratingFrequency: 0.9,
      userMaturityLevel: 0.95
    },
    explorer: {
      engagementIntensity: 0.7,
      contentCompletionTendency: 0.4,
      bingeWatchingScore: 0.3,
      contentExplorationRate: 0.9,
      searchDrivenDiscovery: 0.8,
      contentDiversityIndex: 0.85
    }
  };
} 