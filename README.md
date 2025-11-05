# StreamSmart - AI-Powered YouTube Learning Platform

**StreamSmart** is a cutting-edge Next.js application that transforms YouTube watching into an intelligent, structured learning experience. Using advanced AI technologies from AWS, Google, and OpenAI, StreamSmart offers personalized video recommendations, interactive mind maps, AI-powered quizzes, and a sophisticated RAG (Retrieval-Augmented Generation) chatbot to answer questions about your playlists.

---

## 🌟 Key Features

### 🎯 Smart Learning Management
- **AI-Powered Playlist Creation**: Generate custom playlists based on learning goals, topics, or video titles
- **Personalized Recommendations**: CSV-based recommendation engine with genre filtering and quality scoring
- **Progress Tracking**: Comprehensive dashboard tracking learning streaks, completed videos, and time spent
- **Achievement System**: Earn badges and track milestones as you learn

### 🤖 Advanced AI Capabilities
- **Multi-Modal Mind Maps**: AI-generated mind maps using Google Gemini combining visual and textual analysis
- **Interactive Quizzes**: Customizable AI-generated quizzes with difficulty levels (easy, medium, hard)
- **RAG-Powered Chatbot**: Ask questions about video content with answers generated from actual transcripts
- **Voice Chat Integration**: Amazon Lex V2 powered voice interaction for hands-free learning
- **Multi-Modal Summarization**: Advanced video analysis combining transcript and visual frame analysis

### 📚 Content Management
- **Transcript Extraction**: Browser extension for automatic YouTube transcript extraction
- **S3 Storage**: Scalable transcript storage in AWS S3 with DynamoDB metadata
- **OpenSearch Integration**: Vector-based semantic search across video transcripts
- **Genre-Based Discovery**: Browse curated content across 15+ genres including Technology, Business, Science, Arts, and more

### 🔐 Authentication & User Management
- **AWS Cognito Integration**: Secure user authentication with email verification
- **User Profiles**: Customizable profiles with learning preferences and weekly goals
- **Social Features**: Public/private playlists and achievement sharing

