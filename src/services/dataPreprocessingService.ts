// StreamSmart Data Preprocessing Service
// Handles data extraction, cleaning, and feature engineering for recommendation algorithms

import mongoose from 'mongoose';
import UserFeedback from '@/models/UserFeedback';
import UserWatchlist from '@/models/UserWatchlist';
import UserViewingHistory from '@/models/UserViewingHistory';
import UserSearchHistory from '@/models/UserSearchHistory';
import UserNavigationHistory from '@/models/UserNavigationHistory';
import UserHoverInteraction from '@/models/UserHoverInteraction';
import User from '@/models/User';

// Types for processed data structures
export interface ProcessedUserFeatures {
  userId: string;
  
  // Explicit preference features
  avgRating: number;
  ratingVariance: number;
  ratingCount: number;
  isHarshRater: boolean;
  reviewLengthAvg: number;
  reviewSentiment: number; // -1 to 1
  isDetailedReviewer: boolean;
  watchlistSize: number;
  watchlistCompletionRate: number;
  
  // Implicit behavior features
  avgCompletionRate: number;
  bingeTendency: number; // 0-1 score
  contentDiversity: number; // Shannon entropy
  viewingConsistency: number;
  searchFrequency: number;
  queryComplexity: number;
  searchSuccessRate: number;
  explorationDepth: number;
  pageEngagement: number;
  hoverEngagement: number;
  
  // Temporal features
  preferredViewingHour: number;
  weekendViewingRatio: number;
  recentActivityLevel: number;
  
  // Clustering features
  userType: 'binge_watcher' | 'casual_browser' | 'focused_learner' | 'explorer';
  engagementLevel: 'low' | 'medium' | 'high';
}

export interface ProcessedItemFeatures {
  itemId: string;
  
  // Content features
  durationCategory: 'short' | 'medium' | 'long';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  contentAge: number; // days since creation
  
  // Engagement metrics
  avgCompletionRate: number;
  avgRating: number;
  viewCount: number;
  watchlistAdds: number;
  replayRate: number;
  skipRate: number;
  hoverAttractiveness: number;
  
  // Popularity metrics
  trendingScore: number;
  viralityScore: number;
  qualityScore: number; // composite score
}

export interface UserItemInteraction {
  userId: string;
  itemId: string;
  
  // Explicit signals
  explicitRating?: number;
  reviewSentiment?: number;
  watchlistPriority?: number;
  
  // Implicit signals
  viewingCompletion: number;
  engagementIntensity: number;
  interactionRecency: number; // days ago
  contextSource: string;
  
  // Derived signals
  implicitRating: number; // 0-5 derived from behavior
  confidenceScore: number; // 0-1 confidence in the rating
}

class DataPreprocessingService {
  private readonly MIN_INTERACTIONS_PER_USER = 3;
  private readonly MIN_RATINGS_PER_ITEM = 3;
  private readonly MAX_VIEW_DURATION_MULTIPLIER = 1.1; // 110% of actual duration
  private readonly MIN_VIEW_DURATION_SECONDS = 5;
  private readonly SIGNIFICANT_HOVER_THRESHOLD = 500; // ms

  // 1. Data Extraction and Aggregation
  async extractUserData(userId: string, timeWindow?: { start: Date; end: Date }) {
    const baseQuery = { userId, isActive: true };
    const timeQuery = timeWindow ? {
      ...baseQuery,
      createdAt: { $gte: timeWindow.start, $lte: timeWindow.end }
    } : baseQuery;

    const [
      feedback,
      watchlist,
      viewingHistory,
      searchHistory,
      navigationHistory,
      hoverInteractions
    ] = await Promise.all([
      UserFeedback.find(timeQuery).lean(),
      UserWatchlist.find(baseQuery).lean(),
      UserViewingHistory.find(timeQuery).lean(),
      UserSearchHistory.find(timeQuery).lean(),
      UserNavigationHistory.find(timeQuery).lean(),
      UserHoverInteraction.find(timeQuery).lean()
    ]);

    return {
      feedback,
      watchlist,
      viewingHistory,
      searchHistory,
      navigationHistory,
      hoverInteractions
    };
  }

