// StreamSmart Clustering Feature Engineering Service
// Specialized feature engineering for Agglomerative Clustering user segmentation

import { ProcessedUserFeatures, dataPreprocessingService } from './dataPreprocessingService';

// Optimized feature set for user clustering
export interface ClusteringFeatures {
  userId: string;
  
  // 1. Engagement & Activity Features (5 features)
  engagementIntensity: number;        // 0-1: Overall engagement level
  platformActivityLevel: number;     // 0-1: How active user is on platform
  sessionDepthScore: number;         // 0-1: Depth of interaction in sessions
  contentExplorationRate: number;    // 0-1: How much they explore vs stick to familiar
  interactionConsistency: number;    // 0-1: Regularity of platform usage
  
  // 2. Content Consumption Patterns (6 features)
  contentCompletionTendency: number; // 0-1: Likelihood to finish content
  bingeWatchingScore: number;        // 0-1: Tendency for long viewing sessions
  contentDiversityIndex: number;     // 0-1: Variety in content consumption
  qualityPreferenceScore: number;    // 0-1: Preference for high-quality content
  difficultyPreferenceLevel: number; // 0-1: Preference for complex content
  contentVelocity: number;           // 0-1: Speed of content consumption
  
  // 3. Discovery & Search Behavior (4 features)
  searchDrivenDiscovery: number;     // 0-1: Reliance on search vs browsing
  queryComplexityScore: number;     // 0-1: Sophistication of search queries
  searchSuccessEfficiency: number;  // 0-1: Effectiveness at finding content
  recommendationReceptivity: number; // 0-1: How much they use recommendations
  
  // 4. Feedback & Rating Patterns (4 features)
  ratingFrequency: number;           // 0-1: How often they rate content
  ratingCriticalness: number;        // 0-1: Tendency to give harsh vs lenient ratings
  feedbackDetailLevel: number;      // 0-1: Depth of reviews and feedback
  watchlistManagementStyle: number; // 0-1: How they organize/manage watchlists
  
  // 5. Temporal Usage Patterns (3 features)
  peakUsageTimePreference: number;  // 0-1: Consistent vs varied viewing times
  weekendUsagePattern: number;      // 0-1: Weekend vs weekday usage difference
  usageTemporalSpread: number;      // 0-1: Concentrated vs distributed usage
  
  // 6. Social & Interaction Features (3 features)  
  platformLoyalty: number;          // 0-1: Long-term vs short-term user behavior
  contentInteractionDepth: number;  // 0-1: Hover, click, explore behavior
  userMaturityLevel: number;        // 0-1: Experience/sophistication on platform
}

// Feature importance weights for different clustering objectives
export interface ClusteringObjective {
  name: string;
  description: string;
  featureWeights: Partial<Record<keyof ClusteringFeatures, number>>;
}

export const CLUSTERING_OBJECTIVES: ClusteringObjective[] = [
  {
    name: 'content_consumption_behavior',
    description: 'Segment users by how they consume content',
    featureWeights: {
      contentCompletionTendency: 1.0,
      bingeWatchingScore: 1.0,
      contentDiversityIndex: 0.9,
      contentVelocity: 0.8,
      qualityPreferenceScore: 0.7,
      difficultyPreferenceLevel: 0.6
    }
  },
  {
    name: 'engagement_levels',
    description: 'Segment users by engagement intensity',
    featureWeights: {
      engagementIntensity: 1.0,
      platformActivityLevel: 1.0,
      sessionDepthScore: 0.9,
      interactionConsistency: 0.8,
      contentInteractionDepth: 0.7
    }
  },
  {
    name: 'discovery_preferences',
    description: 'Segment users by content discovery behavior',
    featureWeights: {
      searchDrivenDiscovery: 1.0,
      recommendationReceptivity: 1.0,
      contentExplorationRate: 0.9,
      queryComplexityScore: 0.8,
      searchSuccessEfficiency: 0.7
    }
  },
  {
    name: 'feedback_personality',
    description: 'Segment users by feedback and rating behavior',
    featureWeights: {
      ratingFrequency: 1.0,
      ratingCriticalness: 1.0,
      feedbackDetailLevel: 0.9,
      watchlistManagementStyle: 0.7
    }
  },
  {
    name: 'temporal_usage_patterns',
    description: 'Segment users by when and how they use the platform',
    featureWeights: {
      peakUsageTimePreference: 1.0,
      weekendUsagePattern: 1.0,
      usageTemporalSpread: 0.9,
      interactionConsistency: 0.8
    }
  }
];

