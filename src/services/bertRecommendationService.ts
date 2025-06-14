const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// TypeScript interfaces for BERT recommendation data
export interface VideoRecommendation {
  title: string;
  channel_name: string;
  likes: number;
  dislikes: number;
  thumbnail_url: string;
  genre: string;
  similarity?: number;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: VideoRecommendation[];
  total_count: number;
  message?: string;
}

export interface SystemStats {
  total_videos: number;
  unique_genres: number;
  genres: Record<string, number>;
  cached_embeddings: number;
  system_status: string;
}

export interface UserViewingHistory {
  user_id: string;
  video_title: string;
  genre: string;
  watch_duration?: number;
  timestamp: string;
}

export interface BertRecommendationRequest {
  title: string;
  top_n?: number;
  genre_filter?: string;
  user_id?: string;
}

export interface GenreRecommendationRequest {
  genre: string;
  top_n?: number;
  user_id?: string;
}

export interface PersonalizedRecommendationRequest {
  user_id: string;
  top_n?: number;
}

class BertRecommendationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/bert-recommendations`;
  }

  /**
   * Initialize the BERT recommendation system
   */
  async initializeSystem(): Promise<{ success: boolean; message: string; stats?: SystemStats }> {
    try {
      const response = await fetch(`${this.baseUrl}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initializing BERT system:', error);
      return {
        success: false,
        message: `Failed to initialize system: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{ success: boolean; stats?: SystemStats }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting system stats:', error);
      return { success: false };
    }
  }

  /**
   * Get content-based recommendations using BERT embeddings
   */
  async getContentBasedRecommendations(
    request: BertRecommendationRequest
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: request.title,
          top_n: request.top_n || 5,
          genre_filter: request.genre_filter,
          user_id: request.user_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting content-based recommendations:', error);
      return {
        success: false,
        recommendations: [],
        total_count: 0,
        message: `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get genre-based recommendations
   */
  async getGenreBasedRecommendations(
    request: GenreRecommendationRequest
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/recommend-by-genre`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre: request.genre,
          top_n: request.top_n || 10,
          user_id: request.user_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting genre-based recommendations:', error);
      return {
        success: false,
        recommendations: [],
        total_count: 0,
        message: `Failed to get genre recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get personalized recommendations based on user viewing history
   */
  async getPersonalizedRecommendations(
    request: PersonalizedRecommendationRequest
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/recommend-personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: request.user_id,
          top_n: request.top_n || 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return {
        success: false,
        recommendations: [],
        total_count: 0,
        message: `Failed to get personalized recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get popular video recommendations
   */
  async getPopularRecommendations(topN: number = 10): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/popular?top_n=${topN}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting popular recommendations:', error);
      return {
        success: false,
        recommendations: [],
        total_count: 0,
        message: `Failed to get popular recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get available genres
   */
  async getAvailableGenres(): Promise<{
    success: boolean;
    genres: string[];
    genre_counts: Record<string, number>;
    total_genres: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/genres`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting available genres:', error);
      return {
        success: false,
        genres: [],
        genre_counts: {},
        total_genres: 0,
      };
    }
  }

  /**
   * Log user viewing activity
   */
  async logUserViewing(
    userId: string,
    videoTitle: string,
    genre: string,
    watchDuration?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/log-viewing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          video_title: videoTitle,
          genre: genre,
          watch_duration: watchDuration,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error logging user viewing:', error);
      return {
        success: false,
        message: `Failed to log viewing: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get user viewing history
   */
  async getUserViewingHistory(
    userId: string,
    limit: number = 20
  ): Promise<{
    success: boolean;
    history: UserViewingHistory[];
    count: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/user-history/${userId}?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting user viewing history:', error);
      return {
        success: false,
        history: [],
        count: 0,
      };
    }
  }

  /**
   * Clear user viewing history
   */
  async clearUserViewingHistory(userId: string): Promise<{
    success: boolean;
    message: string;
    deleted_count: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/user-history/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error clearing user viewing history:', error);
      return {
        success: false,
        message: `Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deleted_count: 0,
      };
    }
  }

  /**
   * Get similar videos based on a video title
   */
  async getSimilarVideos(
    title: string,
    userId?: string,
    topN: number = 5
  ): Promise<VideoRecommendation[]> {
    const response = await this.getContentBasedRecommendations({
      title,
      top_n: topN,
      user_id: userId,
    });

    return response.success ? response.recommendations : [];
  }

  /**
   * Get recommendations for a specific genre
   */
  async getGenreVideos(
    genre: string,
    userId?: string,
    topN: number = 10
  ): Promise<VideoRecommendation[]> {
    const response = await this.getGenreBasedRecommendations({
      genre,
      top_n: topN,
      user_id: userId,
    });

    return response.success ? response.recommendations : [];
  }

  /**
   * Get home page recommendations for a user
   */
  async getHomeRecommendations(userId?: string): Promise<{
    popular: VideoRecommendation[];
    personalized: VideoRecommendation[];
    genres: Record<string, VideoRecommendation[]>;
  }> {
    const results = {
      popular: [] as VideoRecommendation[],
      personalized: [] as VideoRecommendation[],
      genres: {} as Record<string, VideoRecommendation[]>,
    };

    try {
      // Get popular recommendations
      const popularResponse = await this.getPopularRecommendations(8);
      if (popularResponse.success) {
        results.popular = popularResponse.recommendations;
      }

      // Get personalized recommendations if user is provided
      if (userId) {
        const personalizedResponse = await this.getPersonalizedRecommendations({
          user_id: userId,
          top_n: 8,
        });
        if (personalizedResponse.success) {
          results.personalized = personalizedResponse.recommendations;
        }
      }

      // Get genre-based recommendations for top 3 genres
      const genresResponse = await this.getAvailableGenres();
      if (genresResponse.success) {
        const topGenres = Object.entries(genresResponse.genre_counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([genre]) => genre);

        for (const genre of topGenres) {
          const genreVideos = await this.getGenreVideos(genre, userId, 6);
          if (genreVideos.length > 0) {
            results.genres[genre] = genreVideos;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting home recommendations:', error);
      return results;
    }
  }
}

// Export singleton instance
export const bertRecommendationService = new BertRecommendationService();
export default bertRecommendationService; 