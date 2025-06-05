// StreamSmart Segment-Aware Recommendation Service
// Provides personalized recommendations based on user clustering and segment characteristics

import { UserCluster, ClusterCharacteristics } from './agglomerativeClusteringService';
import User from '@/models/User';
import UserViewingHistory from '@/models/UserViewingHistory';
import UserFeedback from '@/models/UserFeedback';

export interface SegmentRecommendation {
  itemId: string;
  itemType: 'video' | 'playlist';
  title: string;
  score: number;
  reasoning: string;
  segmentStrategy: string;
  clusterInfo: {
    clusterId: number;
    userType: string;
    engagementLevel: string;
    recommendationStrategy: string;
  };
}

export interface RecommendationRequest {
  userId: string;
  count?: number;
  excludeViewed?: boolean;
  includeExploration?: boolean;
  contextType?: 'homepage' | 'category' | 'search' | 'video_page';
}

export interface UserSegmentProfile {
  userId: string;
  clusterId: number;
  clusterCharacteristics: ClusterCharacteristics;
  segmentPeers: string[]; // Other users in same cluster
  recommendationEngine: SegmentRecommendationEngine;
}

export interface SegmentRecommendationEngine {
  strategy: string;
  weightings: {
    collaborative: number;
    contentBased: number;
    popularity: number;
    exploration: number;
    temporal: number;
  };
  filters: {
    minQuality?: number;
    preferredCategories?: string[];
    excludeGenres?: string[];
    maxDuration?: number;
    minDuration?: number;
  };
}

class SegmentAwareRecommendationService {
  private userSegmentCache = new Map<string, UserSegmentProfile>();
  private clusterCache = new Map<number, UserCluster>();

  // Main recommendation method
  async getRecommendations(
    request: RecommendationRequest,
    userClusters: UserCluster[]
  ): Promise<SegmentRecommendation[]> {
    const { userId, count = 10 } = request;
    
    console.log(`🎯 Generating segment-aware recommendations for user: ${userId}`);
    
    // Step 1: Find user's cluster
    const userSegment = await this.getUserSegmentProfile(userId, userClusters);
    if (!userSegment) {
      console.warn(`User ${userId} not found in any cluster, falling back to popular recommendations`);
      return this.getFallbackRecommendations(request);
    }
    
    console.log(`📊 User belongs to cluster ${userSegment.clusterId} (${userSegment.clusterCharacteristics.userType})`);
    
    // Step 2: Generate recommendations based on segment strategy
    const recommendations = await this.generateSegmentBasedRecommendations(
      request,
      userSegment
    );
    
    // Step 3: Apply segment-specific ranking and filtering
    const rankedRecommendations = await this.rankRecommendationsBySegment(
      recommendations,
      userSegment
    );
    
    // Step 4: Diversify recommendations if needed
    const diversifiedRecommendations = await this.diversifyRecommendations(
      rankedRecommendations,
      userSegment,
      request
    );
    
    return diversifiedRecommendations.slice(0, count);
  }

