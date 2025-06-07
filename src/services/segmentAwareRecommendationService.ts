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
    
    // Find user's cluster - Enhanced matching logic
    const userCluster = userClusters.find(cluster => {
      if (!cluster.userIds || !Array.isArray(cluster.userIds)) {
        console.log(`⚠️ Cluster ${cluster.clusterId} has invalid userIds:`, cluster.userIds);
        return false;
      }
      
      // Enhanced user matching with multiple strategies
      return cluster.userIds.some(id => {
        if (!id) return false;
        
        try {
          // Strategy 1: Direct string comparison
          if (String(id) === String(userId)) {
            return true;
          }
          
          // Strategy 2: ObjectId comparison (handle both directions)
          if (typeof id === 'object' && id.toString && id.toString() === userId) {
            return true;
          }
          
          // Strategy 3: Handle mongoose ObjectId comparison
          if (id._id && String(id._id) === userId) {
            return true;
          }
          
          // Strategy 4: Loose string comparison (remove whitespace/special chars)
          const cleanId = String(id).trim().replace(/[^a-zA-Z0-9]/g, '');
          const cleanUserId = String(userId).trim().replace(/[^a-zA-Z0-9]/g, '');
          if (cleanId === cleanUserId) {
            return true;
          }
          
          return false;
        } catch (error) {
          console.log(`⚠️ Error matching user ID:`, id, error);
          return false;
        }
      });
    });
    
    if (!userCluster) {
      console.log(`❌ User ${userId} not found in any cluster after enhanced matching`);
      
      // Enhanced debugging - check all user IDs
      const allUserIds = userClusters.flatMap(c => c.userIds || []).filter(Boolean);
      console.log(`📊 Total users in clusters: ${allUserIds.length}`);
      console.log(`📋 Sample user IDs: ${allUserIds.slice(0, 10).map(id => String(id)).join(', ')}`);
      console.log(`🔍 Looking for: ${userId} (type: ${typeof userId})`);
      
      // Try fuzzy matching as last resort
      const fuzzyMatch = this.findFuzzyUserMatch(userId, userClusters);
      if (fuzzyMatch) {
        console.log(`✅ Found fuzzy match in cluster ${fuzzyMatch.clusterId}`);
        return this.createSegmentProfile(userId, fuzzyMatch);
      }
      
      return null;
    }
    
    console.log(`✅ Found user ${userId} in cluster ${userCluster.clusterId} with ${userCluster.userIds?.length || 0} users`);
    console.log(`Cluster characteristics: ${JSON.stringify(userCluster.characteristics, null, 2)}`);
    
    return this.createSegmentProfile(userId, userCluster);
  }

  // Helper method to create segment profile
  private createSegmentProfile(userId: string, userCluster: UserCluster): UserSegmentProfile {
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

  // Helper method for fuzzy user matching
  private findFuzzyUserMatch(userId: string, userClusters: UserCluster[]): UserCluster | null {
    const userIdStr = String(userId).toLowerCase();
    
    for (const cluster of userClusters) {
      if (!cluster.userIds) continue;
      
      const match = cluster.userIds.find(id => {
        if (!id) return false;
        try {
          const idStr = String(id).toLowerCase();
          // Check if IDs are similar (allowing for slight variations)
          return idStr.includes(userIdStr) || userIdStr.includes(idStr);
        } catch (error) {
          return false;
        }
      });
      
      if (match) {
        console.log(`🔍 Fuzzy match found: ${match} ≈ ${userId}`);
        return cluster;
      }
    }
    
    return null;
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

  // Enhanced segment analytics
  async getSegmentAnalytics(clusterId: number): Promise<any> {
    const cluster = this.clusterCache.get(clusterId);
    if (!cluster) {
      return {
        error: 'Cluster not found',
        clusterId,
        availableClusters: Array.from(this.clusterCache.keys())
      };
    }

    try {
      // Get detailed cluster analytics
      const clusterUsers = cluster.userIds || [];
      console.log(`📊 Analyzing cluster ${clusterId} with ${clusterUsers.length} users`);

      // Get viewing patterns for cluster users
      const viewingHistory = await UserViewingHistory.find({
        userId: { $in: clusterUsers }
      }).limit(1000);

      // Calculate engagement metrics
      const engagementMetrics = this.calculateEngagementMetrics(viewingHistory);
      
      // Get content preferences
      const contentPreferences = this.analyzeContentPreferences(viewingHistory);
      
      // Calculate recommendation performance
      const recommendationPerformance = await this.calculateRecommendationPerformance(clusterUsers);

      return {
        clusterId,
        clusterSize: clusterUsers.length,
        characteristics: cluster.characteristics,
        engagementMetrics,
        contentPreferences,
        recommendationPerformance,
        recommendationEngine: this.createRecommendationEngine(cluster.characteristics),
        insights: this.generateClusterInsights(cluster, engagementMetrics, contentPreferences)
      };
    } catch (error) {
      console.error(`Error analyzing cluster ${clusterId}:`, error);
      return {
        error: 'Analysis failed',
        clusterId,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Calculate detailed engagement metrics
  private calculateEngagementMetrics(viewingHistory: any[]): any {
    if (viewingHistory.length === 0) {
      return {
        avgViewDuration: 0,
        avgCompletionRate: 0,
        totalViews: 0,
        activeUsers: 0,
        avgSessionsPerUser: 0
      };
    }

    const totalViews = viewingHistory.length;
    const uniqueUsers = new Set(viewingHistory.map(v => v.userId)).size;
    const totalDuration = viewingHistory.reduce((sum, v) => sum + (v.totalViewDuration || 0), 0);
    const totalCompletion = viewingHistory.reduce((sum, v) => sum + (v.completionPercentage || 0), 0);

    // Group by user to calculate sessions
    const userSessions = new Map<string, number>();
    viewingHistory.forEach(v => {
      const userId = v.userId;
      userSessions.set(userId, (userSessions.get(userId) || 0) + 1);
    });

    const avgSessionsPerUser = uniqueUsers > 0 ? 
      Array.from(userSessions.values()).reduce((sum, sessions) => sum + sessions, 0) / uniqueUsers : 0;

    return {
      avgViewDuration: totalViews > 0 ? totalDuration / totalViews : 0,
      avgCompletionRate: totalViews > 0 ? totalCompletion / totalViews : 0,
      totalViews,
      activeUsers: uniqueUsers,
      avgSessionsPerUser,
      engagementScore: this.calculateEngagementScore(totalViews, totalDuration, totalCompletion, uniqueUsers)
    };
  }

  // Analyze content preferences for the cluster
  private analyzeContentPreferences(viewingHistory: any[]): any {
    const categoryCount = new Map<string, number>();
    const categoryDuration = new Map<string, number>();
    const categoryCompletion = new Map<string, number>();

    viewingHistory.forEach(v => {
      const category = v.category || 'Unknown';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
      categoryDuration.set(category, (categoryDuration.get(category) || 0) + (v.totalViewDuration || 0));
      categoryCompletion.set(category, (categoryCompletion.get(category) || 0) + (v.completionPercentage || 0));
    });

    // Calculate preferences with scores
    const preferences = Array.from(categoryCount.entries()).map(([category, count]) => {
      const duration = categoryDuration.get(category) || 0;
      const completion = categoryCompletion.get(category) || 0;
      const avgCompletion = count > 0 ? completion / count : 0;
      const score = (count * 0.4) + (duration * 0.0001) + (avgCompletion * 0.6);
      
      return {
        category,
        viewCount: count,
        totalDuration: duration,
        avgCompletion,
        preferenceScore: score
      };
    }).sort((a, b) => b.preferenceScore - a.preferenceScore);

    return {
      topPreferences: preferences.slice(0, 5),
      totalCategories: preferences.length,
      diversityIndex: this.calculateDiversityIndex(preferences)
    };
  }

  // Calculate recommendation performance for cluster users
  private async calculateRecommendationPerformance(userIds: string[]): Promise<any> {
    try {
      // Get recent feedback for cluster users
      const recentFeedback = await UserFeedback.find({
        userId: { $in: userIds },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      });

      if (recentFeedback.length === 0) {
        return {
          totalFeedback: 0,
          positiveRate: 0,
          avgRating: 0,
          engagementRate: 0
        };
      }

      const positiveFeedback = recentFeedback.filter(f => 
        (f.feedbackType === 'rating' && f.rating && f.rating >= 4) ||
        f.feedbackType === 'like'
      ).length;

      const ratings = recentFeedback.filter(f => f.feedbackType === 'rating' && f.rating);
      const avgRating = ratings.length > 0 ? 
        ratings.reduce((sum, f) => sum + f.rating!, 0) / ratings.length : 0;

      return {
        totalFeedback: recentFeedback.length,
        positiveFeedback,
        positiveRate: positiveFeedback / recentFeedback.length,
        avgRating,
        engagementRate: recentFeedback.length / userIds.length
      };
    } catch (error) {
      console.error('Error calculating recommendation performance:', error);
      return {
        totalFeedback: 0,
        positiveRate: 0,
        avgRating: 0,
        engagementRate: 0,
        error: 'Calculation failed'
      };
    }
  }

  // Generate cluster insights
  private generateClusterInsights(cluster: UserCluster, engagementMetrics: any, contentPreferences: any): any {
    const characteristics = cluster.characteristics;
    
    return {
      segmentType: characteristics.userType,
      engagementLevel: characteristics.engagementLevel,
      keyBehaviors: characteristics.behaviorPatterns,
      contentAffinities: contentPreferences.topPreferences.slice(0, 3).map((p: any) => p.category),
      recommendationStrategy: characteristics.recommendationStrategy,
      clusterHealth: {
        size: cluster.clusterSize,
        cohesion: cluster.intraClusterDistance,
        engagement: engagementMetrics.engagementScore,
        diversity: contentPreferences.diversityIndex
      },
      optimizationSuggestions: this.generateOptimizationSuggestions(cluster, engagementMetrics, contentPreferences)
    };
  }

  // Helper methods for calculations
  private calculateEngagementScore(views: number, duration: number, completion: number, users: number): number {
    const avgViewsPerUser = users > 0 ? views / users : 0;
    const avgDurationPerView = views > 0 ? duration / views : 0;
    const avgCompletionRate = views > 0 ? completion / views : 0;
    
    // Weighted engagement score (0-100)
    return Math.min(100, 
      (avgViewsPerUser * 10) + 
      (avgDurationPerView * 0.01) + 
      (avgCompletionRate * 0.5)
    );
  }

  private calculateDiversityIndex(preferences: any[]): number {
    if (preferences.length === 0) return 0;
    
    const totalScore = preferences.reduce((sum, p) => sum + p.preferenceScore, 0);
    const entropy = preferences.reduce((sum, p) => {
      const probability = p.preferenceScore / totalScore;
      return sum - (probability * Math.log2(probability || 1));
    }, 0);
    
    return entropy / Math.log2(preferences.length || 1); // Normalized entropy
  }

  private generateOptimizationSuggestions(cluster: UserCluster, engagementMetrics: any, contentPreferences: any): string[] {
    const suggestions: string[] = [];
    
    if (engagementMetrics.engagementScore < 30) {
      suggestions.push('Increase content variety to boost engagement');
    }
    
    if (contentPreferences.diversityIndex < 0.3) {
      suggestions.push('Introduce cross-category recommendations');
    }
    
    if (cluster.clusterSize < 5) {
      suggestions.push('Consider merging with similar clusters for better recommendations');
    }
    
    if (engagementMetrics.avgCompletionRate < 50) {
      suggestions.push('Focus on shorter content or better content matching');
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const segmentAwareRecommendationService = new SegmentAwareRecommendationService();
export default segmentAwareRecommendationService; 