class ClusteringFeatureService {
  
  // Transform processed user features into clustering-optimized features
  async engineerClusteringFeatures(
    processedFeatures: ProcessedUserFeatures[]
  ): Promise<ClusteringFeatures[]> {
    
    // Calculate dataset-wide statistics for normalization
    const datasetStats = this.calculateDatasetStatistics(processedFeatures);
    
    return processedFeatures.map(user => this.transformUserFeatures(user, datasetStats));
  }

  private transformUserFeatures(
    user: ProcessedUserFeatures, 
    stats: DatasetStatistics
  ): ClusteringFeatures {
    
    return {
      userId: user.userId,
      
      // 1. Engagement & Activity Features
      engagementIntensity: this.calculateEngagementIntensity(user),
      platformActivityLevel: this.normalizePlatformActivity(user, stats),
      sessionDepthScore: this.calculateSessionDepth(user),
      contentExplorationRate: this.calculateExplorationRate(user),
      interactionConsistency: user.viewingConsistency,
      
      // 2. Content Consumption Patterns  
      contentCompletionTendency: user.avgCompletionRate / 100, // Normalize 0-100 to 0-1
      bingeWatchingScore: user.bingeTendency,
      contentDiversityIndex: user.contentDiversity,
      qualityPreferenceScore: this.calculateQualityPreference(user),
      difficultyPreferenceLevel: this.calculateDifficultyPreference(user),
      contentVelocity: this.calculateContentVelocity(user, stats),
      
      // 3. Discovery & Search Behavior
      searchDrivenDiscovery: this.calculateSearchDependency(user, stats),
      queryComplexityScore: user.queryComplexity,
      searchSuccessEfficiency: user.searchSuccessRate,
      recommendationReceptivity: this.calculateRecommendationReceptivity(user),
      
      // 4. Feedback & Rating Patterns
      ratingFrequency: this.normalizeRatingFrequency(user, stats),
      ratingCriticalness: this.calculateRatingCriticalness(user, stats),
      feedbackDetailLevel: this.calculateFeedbackDetail(user, stats),
      watchlistManagementStyle: this.calculateWatchlistStyle(user),
      
      // 5. Temporal Usage Patterns
      peakUsageTimePreference: this.calculateTimeConsistency(user),
      weekendUsagePattern: this.normalizeWeekendPattern(user.weekendViewingRatio),
      usageTemporalSpread: this.calculateTemporalSpread(user),
      
      // 6. Social & Interaction Features
      platformLoyalty: this.calculatePlatformLoyalty(user),
      contentInteractionDepth: user.hoverEngagement,
      userMaturityLevel: this.calculateUserMaturity(user, stats)
    };
  }

  // Calculate complex derived features
  private calculateEngagementIntensity(user: ProcessedUserFeatures): number {
    // Combine multiple engagement signals
    const completionWeight = user.avgCompletionRate / 100 * 0.3;
    const hoverWeight = user.hoverEngagement * 0.2;
    const searchWeight = Math.min(user.searchFrequency / 20, 1) * 0.2;
    const ratingWeight = Math.min(user.ratingCount / 10, 1) * 0.15;
    const explorationWeight = user.explorationDepth * 0.15;
    
    return Math.min(1, completionWeight + hoverWeight + searchWeight + ratingWeight + explorationWeight);
  }

  private calculateSessionDepth(user: ProcessedUserFeatures): number {
    // Combine binge tendency with page engagement
    return (user.bingeTendency * 0.6 + user.pageEngagement * 0.4);
  }

