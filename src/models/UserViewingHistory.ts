import mongoose, { Document, Schema } from 'mongoose';

export interface IUserViewingHistory extends Document {
  _id: string;
  userId: string;
  itemId: string; // video ID or playlist ID
  itemType: 'video' | 'playlist';
  
  // Viewing data
  viewStartTime: Date;
  viewEndTime?: Date;
  totalViewDuration: number; // in seconds
  actualDuration?: number; // content duration in seconds
  completionPercentage: number; // 0-100
  
  // Viewing behavior
  pauseCount: number;
  seekCount: number; // how many times user jumped to different positions
  skipCount: number; // how many times user skipped ahead
  replayCount: number; // how many times user replayed sections
  
  // Context data
  viewingContext: {
    source: string; // 'dashboard', 'playlist', 'search', 'recommendation', etc.
    device: string; // 'desktop', 'mobile', 'tablet'
    referrer?: string; // where they came from
    sessionId: string; // to group related viewing activities
  };
  
  // Quality metrics
  averagePlaybackSpeed: number; // 1.0 = normal speed
  qualityChanges: number; // number of video quality changes
  bufferingEvents: number; // number of buffering interruptions
  
  // Engagement indicators
  fullScreenUsed: boolean;
  volumeAdjustments: number;
  captionsEnabled: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const UserViewingHistorySchema: Schema = new Schema({
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
  viewStartTime: {
    type: Date,
    required: true,
  },
  viewEndTime: {
    type: Date,
    default: null,
  },
  totalViewDuration: {
    type: Number,
    required: true,
    min: 0,
  },
  actualDuration: {
    type: Number,
    min: 0,
    default: null,
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  pauseCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  seekCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  skipCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  replayCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  viewingContext: {
    source: {
      type: String,
      required: true,
      default: 'unknown',
    },
    device: {
      type: String,
      required: true,
      default: 'desktop',
    },
    referrer: {
      type: String,
      default: null,
    },
    sessionId: {
      type: String,
      required: true,
    },
  },
  averagePlaybackSpeed: {
    type: Number,
    default: 1.0,
    min: 0.25,
    max: 2.0,
  },
  qualityChanges: {
    type: Number,
    default: 0,
    min: 0,
  },
  bufferingEvents: {
    type: Number,
    default: 0,
    min: 0,
  },
  fullScreenUsed: {
    type: Boolean,
    default: false,
  },
  volumeAdjustments: {
    type: Number,
    default: 0,
    min: 0,
  },
  captionsEnabled: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
UserViewingHistorySchema.index({ userId: 1, createdAt: -1 });
UserViewingHistorySchema.index({ userId: 1, itemId: 1, createdAt: -1 });
UserViewingHistorySchema.index({ userId: 1, itemType: 1, completionPercentage: -1 });
UserViewingHistorySchema.index({ itemId: 1, completionPercentage: -1, createdAt: -1 });
UserViewingHistorySchema.index({ 'viewingContext.sessionId': 1, createdAt: -1 });

export default mongoose.models.UserViewingHistory || mongoose.model<IUserViewingHistory>('UserViewingHistory', UserViewingHistorySchema); 