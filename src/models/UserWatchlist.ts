import mongoose, { Document, Schema } from 'mongoose';

export interface IUserWatchlist extends Document {
  _id: string;
  userId: string;
  itemId: string; // video ID or playlist ID
  itemType: 'video' | 'playlist';
  
  // Item details for faster access
  itemDetails: {
    title: string;
    thumbnail: string;
    duration?: string;
    description?: string;
    creator?: string;
  };
  
  // Watchlist metadata
  addedFrom: string; // 'recommendations', 'search', 'browse', 'shared', etc.
  priority: number; // 1-5, user can set priority
  notes?: string; // user notes about why they added it
  
  // Status tracking
  status: 'want_to_watch' | 'watching' | 'completed' | 'paused';
  watchedAt?: Date; // when they actually watched it
  completionPercentage: number; // 0-100
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean; // for soft deletion
}

const UserWatchlistSchema: Schema = new Schema({
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
    enum: ['video', 'playlist'],
    required: true,
  },
  itemDetails: {
    title: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    creator: {
      type: String,
      default: null,
    },
  },
  addedFrom: {
    type: String,
    required: true,
    default: 'unknown',
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  notes: {
    type: String,
    maxlength: 500,
    default: null,
  },
  status: {
    type: String,
    enum: ['want_to_watch', 'watching', 'completed', 'paused'],
    default: 'want_to_watch',
  },
  watchedAt: {
    type: Date,
    default: null,
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
UserWatchlistSchema.index({ userId: 1, status: 1, createdAt: -1 });
UserWatchlistSchema.index({ userId: 1, itemId: 1 }, { unique: true });
UserWatchlistSchema.index({ userId: 1, priority: -1, createdAt: -1 });

export default mongoose.models.UserWatchlist || mongoose.model<IUserWatchlist>('UserWatchlist', UserWatchlistSchema); 