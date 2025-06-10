# Multi-User Database Schema Design

## User Management Collections

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  userId: String (unique identifier),
  email: String (unique),
  username: String (unique),
  passwordHash: String,
  profile: {
    firstName: String,
    lastName: String,
    preferences: {
      language: String,
      theme: String,
      defaultSummaryLength: String
    }
  },
  subscription: {
    plan: String, // "free", "premium", "enterprise"
    limits: {
      monthlyVideos: Number,
      storageGB: Number,
      ragQueries: Number
    },
    usage: {
      videosProcessed: Number,
      storageUsed: Number,
      ragQueriesUsed: Number,
      resetDate: Date
    }
  },
  createdAt: Date,
  lastLogin: Date,
  isActive: Boolean
}
```

### 2. User Sessions Collection
```javascript
{
  _id: ObjectId,
  sessionId: String (unique),
  userId: String (reference to Users),
  type: String, // "authenticated", "guest", "demo"
  ipAddress: String,
  userAgent: String,
  createdAt: Date,
  expiresAt: Date,
  lastActivity: Date,
  isActive: Boolean
}
```

## Content Collections (User-Scoped)

### 3. Transcripts Collection
```javascript
{
  _id: ObjectId,
  transcriptId: String (unique identifier),
  userId: String (owner of transcript),
  videoId: String (YouTube video ID),
  videoUrl: String,
  videoTitle: String,
  videoDescription: String,
  videoDuration: Number,
  transcript: {
    fullText: String,
    segments: [
      {
        startTime: Number,
        endTime: Number,
        text: String,
        confidence: Number
      }
    ],
    language: String,
    source: String // "youtube_api", "generated", "uploaded"
  },
  processing: {
    status: String, // "pending", "processing", "completed", "failed"
    extractionMethod: String,
    processingTime: Number,
    errorMessage: String
  },
  embeddings: {
    isProcessed: Boolean,
    chunkCount: Number,
    vectorStoreId: String,
    embeddingModel: String
  },
  privacy: {
    isPublic: Boolean,
    shareableLink: String,
    allowedUsers: [String] // Array of userIds who can access
  },
  metadata: {
    tags: [String],
    category: String,
    customNotes: String
  },
  createdAt: Date,
  updatedAt: Date,
  accessCount: Number
}
```

### 4. Video Summaries Collection
```javascript
{
  _id: ObjectId,
  summaryId: String (unique identifier),
  userId: String (owner),
  transcriptId: String (reference to Transcripts),
  videoId: String,
  summary: {
    mainSummary: String,
    keyTopics: [String],
    visualInsights: [String],
    timestampHighlights: [
      {
        timestamp: Number,
        description: String,
        importanceScore: Number
      }
    ],
    mindMap: Object, // Structured mind map data
    sentiment: String,
    difficulty: String,
    estimatedReadTime: Number
  },
  generationSettings: {
    summaryLength: String, // "brief", "detailed", "comprehensive"
    focusAreas: [String],
    customPrompt: String
  },
  processing: {
    model: String,
    processingTime: Number,
    tokensUsed: Number
  },
  createdAt: Date,
  regenerationHistory: [
    {
      summary: Object,
      settings: Object,
      createdAt: Date
    }
  ]
}
```

### 5. Chat Sessions Collection
```javascript
{
  _id: ObjectId,
  chatSessionId: String (unique identifier),
  userId: String (owner),
  transcriptIds: [String], // Array of transcript IDs in context
  videoIds: [String], // Array of video IDs in context
  sessionName: String,
  messages: [
    {
      messageId: String,
      role: String, // "user", "assistant"
      content: String,
      timestamp: Date,
      sources: [
        {
          transcriptId: String,
          videoId: String,
          chunks: [String],
          relevanceScore: Number
        }
      ],
      processing: {
        model: String,
        responseTime: Number,
        tokensUsed: Number
      }
    }
  ],
  settings: {
    ragTopK: Number,
    temperature: Number,
    maxTokens: Number,
    systemPrompt: String
  },
  isActive: Boolean,
  createdAt: Date,
  lastActivity: Date,
  totalMessages: Number
}
```

### 6. Vector Embeddings Collection
```javascript
{
  _id: ObjectId,
  embeddingId: String (unique identifier),
  userId: String (owner),
  transcriptId: String,
  videoId: String,
  chunks: [
    {
      chunkId: String,
      text: String,
      startIndex: Number,
      endIndex: Number,
      embedding: [Number], // Vector embedding array
      metadata: {
        timestamp: Number,
        segment: String,
        importance: Number
      }
    }
  ],
  embeddingModel: String,
  dimensions: Number,
  createdAt: Date,
  lastAccessed: Date
}
```

## System Collections (Global)

### 7. Processing Queue Collection
```javascript
{
  _id: ObjectId,
  jobId: String (unique identifier),
  userId: String,
  jobType: String, // "transcript_extraction", "summarization", "embedding_generation"
  priority: Number,
  status: String, // "queued", "processing", "completed", "failed"
  data: {
    videoUrl: String,
    videoId: String,
    settings: Object
  },
  processing: {
    startedAt: Date,
    completedAt: Date,
    workerId: String,
    attempts: Number,
    errorMessage: String
  },
  createdAt: Date,
  estimatedDuration: Number
}
```

### 8. Usage Analytics Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  date: Date,
  metrics: {
    videosProcessed: Number,
    transcriptsGenerated: Number,
    summariesCreated: Number,
    ragQueries: Number,
    storageUsed: Number,
    processingTime: Number,
    apiCalls: {
      gemini: Number,
      openai: Number,
      youtube: Number
    }
  },
  features: {
    transcriptExtraction: Number,
    aiSummarization: Number,
    ragChatbot: Number,
    vectorSearch: Number
  }
}
```

## Indexing Strategy

### Essential Indexes
```javascript
// Users Collection
db.users.createIndex({ "userId": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })

// Transcripts Collection
db.transcripts.createIndex({ "userId": 1, "videoId": 1 })
db.transcripts.createIndex({ "transcriptId": 1 }, { unique: true })
db.transcripts.createIndex({ "userId": 1, "createdAt": -1 })
db.transcripts.createIndex({ "privacy.isPublic": 1 })

// Chat Sessions Collection
db.chatSessions.createIndex({ "userId": 1, "lastActivity": -1 })
db.chatSessions.createIndex({ "chatSessionId": 1 }, { unique: true })

// Vector Embeddings Collection
db.vectorEmbeddings.createIndex({ "userId": 1, "transcriptId": 1 })
db.vectorEmbeddings.createIndex({ "embeddingId": 1 }, { unique: true })

// Processing Queue Collection
db.processingQueue.createIndex({ "status": 1, "priority": -1, "createdAt": 1 })
db.processingQueue.createIndex({ "userId": 1, "jobType": 1 })
```

## Data Isolation & Security

### User Data Isolation
- All user-generated content is tied to `userId`
- Database queries always include user context
- Vector embeddings are namespaced by user
- File storage paths include user ID prefix

### Privacy Controls
- Per-transcript privacy settings
- Shareable links with access control
- Option to make transcripts public for discovery
- User-controlled data retention policies 