  // 2. Data Cleaning Pipeline
  async cleanViewingData(viewingHistory: any[]) {
    return viewingHistory.filter(record => {
      // Remove sessions that are too short (accidental clicks)
      if (record.totalViewDuration < this.MIN_VIEW_DURATION_SECONDS) {
        return false;
      }

      // Remove sessions with impossible completion percentages
      if (record.completionPercentage < 0 || record.completionPercentage > 120) {
        return false;
      }

      // Remove sessions with duration exceeding content length by too much
      if (record.actualDuration && 
          record.totalViewDuration > record.actualDuration * this.MAX_VIEW_DURATION_MULTIPLIER) {
        return false;
      }

      return true;
    }).map(record => ({
      ...record,
      // Cap completion percentage at 100%
      completionPercentage: Math.min(record.completionPercentage, 100),
      // Normalize view duration
      normalizedDuration: record.actualDuration ? 
        record.totalViewDuration / record.actualDuration : 
        record.totalViewDuration
    }));
  }

  async cleanSearchData(searchHistory: any[]) {
    return searchHistory.filter(record => {
      // Remove extremely short queries (likely typos)
      if (record.searchQuery.length < 2) return false;
      
      // Remove extremely long queries (likely spam)
      if (record.searchQuery.length > 500) return false;
      
      return true;
    }).map(record => ({
      ...record,
      // Normalize query
      normalizedQuery: record.searchQuery.toLowerCase().trim(),
      queryLength: record.searchQuery.length,
      hasResults: record.resultsFound > 0
    }));
  }

  async cleanHoverData(hoverInteractions: any[]) {
    return hoverInteractions.filter(record => {
      // Remove very short hovers (accidental mouse movements)
      if (record.hoverDuration < 100) return false;
      
      // Remove extremely long hovers (user went away)
      if (record.hoverDuration > 30000) return false;
      
      return true;
    }).map(record => ({
      ...record,
      isSignificantHover: record.hoverDuration >= this.SIGNIFICANT_HOVER_THRESHOLD
    }));
  }

  // 3. Feature Engineering
  async engineerUserFeatures(userData: any): Promise<ProcessedUserFeatures> {
    const {
      feedback,
      watchlist,
      viewingHistory,
      searchHistory,
      navigationHistory,
      hoverInteractions
    } = userData;

    // Clean the data first
    const cleanViewing = await this.cleanViewingData(viewingHistory);
    const cleanSearch = await this.cleanSearchData(searchHistory);
    const cleanHover = await this.cleanHoverData(hoverInteractions);

    // Calculate explicit features
    const ratings = feedback.filter((f: any) => f.feedbackType === 'rating');
    const reviews = feedback.filter((f: any) => f.feedbackType === 'review');
    
    const avgRating = ratings.length > 0 ? 
      ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length : 0;
    
    const ratingVariance = ratings.length > 1 ? 
      this.calculateVariance(ratings.map((r: any) => r.rating)) : 0;

    // Calculate implicit features
    const avgCompletionRate = cleanViewing.length > 0 ?
      cleanViewing.reduce((sum, v) => sum + v.completionPercentage, 0) / cleanViewing.length : 0;

    const bingeTendency = this.calculateBingeTendency(cleanViewing);
    const contentDiversity = this.calculateContentDiversity(cleanViewing);
    const searchSuccessRate = this.calculateSearchSuccessRate(cleanSearch);
    const hoverEngagement = this.calculateHoverEngagement(cleanHover);

    // Temporal analysis
    const viewingTimes = cleanViewing.map(v => new Date(v.viewStartTime).getHours());
    const preferredViewingHour = this.calculateMode(viewingTimes);
    
    // User classification
    const userType = this.classifyUserType({
      avgCompletionRate,
      bingeTendency,
      contentDiversity,
      searchFrequency: cleanSearch.length
    });

    return {
      userId: userData.userId,
      
      // Explicit features
      avgRating,
      ratingVariance,
      ratingCount: ratings.length,
      isHarshRater: avgRating < 3.0 && ratings.length >= 5,
      reviewLengthAvg: reviews.length > 0 ? 
        reviews.reduce((sum: number, r: any) => sum + (r.reviewText?.length || 0), 0) / reviews.length : 0,
      reviewSentiment: 0, // TODO: Implement sentiment analysis
      isDetailedReviewer: reviews.some((r: any) => r.reviewText && r.reviewText.length > 100),
      watchlistSize: watchlist.length,
      watchlistCompletionRate: this.calculateWatchlistCompletionRate(watchlist),
      
      // Implicit features
      avgCompletionRate,
      bingeTendency,
      contentDiversity,
      viewingConsistency: this.calculateViewingConsistency(cleanViewing),
      searchFrequency: cleanSearch.length,
      queryComplexity: this.calculateQueryComplexity(cleanSearch),
      searchSuccessRate,
      explorationDepth: this.calculateExplorationDepth(navigationHistory),
      pageEngagement: this.calculatePageEngagement(navigationHistory),
      hoverEngagement,
      
      // Temporal features
      preferredViewingHour,
      weekendViewingRatio: this.calculateWeekendViewingRatio(cleanViewing),
      recentActivityLevel: this.calculateRecentActivityLevel(cleanViewing),
      
      // Classification
      userType,
      engagementLevel: this.classifyEngagementLevel({
        avgCompletionRate,
        hoverEngagement,
        searchFrequency: cleanSearch.length
      })
    };
  }

