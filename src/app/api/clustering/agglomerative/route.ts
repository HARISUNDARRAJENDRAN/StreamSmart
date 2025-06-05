import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { clusteringFeatureService } from '@/services/clusteringFeatureService';
import { agglomerativeClusteringService, LinkageCriteria, DistanceMetric } from '@/services/agglomerativeClusteringService';
import { dataPreprocessingService } from '@/services/dataPreprocessingService';

// POST: Perform agglomerative clustering for user segmentation
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userIds,
      numClusters = 5,
      linkageCriteria = 'ward',
      distanceMetric = 'euclidean',
      minClusterSize = 2,
      maxClusters = 10,
      objective, // Optional clustering objective
      scaleFeatures = true,
      findOptimalClusters = false,
      batchSize = 100
    } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    if (userIds.length < numClusters) {
      return NextResponse.json(
        { error: `Number of users (${userIds.length}) must be >= number of clusters (${numClusters})` },
        { status: 400 }
      );
    }

    console.log(`🔬 Starting Agglomerative Clustering for ${userIds.length} users`);
    console.log(`📊 Config: ${numClusters} clusters, ${linkageCriteria} linkage, ${distanceMetric} distance`);

    // Step 1: Get preprocessed user features
    const processedFeatures = await dataPreprocessingService.preprocessUsersInBatch(
      userIds, 
      batchSize
    );

    if (processedFeatures.length < numClusters) {
      return NextResponse.json(
        { error: `Insufficient valid user data (${processedFeatures.length}) for ${numClusters} clusters` },
        { status: 400 }
      );
    }

    // Step 2: Engineer clustering-specific features
    const clusteringFeatures = await clusteringFeatureService.engineerClusteringFeatures(
      processedFeatures
    );

    console.log(`✅ Engineered features for ${clusteringFeatures.length} users`);

    // Step 3: Prepare features for clustering
    let selectedObjective;
    if (objective) {
      const { CLUSTERING_OBJECTIVES } = await import('@/services/clusteringFeatureService');
      selectedObjective = CLUSTERING_OBJECTIVES.find(obj => obj.name === objective);
      if (!selectedObjective) {
        return NextResponse.json(
          { error: `Invalid clustering objective: ${objective}` },
          { status: 400 }
        );
      }
    }

    const clusteringData = clusteringFeatureService.prepareForClustering(
      clusteringFeatures,
      selectedObjective,
      scaleFeatures
    );

    console.log(`🎯 Prepared clustering data: ${clusteringData.features.length} users, ${clusteringData.featureNames.length} features`);

    // Step 4: Validate clustering parameters
    const validLinkage: LinkageCriteria[] = ['ward', 'complete', 'average', 'single'];
    const validDistance: DistanceMetric[] = ['euclidean', 'manhattan', 'cosine'];

    if (!validLinkage.includes(linkageCriteria as LinkageCriteria)) {
      return NextResponse.json(
        { error: `Invalid linkage criteria. Valid options: ${validLinkage.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validDistance.includes(distanceMetric as DistanceMetric)) {
      return NextResponse.json(
        { error: `Invalid distance metric. Valid options: ${validDistance.join(', ')}` },
        { status: 400 }
      );
    }

    // Step 5: Perform agglomerative clustering
    const clusteringConfig = {
      numClusters: findOptimalClusters ? undefined : numClusters,
      linkageCriteria: linkageCriteria as LinkageCriteria,
      distanceMetric: distanceMetric as DistanceMetric,
      minClusterSize,
      maxClusters
    };

    const clusteringResult = await agglomerativeClusteringService.performClustering(
      clusteringData,
      clusteringConfig
    );

    console.log(`🎉 Clustering completed with ${clusteringResult.clusters.length} clusters`);
    console.log(`📈 Quality: ${clusteringResult.metadata.clusteringQuality} (Silhouette: ${clusteringResult.metadata.silhouetteScore.toFixed(3)})`);

    // Step 6: Calculate additional analytics
    const clusterAnalytics = await calculateClusterAnalytics(clusteringResult);

    // Step 7: Generate cluster insights
    const clusterInsights = generateClusterInsights(clusteringResult);

    return NextResponse.json({
      success: true,
      clusteringResult,
      analytics: clusterAnalytics,
      insights: clusterInsights,
      configuration: {
        userCount: userIds.length,
        validUserCount: clusteringFeatures.length,
        numClusters: clusteringResult.metadata.numClusters,
        linkageCriteria,
        distanceMetric,
        objective: selectedObjective?.name,
        scalingApplied: scaleFeatures,
        optimalClustersFound: findOptimalClusters
      },
      recommendations: {
        qualityAssessment: interpretClusteringQuality(clusteringResult.metadata.silhouetteScore),
        suggestions: generateClusteringSuggestions(clusteringResult),
        nextSteps: [
          'Use clusters for segment-aware recommendations',
          'Monitor cluster stability over time',
          'Refine features based on cluster characteristics',
          'A/B test recommendations across segments'
        ]
      }
    });

  } catch (error) {
    console.error('Agglomerative clustering error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during clustering',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GET: Get clustering status and available configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const info = searchParams.get('info');

    if (info === 'config') {
      return NextResponse.json({
        availableConfigurations: {
          linkageCriteria: [
            { value: 'ward', description: 'Ward linkage - minimizes within-cluster variance (best for balanced clusters)' },
            { value: 'complete', description: 'Complete linkage - maximum distance between clusters (compact clusters)' },
            { value: 'average', description: 'Average linkage - average distance between clusters (balanced approach)' },
            { value: 'single', description: 'Single linkage - minimum distance between clusters (can create elongated clusters)' }
          ],
          distanceMetrics: [
            { value: 'euclidean', description: 'Euclidean distance - standard geometric distance' },
            { value: 'manhattan', description: 'Manhattan distance - sum of absolute differences' },
            { value: 'cosine', description: 'Cosine distance - angle-based similarity (good for high-dimensional data)' }
          ],
          recommendedConfigurations: [
            {
              name: 'General User Segmentation',
              config: { linkageCriteria: 'ward', distanceMetric: 'euclidean', numClusters: 5 },
              description: 'Best for general purpose user segmentation'
            },
            {
              name: 'Engagement-Based Clustering',
              config: { linkageCriteria: 'complete', distanceMetric: 'euclidean', numClusters: 4 },
              description: 'Focuses on engagement patterns'
            },
            {
              name: 'Behavior Pattern Clustering',
              config: { linkageCriteria: 'average', distanceMetric: 'cosine', numClusters: 6 },
              description: 'Emphasizes behavioral similarities'
            }
          ]
        },
        qualityMetrics: {
          silhouetteScore: {
            range: '[-1, 1]',
            interpretation: {
              excellent: '>= 0.7',
              good: '0.5 - 0.7',
              fair: '0.25 - 0.5',
              poor: '< 0.25'
            }
          },
          daviesBouldinIndex: {
            range: '[0, ∞)',
            interpretation: 'Lower values indicate better clustering (0 is perfect)'
          },
          calinskiHarabaszIndex: {
            range: '[0, ∞)',
            interpretation: 'Higher values indicate better clustering'
          }
        }
      });
    }

    return NextResponse.json({
      service: 'Agglomerative Clustering',
      status: 'active',
      features: [
        'Hierarchical user clustering',
        'Multiple linkage criteria support',
        'Various distance metrics',
        'Automatic optimal cluster detection',
        'Comprehensive quality evaluation',
        'Segment characterization',
        'Recommendation strategy assignment'
      ],
      endpoints: {
        cluster: 'POST /api/clustering/agglomerative',
        recommendations: 'POST /api/recommendations/segment-aware'
      }
    });

  } catch (error) {
    console.error('Error in GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function calculateClusterAnalytics(clusteringResult: any) {
  const { clusters, metadata } = clusteringResult;
  
  // Cluster size distribution
  const sizeDistribution = clusters.map((cluster: any) => ({
    clusterId: cluster.clusterId,
    size: cluster.clusterSize,
    percentage: (cluster.clusterSize / metadata.totalUsers * 100).toFixed(1)
  }));

  // User type distribution
  const userTypeDistribution = clusters.reduce((acc: any, cluster: any) => {
    const userType = cluster.characteristics.userType;
    acc[userType] = (acc[userType] || 0) + cluster.clusterSize;
    return acc;
  }, {});

  // Engagement level distribution
  const engagementDistribution = clusters.reduce((acc: any, cluster: any) => {
    const engagement = cluster.characteristics.engagementLevel;
    acc[engagement] = (acc[engagement] || 0) + cluster.clusterSize;
    return acc;
  }, {});

  return {
    sizeDistribution,
    userTypeDistribution,
    engagementDistribution,
    qualityMetrics: {
      silhouetteScore: metadata.silhouetteScore,
      daviesBouldinIndex: metadata.daviesBouldinIndex,
      calinskiHarabaszIndex: metadata.calinskiHarabaszIndex,
      clusteringQuality: metadata.clusteringQuality
    },
    clusterCharacteristics: clusters.map((cluster: any) => ({
      clusterId: cluster.clusterId,
      userType: cluster.characteristics.userType,
      engagementLevel: cluster.characteristics.engagementLevel,
      recommendationStrategy: cluster.characteristics.recommendationStrategy,
      dominantFeatures: cluster.characteristics.dominantFeatures.slice(0, 3)
    }))
  };
}

function generateClusterInsights(clusteringResult: any) {
  const { clusters, metadata } = clusteringResult;
  
  const insights = {
    overview: `Successfully created ${clusters.length} user segments with ${metadata.clusteringQuality} clustering quality`,
    qualityAssessment: interpretClusteringQuality(metadata.silhouetteScore),
    segmentHighlights: clusters.map((cluster: any) => ({
      clusterId: cluster.clusterId,
      name: `${cluster.characteristics.userType.replace('_', ' ').toUpperCase()} Segment`,
      size: cluster.clusterSize,
      description: generateSegmentDescription(cluster.characteristics),
      recommendationApproach: cluster.characteristics.recommendationStrategy
    })),
    recommendations: generateClusteringSuggestions(clusteringResult)
  };

  return insights;
}

function interpretClusteringQuality(silhouetteScore: number): string {
  if (silhouetteScore >= 0.7) {
    return 'Excellent clustering quality - very distinct and well-separated segments';
  } else if (silhouetteScore >= 0.5) {
    return 'Good clustering quality - clear segment boundaries with good separation';
  } else if (silhouetteScore >= 0.25) {
    return 'Fair clustering quality - moderate segment distinction, consider feature refinement';
  } else {
    return 'Poor clustering quality - weak segment separation, recommend different approach';
  }
}

function generateSegmentDescription(characteristics: any): string {
  const { userType, engagementLevel, contentPreferences, behaviorPatterns } = characteristics;
  
  let description = `${engagementLevel.charAt(0).toUpperCase() + engagementLevel.slice(1)} engagement users who are `;
  
  switch (userType) {
    case 'binge_watcher':
      description += 'likely to watch multiple videos in long sessions';
      break;
    case 'active_explorer':
      description += 'actively seeking new and diverse content';
      break;
    case 'focused_learner':
      description += 'focused on high-quality, educational content';
      break;
    case 'content_explorer':
      description += 'exploring various content categories';
      break;
    case 'casual_viewer':
      description += 'casually browsing popular content';
      break;
    default:
      description += 'showing mixed viewing patterns';
  }

  if (contentPreferences.length > 0) {
    description += `. Preferences: ${contentPreferences.join(', ')}`;
  }

  return description;
}

function generateClusteringSuggestions(clusteringResult: any): string[] {
  const { metadata, clusters } = clusteringResult;
  const suggestions: string[] = [];

  // Quality-based suggestions
  if (metadata.silhouetteScore < 0.5) {
    suggestions.push('Consider increasing the number of clusters for better segment definition');
    suggestions.push('Try different linkage criteria (ward or complete) for more compact clusters');
  }

  // Cluster size balance suggestions
  const sizes = clusters.map((c: any) => c.clusterSize);
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  
  if (maxSize / minSize > 5) {
    suggestions.push('Cluster sizes are unbalanced - consider different clustering parameters');
  }

  // Feature-based suggestions
  if (metadata.numClusters < 4) {
    suggestions.push('Consider more clusters to capture nuanced user behavior patterns');
  } else if (metadata.numClusters > 8) {
    suggestions.push('Consider fewer clusters for more actionable segment-based strategies');
  }

  // Strategy-based suggestions
  suggestions.push('Implement A/B testing to validate segment-specific recommendation strategies');
  suggestions.push('Monitor cluster stability over time and re-cluster periodically');
  
  return suggestions;
} 