  private calculateExplorationRate(user: ProcessedUserFeatures): number {
    // High diversity + high search frequency = high exploration
    const diversityScore = user.contentDiversity;
    const searchExploration = Math.min(user.searchFrequency / 15, 1);
    const navigationExploration = user.explorationDepth;
    
    return (diversityScore * 0.4 + searchExploration * 0.3 + navigationExploration * 0.3);
  }

  private calculateQualityPreference(user: ProcessedUserFeatures): number {
    // Users who complete more content and rate higher prefer quality
    const completionIndicator = user.avgCompletionRate / 100;
    const ratingIndicator = user.avgRating > 0 ? (user.avgRating - 3) / 2 : 0; // Normalize 3-5 to 0-1
    const consistencyIndicator = user.viewingConsistency;
    
    return Math.max(0, Math.min(1, 
      completionIndicator * 0.4 + 
      Math.max(0, ratingIndicator) * 0.3 + 
      consistencyIndicator * 0.3
    ));
  }

  private calculateDifficultyPreference(user: ProcessedUserFeatures): number {
    // Users who search more complex queries and complete diverse content
    const queryComplexity = user.queryComplexity;
    const contentDiversity = user.contentDiversity;
    const completionRate = user.avgCompletionRate / 100;
    
    // High completion + high diversity + complex queries = prefers difficulty
    return (queryComplexity * 0.4 + contentDiversity * 0.3 + completionRate * 0.3);
  }

  private calculateSearchDependency(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    // Normalize search frequency relative to dataset
    const relativeSearchFreq = user.searchFrequency / Math.max(1, stats.avgSearchFrequency);
    const searchSuccess = user.searchSuccessRate;
    
    // High search frequency + high success = search dependent
    return Math.min(1, (Math.min(2, relativeSearchFreq) / 2) * 0.7 + searchSuccess * 0.3);
  }

  private calculateRecommendationReceptivity(user: ProcessedUserFeatures): number {
    // Low search dependency + high completion = follows recommendations
    const lowSearchDependency = 1 - Math.min(user.searchFrequency / 20, 1);
    const highCompletion = user.avgCompletionRate / 100;
    const consistentUsage = user.viewingConsistency;
    
    return (lowSearchDependency * 0.4 + highCompletion * 0.3 + consistentUsage * 0.3);
  }

  private calculateRatingCriticalness(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    if (user.avgRating === 0) return 0.5; // Neutral if no ratings
    
    // Lower than average rating = more critical
    const relativeRating = user.avgRating / stats.avgRating;
    const hasVariance = user.ratingVariance > 0.5; // Uses full rating scale
    
    const criticalScore = Math.max(0, (1 - relativeRating)) + (hasVariance ? 0.2 : 0);
    return Math.min(1, criticalScore);
  }

  private calculateFeedbackDetail(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    const hasDetailedReviews = user.isDetailedReviewer ? 1 : 0;
    const relativeReviewLength = user.reviewLengthAvg / Math.max(1, stats.avgReviewLength);
    const ratingFrequency = this.normalizeRatingFrequency(user, stats);
    
    return Math.min(1, 
      hasDetailedReviews * 0.5 + 
      Math.min(2, relativeReviewLength) / 2 * 0.3 + 
      ratingFrequency * 0.2
    );
  }

  private calculateWatchlistStyle(user: ProcessedUserFeatures): number {
    if (user.watchlistSize === 0) return 0;
    
    // High completion rate + moderate size = organized style
    // Low completion rate + large size = collector style
    const completionRate = user.watchlistCompletionRate;
    const sizeNormalized = Math.min(1, user.watchlistSize / 20); // Assume 20 is large
    
    // Organized users: high completion, moderate size
    const organizedScore = completionRate * (1 - Math.abs(sizeNormalized - 0.5));
    
    return organizedScore;
  }

  private calculateTimeConsistency(user: ProcessedUserFeatures): number {
    // Users with preferred viewing hour have consistent patterns
    return user.preferredViewingHour > 0 ? 1 : 0.5; // Binary for now, could be more sophisticated
  }