### 🎨 Modern UI/UX
- **Responsive Design**: Beautiful, mobile-friendly interface built with Tailwind CSS
- **ShadCN Components**: Modern, accessible UI components
- **Animated Interactions**: Smooth transitions with Framer Motion and GSAP
- **Dark/Light Themes**: Full theming support with system preference detection

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components, React 18)
- **Language**: [TypeScript 5.7](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Visualization**: 
  - [ReactFlow 11](https://reactflow.dev/) - Mind maps
  - [Recharts 2](https://recharts.org/) - Analytics charts
- **Animation**: [Framer Motion](https://www.framer.com/motion/), [GSAP](https://gsap.com/)
- **State Management**: React Query (TanStack Query), Context API
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

### Backend (Python/FastAPI)
- **Framework**: [FastAPI 0.104](https://fastapi.tiangolo.com/)
- **Server**: Uvicorn with standard extras
- **Data Processing**: pandas, NumPy (<2.0), scikit-learn
- **AI/ML**: Google Generative AI (Gemini), OpenAI GPT-4o-mini

### AWS Services Integration
- **Authentication**: AWS Cognito (User Pools, OAuth 2.0)
- **Database**: DynamoDB (Users, Playlists, Videos, Activities, Transcripts)
- **Storage**: S3 (Transcript storage, video metadata)
- **Search**: OpenSearch with vector embeddings (FAISS engine)
- **AI Models**: 
  - Amazon Bedrock (Titan embeddings, Titan LLM)
  - Amazon Lex V2 (Conversational AI)
- **Caching**: ElastiCache (Redis) for request deduplication
- **SDK**: AWS SDK v3 for JavaScript/TypeScript, boto3 for Python

### AI/ML Technologies
- **Google AI**: Gemini 1.5 Flash, Gemini 2.0 Flash
- **OpenAI**: GPT-4o-mini for cost-effective RAG responses
- **Amazon Bedrock**: Titan Text Embed v2, Titan Text Express v1
- **Vector Search**: OpenSearch with cosine similarity

### Browser Extension
- **Manifest**: V3 (Chrome/Edge compatible)
- **Features**: YouTube transcript extraction, background service worker
- **Integration**: Direct API communication with Python backend

---

## 📋 Prerequisites

Before setting up StreamSmart, ensure you have:

- **Node.js** v18+ and npm/yarn
- **Python** 3.8+ with pip
- **AWS Account** with configured credentials
- **Google Cloud Project** with Gemini API enabled
- **OpenAI API Key** (for RAG chatbot)
- **YouTube Data API v3 Key**

### AWS Services Setup
1. **DynamoDB Tables**: Users, Playlists, Videos, Activities, Transcripts
2. **S3 Bucket**: For transcript storage
3. **OpenSearch Domain**: For vector-based semantic search
4. **Cognito User Pool**: For authentication
5. **Lex Bot**: (Optional) For voice chat features
6. **ElastiCache**: (Optional) Redis cluster for caching

---

## 🚀 Getting Started

### Quick Start (Recommended)

The fastest way to run StreamSmart is using the configured AWS environment:

1. **Configure AWS Credentials**
   ```powershell
   # Configure AWS CLI with your credentials
   aws configure --profile streamsmart-admin
   
   # Or use AWS SSO
   aws sso login --profile streamsmart-admin
   ```

2. **Set Environment Variables**
   
   Create `.env.local` in the project root:
   ```env
   # AWS Configuration
   AWS_REGION=ap-south-2
   AWS_PROFILE=streamsmart-admin
   STREAMSMART_AWS_REGION=ap-south-2
   STREAMSMART_AWS_ACCESS_KEY_ID=your_access_key
   STREAMSMART_AWS_SECRET_ACCESS_KEY=your_secret_key
   
   # AWS Cognito
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
   NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
   NEXT_PUBLIC_COGNITO_DOMAIN=your_cognito_domain
   NEXT_PUBLIC_AWS_REGION=ap-south-2
   
   # Amazon Lex (Optional)
   NEXT_PUBLIC_LEX_BOT_ID=your_bot_id
   NEXT_PUBLIC_LEX_BOT_ALIAS_ID=your_alias_id
   NEXT_PUBLIC_LEX_LOCALE_ID=en_US
   NEXT_PUBLIC_LEX_REGION=us-east-1
   
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   
   # OpenAI (for RAG chatbot)
   OPENAI_API_KEY=your_openai_api_key
   
   # YouTube API
   YOUTUBE_API_KEY=your_youtube_api_key
   NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
   
   # AWS RAG Configuration (Optional)
   AWS_RAG_S3_BUCKET=your_s3_bucket_name
   AWS_RAG_OPENSEARCH_ENDPOINT=your_opensearch_endpoint
   AWS_RAG_OPENSEARCH_INDEX=streamsmart-rag-chunks
   AWS_RAG_EMBED_MODEL=amazon.titan-embed-text-v2
   AWS_RAG_LLM_MODEL=amazon.titan-text-express-v1
   
   # ElastiCache Redis (Optional)
   AWS_ELASTICACHE_HOST=your_elasticache_endpoint
   AWS_ELASTICACHE_PORT=6379
   AWS_ELASTICACHE_PASSWORD=your_redis_password
   AWS_ELASTICACHE_TLS=true
   ```

3. **Install Dependencies & Run**

   ```powershell
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd python_backend
   pip install -r requirements.txt
   cd ..
   
   # Run both frontend and backend
   # Terminal 1 - Frontend
   npm run dev
   
   # Terminal 2 - Backend
   cd python_backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

---

## 📦 Installation & Setup

### Backend Setup (Python/FastAPI)

#### 1. Clone the Repository
```powershell
git clone https://github.com/HARISUNDARRAJENDRAN/StreamSmart.git
cd StreamSmart
```

#### 2. Navigate to Backend Directory
```powershell
cd python_backend
```

#### 3. Create Python Virtual Environment (Recommended)
```powershell
# Create virtual environment
python -m venv venv

# Activate (PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Command Prompt)
venv\Scripts\activate.bat
```

#### 4. Install Python Dependencies
```powershell
pip install -r requirements.txt
```

**Key Dependencies:**
- FastAPI & Uvicorn (API server)
- boto3 (AWS SDK)
- pandas, NumPy, scikit-learn (Data processing)
- opensearch-py (Vector search)
- google-generativeai (Gemini AI)
- Pillow (Image processing)

#### 5. Configure Backend Environment

Create `.env` file in `python_backend` directory:
```env
# AWS Configuration
AWS_REGION=ap-south-2
AWS_PROFILE=streamsmart-admin

# S3 & DynamoDB
S3_BUCKET=streamsmart-transcripts-560271561936
DYNAMODB_REGION=ap-south-2

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# AWS RAG (Optional)
AWS_RAG_S3_BUCKET=your_rag_bucket
AWS_RAG_OPENSEARCH_ENDPOINT=your_opensearch_endpoint
AWS_RAG_OPENSEARCH_INDEX=streamsmart-rag-chunks
```

#### 6. Initialize AWS Infrastructure (First Time Setup)

```powershell
# Setup transcript infrastructure (S3 + DynamoDB)
python setup_transcript_infrastructure.py

# Optional: Setup Lex bot for voice chat
python setup_lex_bot.py
```

#### 7. Start the Backend Server
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

---

### Frontend Setup (Next.js)

#### 1. Navigate to Project Root
```powershell
cd ..  # From python_backend to project root
```

#### 2. Install Node.js Dependencies
```powershell
npm install
# or
yarn install
```

**Key Dependencies:**
- Next.js 15.1.3 (App Router)
- React 18.3
- AWS Amplify 6.15 (Cognito auth)
- AWS SDK v3 (DynamoDB, Lex)
- Google Generative AI
- TanStack Query (React Query)
- ShadCN UI components

#### 3. Configure Frontend Environment

Create `.env.local` in the project root (see Quick Start section for complete list)

#### 4. Run Development Server
```powershell
npm run dev
```

Frontend will be available at: http://localhost:3000

---

### Browser Extension Setup (Optional)

#### 1. Navigate to Extension Directory
```powershell
cd streamsmart-extension
```

#### 2. Load Extension in Browser

**Chrome/Edge:**
1. Navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `streamsmart-extension` folder

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` in the extension folder

#### 3. Usage
- Navigate to any YouTube video
- Click the StreamSmart extension icon
- Use "Extract Transcript" button to send transcript to backend

---

## 📁 Project Structure

```
StreamSmart/
├── src/                                    # Frontend source code
│   ├── ai/                                # AI/ML flows and integrations
│   │   └── flows/                        
│   │       ├── generate-enhanced-mind-map-flow.ts  # Multi-modal mind map generation
│   │       ├── generate-mind-map-flow.ts           # Basic mind map generation
│   │       ├── generate-playlist-quiz-flow.ts      # AI quiz generation
│   │       ├── rag-answer-questions.ts             # RAG chatbot flow
│   │       └── answer-playlist-questions.ts        # Direct Q&A flow
│   │
│   ├── app/                              # Next.js App Router
│   │   ├── (app)/                        # Authenticated routes
│   │   │   ├── dashboard/               # Main dashboard
│   │   │   ├── playlists/               # Playlist management
│   │   │   ├── achievements/            # User achievements
│   │   │   ├── progress/                # Learning analytics
│   │   │   ├── search/                  # Video search
│   │   │   ├── settings/                # User settings
│   │   │   └── genre/                   # Genre exploration
│   │   ├── (auth)/                       # Auth routes (login, signup)
│   │   ├── landing/                      # Landing page
│   │   ├── video/                        # Video player page
│   │   ├── about/                        # About page
│   │   ├── api/                          # API routes (Next.js serverless)
│   │   │   ├── auth/                    # Auth endpoints
│   │   │   ├── playlists/               # Playlist CRUD
│   │   │   ├── videos/                  # Video operations
│   │   │   ├── activities/              # Activity tracking
│   │   │   ├── user/                    # User management
│   │   │   ├── multimodal-analysis/     # AI analysis
│   │   │   └── test/                    # Test endpoints
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Landing page
│   │   └── globals.css                   # Global styles
│   │
│   ├── components/                        # React components
│   │   ├── ui/                           # ShadCN UI components
│   │   ├── auth/                         # Authentication components
│   │   ├── layout/                       # Layout components
│   │   ├── playlists/                    # Playlist components
│   │   ├── profile/                      # Profile components
│   │   ├── dashboard/                    # Dashboard widgets
│   │   ├── achievements/                 # Achievement displays
│   │   ├── recommendations/              # Recommendation cards
│   │   └── feedback/                     # Feedback forms
│   │
│   ├── contexts/                          # React Context providers
│   │   ├── CognitoAuthContext.tsx        # AWS Cognito auth
│   │   ├── UserContext.tsx               # User state management
│   │   └── AuthContext.tsx               # Legacy auth (deprecated)
│   │
│   ├── hooks/                             # Custom React hooks
│   │   ├── use-mobile.tsx               # Mobile detection
│   │   ├── use-toast.ts                 # Toast notifications
│   │   ├── useImplicitTracking.ts       # Analytics tracking
│   │   └── useIntersectionObserver.ts   # Scroll observers
│   │
│   ├── lib/                               # Utility libraries
│   │   ├── cognito-config.ts            # AWS Cognito setup
│   │   ├── auth-service.ts              # Auth utilities
│   │   ├── dynamodb-server.ts           # DynamoDB connection
│   │   ├── dynamodb-service-server.ts   # DynamoDB operations (server)
│   │   ├── dynamodb-service.ts          # DynamoDB operations (client)
│   │   ├── lex-client.ts                # Amazon Lex integration
│   │   ├── mongodb.ts                   # Legacy DB (now DynamoDB)
│   │   ├── api-base.ts                  # API base URL config
│   │   ├── cache.ts                     # Client-side caching
│   │   ├── memory-cache.ts              # Memory cache utilities
│   │   ├── request-dedup.ts             # Request deduplication
│   │   └── utils.ts                     # General utilities
│   │
│   ├── services/                          # External service integrations
│   │   ├── playlistService.ts           # Playlist API client
│   │   ├── userService.ts               # User API client
│   │   ├── feedbackService.ts           # Feedback API client
│   │   ├── recommendationService.ts     # Recommendation API client
│   │   ├── multimodal-summarizer.ts     # ML backend client
│   │   └── youtube.ts                   # YouTube API client
│   │
│   ├── types/                             # TypeScript definitions
│   │   ├── index.ts                     # Core types
│   │   └── global.d.ts                  # Global type declarations
│   │
│   ├── models/                            # Data models
│   │   ├── User.ts                      # User model
│   │   ├── Playlist.ts                  # Playlist model
│   │   └── Activity.ts                  # Activity model
│   │
│   ├── providers/                         # Provider wrappers
│   │   └── QueryProvider.tsx            # React Query provider
│   │
│   └── middleware.ts                      # Next.js middleware (auth)
│
├── python_backend/                        # FastAPI backend
│   ├── main.py                           # Main FastAPI application
│   ├── requirements.txt                  # Python dependencies
│   ├── start_server.py                   # Server startup script
│   │
│   ├── api/                              # Vercel serverless deployment
│   │   └── index.py                     # Vercel entry point
│   │
│   ├── services/                         # Backend services
│   │   ├── multimodal_summarizer.py     # Video analysis service
│   │   ├── youtube_content_collector.py # YouTube data collector
│   │   └── youtube_quota.py             # API quota management
│   │
│   ├── endpoints/                        # API endpoint modules
│   │   ├── recommendation_endpoints.py  # Recommendation API
│   │   ├── transcript_endpoints.py      # Transcript upload/download
│   │   ├── genre_endpoints.py           # Genre-based filtering
│   │   └── lex_proxy_endpoint.py        # Lex chatbot proxy
│   │
│   ├── csv_recommendation_agent.py       # CSV-based recommendation engine
│   ├── educational_youtube_content.csv   # Video dataset
│   │
│   ├── setup_transcript_infrastructure.py # AWS setup script
│   ├── setup_lex_bot.py                  # Lex bot configuration
│   ├── create_working_lex_bot.py         # Lex bot creation
│   ├── load_videos_to_dynamodb.py        # Data loader
│   │
│   ├── cache/                            # Response cache
│   ├── logs/                             # Application logs
│   └── temp/                             # Temporary files
│
├── streamsmart-extension/                 # Browser extension
│   ├── manifest.json                     # Extension manifest (V3)
│   ├── background/
│   │   └── service-worker.js            # Background service worker
│   ├── content/
│   │   ├── youtube-scraper.js           # Transcript extraction
│   │   └── styles.css                   # Extension styles
│   ├── popup/
│   │   ├── popup.html                   # Extension popup
│   │   ├── popup.js                     # Popup logic
│   │   └── popup.css                    # Popup styles
│   ├── utils/
│   │   └── transcript-parser.js         # Transcript parsing
│   └── icons/                            # Extension icons
│
├── public/                                # Static assets
│
├── Configuration Files
├── .env.local                            # Environment variables (not in repo)
├── .env.production                       # Production env (AWS config)
├── next.config.ts                        # Next.js configuration
├── tsconfig.json                         # TypeScript configuration
├── tailwind.config.ts                    # Tailwind CSS configuration
├── postcss.config.mjs                    # PostCSS configuration
├── components.json                       # ShadCN UI configuration
├── package.json                          # Node.js dependencies
└── README.md                             # This file
```

---

## 🎯 Core Features Explained

### 1. RAG-Powered Chatbot
The chatbot uses Retrieval-Augmented Generation to answer questions about video content:
- **Transcript Storage**: Videos transcripts stored in S3, metadata in DynamoDB
- **Vector Embeddings**: OpenSearch with Amazon Titan embeddings for semantic search
- **Answer Generation**: OpenAI GPT-4o-mini generates contextual answers
- **Source Attribution**: Answers cite specific videos and timestamps

### 2. Multi-Modal Video Analysis
Advanced video understanding combining text and visual analysis:
- **Transcript Analysis**: Full text processing with NLTK and scikit-learn
- **Frame Extraction**: Visual frame analysis at key timestamps
- **Cross-Modal Alignment**: Synchronization of visual and textual insights
- **Learning Objectives**: AI-generated learning goals and key concepts

### 3. Recommendation Engine
CSV-based recommendation system with intelligent filtering:
- **Quality Scoring**: Videos rated on educational value (0-1 scale)
- **Genre-Based Filtering**: 15+ categories including Technology, Science, Business
- **Popularity Metrics**: View count and engagement-based ranking
- **Personalization**: User history and preference tracking

### 4. Achievement System
Gamified learning with milestone tracking:
- **Learning Streaks**: Daily consistency tracking
- **Time-Based Achievements**: Hours of learning milestones
- **Completion Badges**: Playlist and video completion rewards
- **Progress Analytics**: Detailed charts and statistics

---

## 🔧 AWS Services Configuration

### DynamoDB Tables
| Table Name | Primary Key | GSI | Purpose |
|------------|-------------|-----|---------|
| Users | id (S) | email-index, cognitoId-index | User profiles |
| Playlists | id (S) | userId-createdAt-index | Playlist metadata |
| Videos | videoId (S) | playlistId-index | Video information |
| Activities | id (S) | userId-timestamp-index | User activities |
| Transcripts | videoId (S) | uploadedBy-uploadedAt-index | Transcript metadata |

### S3 Buckets
- **streamsmart-transcripts-560271561936**: Transcript storage (ap-south-1)
- **RAG Bucket**: Vector embeddings and processed data

### OpenSearch Domain
- **Index**: streamsmart-rag-chunks
- **Engine**: FAISS for vector similarity
- **Embedding Model**: amazon.titan-embed-text-v2 (dimension varies)
- **LLM Model**: amazon.titan-text-express-v1

### Cognito User Pool
- **Authentication Methods**: Email/Password, OAuth 2.0
- **Verification**: Email code verification
- **OAuth Providers**: Google (configured)
- **Password Policy**: Minimum 8 characters, requires uppercase, lowercase, numbers

### Amazon Lex V2 Bot
- **Bot ID**: 8PLHOZHCUV
- **Alias**: PU4IPD1W0D
- **Locale**: en_US
- **Region**: us-east-1
- **Purpose**: Voice chat interface for hands-free learning

---

## 🚢 Deployment

### Frontend (Vercel - Recommended)

1. **Connect Repository**
   - Link GitHub repository to Vercel
   - Select `main` branch for production

2. **Configure Environment Variables**
   - Add all `NEXT_PUBLIC_*` variables
   - Add AWS credentials (Cognito, Lex)
   - Add AI API keys (Gemini, OpenAI)

3. **Build Settings**
   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Node Version: 18.x
   ```

4. **Deploy**
   - Automatic deployments on push to main
   - Preview deployments for pull requests

### Backend (Vercel Serverless)

1. **Configure `vercel.json`** (if not present)
   ```json
   {
     "builds": [
       {
         "src": "python_backend/api/index.py",
         "use": "@vercel/python"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "python_backend/api/index.py"
       }
     ]
   }
   ```

2. **Environment Variables**
   - Add all AWS credentials
   - Add API keys (OpenAI, Gemini, YouTube)
   - Configure S3 and DynamoDB settings

### Alternative: AWS Deployment

#### Frontend (Amplify Hosting)
```bash
npm run build
aws amplify create-app --name StreamSmart
# Follow console instructions
```

#### Backend (Elastic Beanstalk or ECS)
```bash
cd python_backend
eb init -p python-3.10 streamsmart-backend
eb create streamsmart-backend-env
eb deploy
```

---

## 🧪 Testing

### Run Frontend Tests
```powershell
npm run test
```

### Test Backend API
```powershell
# Start backend
cd python_backend
uvicorn main:app --reload

# In another terminal
curl http://localhost:8000/health
```

### Test Browser Extension
1. Load extension in Chrome
2. Navigate to YouTube video
3. Check console for "StreamSmart: YouTube scraper loaded"
4. Test transcript extraction

---

## 📊 API Endpoints

### Backend API Routes

#### Health Check
- `GET /health` - Service health status

#### Recommendations
- `POST /api/recommendations/get` - Get personalized recommendations
- `POST /api/recommendations/search` - Search videos by keywords
- `GET /api/recommendations/genres` - List available genres
- `GET /api/recommendations/stats` - Recommendation system statistics

#### Transcripts
- `POST /api/transcripts/upload` - Upload video transcript
- `GET /api/transcripts/download/{videoId}` - Download transcript
- `POST /api/transcripts/check` - Check if transcript exists

#### RAG & AI
- `POST /process-videos` - Process videos for RAG indexing
- `POST /rag-answer` - Answer questions using RAG
- `POST /lex-voice-chat` - Interact with Lex chatbot

#### Genre & Discovery
- `GET /api/genres` - List all genres
- `GET /api/genres/{genre_name}/videos` - Get videos by genre

### Frontend API Routes

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

#### Playlists
- `GET /api/playlists` - List user playlists
- `GET /api/playlists/{id}` - Get playlist details
- `POST /api/playlists` - Create playlist
- `PUT /api/playlists/{id}` - Update playlist
- `DELETE /api/playlists/{id}` - Delete playlist

#### User Management
- `GET /api/user` - Get current user
- `PUT /api/user` - Update user profile
- `GET /api/activities` - Get user activities

#### AI Features
- `POST /api/multimodal-analysis` - Multi-modal video analysis

---

## 🛡️ Security Best Practices

1. **Never commit `.env.local` files** - Add to `.gitignore`
2. **Use IAM roles** for AWS access in production
3. **Enable MFA** on AWS Cognito
4. **Rotate API keys** regularly
5. **Use HTTPS** in production
6. **Implement rate limiting** on API endpoints
7. **Sanitize user inputs** to prevent XSS/SQL injection
8. **Enable CORS** only for trusted domains in production

---

## 🐛 Troubleshooting

### Common Issues

#### "AWS credentials not found"
```powershell
# Verify AWS configuration
aws configure list

# Test credentials
aws sts get-caller-identity
```

#### "DynamoDB table not found"
```powershell
# Run infrastructure setup
cd python_backend
python setup_transcript_infrastructure.py
```

#### "Gemini API quota exceeded"
- Check Google Cloud Console quotas
- Consider upgrading to paid tier
- Implement request caching

#### "Port already in use"
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <process_id> /F
```

#### Extension not extracting transcripts
- Check if YouTube video has captions enabled
- Verify backend is running on port 8000
- Check browser console for errors

---

## 🎓 Learning Resources

### For Developers
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Google Gemini API](https://ai.google.dev/docs)

### Architecture Patterns
- [RAG (Retrieval-Augmented Generation)](https://arxiv.org/abs/2005.11401)
- [Vector Databases](https://www.pinecone.io/learn/vector-database/)
- [Serverless Architecture](https://aws.amazon.com/serverless/)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript/Python best practices
- Add unit tests for new features
- Update documentation
- Ensure code passes linting (`npm run lint`)

---

## 📝 License

This project is part of an academic/portfolio project. Please contact the author for usage permissions.

---

## 👤 Contact & Support

**Hari Sundar Rajendran**
- Email: [hsundar080506@gmail.com](mailto:hsundar080506@gmail.com)
- LinkedIn: [Hari Sundar Rajendran](https://www.linkedin.com/in/hari-sundar-237570286/)
- GitHub: [@HARISUNDARRAJENDRAN](https://github.com/HARISUNDARRAJENDRAN)

### Project Links
- **Repository**: [github.com/HARISUNDARRAJENDRAN/StreamSmart](https://github.com/HARISUNDARRAJENDRAN/StreamSmart)
- **Issues**: [Report a bug or request a feature](https://github.com/HARISUNDARRAJENDRAN/StreamSmart/issues)

---

## 🙏 Acknowledgments

- **AWS** for cloud infrastructure and AI services
- **Google** for Gemini AI models
- **OpenAI** for GPT models
- **Vercel** for deployment platform
- **ShadCN** for beautiful UI components
- **Next.js team** for the amazing framework

---

**Built with ❤️ for better learning experiences**

---

*Last Updated: November 2025*