  // Get user's segment profile
  private async getUserSegmentProfile(
    userId: string,
    userClusters: UserCluster[]
  ): Promise<UserSegmentProfile | null> {
    // Check cache first
    if (this.userSegmentCache.has(userId)) {
      return this.userSegmentCache.get(userId)!;
    }
    
    console.log(`🔍 Looking for user ${userId} in ${userClusters.length} clusters`);
    
    // Debug: Log cluster information
    userClusters.forEach((cluster, index) => {
      console.log(`Cluster ${index}: ${cluster.userIds?.length || 0} users`);
      console.log(`First few user IDs: ${cluster.userIds?.slice(0, 3).join(', ') || 'none'}`);
    });
    
    // Find user's cluster - try both string and ObjectId matching
    const userCluster = userClusters.find(cluster => {
      if (!cluster.userIds || !Array.isArray(cluster.userIds)) {
        console.log(`⚠️ Cluster ${cluster.clusterId} has invalid userIds:`, cluster.userIds);
        return false;
      }
      
      // Try exact string match first
      if (cluster.userIds.includes(userId)) {
        return true;
      }
      
      // Try converting ObjectId to string - with comprehensive null checks
      const userIdStringified = cluster.userIds.find(id => {
        if (!id) return false;
        try {
          // Handle both string and ObjectId types
          if (typeof id === 'string') {
            return id === userId;
          }
          // If it's an ObjectId or has toString method
          if (id && typeof id.toString === 'function') {
            return id.toString() === userId;
          }
          // Convert to string as fallback
          const idStr = String(id);
          return idStr === userId;
        } catch (error) {
          console.log(`⚠️ Error converting ID to string:`, id, error);
          return false;
        }
      });
      
      return !!userIdStringified;
    });
    
    if (!userCluster) {
      console.log(`❌ User ${userId} not found in any cluster`);
      const allUserIds = userClusters.flatMap(c => c.userIds || []).filter(Boolean);
      console.log(`Available user IDs in clusters: ${allUserIds.slice(0, 10).join(', ')}`);
      return null;
    }
    
    console.log(`✅ Found user ${userId} in cluster ${userCluster.clusterId} with ${userCluster.userIds?.length || 0} users`);
    console.log(`Cluster characteristics: ${JSON.stringify(userCluster.characteristics, null, 2)}`);
    
    // Create segment profile with safe filtering
    const segmentPeers = (userCluster.userIds || []).filter(id => {
      if (!id) return false;
      try {
        const idStr = typeof id === 'string' ? id : id.toString();
        return idStr !== userId && id !== userId;
      } catch (error) {
        console.log(`⚠️ Error filtering peer ID:`, id, error);
        return false;
      }
    });
    
    const segmentProfile: UserSegmentProfile = {
      userId,
      clusterId: userCluster.clusterId,
      clusterCharacteristics: userCluster.characteristics,
      segmentPeers,
      recommendationEngine: this.createRecommendationEngine(userCluster.characteristics)
    };
    
    // Cache the profile
    this.userSegmentCache.set(userId, segmentProfile);
    this.clusterCache.set(userCluster.clusterId, userCluster);
    
    return segmentProfile;
  }

  // Create recommendation engine configuration based on cluster characteristics
  private createRecommendationEngine(
    characteristics: ClusterCharacteristics
  ): SegmentRecommendationEngine {
    const { userType, engagementLevel, recommendationStrategy } = characteristics;
    
    // Base configuration
    let engine: SegmentRecommendationEngine = {
      strategy: recommendationStrategy,
      weightings: {
        collaborative: 0.3,
        contentBased: 0.3,
        popularity: 0.2,
        exploration: 0.1,
        temporal: 0.1
      },
      filters: {}
    };
    
    // Customize based on user type
    switch (userType) {
      case 'binge_watcher':
        engine.weightings = {
          collaborative: 0.4, // High collaborative filtering
          contentBased: 0.3,
          popularity: 0.2,
          exploration: 0.05,
          temporal: 0.05
        };
        engine.filters = {
          minDuration: 300, // Prefer longer content
          preferredCategories: ['series', 'documentaries', 'movies']
        };
        break;
        
      case 'active_explorer':
        engine.weightings = {
          collaborative: 0.2,
          contentBased: 0.25,
          popularity: 0.15,
          exploration: 0.3, // High exploration
          temporal: 0.1
        };
        engine.filters = {
          preferredCategories: ['trending', 'new_releases', 'diverse_topics']
        };
        break;
        
      case 'focused_learner':
        engine.weightings = {
          collaborative: 0.25,
          contentBased: 0.4, // High content-based
          popularity: 0.15,
          exploration: 0.1,
          temporal: 0.1
        };
        engine.filters = {
          minQuality: 4.0, // High quality content only
          preferredCategories: ['educational', 'tutorials', 'documentaries']
        };
        break;
        
      case 'content_explorer':
        engine.weightings = {
          collaborative: 0.3,
          contentBased: 0.2,
          popularity: 0.2,
          exploration: 0.25,
          temporal: 0.05
        };
        break;
        
      case 'casual_viewer':
        engine.weightings = {
          collaborative: 0.2,
          contentBased: 0.2,
          popularity: 0.4, // High popularity
          exploration: 0.1,
          temporal: 0.1
        };
        engine.filters = {
          maxDuration: 1800, // Prefer shorter content
          preferredCategories: ['trending', 'popular', 'entertainment']
        };
        break;
    }
    
    // Adjust based on engagement level
    if (engagementLevel === 'high') {
      engine.weightings.collaborative += 0.1;
      engine.weightings.contentBased += 0.1;
      engine.weightings.popularity -= 0.2;
    } else if (engagementLevel === 'low') {
      engine.weightings.popularity += 0.2;
      engine.weightings.collaborative -= 0.1;
      engine.weightings.contentBased -= 0.1;
    }
    
    return engine;
  }