  private normalizeWeekendPattern(weekendRatio: number): number {
    // Convert weekend ratio to preference score
    // 0.5 = balanced, 0 = weekday only, 1 = weekend only
    return weekendRatio;
  }

  private calculateTemporalSpread(user: ProcessedUserFeatures): number {
    // High activity level + high consistency = concentrated usage
    const activityLevel = Math.min(user.recentActivityLevel / 2, 1); // Normalize assuming 2 views/day is high
    const consistency = user.viewingConsistency;
    
    return (activityLevel * 0.6 + consistency * 0.4);
  }

  private calculatePlatformLoyalty(user: ProcessedUserFeatures): number {
    // Combine consistency, rating behavior, and watchlist usage
    const consistency = user.viewingConsistency;
    const ratingBehavior = user.ratingCount > 0 ? 1 : 0;
    const watchlistUsage = user.watchlistSize > 0 ? 1 : 0;
    
    return (consistency * 0.5 + ratingBehavior * 0.25 + watchlistUsage * 0.25);
  }

  private calculateUserMaturity(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    // Experienced users: high rating count, detailed reviews, complex queries
    const ratingMaturity = Math.min(user.ratingCount / 20, 1); // 20+ ratings = mature
    const reviewMaturity = user.isDetailedReviewer ? 1 : 0;
    const queryMaturity = user.queryComplexity;
    const diversityMaturity = user.contentDiversity;
    
    return (ratingMaturity * 0.3 + reviewMaturity * 0.25 + queryMaturity * 0.25 + diversityMaturity * 0.2);
  }

  // Normalization helpers
  private normalizePlatformActivity(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    const relativeActivity = user.recentActivityLevel / Math.max(0.1, stats.avgRecentActivity);
    return Math.min(1, relativeActivity / 2); // Cap at 2x average
  }

  private calculateContentVelocity(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    // Speed of content consumption relative to completion rate
    const relativeActivity = user.recentActivityLevel / Math.max(0.1, stats.avgRecentActivity);
    const completionEfficiency = user.avgCompletionRate / 100;
    
    // High activity + high completion = high velocity
    return Math.min(1, (relativeActivity * completionEfficiency));
  }

  private normalizeRatingFrequency(user: ProcessedUserFeatures, stats: DatasetStatistics): number {
    const relativeRatingCount = user.ratingCount / Math.max(1, stats.avgRatingCount);
    return Math.min(1, relativeRatingCount / 2); // Normalize relative to dataset
  }

  // Dataset statistics calculation
  private calculateDatasetStatistics(users: ProcessedUserFeatures[]): DatasetStatistics {
    if (users.length === 0) {
      return {
        avgSearchFrequency: 0,
        avgRating: 3.5,
        avgReviewLength: 0,
        avgRecentActivity: 0,
        avgRatingCount: 0
      };
    }

    return {
      avgSearchFrequency: users.reduce((sum, u) => sum + u.searchFrequency, 0) / users.length,
      avgRating: users.filter(u => u.avgRating > 0)
        .reduce((sum, u, _, arr) => sum + u.avgRating / arr.length, 0) || 3.5,
      avgReviewLength: users.reduce((sum, u) => sum + u.reviewLengthAvg, 0) / users.length,
      avgRecentActivity: users.reduce((sum, u) => sum + u.recentActivityLevel, 0) / users.length,
      avgRatingCount: users.reduce((sum, u) => sum + u.ratingCount, 0) / users.length
    };
  }

  // Feature selection for specific clustering objectives
  selectFeaturesForObjective(
    features: ClusteringFeatures[], 
    objective: ClusteringObjective
  ): { features: number[][], featureNames: string[] } {
    
    const featureNames = Object.keys(objective.featureWeights) as (keyof ClusteringFeatures)[];
    const weights = featureNames.map(name => objective.featureWeights[name] || 0);
    
    const selectedFeatures = features.map(user => 
      featureNames.map((name, index) => {
        const value = user[name] as number;
        const weight = weights[index];
        return value * weight; // Apply feature weight
      })
    );

    return {
      features: selectedFeatures,
      featureNames: featureNames.filter(name => name !== 'userId')
    };
  }

