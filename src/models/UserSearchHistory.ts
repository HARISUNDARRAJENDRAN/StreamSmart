import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSearchHistory extends Document {
  _id: string;
  userId: string;
  
  // Search query data
  searchQuery: string;
  searchType: 'content' | 'creator' | 'category' | 'advanced';
  normalizedQuery: string; // processed version for analysis
  queryLength: number;
  
  // Search context
  searchContext: {
    source: string; // 'header_search', 'browse_page', 'recommendation_page', etc.
    sessionId: string;
    previousQuery?: string; // if this is a refinement
    device: string;
    userAgent?: string;
  };
  
  // Search results
  resultsFound: number;
  resultsDisplayed: number;
  noResultsFound: boolean;
  
  // User interaction with results
  clickedResults: Array<{
    itemId: string;
    itemType: 'video' | 'playlist' | 'creator';
    position: number; // position in search results (1-based)
    clickTimestamp: Date;
  }>;
  
  // Search refinement behavior
  searchRefinements: Array<{
    refinementType: 'filter' | 'sort' | 'category' | 'duration';
    refinementValue: string;
    appliedAt: Date;
  }>;
  
  // Timing data
  searchStartTime: Date;
  firstClickTime?: Date;
  searchEndTime?: Date;
  timeToFirstClick?: number; // in seconds
  totalSearchDuration?: number; // in seconds
  
  // Search success indicators
  searchAbandoned: boolean; // user left without clicking anything
  searchSuccessful: boolean; // user found and interacted with content
  resultsScrollDepth: number; // how far down they scrolled (0-100%)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const UserSearchHistorySchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  searchQuery: {
    type: String,
    required: true,
    trim: true,
  },
  searchType: {
    type: String,
    enum: ['content', 'creator', 'category', 'advanced'],
    default: 'content',
  },
  normalizedQuery: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  queryLength: {
    type: Number,
    required: true,
    min: 0,
  },
  searchContext: {
    source: {
      type: String,
      required: true,
      default: 'header_search',
    },
    sessionId: {
      type: String,
      required: true,
    },
    previousQuery: {
      type: String,
      default: null,
    },
    device: {
      type: String,
      required: true,
      default: 'desktop',
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  resultsFound: {
    type: Number,
    required: true,
    min: 0,
  },
  resultsDisplayed: {
    type: Number,
    required: true,
    min: 0,
  },
  noResultsFound: {
    type: Boolean,
    default: false,
  },
  clickedResults: [{
    itemId: {
      type: String,
      required: true,
    },
    itemType: {
      type: String,
      enum: ['video', 'playlist', 'creator'],
      required: true,
    },
    position: {
      type: Number,
      required: true,
      min: 1,
    },
    clickTimestamp: {
      type: Date,
      required: true,
    },
  }],
  searchRefinements: [{
    refinementType: {
      type: String,
      enum: ['filter', 'sort', 'category', 'duration'],
      required: true,
    },
    refinementValue: {
      type: String,
      required: true,
    },
    appliedAt: {
      type: Date,
      required: true,
    },
  }],
  searchStartTime: {
    type: Date,
    required: true,
  },
  firstClickTime: {
    type: Date,
    default: null,
  },
  searchEndTime: {
    type: Date,
    default: null,
  },
  timeToFirstClick: {
    type: Number,
    min: 0,
    default: null,
  },
  totalSearchDuration: {
    type: Number,
    min: 0,
    default: null,
  },
  searchAbandoned: {
    type: Boolean,
    default: false,
  },
  searchSuccessful: {
    type: Boolean,
    default: false,
  },
  resultsScrollDepth: {
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
UserSearchHistorySchema.index({ userId: 1, createdAt: -1 });
UserSearchHistorySchema.index({ userId: 1, searchQuery: 'text' });
UserSearchHistorySchema.index({ userId: 1, normalizedQuery: 1, createdAt: -1 });
UserSearchHistorySchema.index({ searchQuery: 'text', resultsFound: -1 });
UserSearchHistorySchema.index({ 'searchContext.sessionId': 1, createdAt: -1 });
UserSearchHistorySchema.index({ userId: 1, searchSuccessful: 1, createdAt: -1 });

export default mongoose.models.UserSearchHistory || mongoose.model<IUserSearchHistory>('UserSearchHistory', UserSearchHistorySchema); 