  // Generate recommendations based on segment strategy
  private async generateSegmentBasedRecommendations(
    request: RecommendationRequest,
    userSegment: UserSegmentProfile
  ): Promise<SegmentRecommendation[]> {
    const recommendations: SegmentRecommendation[] = [];
    const engine = userSegment.recommendationEngine;
    
    // Get collaborative filtering recommendations from segment peers
    const collaborativeRecs = await this.getCollaborativeRecommendations(
      request.userId,
      userSegment.segmentPeers,
      Math.ceil(request.count! * engine.weightings.collaborative / 0.1)
    );
    
    // Get content-based recommendations
    const contentBasedRecs = await this.getContentBasedRecommendations(
      request.userId,
      userSegment.clusterCharacteristics,
      Math.ceil(request.count! * engine.weightings.contentBased / 0.1)
    );
    
    // Get popular recommendations for the segment
    const popularRecs = await this.getPopularRecommendations(
      userSegment.clusterId,
      Math.ceil(request.count! * engine.weightings.popularity / 0.1)
    );
    
    // Get exploration recommendations
    const explorationRecs = request.includeExploration ? 
      await this.getExplorationRecommendations(
        request.userId,
        userSegment.clusterCharacteristics,
        Math.ceil(request.count! * engine.weightings.exploration / 0.1)
      ) : [];
    
    // Combine all recommendations with segment context
    const allRecs = [
      ...collaborativeRecs.map(rec => ({ 
        ...rec, 
        segmentStrategy: 'collaborative_segment',
        clusterInfo: {
          clusterId: userSegment.clusterId,
          userType: userSegment.clusterCharacteristics.userType,
          engagementLevel: userSegment.clusterCharacteristics.engagementLevel,
          recommendationStrategy: userSegment.clusterCharacteristics.recommendationStrategy
        }
      })),
      ...contentBasedRecs.map(rec => ({ 
        ...rec, 
        segmentStrategy: 'content_based_segment',
        clusterInfo: {
          clusterId: userSegment.clusterId,
          userType: userSegment.clusterCharacteristics.userType,
          engagementLevel: userSegment.clusterCharacteristics.engagementLevel,
          recommendationStrategy: userSegment.clusterCharacteristics.recommendationStrategy
        }
      })),
      ...popularRecs.map(rec => ({ 
        ...rec, 
        segmentStrategy: 'popular_in_segment',
        clusterInfo: {
          clusterId: userSegment.clusterId,
          userType: userSegment.clusterCharacteristics.userType,
          engagementLevel: userSegment.clusterCharacteristics.engagementLevel,
          recommendationStrategy: userSegment.clusterCharacteristics.recommendationStrategy
        }
      })),
      ...explorationRecs.map(rec => ({ 
        ...rec, 
        segmentStrategy: 'exploration_segment',
        clusterInfo: {
          clusterId: userSegment.clusterId,
          userType: userSegment.clusterCharacteristics.userType,
          engagementLevel: userSegment.clusterCharacteristics.engagementLevel,
          recommendationStrategy: userSegment.clusterCharacteristics.recommendationStrategy
        }
      }))
    ];
    
    return allRecs;
  }

  // Collaborative filtering within the user's segment
  private async getCollaborativeRecommendations(
    userId: string,
    segmentPeers: string[],
    count: number
  ): Promise<Omit<SegmentRecommendation, 'segmentStrategy' | 'clusterInfo'>[]> {
    try {
      // Get viewing history of segment peers
      const peerViewingHistory = await UserViewingHistory.find({
        userId: { $in: segmentPeers },
        completionPercentage: { $gte: 70 }, // Only well-watched content
        totalViewDuration: { $gte: 300 } // At least 5 minutes
      }).sort({ viewStartTime: -1 }).limit(1000);
      
      // Get user's viewing history to exclude already seen
      const userHistory = await UserViewingHistory.find({ userId });
      const seenItems = new Set(userHistory.map(h => h.itemId));
      
      // Calculate item popularity within segment
      const itemPopularity = new Map<string, number>();
      peerViewingHistory.forEach(history => {
        if (!seenItems.has(history.itemId)) {
          itemPopularity.set(
            history.itemId,
            (itemPopularity.get(history.itemId) || 0) + 1
          );
        }
      });
      
      // Sort by popularity and create recommendations
      const recommendations = Array.from(itemPopularity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([itemId, popularity]) => ({
          itemId,
          itemType: 'video' as const,
          title: `Video ${itemId}`, // Would fetch actual title from database
          score: popularity / segmentPeers.length,
          reasoning: `Popular among ${popularity} similar users in your segment`
        }));
      
      return recommendations;
    } catch (error) {
      console.error('Error in collaborative recommendations:', error);
      return [];
    }
  }