  // 4. Utility Functions for Feature Calculation
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateBingeTendency(viewingHistory: any[]): number {
    if (viewingHistory.length === 0) return 0;
    
    // Group by session and calculate session lengths
    const sessionGroups = new Map<string, any[]>();
    viewingHistory.forEach(record => {
      const sessionId = record.viewingContext.sessionId;
      if (!sessionGroups.has(sessionId)) {
        sessionGroups.set(sessionId, []);
      }
      sessionGroups.get(sessionId)!.push(record);
    });

    // Calculate average session length and video count per session
    const sessionMetrics = Array.from(sessionGroups.values()).map(session => ({
      videoCount: session.length,
      totalDuration: session.reduce((sum, v) => sum + v.totalViewDuration, 0)
    }));

    const avgVideosPerSession = sessionMetrics.reduce((sum, s) => sum + s.videoCount, 0) / sessionMetrics.length;
    const avgSessionDuration = sessionMetrics.reduce((sum, s) => sum + s.totalDuration, 0) / sessionMetrics.length;

    // Normalize to 0-1 scale (binge = multiple videos in long sessions)
    return Math.min(1, (avgVideosPerSession / 5) * (avgSessionDuration / 7200)); // 2 hours = 7200 seconds
  }

  private calculateContentDiversity(viewingHistory: any[]): number {
    if (viewingHistory.length === 0) return 0;
    
    // For now, calculate diversity based on itemId uniqueness
    // In production, you'd want to use actual content categories/tags
    const uniqueItems = new Set(viewingHistory.map(v => v.itemId));
    return uniqueItems.size / viewingHistory.length;
  }

  private calculateSearchSuccessRate(searchHistory: any[]): number {
    if (searchHistory.length === 0) return 0;
    
    const successfulSearches = searchHistory.filter(s => 
      s.searchSuccessful || s.clickedResults.length > 0
    );
    
    return successfulSearches.length / searchHistory.length;
  }

  private calculateHoverEngagement(hoverInteractions: any[]): number {
    if (hoverInteractions.length === 0) return 0;
    
    const significantHovers = hoverInteractions.filter(h => h.isSignificantHover);
    const clickThroughHovers = hoverInteractions.filter(h => h.hoverOutcome.resultedInClick);
    
    // Combine hover frequency and conversion rate
    const hoverRate = significantHovers.length / Math.max(1, hoverInteractions.length);
    const conversionRate = clickThroughHovers.length / Math.max(1, significantHovers.length);
    
    return (hoverRate + conversionRate) / 2;
  }

