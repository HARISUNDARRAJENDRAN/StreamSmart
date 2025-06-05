import mongoose, { Document, Schema } from 'mongoose';

export interface IUserHoverInteraction extends Document {
  _id: string;
  userId: string;
  
  // Target information
  targetId: string; // ID of the item being hovered
  targetType: 'video' | 'playlist' | 'recommendation_card' | 'thumbnail' | 'creator' | 'category' | 'play_button';
  targetContext: {
    containerType: string; // 'recommendation_grid', 'search_results', 'category_list', etc.
    position: number; // position in list/grid (1-based)
    pageContext: string; // which page this happened on
    sectionId?: string; // if part of a specific section
  };
  
  // Hover behavior data
  hoverStartTime: Date;
  hoverEndTime?: Date;
  hoverDuration: number; // in milliseconds
  isSignificantHover: boolean; // hover duration > threshold (e.g., 500ms)
  
  // Mouse movement patterns
  mouseMovement: {
    entryDirection: string; // 'top', 'bottom', 'left', 'right', 'center', 'unknown'
    exitDirection?: string; // 'top', 'bottom', 'left', 'right', 'center', 'click', 'unknown'
    movementPattern: string; // 'direct', 'exploratory', 'hesitant', 'rapid'
    totalMovementDistance: number; // pixels moved during hover
    movementSpeed: number; // average pixels per second
  };
  
  // Interaction context
  interactionContext: {
    sessionId: string;
    device: string;
    viewport: {
      width: number;
      height: number;
    };
    scrollPosition: number; // vertical scroll position when hover occurred
    elementPosition: {
      x: number;
      y: number;
    };
    elementSize: {
      width: number;
      height: number;
    };
  };
  
  // Hover outcome
  hoverOutcome: {
    resultedInClick: boolean;
    clickTimestamp?: Date;
    resultedInScroll: boolean; // did user scroll after hover
    resultedInNavigation: boolean; // did user navigate away
    timeToAction?: number; // ms between hover end and action
  };
  
  // Additional actions during hover
  actionsOnHover: Array<{
    actionType: 'preview_show' | 'tooltip_show' | 'menu_open' | 'button_highlight' | 'other';
    actionTimestamp: Date;
    actionData?: any; // additional data about the action
  }>;
  
  // Recommendation specific data (if applicable)
  recommendationData?: {
    algorithm: string; // recommendation algorithm used
    confidence: number; // algorithm confidence score (0-1)
    category: string; // content category
    tags: string[]; // content tags
    isPersonalized: boolean;
  };
  
  // User state during hover
  userState: {
    isFirstTimeSeeing: boolean; // first time user sees this item
    previousInteractions: number; // how many times user interacted with this item before
    timeOnCurrentPage: number; // how long user has been on current page (seconds)
    totalPageInteractions: number; // total interactions on current page
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const UserHoverInteractionSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  targetId: {
    type: String,
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    enum: ['video', 'playlist', 'recommendation_card', 'thumbnail', 'creator', 'category', 'play_button'],
    required: true,
  },
  targetContext: {
    containerType: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
      min: 1,
    },
    pageContext: {
      type: String,
      required: true,
    },
    sectionId: {
      type: String,
      default: null,
    },
  },
  hoverStartTime: {
    type: Date,
    required: true,
  },
  hoverEndTime: {
    type: Date,
    default: null,
  },
  hoverDuration: {
    type: Number,
    required: true,
    min: 0,
  },
  isSignificantHover: {
    type: Boolean,
    default: false,
  },
  mouseMovement: {
    entryDirection: {
      type: String,
      enum: ['top', 'bottom', 'left', 'right', 'center', 'unknown'],
      required: true,
    },
    exitDirection: {
      type: String,
      enum: ['top', 'bottom', 'left', 'right', 'center', 'click', 'unknown'],
      default: null,
    },
    movementPattern: {
      type: String,
      enum: ['direct', 'exploratory', 'hesitant', 'rapid', 'unknown'],
      default: 'unknown',
    },
    totalMovementDistance: {
      type: Number,
      default: 0,
      min: 0,
    },
    movementSpeed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  interactionContext: {
    sessionId: {
      type: String,
      required: true,
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
    scrollPosition: {
      type: Number,
      default: 0,
      min: 0,
    },
    elementPosition: {
      x: {
        type: Number,
        required: true,
        min: 0,
      },
      y: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    elementSize: {
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
  },
  hoverOutcome: {
    resultedInClick: {
      type: Boolean,
      default: false,
    },
    clickTimestamp: {
      type: Date,
      default: null,
    },
    resultedInScroll: {
      type: Boolean,
      default: false,
    },
    resultedInNavigation: {
      type: Boolean,
      default: false,
    },
    timeToAction: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  actionsOnHover: [{
    actionType: {
      type: String,
      enum: ['preview_show', 'tooltip_show', 'menu_open', 'button_highlight', 'other'],
      required: true,
    },
    actionTimestamp: {
      type: Date,
      required: true,
    },
    actionData: {
      type: Schema.Types.Mixed,
      default: null,
    },
  }],
  recommendationData: {
    algorithm: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
    tags: [{
      type: String,
    }],
    isPersonalized: {
      type: Boolean,
      default: false,
    },
  },
  userState: {
    isFirstTimeSeeing: {
      type: Boolean,
      default: true,
    },
    previousInteractions: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeOnCurrentPage: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPageInteractions: {
      type: Number,
      default: 0,
      min: 0,
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
UserHoverInteractionSchema.index({ userId: 1, createdAt: -1 });
UserHoverInteractionSchema.index({ userId: 1, targetId: 1, createdAt: -1 });
UserHoverInteractionSchema.index({ userId: 1, isSignificantHover: 1, createdAt: -1 });
UserHoverInteractionSchema.index({ targetId: 1, 'hoverOutcome.resultedInClick': 1, createdAt: -1 });
UserHoverInteractionSchema.index({ 'interactionContext.sessionId': 1, createdAt: -1 });
UserHoverInteractionSchema.index({ userId: 1, 'targetContext.containerType': 1, hoverDuration: -1 });
UserHoverInteractionSchema.index({ 'recommendationData.algorithm': 1, 'hoverOutcome.resultedInClick': 1 });

export default mongoose.models.UserHoverInteraction || mongoose.model<IUserHoverInteraction>('UserHoverInteraction', UserHoverInteractionSchema); 