  // Content-based recommendations based on cluster characteristics
  private async getContentBasedRecommendations(
    userId: string,
    characteristics: ClusterCharacteristics,
    count: number
  ): Promise<Omit<SegmentRecommendation, 'segmentStrategy' | 'clusterInfo'>[]> {
    try {
      // Get user's positive feedback to understand preferences
      const userFeedback = await UserFeedback.find({
        userId,
        $or: [
          { feedbackType: 'rating', rating: { $gte: 4 } },
          { feedbackType: 'like' }
        ]
      });
      
      // Get user's viewing history for content analysis
      const userHistory = await UserViewingHistory.find({
        userId,
        completionPercentage: { $gte: 60 }
      }).sort({ viewStartTime: -1 }).limit(50);
      
      // Mock content-based recommendations based on characteristics
      // In a real system, this would use content features, categories, etc.
      const recommendations: Omit<SegmentRecommendation, 'segmentStrategy' | 'clusterInfo'>[] = [];
      
      for (let i = 0; i < count; i++) {
        const contentId = `content_${userId}_${i}`;
        let reasoning = 'Based on your ';
        
        if (characteristics.contentPreferences.includes('high_quality_content')) {
          reasoning += 'preference for high-quality content';
        } else if (characteristics.contentPreferences.includes('varied_content')) {
          reasoning += 'diverse content consumption patterns';
        } else {
          reasoning += 'viewing history and segment preferences';
        }
        
        recommendations.push({
          itemId: contentId,
          itemType: 'video',
          title: `Recommended Video ${i + 1}`,
          score: 0.8 - (i * 0.05), // Decreasing relevance score
          reasoning
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error in content-based recommendations:', error);
      return [];
    }
  }

  // Popular content within the segment
  private async getPopularRecommendations(
    clusterId: number,
    count: number
  ): Promise<Omit<SegmentRecommendation, 'segmentStrategy' | 'clusterInfo'>[]> {
    try {
      const cluster = this.clusterCache.get(clusterId);
      if (!cluster) return [];
      
      // Get most viewed content within this cluster
      const clusterViewingHistory = await UserViewingHistory.find({
        userId: { $in: cluster.userIds },
        completionPercentage: { $gte: 50 }
      });
      
      // Calculate popularity scores
      const itemPopularity = new Map<string, { count: number; avgCompletion: number }>();
      clusterViewingHistory.forEach(history => {
        const current = itemPopularity.get(history.itemId) || { count: 0, avgCompletion: 0 };
        current.count += 1;
        current.avgCompletion = (current.avgCompletion * (current.count - 1) + history.completionPercentage) / current.count;
        itemPopularity.set(history.itemId, current);
      });
      
      // Create recommendations
      return Array.from(itemPopularity.entries())
        .sort((a, b) => (b[1].count * b[1].avgCompletion) - (a[1].count * a[1].avgCompletion))
        .slice(0, count)
        .map(([itemId, stats]) => ({
          itemId,
          itemType: 'video' as const,
          title: `Popular Video ${itemId}`,
          score: (stats.count * stats.avgCompletion) / 100,
          reasoning: `Popular in your user segment (${stats.count} views, ${stats.avgCompletion.toFixed(1)}% avg completion)`
        }));
    } catch (error) {
      console.error('Error in popular recommendations:', error);
      return [];
    }
  }

  // Exploration recommendations for discovery
  private async getExplorationRecommendations(
    userId: string,
    characteristics: ClusterCharacteristics,
    count: number
  ): Promise<Omit<SegmentRecommendation, 'segmentStrategy' | 'clusterInfo'>[]> {
    try {
      // Get user's viewing history to find unexplored categories
      const userHistory = await UserViewingHistory.find({ userId });
      const seenCategories = new Set(userHistory.map(h => h.category).filter(Boolean));
      
      // Mock exploration recommendations
      // In reality, this would query content database for unexplored categories
      const recommendations: Omit<SegmentRecommendation, 'segmentStrategy' | 'clusterInfo'>[] = [];
      
      for (let i = 0; i < count; i++) {
        recommendations.push({
          itemId: `explore_${userId}_${i}`,
          itemType: 'video',
          title: `Discovery Video ${i + 1}`,
          score: 0.6 + (Math.random() * 0.2), // Random exploration score
          reasoning: 'Recommended for discovery based on your segment\'s exploration patterns'
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error in exploration recommendations:', error);
      return [];
    }
  }

  // Rank recommendations by segment-specific preferences
  private async rankRecommendationsBySegment(
    recommendations: SegmentRecommendation[],
    userSegment: UserSegmentProfile
  ): Promise<SegmentRecommendation[]> {
    const engine = userSegment.recommendationEngine;
    
    // Apply segment-specific scoring
    return recommendations.map(rec => {
      let adjustedScore = rec.score;
      
      // Apply strategy-specific boosts
      switch (rec.segmentStrategy) {
        case 'collaborative_segment':
          adjustedScore *= engine.weightings.collaborative * 10;
          break;
        case 'content_based_segment':
          adjustedScore *= engine.weightings.contentBased * 10;
          break;
        case 'popular_in_segment':
          adjustedScore *= engine.weightings.popularity * 10;
          break;
        case 'exploration_segment':
          adjustedScore *= engine.weightings.exploration * 10;
          break;
      }
      
      return {
        ...rec,
        score: Math.min(1, adjustedScore) // Cap at 1.0
      };
    }).sort((a, b) => b.score - a.score);
  }

  // Diversify recommendations to avoid clustering around single content type
  private async diversifyRecommendations(
    recommendations: SegmentRecommendation[],
    userSegment: UserSegmentProfile,
    request: RecommendationRequest
  ): Promise<SegmentRecommendation[]> {
    const diversified: SegmentRecommendation[] = [];
    const seenStrategies = new Set<string>();
    const maxPerStrategy = Math.ceil(request.count! / 3);
    
    // Ensure diversity in recommendation strategies
    for (const rec of recommendations) {
      const strategyCount = diversified.filter(r => r.segmentStrategy === rec.segmentStrategy).length;
      
      if (strategyCount < maxPerStrategy || diversified.length < request.count!) {
        diversified.push(rec);
        seenStrategies.add(rec.segmentStrategy);
      }
      
      if (diversified.length >= request.count!) break;
    }
    
    return diversified;
  }

  // Fallback recommendations when user is not in any cluster
  private async getFallbackRecommendations(
    request: RecommendationRequest
  ): Promise<SegmentRecommendation[]> {
    const fallbackRecs: SegmentRecommendation[] = [];
    
    for (let i = 0; i < request.count!; i++) {
      fallbackRecs.push({
        itemId: `fallback_${i}`,
        itemType: 'video',
        title: `Popular Video ${i + 1}`,
        score: 0.5,
        reasoning: 'Popular content recommendation',
        segmentStrategy: 'fallback_popular',
        clusterInfo: {
          clusterId: -1,
          userType: 'unknown',
          engagementLevel: 'medium',
          recommendationStrategy: 'popular_and_trending_focused'
        }
      });
    }
    
    return fallbackRecs;
  }

  // Clear cache
  clearCache(): void {
    this.userSegmentCache.clear();
    this.clusterCache.clear();
  }

  // Get segment analytics
  async getSegmentAnalytics(clusterId: number): Promise<any> {
    const cluster = this.clusterCache.get(clusterId);
    if (!cluster) return null;
    
    return {
      clusterId,
      userCount: cluster.clusterSize,
      characteristics: cluster.characteristics,
      recommendationEngine: this.createRecommendationEngine(cluster.characteristics)
    };
  }
}

// Export singleton instance
export const segmentAwareRecommendationService = new SegmentAwareRecommendationService();
export default segmentAwareRecommendationService; 