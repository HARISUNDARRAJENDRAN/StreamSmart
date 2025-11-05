/**
 * CSV-Based Recommendation Service
 * Production-ready TypeScript implementation with proper error handling, caching, and type safety
 */

import { API_BASE_URL } from '@/lib/api-base';

// ============= Type Definitions =============

export interface VideoRecommendation {
  video_id: string;
  title: string;
  channelName: string;
  channelId?: string;
  thumbnailUrl: string;
  duration: string;
  genre: string;
  qualityScore: number;
  viewCount: number;
  popularityScore?: number;
  youtubeUrl: string;
  description?: string;
  uploadDate?: string;
}

export interface SmartFeedSections {
  continueLearning: VideoRecommendation[];
  recommended: VideoRecommendation[];
  trending: VideoRecommendation[];
  discover: VideoRecommendation[];
}

export interface SmartFeedResponse {
  success: boolean;
  sections: SmartFeedSections;
  metadata: Record<string, any>;
  message?: string;
}

export interface TopicNode {
  id: string;
  title: string;
  videoCount: number;
  averageQualityScore: number;
  totalViews: number;
  topKeywords: string[];
  sampleVideos: VideoRecommendation[];
}

export interface TopicHierarchyResponse {
  success: boolean;
  topics: TopicNode[];
  totalTopics: number;
  metadata: Record<string, any>;
}

export interface CreatorSummary {
  channelName: string;
  channelId?: string;
  videoCount: number;
  averageQualityScore: number;
  totalViews: number;
  genres: string[];
  topVideos: VideoRecommendation[];
}

export interface CreatorResponse {
  success: boolean;
  creators: CreatorSummary[];
  count: number;
  metadata: Record<string, any>;
}

export interface RecommendationRequest {
  genre?: string;
  userId?: string;
  excludeIds?: string[];
  topN?: number;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: VideoRecommendation[];
  count: number;
  message?: string;
  metadata?: Record<string, any>;
}

export interface SearchRequest {
  keywords?: string[];
  topN?: number;
  searchFields?: string[];
  genres?: string[];
  channels?: string[];
  minQualityScore?: number;
  duration?: {
    minSeconds?: number;
    maxSeconds?: number;
  };
  difficultyLevels?: string[];
  uploadedAfter?: string | Date;
  sortBy?: 'relevance' | 'popularity' | 'recent';
}

export interface SystemStats {
  total_videos: number;
  total_genres: number;
  genres: string[];
  avg_quality_score: number;
  avg_view_count: number;
  cache_size: number;
  last_refresh?: string;
  version: string;
}

// ============= Cache Implementation =============

class RecommendationCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 50;

  generateKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    // Implement simple LRU: remove oldest if cache is full
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// ============= Error Handling =============

class RecommendationError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

// ============= Service Implementation =============