  private calculateMode(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const frequency = new Map<number, number>();
    numbers.forEach(num => {
      frequency.set(num, (frequency.get(num) || 0) + 1);
    });
    
    let maxFreq = 0;
    let mode = 0;
    frequency.forEach((freq, num) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = num;
      }
    });
    
    return mode;
  }

  private calculateWatchlistCompletionRate(watchlist: any[]): number {
    if (watchlist.length === 0) return 0;
    
    const completed = watchlist.filter(w => w.status === 'completed');
    return completed.length / watchlist.length;
  }

  private calculateViewingConsistency(viewingHistory: any[]): number {
    if (viewingHistory.length < 7) return 0; // Need at least a week of data
    
    // Calculate daily viewing and measure consistency
    const dailyViewing = new Map<string, number>();
    
    viewingHistory.forEach(record => {
      const date = new Date(record.viewStartTime).toDateString();
      dailyViewing.set(date, (dailyViewing.get(date) || 0) + 1);
    });
    
    const viewingCounts = Array.from(dailyViewing.values());
    const mean = viewingCounts.reduce((sum, count) => sum + count, 0) / viewingCounts.length;
    const variance = this.calculateVariance(viewingCounts);
    
    // Lower variance = higher consistency
    return Math.max(0, 1 - (variance / Math.max(1, mean)));
  }

  private calculateQueryComplexity(searchHistory: any[]): number {
    if (searchHistory.length === 0) return 0;
    
    const avgQueryLength = searchHistory.reduce((sum, s) => sum + s.queryLength, 0) / searchHistory.length;
    const refinementRate = searchHistory.filter(s => s.searchRefinements.length > 0).length / searchHistory.length;
    
    // Normalize to 0-1 scale
    return Math.min(1, (avgQueryLength / 50) * 0.7 + refinementRate * 0.3);
  }

  private calculateExplorationDepth(navigationHistory: any[]): number {
    if (navigationHistory.length === 0) return 0;
    
    const avgScrollDepth = navigationHistory.reduce((sum, n) => sum + n.scrollDepth, 0) / navigationHistory.length;
    const avgTimeOnPage = navigationHistory.reduce((sum, n) => sum + (n.timeOnPage || 0), 0) / navigationHistory.length;
    
    return Math.min(1, (avgScrollDepth / 100) * 0.6 + Math.min(avgTimeOnPage / 300, 1) * 0.4);
  }

  private calculatePageEngagement(navigationHistory: any[]): number {
    if (navigationHistory.length === 0) return 0;
    
    const totalClicks = navigationHistory.reduce((sum, n) => sum + n.clickEvents.length, 0);
    const avgClicksPerPage = totalClicks / navigationHistory.length;
    
    return Math.min(1, avgClicksPerPage / 10); // Normalize assuming 10 clicks is high engagement
  }

  private calculateWeekendViewingRatio(viewingHistory: any[]): number {
    if (viewingHistory.length === 0) return 0;
    
    const weekendViews = viewingHistory.filter(v => {
      const dayOfWeek = new Date(v.viewStartTime).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    });
    
    return weekendViews.length / viewingHistory.length;
  }

  private calculateRecentActivityLevel(viewingHistory: any[]): number {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentViews = viewingHistory.filter(v => 
      new Date(v.viewStartTime) >= thirtyDaysAgo
    );
    
    return recentViews.length / 30; // Views per day in last 30 days
  }

  private classifyUserType(metrics: {
    avgCompletionRate: number;
    bingeTendency: number;
    contentDiversity: number;
    searchFrequency: number;
  }): 'binge_watcher' | 'casual_browser' | 'focused_learner' | 'explorer' {
    const { avgCompletionRate, bingeTendency, contentDiversity, searchFrequency } = metrics;
    
    if (bingeTendency > 0.7 && avgCompletionRate > 0.8) {
      return 'binge_watcher';
    } else if (contentDiversity > 0.7 && searchFrequency > 10) {
      return 'explorer';
    } else if (avgCompletionRate > 0.8 && contentDiversity < 0.3) {
      return 'focused_learner';
    } else {
      return 'casual_browser';
    }
  }

  private classifyEngagementLevel(metrics: {
    avgCompletionRate: number;
    hoverEngagement: number;
    searchFrequency: number;
  }): 'low' | 'medium' | 'high' {
    const { avgCompletionRate, hoverEngagement, searchFrequency } = metrics;
    
    const engagementScore = (avgCompletionRate + hoverEngagement) / 2 + 
                          Math.min(searchFrequency / 20, 0.5); // Cap search contribution
    
    if (engagementScore > 0.7) return 'high';
    if (engagementScore > 0.4) return 'medium';
    return 'low';
  }

  // 5. Batch Processing for Multiple Users
  async preprocessUsersInBatch(userIds: string[], batchSize: number = 100): Promise<ProcessedUserFeatures[]> {
    const results: ProcessedUserFeatures[] = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (userId) => {
        try {
          const userData = await this.extractUserData(userId);
          return await this.engineerUserFeatures(userData);
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as ProcessedUserFeatures[]);
      
      // Log progress
      console.log(`Processed ${Math.min(i + batchSize, userIds.length)} / ${userIds.length} users`);
    }
    
    return results;
  }

  // 6. Create User-Item Interaction Matrix for Collaborative Filtering
  async createInteractionMatrix(userIds: string[], itemIds: string[]): Promise<UserItemInteraction[]> {
    const interactions: UserItemInteraction[] = [];
    
    for (const userId of userIds) {
      const userData = await this.extractUserData(userId);
      
      for (const itemId of itemIds) {
        const interaction = await this.calculateUserItemInteraction(userId, itemId, userData);
        if (interaction) {
          interactions.push(interaction);
        }
      }
    }
    
    return interactions;
  }

  private async calculateUserItemInteraction(
    userId: string, 
    itemId: string, 
    userData: any
  ): Promise<UserItemInteraction | null> {
    const { feedback, viewingHistory } = userData;
    
    // Check for explicit feedback
    const explicitFeedback = feedback.find((f: any) => f.itemId === itemId);
    const viewingRecord = viewingHistory.find((v: any) => v.itemId === itemId);
    
    // Skip if no interaction found
    if (!explicitFeedback && !viewingRecord) {
      return null;
    }
    
    // Calculate implicit rating from viewing behavior
    let implicitRating = 0;
    let confidenceScore = 0;
    
    if (viewingRecord) {
      // Convert completion percentage to implicit rating (0-5 scale)
      implicitRating = (viewingRecord.completionPercentage / 100) * 5;
      
      // Boost rating based on engagement signals
      if (viewingRecord.pauseCount === 0 && viewingRecord.completionPercentage > 90) {
        implicitRating = Math.min(5, implicitRating + 0.5); // Bonus for uninterrupted viewing
      }
      
      // Calculate confidence based on viewing duration and behavior
      confidenceScore = Math.min(1, viewingRecord.totalViewDuration / 60); // Max confidence at 1 minute
    }
    
    // Combine explicit and implicit signals
    const finalRating = explicitFeedback?.rating || implicitRating;
    const finalConfidence = explicitFeedback ? 1.0 : confidenceScore;
    
    return {
      userId,
      itemId,
      explicitRating: explicitFeedback?.rating,
      reviewSentiment: explicitFeedback?.reviewText ? 0 : undefined, // TODO: Implement sentiment
      watchlistPriority: undefined, // TODO: Extract from watchlist
      viewingCompletion: viewingRecord?.completionPercentage || 0,
      engagementIntensity: this.calculateEngagementIntensity(viewingRecord),
      interactionRecency: this.calculateInteractionRecency(viewingRecord?.viewStartTime || explicitFeedback?.createdAt),
      contextSource: viewingRecord?.viewingContext?.source || 'unknown',
      implicitRating: implicitRating,
      confidenceScore: finalConfidence
    };
  }

  private calculateEngagementIntensity(viewingRecord: any): number {
    if (!viewingRecord) return 0;
    
    // Combine multiple engagement signals
    const completionBonus = viewingRecord.completionPercentage / 100;
    const interactionPenalty = (viewingRecord.pauseCount + viewingRecord.seekCount) * 0.1;
    const qualityBonus = viewingRecord.fullScreenUsed ? 0.2 : 0;
    
    return Math.max(0, Math.min(1, completionBonus - interactionPenalty + qualityBonus));
  }

  private calculateInteractionRecency(timestamp: string): number {
    const now = new Date();
    const interactionDate = new Date(timestamp);
    const daysDiff = (now.getTime() - interactionDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.floor(daysDiff);
  }
}

export const dataPreprocessingService = new DataPreprocessingService(); 