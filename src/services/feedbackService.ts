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

// Temporary mock data storage until new recommendation system is implemented
const mockFeedbackData: Record<string, any> = {};
const mockWatchlistData: Record<string, any[]> = {};

export const feedbackService = {
  // Submit feedback (rating, review, not interested) - Mock implementation
  async submitFeedback(feedbackData: FeedbackData) {
    try {
      console.log('📝 [Mock] Submitting feedback:', feedbackData);
      
      // Store in mock data
      const key = `${feedbackData.userId}_${feedbackData.itemId}_${feedbackData.feedbackType}`;
      mockFeedbackData[key] = {
        ...feedbackData,
        id: key,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return { success: true, feedback: mockFeedbackData[key] };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit feedback' 
      };
    }
  },

  // Get user's feedback for items - Mock implementation
  async getUserFeedback(userId: string, itemId?: string, feedbackType?: string) {
    try {
      console.log('📖 [Mock] Getting user feedback:', { userId, itemId, feedbackType });
      
      // Filter mock data based on parameters
      const filteredFeedback = Object.values(mockFeedbackData).filter(feedback => {
        if (feedback.userId !== userId) return false;
        if (itemId && feedback.itemId !== itemId) return false;
        if (feedbackType && feedback.feedbackType !== feedbackType) return false;
        return true;
      });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { success: true, feedback: filteredFeedback };
    } catch (error) {
      console.error('Error getting feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get feedback' 
      };
    }
  },

  // Remove feedback - Mock implementation
  async removeFeedback(feedbackId: string, userId: string) {
    try {
      console.log('🗑️ [Mock] Removing feedback:', { feedbackId, userId });
      
      // Remove from mock data
      delete mockFeedbackData[feedbackId];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { success: true, message: 'Feedback removed successfully' };
    } catch (error) {
      console.error('Error removing feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove feedback' 
      };
    }
  },

  // Add to watchlist - Mock implementation
  async addToWatchlist(watchlistData: WatchlistData) {
    try {
      console.log('➕ [Mock] Adding to watchlist:', watchlistData);
      
      // Create watchlist item
      const watchlistItem = {
        ...watchlistData,
        id: `watchlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
        completionPercentage: 0
      };
      
      // Store in mock data
      if (!mockWatchlistData[watchlistData.userId]) {
        mockWatchlistData[watchlistData.userId] = [];
      }
      mockWatchlistData[watchlistData.userId].push(watchlistItem);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return { success: true, watchlistItem };
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add to watchlist' 
      };
    }
  },

  // Remove from watchlist - Mock implementation
  async removeFromWatchlist(watchlistId: string, userId: string) {
    try {
      console.log('🗑️ [Mock] Removing from watchlist:', { watchlistId, userId });
      
      // Remove from mock data
      if (mockWatchlistData[userId]) {
        mockWatchlistData[userId] = mockWatchlistData[userId].filter(
          item => item.id !== watchlistId
        );
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { success: true, message: 'Item removed from watchlist' };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove from watchlist' 
      };
    }
  },

  // Get user's watchlist - Mock implementation
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
      console.log('📚 [Mock] Getting user watchlist:', { userId, options });
      
      let watchlistItems = mockWatchlistData[userId] || [];
      
      // Apply filters
      if (options.status) {
        watchlistItems = watchlistItems.filter(item => item.status === options.status);
      }
      if (options.itemType) {
        watchlistItems = watchlistItems.filter(item => item.itemType === options.itemType);
      }
      
      // Apply sorting
      if (options.sortBy) {
        watchlistItems.sort((a, b) => {
          const aVal = a[options.sortBy!];
          const bVal = b[options.sortBy!];
          const order = options.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }
      
      // Apply limit
      if (options.limit) {
        watchlistItems = watchlistItems.slice(0, options.limit);
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { 
        success: true, 
        watchlist: watchlistItems,
        total: watchlistItems.length 
      };
    } catch (error) {
      console.error('Error getting watchlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get watchlist' 
      };
    }
  },

  // Update watchlist item - Mock implementation
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
      console.log('📝 [Mock] Updating watchlist item:', { watchlistId, userId, updates });
      
      // Update in mock data
      if (mockWatchlistData[userId]) {
        const itemIndex = mockWatchlistData[userId].findIndex(item => item.id === watchlistId);
        if (itemIndex !== -1) {
          mockWatchlistData[userId][itemIndex] = {
            ...mockWatchlistData[userId][itemIndex],
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { success: true, message: 'Watchlist item updated successfully' };
    } catch (error) {
      console.error('Error updating watchlist item:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update watchlist item' 
      };
    }
  },

  // Check if item is in watchlist - Mock implementation
  async isInWatchlist(userId: string, itemId: string): Promise<boolean> {
    try {
      console.log('🔍 [Mock] Checking if in watchlist:', { userId, itemId });
      
      const userWatchlist = mockWatchlistData[userId] || [];
      const isInWatchlist = userWatchlist.some(item => item.itemId === itemId);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return isInWatchlist;
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  },

  // Batch submit feedback - Mock implementation
  async batchSubmitFeedback(feedbackItems: FeedbackData[]) {
    try {
      console.log('📦 [Mock] Batch submitting feedback:', feedbackItems.length, 'items');
      
      const results = [];
      for (const feedbackData of feedbackItems) {
        const result = await this.submitFeedback(feedbackData);
        results.push(result);
      }
      
      return { 
        success: true, 
        results,
        message: `Processed ${results.length} feedback items` 
      };
    } catch (error) {
      console.error('Error batch submitting feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to batch submit feedback' 
      };
    }
  }
};

export default feedbackService; 