class RecommendationService {
  private readonly baseUrl: string;
  private readonly cache: RecommendationCache;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/recommendations`;
    this.cache = new RecommendationCache();
  }

  /**
   * Generic fetch wrapper with error handling and abort support
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 2
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Create abort controller for this request
    const requestId = `${endpoint}-${Date.now()}`;
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    const fetchOptions: RequestInit = {
      ...options,
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, fetchOptions);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({
              message: `HTTP ${response.status}`,
            }));
            
            throw new RecommendationError(
              errorData.detail || errorData.message || 'Request failed',
              response.status,
              errorData
            );
          }

          const data = await response.json();
          return data as T;
        } catch (error) {
          if (error instanceof RecommendationError) {
            throw error;
          }
          
          if ((error as Error).name === 'AbortError') {
            throw new RecommendationError('Request was cancelled');
          }

          // Retry on network errors
          if (attempt === retries) {
            throw new RecommendationError(
              'Network error: Unable to reach recommendation service',
              undefined,
              error
            );
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      throw new RecommendationError('Max retries exceeded');
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Get video recommendations based on criteria
   */
  async getSuggestions(params: RecommendationRequest): Promise<RecommendationResponse> {
    const cacheKey = this.cache.generateKey('suggest', params);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry<RecommendationResponse>(
        '/suggest',
        {
          method: 'POST',
          body: JSON.stringify({
            genre: params.genre,
            user_id: params.userId,
            exclude_ids: params.excludeIds || [],
            top_n: params.topN || 10,
          }),
        }
      );

      // Cache successful response
      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      throw error;
    }
  }

  /**
   * Get trending videos
   */
  async getTrending(genre?: string, topN: number = 10): Promise<RecommendationResponse> {
    const params = { genre, topN };
    const cacheKey = this.cache.generateKey('trending', params);
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = new URLSearchParams();
      if (genre) queryParams.set('genre', genre);
      queryParams.set('top_n', topN.toString());

      const response = await this.fetchWithRetry<RecommendationResponse>(
        `/trending?${queryParams.toString()}`
      );

      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching trending videos:', error);
      throw error;
    }
  }

  /**
   * Search videos by keywords
   */
  async searchVideos(request: SearchRequest): Promise<RecommendationResponse> {
    const payload = {
      keywords: request.keywords,
      top_n: request.topN ?? 10,
      search_fields: request.searchFields,
      genres: request.genres,
      channels: request.channels,
      min_quality_score: request.minQualityScore,
      duration: request.duration
        ? {
            min_seconds: request.duration.minSeconds,
            max_seconds: request.duration.maxSeconds,
          }
        : undefined,
      difficulty_levels: request.difficultyLevels,
      uploaded_after: request.uploadedAfter
        ? request.uploadedAfter instanceof Date
          ? request.uploadedAfter.toISOString()
          : request.uploadedAfter
        : undefined,
      sort_by: request.sortBy,
    };

    const cacheKey = this.cache.generateKey('search', payload);
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry<RecommendationResponse>(
        '/search',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  }

  /**
   * Get videos similar to a specific video
   */
  async getSimilarVideos(
    videoId: string,
    topN: number = 10
  ): Promise<RecommendationResponse> {
    const cacheKey = this.cache.generateKey('similar', { videoId, topN });
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry<RecommendationResponse>(
        `/similar/${videoId}?top_n=${topN}`
      );

      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching similar videos:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    try {
      return await this.fetchWithRetry<SystemStats>('/stats');
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  /**
   * Refresh recommendation data (admin function)
   */
  async refreshData(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.fetchWithRetry<{ status: string; message: string }>(
        '/refresh',
        { method: 'POST' }
      );
      
      // Clear cache after refresh
      this.cache.clear();
      
      return response;
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{ status: string; service: string; timestamp: string }> {
    try {
      return await this.fetchWithRetry('/health');
    } catch (error) {
      console.error('Recommendation service health check failed:', error);
      throw error;
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  /**
   * Get personalized smart feed with multiple contextual sections
   */
  async getSmartFeed(userId: string, limit: number = 50): Promise<SmartFeedResponse> {
    const cacheKey = this.cache.generateKey('smart-feed', { userId, limit });
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry<SmartFeedResponse>(
        '/smart-feed',
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            limit,
          }),
        }
      );

      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching smart feed:', error);
      throw error;
    }
  }

  /**
   * Get dynamic topic hierarchy for explore page
   */
  async getTopicHierarchy(
    maxTopics: number = 12,
    samplesPerTopic: number = 6
  ): Promise<TopicHierarchyResponse> {
    const cacheKey = this.cache.generateKey('topics', { maxTopics, samplesPerTopic });
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('max_topics', maxTopics.toString());
      queryParams.set('samples_per_topic', samplesPerTopic.toString());

      const response = await this.fetchWithRetry<TopicHierarchyResponse>(
        `/topics/hierarchy?${queryParams.toString()}`
      );

      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching topic hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get top creators with aggregated metrics
   */
  async getTopCreators(
    genre?: string,
    sortBy: 'quality' | 'views' | 'videos' = 'quality',
    limit: number = 20,
    minVideos: number = 2
  ): Promise<CreatorResponse> {
    const cacheKey = this.cache.generateKey('creators', { genre, sortBy, limit, minVideos });
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = new URLSearchParams();
      if (genre) queryParams.set('genre', genre);
      queryParams.set('sort_by', sortBy);
      queryParams.set('limit', limit.toString());
      queryParams.set('min_videos', minVideos.toString());

      const response = await this.fetchWithRetry<CreatorResponse>(
        `/creators/top?${queryParams.toString()}`
      );

      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching top creators:', error);
      throw error;
    }
  }
}

// ============= Export Singleton Instance =============

const recommendationService = new RecommendationService();

// Export both the service instance and the class for testing
export { recommendationService, RecommendationService, RecommendationError };

// Default export for convenient importing
export default recommendationService;
