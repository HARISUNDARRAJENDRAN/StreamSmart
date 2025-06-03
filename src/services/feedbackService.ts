const API_BASE_URL = '/api';

export interface FeedbackData {
  userId: string;
  itemId: string;
  itemType: 'video' | 'playlist' | 'recommendation';
  feedbackType: 'rating' | 'review' | 'not_interested' | 'thumbs_up' | 'thumbs_down';
  rating?: number;
  reviewText?: string;
  reviewTitle?: string;
  recommendationContext?: {
    source: string;
    algorithm: string;
    position: number;
  };
}

export interface WatchlistData {
  userId: string;
  itemId: string;
  itemType: 'video' | 'playlist';
  itemDetails: {
    title: string;
    thumbnail: string;
    duration?: string;
    description?: string;
    creator?: string;
  };
  addedFrom: string;
  priority?: number;
  notes?: string;
}

export const feedbackService = {
  // Submit feedback (rating, review, not interested)
  async submitFeedback(feedbackData: FeedbackData) {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Feedback API error:', data);
        throw new Error(data.error || 'Failed to submit feedback');
      }
      
      return { success: true, feedback: data.feedback };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit feedback' 
      };
    }
  },

  // Get user's feedback for items
  async getUserFeedback(userId: string, itemId?: string, feedbackType?: string) {
    try {
      const params = new URLSearchParams({ userId });
      if (itemId) params.append('itemId', itemId);
      if (feedbackType) params.append('feedbackType', feedbackType);

      const response = await fetch(`${API_BASE_URL}/feedback?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Get feedback API error:', data);
        throw new Error(data.error || 'Failed to get feedback');
      }
      
      return { success: true, feedback: data.feedback };
    } catch (error) {
      console.error('Error getting feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get feedback' 
      };
    }
  },

  // Remove feedback
  async removeFeedback(feedbackId: string, userId: string) {
    try {
      const params = new URLSearchParams({ feedbackId, userId });

      const response = await fetch(`${API_BASE_URL}/feedback?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Remove feedback API error:', data);
        throw new Error(data.error || 'Failed to remove feedback');
      }
      
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error removing feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove feedback' 
      };
    }
  },

  // Add to watchlist
  async addToWatchlist(watchlistData: WatchlistData) {
    try {
      console.log('🚀 [addToWatchlist] Sending data:', JSON.stringify(watchlistData, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(watchlistData),
      });
      
      console.log('📡 [addToWatchlist] Response status:', response.status, response.statusText);
      console.log('📡 [addToWatchlist] Response headers:', Object.fromEntries(response.headers.entries()));
      
      let data;
      try {
        const responseText = await response.text();
        console.log('📄 [addToWatchlist] Raw response text:', responseText);
        
        if (responseText) {
          data = JSON.parse(responseText);
        } else {
          data = {};
        }
      } catch (parseError) {
        console.error('❌ [addToWatchlist] JSON parse error:', parseError);
        data = { error: 'Invalid response format' };
      }
      
      console.log('📄 [addToWatchlist] Parsed response data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('Add to watchlist API error:', data);
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return { success: true, watchlistItem: data.watchlistItem };
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add to watchlist' 
      };
    }
  },

  // Remove from watchlist
  async removeFromWatchlist(watchlistId: string, userId: string) {
    try {
      const params = new URLSearchParams({ watchlistId, userId });
      const url = `${API_BASE_URL}/watchlist?${params.toString()}`;
      
      console.log('Calling DELETE watchlist API:', { url, watchlistId, userId });

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('DELETE response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('DELETE response data:', data);
      
      if (!response.ok) {
        console.error('Remove from watchlist API error:', data);
        throw new Error(data.error || 'Failed to remove from watchlist');
      }
      
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove from watchlist' 
      };
    }
  },

  // Get user's watchlist
  async getUserWatchlist(
    userId: string, 
    options: {
      status?: string;
      itemType?: string;
      sortBy?: string;
      sortOrder?: string;
      limit?: number;
    } = {}
  ) {
    try {
      const params = new URLSearchParams({ userId });
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/watchlist?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Get watchlist API error:', data);
        throw new Error(data.error || 'Failed to get watchlist');
      }
      
      return { success: true, watchlistItems: data.watchlistItems };
    } catch (error) {
      console.error('Error getting watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get watchlist' 
      };
    }
  },

  // Update watchlist item status
  async updateWatchlistItem(
    watchlistId: string, 
    userId: string, 
    updates: {
      status?: string;
      priority?: number;
      notes?: string;
      completionPercentage?: number;
      watchedAt?: Date;
    }
  ) {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlistId,
          userId,
          ...updates
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Update watchlist API error:', data);
        throw new Error(data.error || 'Failed to update watchlist item');
      }
      
      return { success: true, watchlistItem: data.watchlistItem };
    } catch (error) {
      console.error('Error updating watchlist item:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update watchlist item' 
      };
    }
  },

  // Check if item is in watchlist
  async isInWatchlist(userId: string, itemId: string): Promise<boolean> {
    try {
      const result = await this.getUserWatchlist(userId, { limit: 1000 });
      if (result.success) {
        // Only count active items (getUserWatchlist already filters by isActive: true)
        return result.watchlistItems.some((item: any) => item.itemId === itemId && item.isActive !== false);
      }
      return false;
    } catch (error) {
      console.error('Error checking watchlist status:', error);
      return false;
    }
  },

  // Batch operations for handling multiple feedback at once
  async batchSubmitFeedback(feedbackItems: FeedbackData[]) {
    const results = await Promise.allSettled(
      feedbackItems.map(item => this.submitFeedback(item))
    );

    const successful = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => (result as PromiseFulfilledResult<any>).value);

    const failed = results
      .filter(result => result.status === 'rejected' || !result.value?.success)
      .map((result, index) => ({ 
        index, 
        error: result.status === 'rejected' 
          ? result.reason 
          : (result as PromiseFulfilledResult<any>).value.error 
      }));

    return {
      successful: successful.length,
      failed: failed.length,
      results: successful,
      errors: failed
    };
  }
};

export default feedbackService; 