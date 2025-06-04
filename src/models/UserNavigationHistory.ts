import mongoose, { Document, Schema } from 'mongoose';

export interface IUserNavigationHistory extends Document {
  _id: string;
  userId: string;
  
  // Page visit data
  pageUrl: string;
  pagePath: string;
  pageTitle: string;
  pageType: 'home' | 'browse' | 'category' | 'playlist' | 'video' | 'search' | 'profile' | 'settings' | 'other';
  
  // Navigation context
  navigationContext: {
    sessionId: string;
    referrerUrl?: string;
    referrerType?: string; // 'internal', 'external', 'direct', 'search_engine'
    entryPoint: string; // 'homepage', 'search', 'bookmark', 'share_link', etc.
    device: string;
    viewport: {
      width: number;
      height: number;
    };
    userAgent?: string;
  };
  
  // Timing data
  visitStartTime: Date;
  visitEndTime?: Date;
  timeOnPage?: number; // in seconds
  
  // Engagement metrics
  scrollDepth: number; // 0-100%
  scrollEvents: number; // number of scroll actions
  clickEvents: Array<{
    elementType: string; // 'button', 'link', 'card', 'menu_item', etc.
    elementId?: string;
    elementText?: string;
    clickTimestamp: Date;
    coordinates: {
      x: number;
      y: number;
    };
  }>;
  
  // Content interaction
  contentInteractions: Array<{
    interactionType: 'hover' | 'click' | 'bookmark' | 'share' | 'like' | 'dislike';
    targetId: string; // ID of content item
    targetType: 'video' | 'playlist' | 'creator' | 'category';
    duration?: number; // for hover events
    timestamp: Date;
  }>;
  
  // Category/genre browsing behavior
  categoryExploration: Array<{
    categoryId: string;
    categoryName: string;
    timeSpent: number; // seconds in this category
    itemsViewed: number; // how many items in this category were viewed
    timestamp: Date;
  }>;
  
  // Navigation flow
  previousPage?: string;
  nextPage?: string;
  isBouncePage: boolean; // user left without further navigation
  exitAction?: string; // 'back_button', 'navigation', 'close_tab', 'external_link'
  
  // Performance data
  pageLoadTime?: number; // in milliseconds
  navigationSpeed: number; // time since last page visit
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const UserNavigationHistorySchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  pageUrl: {
    type: String,
    required: true,
  },
  pagePath: {
    type: String,
    required: true,
    index: true,
  },
  pageTitle: {
    type: String,
    required: true,
  },
  pageType: {
    type: String,
    enum: ['home', 'browse', 'category', 'playlist', 'video', 'search', 'profile', 'settings', 'other'],
    required: true,
  },
  navigationContext: {
    sessionId: {
      type: String,
      required: true,
    },
    referrerUrl: {
      type: String,
      default: null,
    },
    referrerType: {
      type: String,
      enum: ['internal', 'external', 'direct', 'search_engine'],
      default: 'direct',
    },
    entryPoint: {
      type: String,
      required: true,
      default: 'homepage',
    },
    device: {
      type: String,
      required: true,
      default: 'desktop',
    },
    viewport: {
      width: {
        type: Number,
        required: true,
        min: 0,
      },
      height: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  visitStartTime: {
    type: Date,
    required: true,
  },
  visitEndTime: {
    type: Date,
    default: null,
  },
  timeOnPage: {
    type: Number,
    min: 0,
    default: null,
  },
  scrollDepth: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  scrollEvents: {
    type: Number,
    min: 0,
    default: 0,
  },
  clickEvents: [{
    elementType: {
      type: String,
      required: true,
    },
    elementId: {
      type: String,
      default: null,
    },
    elementText: {
      type: String,
      default: null,
    },
    clickTimestamp: {
      type: Date,
      required: true,
    },
    coordinates: {
      x: {
        type: Number,
        required: true,
      },
      y: {
        type: Number,
        required: true,
      },
    },
  }],
  contentInteractions: [{
    interactionType: {
      type: String,
      enum: ['hover', 'click', 'bookmark', 'share', 'like', 'dislike'],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['video', 'playlist', 'creator', 'category'],
      required: true,
    },
    duration: {
      type: Number,
      min: 0,
      default: null,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  }],
  categoryExploration: [{
    categoryId: {
      type: String,
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
    },
    timeSpent: {
      type: Number,
      required: true,
      min: 0,
    },
    itemsViewed: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  }],
  previousPage: {
    type: String,
    default: null,
  },
  nextPage: {
    type: String,
    default: null,
  },
  isBouncePage: {
    type: Boolean,
    default: false,
  },
  exitAction: {
    type: String,
    enum: ['back_button', 'navigation', 'close_tab', 'external_link', 'timeout'],
    default: null,
  },
  pageLoadTime: {
    type: Number,
    min: 0,
    default: null,
  },
  navigationSpeed: {
    type: Number,
    min: 0,
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
UserNavigationHistorySchema.index({ userId: 1, createdAt: -1 });
UserNavigationHistorySchema.index({ userId: 1, pageType: 1, createdAt: -1 });
UserNavigationHistorySchema.index({ 'navigationContext.sessionId': 1, createdAt: -1 });
UserNavigationHistorySchema.index({ userId: 1, pagePath: 1, createdAt: -1 });
UserNavigationHistorySchema.index({ userId: 1, timeOnPage: -1, createdAt: -1 });
UserNavigationHistorySchema.index({ pageType: 1, scrollDepth: -1 });

export default mongoose.models.UserNavigationHistory || mongoose.model<IUserNavigationHistory>('UserNavigationHistory', UserNavigationHistorySchema); 