  // Prepare features for sklearn-compatible format
  prepareForClustering(
    clusteringFeatures: ClusteringFeatures[],
    objective?: ClusteringObjective,
    scaleFeatures: boolean = true
  ): ClusteringData {
    
    let features: number[][];
    let featureNames: string[];

    if (objective) {
      const selected = this.selectFeaturesForObjective(clusteringFeatures, objective);
      features = selected.features;
      featureNames = selected.featureNames;
    } else {
      // Use all features except userId
      featureNames = Object.keys(clusteringFeatures[0]).filter(key => key !== 'userId');
      features = clusteringFeatures.map(user => 
        featureNames.map(name => user[name as keyof ClusteringFeatures] as number)
      );
    }

    if (scaleFeatures) {
      features = this.standardScaleFeatures(features);
    }

    return {
      features,
      featureNames,
      userIds: clusteringFeatures.map(u => u.userId),
      scalingApplied: scaleFeatures,
      objective: objective?.name
    };
  }

  // Standard scaling (z-score normalization)
  private standardScaleFeatures(features: number[][]): number[][] {
    if (features.length === 0) return features;
    
    const numFeatures = features[0].length;
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(0);
    
    // Calculate means
    features.forEach(row => {
      row.forEach((value, index) => {
        means[index] += value;
      });
    });
    means.forEach((sum, index) => {
      means[index] = sum / features.length;
    });
    
    // Calculate standard deviations
    features.forEach(row => {
      row.forEach((value, index) => {
        stds[index] += Math.pow(value - means[index], 2);
      });
    });
    stds.forEach((sum, index) => {
      stds[index] = Math.sqrt(sum / features.length);
    });
    
    // Apply scaling
    return features.map(row => 
      row.map((value, index) => 
        stds[index] > 0 ? (value - means[index]) / stds[index] : 0
      )
    );
  }

  // Feature correlation analysis
  calculateFeatureCorrelations(features: ClusteringFeatures[]): CorrelationMatrix {
    const featureNames = Object.keys(features[0]).filter(key => key !== 'userId');
    const numFeatures = featureNames.length;
    
    const correlationMatrix: number[][] = Array(numFeatures)
      .fill(null)
      .map(() => Array(numFeatures).fill(0));
    
    // Calculate Pearson correlation coefficients
    for (let i = 0; i < numFeatures; i++) {
      for (let j = 0; j < numFeatures; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
        } else {
          const feature1Values = features.map(f => f[featureNames[i] as keyof ClusteringFeatures] as number);
          const feature2Values = features.map(f => f[featureNames[j] as keyof ClusteringFeatures] as number);
          correlationMatrix[i][j] = this.pearsonCorrelation(feature1Values, feature2Values);
        }
      }
    }
    
    return {
      matrix: correlationMatrix,
      featureNames,
      highlyCorrelated: this.findHighlyCorrelatedPairs(correlationMatrix, featureNames, 0.8)
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private findHighlyCorrelatedPairs(
    matrix: number[][], 
    featureNames: string[], 
    threshold: number
  ): Array<{feature1: string, feature2: string, correlation: number}> {
    const pairs: Array<{feature1: string, feature2: string, correlation: number}> = [];
    
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix.length; j++) {
        const correlation = Math.abs(matrix[i][j]);
        if (correlation >= threshold) {
          pairs.push({
            feature1: featureNames[i],
            feature2: featureNames[j],
            correlation: matrix[i][j]
          });
        }
      }
    }
    
    return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
}

// Supporting interfaces
interface DatasetStatistics {
  avgSearchFrequency: number;
  avgRating: number;
  avgReviewLength: number;
  avgRecentActivity: number;
  avgRatingCount: number;
}

export interface ClusteringData {
  features: number[][];
  featureNames: string[];
  userIds: string[];
  scalingApplied: boolean;
  objective?: string;
}

export interface CorrelationMatrix {
  matrix: number[][];
  featureNames: string[];
  highlyCorrelated: Array<{feature1: string, feature2: string, correlation: number}>;
}

export const clusteringFeatureService = new ClusteringFeatureService(); 