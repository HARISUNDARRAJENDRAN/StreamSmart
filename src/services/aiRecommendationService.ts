/**
 * AI Recommendation Service
 * Integrates with AWS AI recommendation API for semantic video recommendations
 */

import { API_BASE_URL } from '@/lib/api-base';

// ============= Type Definitions =============

export interface AIRecommendationRequest {
  title: string;
  description?: string;
  topN?: number;
}

export interface AIVideoRecommendation {
  video_id: string;
  title: string;
  channelName: string;
  channelId?: string;
  thumbnailUrl: string;
  duration: string;
  genre: string;
  qualityScore: number;
  viewCount: number;
  youtubeUrl: string;
  description?: string;
  uploadDate?: string;
  similarityScore?: number; // AI similarity score
}

export interface AIRecommendationResponse {
  success: boolean;
  recommendations: AIVideoRecommendation[];
  count: number;
  metadata?: {
    model: string;
    search_method: string;
    index: string;
  };
  message?: string;
}

export interface AIHealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  timestamp: string;
  endpoint?: string;
  error?: string;
}

// ============= Configuration =============

const AI_API_ENDPOINT = process.env.NEXT_PUBLIC_AI_RECOMMENDATION_API || 
  `${API_BASE_URL}/api/v1/recommend`;

const AI_HEALTH_ENDPOINT = process.env.NEXT_PUBLIC_AI_HEALTH_CHECK || 
  `${API_BASE_URL}/api/v1/health`;

const AI_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS === 'true';

// Cache for AI recommendations
const aiCache = new Map<string, { data: AIRecommendationResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============= Service Implementation =============

class AIRecommendationService {
  private abortController: AbortController | null = null;

  /**
   * Check if AI recommendations are enabled
   */
  isEnabled(): boolean {
    return AI_ENABLED;
  }

  /**
   * Get AI-powered recommendations for a video
   * Uses semantic search to find truly similar content
   */
  async getRecommendations(
    request: AIRecommendationRequest
  ): Promise<AIRecommendationResponse> {
    if (!AI_ENABLED) {
      throw new Error('AI recommendations are not enabled');
    }

    const { title, description, topN = 10 } = request;

    if (!title?.trim()) {
      throw new Error('Video title is required');
    }

    // Check cache
    const cacheKey = JSON.stringify({ title, description, topN });
    const cached = aiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[AI] Cache hit for:', title);
      return cached.data;
    }

    // Cancel previous request if any
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      console.log('[AI] Fetching recommendations for:', title);
      
      const response = await fetch(AI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim() || '',
          topN: Math.min(topN, 50), // Cap at 50
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || `HTTP ${response.status}`
        );
      }

      const data: AIRecommendationResponse = await response.json();

      // Cache the response
      aiCache.set(cacheKey, { data, timestamp: Date.now() });

      // Clean old cache entries
      if (aiCache.size > 50) {
        const oldestKey = Array.from(aiCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        aiCache.delete(oldestKey);
      }

      console.log(`[AI] Got ${data.count} recommendations`);
      return data;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[AI] Request cancelled (this is normal if navigating away)');
        // Throw with a specific marker so components can ignore it
        const cancelError = new Error('Request was cancelled');
        cancelError.name = 'AbortError';
        throw cancelError;
      }

      console.error('[AI] Error fetching recommendations:', error);
      throw new Error(
        error.message || 'Failed to get AI recommendations'
      );
    }
  }

  /**
   * Get recommendations for when user adds a video to playlist
   * This is the main integration point
   */
  async getRecommendationsForVideo(
    videoTitle: string,
    videoDescription?: string,
    channelName?: string
  ): Promise<AIVideoRecommendation[]> {
    try {
      // Enhance the query with channel name if available
      const enhancedDescription = channelName
        ? `${videoDescription || ''} by ${channelName}`.trim()
        : videoDescription;

      const response = await this.getRecommendations({
        title: videoTitle,
        description: enhancedDescription,
        topN: 10,
      });

      return response.recommendations;
    } catch (error) {
      console.error('[AI] Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Health check for AI service
   */
  async checkHealth(): Promise<AIHealthCheckResponse> {
    try {
      const response = await fetch(AI_HEALTH_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        status: 'unhealthy',
        service: 'ai-recommendations',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clear recommendation cache
   */
  clearCache(): void {
    aiCache.clear();
    console.log('[AI] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: aiCache.size,
      keys: Array.from(aiCache.keys()).map(k => {
        try {
          const parsed = JSON.parse(k);
          return parsed.title;
        } catch {
          return k.substring(0, 50);
        }
      }),
    };
  }
}

// Export singleton instance
export const aiRecommendationService = new AIRecommendationService();

export default aiRecommendationService;
