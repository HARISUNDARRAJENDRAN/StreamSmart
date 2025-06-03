import mongoose, { Document, Schema } from 'mongoose';

export interface IUserFeedback extends Document {
  _id: string;
  userId: string;
  itemId: string; // video ID or playlist ID
  itemType: 'video' | 'playlist' | 'recommendation';
  feedbackType: 'rating' | 'review' | 'watchlist' | 'not_interested' | 'thumbs_up' | 'thumbs_down';
  
  // Rating data (1-5 stars or thumbs up/down)
  rating?: number; // 1-5 for star rating, 1 for thumbs up, 0 for thumbs down
  
  // Review data
  reviewText?: string;
  reviewTitle?: string;
  
  // Watchlist data
  addedToWatchlist?: boolean;
  
  // Context data
  recommendationContext?: {
    source: string; // 'dashboard', 'playlist_detail', 'search', etc.
    algorithm: string; // 'collaborative_filtering', 'content_based', etc.
    position: number; // position in recommendation list
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean; // for soft deletion
}

const UserFeedbackSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  itemId: {
    type: String,
    required: true,
    index: true,
  },
  itemType: {
    type: String,
    enum: ['video', 'playlist', 'recommendation'],
    required: true,
  },
  feedbackType: {
    type: String,
    enum: ['rating', 'review', 'watchlist', 'not_interested', 'thumbs_up', 'thumbs_down'],
    required: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: null,
  },
  reviewText: {
    type: String,
    maxlength: 1000,
    default: null,
  },
  reviewTitle: {
    type: String,
    maxlength: 100,
    default: null,
  },
  addedToWatchlist: {
    type: Boolean,
    default: null,
  },
  recommendationContext: {
    source: {
      type: String,
      default: 'unknown',
    },
    algorithm: {
      type: String,
      default: 'unknown',
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
UserFeedbackSchema.index({ userId: 1, itemId: 1, feedbackType: 1 });
UserFeedbackSchema.index({ userId: 1, feedbackType: 1, createdAt: -1 });
UserFeedbackSchema.index({ itemId: 1, feedbackType: 1, isActive: 1 });

export default mongoose.models.UserFeedback || mongoose.model<IUserFeedback>('UserFeedback', UserFeedbackSchema); 