"""
CSV-Based Recommendation API Endpoints
Production-ready FastAPI implementation with proper error handling, validation, and async support
"""

from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, model_validator
from typing import List, Optional, Dict, Any, Tuple
import logging
import os
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json

from csv_recommendation_agent import CSVRecommendationAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import Gemini AI for intelligent genre detection
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    genai = None
    logger.warning("Google Gemini AI not available - falling back to keyword-based genre detection")

# Thread pool for blocking operations
executor = ThreadPoolExecutor(max_workers=4)

# Available genres from CSV dataset (30 genres)
AVAILABLE_GENRES = [
    'ai-innovation',
    'biology',
    'chemistry',
    'coding-programming',
    'cybersecurity',
    'data-science-ai',
    'design',
    'digital-marketing',
    'diy-projects',
    'electronics-arduino',
    'entrepreneurship',
    'financial-literacy',
    'health-fitness',
    'history-civics',
    'language-learning',
    'mathematics',
    'mental-wellness',
    'philosophy',
    'physics',
    'productivity',
    'psychology',
    'public-speaking',
    'resume-job-hunting',
    'robotics-iot',
    'science-experiments',
    'soft-skills',
    'startups',
    'sustainableliving',
    'trivia-facts',
    'writing-content'
]

# AI genre detection cache (LRU-style in-memory cache)
_ai_genre_cache: Dict[str, Tuple[str, float]] = {}  # {cache_key: (genre, timestamp)}
AI_CACHE_MAX_SIZE = 1000
AI_CACHE_TTL_SECONDS = 86400  # 24 hours

# Initialize Gemini model if available
_gemini_model = None
if HAS_GEMINI and os.getenv('GEMINI_API_KEY'):
    try:
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        # Try different model names in order of preference
        model_names = ['gemini-1.5-flash', 'gemini-pro', 'gemini-1.0-pro']
        for model_name in model_names:
            try:
                _gemini_model = genai.GenerativeModel(model_name)
                logger.info(f"Gemini AI model '{model_name}' initialized for genre detection")
                break
            except Exception as model_error:
                logger.debug(f"Model '{model_name}' not available: {model_error}")
                continue
        
        if not _gemini_model:
            logger.warning("No compatible Gemini model found")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
        _gemini_model = None

# Create router with prefix and tags
router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Internal server error"}
    }
)

# ============= Pydantic Models =============

class RecommendationRequest(BaseModel):
    """Request model for getting recommendations"""
    genre: Optional[str] = Field(None, description="Filter by genre")
    user_id: Optional[str] = Field(None, description="User ID for personalized recommendations")
    exclude_ids: List[str] = Field(default_factory=list, description="Video IDs to exclude")
    top_n: int = Field(10, ge=1, le=100, description="Number of recommendations")
    
    @validator('top_n')
    def validate_top_n(cls, v):
        if v > 50:
            logger.warning(f"Large top_n value requested: {v}")
        return v

class VideoRecommendation(BaseModel):
    """Response model for video recommendations"""
    video_id: str
    title: str
    channel_name: str = Field(alias="channelName")
    channel_id: Optional[str] = Field(None, alias="channelId")
    thumbnail_url: str = Field(alias="thumbnailUrl")
    duration: str
    genre: str
    quality_score: float = Field(alias="qualityScore")
    view_count: int = Field(alias="viewCount")
    youtube_url: str = Field(alias="youtubeUrl")
    description: Optional[str] = None
    upload_date: Optional[str] = Field(None, alias="uploadDate")
    
    class Config:
        populate_by_name = True  # Pydantic V2
        json_schema_extra = {  # Pydantic V2
            "example": {
                "video_id": "dQw4w9WgXcQ",
                "title": "Introduction to Machine Learning",
                "channelName": "Tech Education",
                "thumbnailUrl": "https://i.ytimg.com/vi/...",
                "duration": "10:30",
                "genre": "technology",
                "qualityScore": 0.95,
                "viewCount": 1000000,
                "youtubeUrl": "https://youtube.com/watch?v=..."
            }
        }

class SmartFeedRequest(BaseModel):
    """Request payload for smart feed generation"""
    user_id: str = Field(..., description="User ID to personalize the feed")
    limit: int = Field(50, ge=20, le=100, description="Upper bound for the total number of videos across sections")

class SmartFeedSections(BaseModel):
    """Smart feed sections grouped by intent"""
    continue_learning: List[VideoRecommendation] = Field(default_factory=list, alias="continueLearning")
    recommended: List[VideoRecommendation] = Field(default_factory=list)
    trending: List[VideoRecommendation] = Field(default_factory=list)
    discover: List[VideoRecommendation] = Field(default_factory=list)

    class Config:
        populate_by_name = True  # Pydantic V2

class SmartFeedResponse(BaseModel):
    """Response model for smart feed endpoint"""
    success: bool
    sections: SmartFeedSections
    metadata: Dict[str, Any]
    message: Optional[str] = None

class DurationRange(BaseModel):
    """Optional duration filter expressed in seconds"""
    min_seconds: Optional[int] = Field(None, ge=0)
    max_seconds: Optional[int] = Field(None, ge=0)

    @validator('max_seconds')
    def validate_duration_range(cls, v, values):
        min_seconds = values.get('min_seconds')
        if v is not None and min_seconds is not None and v < min_seconds:
            raise ValueError("max_seconds must be greater than or equal to min_seconds")
        return v

class SearchRequest(BaseModel):
    """Request model for keyword search"""
    keywords: Optional[List[str]] = Field(None, max_items=10)
    top_n: int = Field(10, ge=1, le=50)
    search_fields: Optional[List[str]] = Field(
        None,
        description="Fields to search in (default: title, description)"
    )
    genres: Optional[List[str]] = Field(None, description="Limit search to specific genres")
    channels: Optional[List[str]] = Field(None, description="Limit search to specific channel names")
    min_quality_score: Optional[float] = Field(None, ge=0, le=1, description="Minimum quality score threshold")
    duration: Optional[DurationRange] = Field(None, description="Filter videos by duration range in seconds")
    difficulty_levels: Optional[List[str]] = Field(None, description="Filter by difficulty levels parsed from educational indicators")
    uploaded_after: Optional[datetime] = Field(None, description="Return videos uploaded after this timestamp")
    sort_by: Optional[str] = Field('relevance', description="Sorting strategy: relevance, popularity, or recent")

    @validator('keywords', each_item=True)
    def normalize_keywords(cls, keyword: Optional[str]) -> Optional[str]:
        return keyword.strip() if isinstance(keyword, str) else keyword

    @validator('genres', 'channels', 'difficulty_levels', each_item=True)
    def normalize_list_fields(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if isinstance(value, str) else value

    @validator('sort_by')
    def validate_sort_option(cls, sort_option: Optional[str]) -> Optional[str]:
        if sort_option and sort_option.lower() not in {'relevance', 'popularity', 'recent'}:
            raise ValueError("sort_by must be one of: relevance, popularity, recent")
        return sort_option

    @validator('min_quality_score')
    def validate_quality_score(cls, value: Optional[float]) -> Optional[float]:
        if value is not None and value > 1:
            raise ValueError("min_quality_score cannot exceed 1.0")
        return value

    @validator('difficulty_levels')
    def ensure_difficulty_not_empty(cls, levels):
        if levels is not None:
            cleaned = [level for level in levels if level and level.strip()]
            return cleaned or None
        return levels

    @validator('keywords')
    def ensure_keywords_not_empty(cls, keywords):
        if keywords is not None:
            cleaned = [keyword for keyword in keywords if keyword and keyword.strip()]
            return cleaned or None
        return keywords

    @validator('duration')
    def ensure_duration_not_empty(cls, duration: Optional[DurationRange]) -> Optional[DurationRange]:
        if duration and duration.min_seconds is None and duration.max_seconds is None:
            return None
        return duration

    @model_validator(mode='after')
    def ensure_any_filter(self):
        if not any([
            self.keywords, 
            self.genres, 
            self.channels, 
            self.min_quality_score, 
            self.duration, 
            self.difficulty_levels, 
            self.uploaded_after
        ]):
            raise ValueError(
                "At least one search filter (keywords, genres, channels, difficulty, duration, min_quality_score, uploaded_after) must be provided"
            )
        return self

class TopicNode(BaseModel):
    """Topic hierarchy node"""
    id: str
    title: str
    video_count: int = Field(..., alias="videoCount")
    average_quality_score: float = Field(..., alias="averageQualityScore")
    total_views: int = Field(..., alias="totalViews")
    top_keywords: List[str] = Field(default_factory=list, alias="topKeywords")
    sample_videos: List[VideoRecommendation] = Field(default_factory=list, alias="sampleVideos")

    class Config:
        populate_by_name = True  # Pydantic V2

class TopicHierarchyResponse(BaseModel):
    """Response payload for topic explorer"""
    success: bool
    topics: List[TopicNode]
    total_topics: int = Field(..., alias="totalTopics")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True  # Pydantic V2

class CreatorSummary(BaseModel):
    """Aggregated creator metrics for the creator hub"""
    channel_name: str = Field(..., alias="channelName")
    channel_id: Optional[str] = Field(None, alias="channelId")
    video_count: int = Field(..., alias="videoCount")
    average_quality_score: float = Field(..., alias="averageQualityScore")
    total_views: int = Field(..., alias="totalViews")
    genres: List[str]
    top_videos: List[VideoRecommendation] = Field(default_factory=list, alias="topVideos")

    class Config:
        populate_by_name = True  # Pydantic V2

class CreatorResponse(BaseModel):
    """Response payload for creator hub queries"""
    success: bool
    creators: List[CreatorSummary]
    count: int
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RecommendationResponse(BaseModel):
    """Standard response wrapper for recommendations"""
    success: bool
    recommendations: List[VideoRecommendation]
    count: int
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SystemStats(BaseModel):
    """System statistics response model"""
    total_videos: int
    total_genres: int
    genres: List[str]
    avg_quality_score: float
    avg_view_count: int
    cache_size: int
    last_refresh: Optional[datetime] = None
    version: str = "2.0.0"

# ============= Playlist Sync Models =============

class PlaylistVideo(BaseModel):
    """Video information from playlist"""
    id: str = Field(..., description="YouTube video ID")
    title: str
    channel: Optional[str] = Field(None, alias="channelTitle")
    
    class Config:
        populate_by_name = True  # Pydantic V2

class PlaylistInfo(BaseModel):
    """Playlist information for sync"""
    playlist_id: str = Field(..., alias="playlistId")
    category: str
    videos: List[PlaylistVideo]
    
    class Config:
        populate_by_name = True  # Pydantic V2

class PlaylistSyncRequest(BaseModel):
    """Request model for syncing playlist videos to user activity history"""
    user_id: str = Field(..., description="User ID to sync playlists for")
    playlists: List[PlaylistInfo] = Field(..., description="List of playlists with videos to sync")
    force_resync: bool = Field(False, description="Force re-sync of already tracked videos")

class PlaylistSyncResponse(BaseModel):
    """Response model for playlist sync operation"""
    success: bool
    synced_count: int = Field(..., alias="syncedCount")
    skipped_count: int = Field(..., alias="skippedCount")
    failed_count: int = Field(..., alias="failedCount")
    genres_extracted: List[str] = Field(default_factory=list, alias="genresExtracted")
    message: str
    
    class Config:
        populate_by_name = True  # Pydantic V2

# ============= Dependency Injection =============

@lru_cache()
def get_recommendation_agent() -> CSVRecommendationAgent:
    """
    Get or create the recommendation agent instance (singleton pattern)
    """
    csv_path = os.path.join(
        os.path.dirname(__file__),
        "educational_youtube_content.csv"
    )
    
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found at {csv_path}")
        raise FileNotFoundError(f"Recommendation data file not found")
    
    try:
        agent = CSVRecommendationAgent(
            csv_path=csv_path,
            min_quality_score=0.7,
            enable_caching=True
        )
        logger.info("Recommendation agent initialized successfully")
        return agent
    except Exception as e:
        logger.error(f"Failed to initialize recommendation agent: {e}")
        raise RuntimeError(f"Failed to initialize recommendation system: {e}")

async def _ai_find_similar_videos_in_csv(
    video_title: str,
    video_channel: str,
    agent: CSVRecommendationAgent,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """
    Use AI to find similar videos in CSV based on semantic understanding.
    This is the NEW approach - no keywords, pure AI similarity.
    
    Args:
        video_title: The user's video title
        video_channel: The user's video channel
        agent: CSV recommendation agent with access to all videos
        top_n: Number of similar videos to return
        
    Returns:
        List of similar videos from CSV
    """
    if not _gemini_model:
        logger.warning("AI model not available, falling back to generic recommendations")
        # Return some high-quality videos from CSV as fallback
        return agent.get_trending_videos(top_n=top_n)
    
    try:
        # Get all available videos from CSV
        all_videos = agent.df[['video_id', 'title', 'channel_name', 'genre', 'description']].to_dict('records')
        
        # Sample videos for AI to analyze (to reduce tokens)
        # Group by genre and take top videos from each
        sample_videos = []
        for genre in agent.available_genres[:15]:  # Top 15 genres
            genre_videos = agent.df[agent.df['genre'] == genre].nlargest(3, 'popularity_score')
            sample_videos.extend(genre_videos[['video_id', 'title', 'channel_name', 'genre']].to_dict('records'))
        
        # Build AI prompt for similarity search
        video_samples = "\n".join([
            f"- [{v['genre']}] {v['title']} by {v['channel_name']}"
            for v in sample_videos[:50]  # Limit to 50 samples
        ])
        
        prompt = f"""You are analyzing educational video content to find similar recommendations.

User's Video:
Title: "{video_title}"
Channel: "{video_channel}"

Task: Based on the user's video above, identify which of these genres from our educational content library would have the MOST similar and relevant videos:

Available Genres:
{', '.join(AVAILABLE_GENRES)}

Sample videos from our library:
{video_samples}

Instructions:
1. Understand what the user's video is about (topic, subject, learning goals)
2. Return the TOP 3 genres that would have the most similar/relevant content
3. Format: Return ONLY the genre keys separated by commas (e.g., "coding-programming,data-science-ai,design")
4. No explanations, just the genre keys

Your response:"""

        # Call AI
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            lambda: _gemini_model.generate_content(prompt)
        )
        
        if response and response.text:
            # Parse AI response
            detected_genres = [g.strip() for g in response.text.strip().split(',')]
            detected_genres = [g for g in detected_genres if g in AVAILABLE_GENRES][:3]
            
            if detected_genres:
                logger.info(f"AI found similar content in genres: {detected_genres} for video '{video_title[:50]}...'")
                
                # Get videos from these genres
                similar_videos = []
                per_genre = top_n // len(detected_genres) + 1
                
                for genre in detected_genres:
                    genre_vids = agent.recommend_by_genre(
                        genre=genre,
                        top_n=per_genre,
                        exclude_ids=[]
                    )
                    similar_videos.extend(genre_vids)
                
                return similar_videos[:top_n]
        
        # Fallback if AI fails
        logger.warning(f"AI similarity search returned no results for '{video_title[:50]}...'")
        return agent.get_trending_videos(top_n=top_n)
        
    except Exception as e:
        logger.error(f"AI similarity search failed: {e}")
        # Fallback to trending
        return agent.get_trending_videos(top_n=top_n)

def _get_ai_cache_key(title: str, channel: str = '', category: str = '') -> str:
    """Generate a cache key for AI genre detection"""
    content = f"{title[:100]}_{channel[:50]}_{category[:30]}"
    return hashlib.md5(content.encode()).hexdigest()

async def _ai_detect_genre(
    title: str, 
    channel: str = '', 
    category: str = '',
    available_genres: List[str] = None
) -> Optional[str]:
    """
    Use Gemini AI to intelligently map video to best CSV genre.
    Production-ready implementation with caching, error handling, and fallbacks.
    
    Args:
        title: Video title
        channel: Channel name (provides context)
        category: Playlist category (fallback hint)
        available_genres: List of valid CSV genres
        
    Returns:
        Best matching genre from available_genres or None if AI unavailable
    """
    if not _gemini_model:
        return None
        
    if not available_genres:
        available_genres = AVAILABLE_GENRES
    
    # Check cache first
    cache_key = _get_ai_cache_key(title, channel, category)
    if cache_key in _ai_genre_cache:
        cached_genre, timestamp = _ai_genre_cache[cache_key]
        if datetime.now().timestamp() - timestamp < AI_CACHE_TTL_SECONDS:
            logger.debug(f"AI cache hit for '{title[:50]}...' -> {cached_genre}")
            return cached_genre
    
    # Create comprehensive genre descriptions for better AI understanding
    genre_descriptions = {
        'ai-innovation': 'Artificial Intelligence, machine learning innovations, AI tools, future of AI',
        'biology': 'Biology, life sciences, genetics, ecology, microbiology, anatomy',
        'chemistry': 'Chemistry, chemical reactions, organic chemistry, laboratory experiments',
        'coding-programming': 'Programming, software development, coding tutorials, web development, databases, SQL, APIs',
        'cybersecurity': 'Cybersecurity, ethical hacking, network security, data protection, security tools',
        'data-science-ai': 'Data science, machine learning, deep learning, data analysis, neural networks, AI models',
        'design': 'Design, UI/UX, graphic design, Photoshop, Illustrator, Figma, creative tools',
        'digital-marketing': 'Digital marketing, SEO, social media marketing, content marketing, advertising',
        'diy-projects': 'DIY projects, crafts, home improvement, building things, maker projects',
        'electronics-arduino': 'Electronics, Arduino, circuits, microcontrollers, hardware projects',
        'entrepreneurship': 'Entrepreneurship, business building, startup advice, business strategy',
        'financial-literacy': 'Finance, investing, economics, stock market, trading, money management',
        'health-fitness': 'Health, fitness, exercise, nutrition, wellness, workout routines',
        'history-civics': 'History, civics, historical events, government, politics, social studies',
        'language-learning': 'Language learning, English, Spanish, French, German, linguistics',
        'mathematics': 'Mathematics, calculus, algebra, geometry, statistics, math concepts',
        'mental-wellness': 'Mental health, mindfulness, meditation, stress management, therapy',
        'philosophy': 'Philosophy, ethics, logic, existentialism, philosophical concepts',
        'physics': 'Physics, quantum mechanics, classical physics, astrophysics, physics concepts',
        'productivity': 'Productivity, time management, study techniques, focus, organization',
        'psychology': 'Psychology, human behavior, cognitive science, psychological concepts',
        'public-speaking': 'Public speaking, presentation skills, communication, speech delivery',
        'resume-job-hunting': 'Resume writing, job hunting, interview preparation, career advice',
        'robotics-iot': 'Robotics, IoT, automation, smart devices, robot programming',
        'science-experiments': 'Science experiments, demonstrations, hands-on science, lab work',
        'soft-skills': 'Soft skills, leadership, teamwork, emotional intelligence, interpersonal skills',
        'startups': 'Startups, venture capital, startup ecosystem, founding companies',
        'sustainableliving': 'Sustainability, eco-friendly living, environmental conservation, green technology',
        'trivia-facts': 'General trivia, interesting facts, random knowledge, fun facts',
        'writing-content': 'Writing, content creation, storytelling, creative writing, blogging'
    }
    
    # Build the prompt for Gemini
    genres_with_descriptions = [
        f"- {genre}: {genre_descriptions.get(genre, genre)}"
        for genre in available_genres
    ]
    
    prompt = f"""You are an expert video content classifier. Your task is to analyze a video and select the SINGLE best matching genre from the provided list.

Video Information:
Title: "{title}"
Channel: "{channel if channel else 'Unknown'}"
Category: "{category if category else 'Not specified'}"

Available Genres (choose ONE):
{chr(10).join(genres_with_descriptions)}

Instructions:
1. Analyze the video title, channel name, and category to understand the content
2. Select the SINGLE genre that best matches the video's primary topic
3. Consider these priority rules:
   - Programming/coding content (including databases, SQL, APIs) -> coding-programming
   - AI/ML research and models -> data-science-ai
   - General AI tools and innovation -> ai-innovation
   - Design and creative tools -> design
   - Business and entrepreneurship -> entrepreneurship or startups
   - Educational content about specific subjects -> match the subject
4. Return ONLY the genre key (e.g., "coding-programming"), nothing else

Your response should be a single genre key from the list above."""

    try:
        # Use asyncio to run the blocking AI call in executor
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            lambda: _gemini_model.generate_content(prompt)
        )
        
        if response and response.text:
            detected_genre = response.text.strip().lower().replace('_', '-')
            
            # Validate the response
            if detected_genre in available_genres:
                # Update cache
                _ai_genre_cache[cache_key] = (detected_genre, datetime.now().timestamp())
                
                # Manage cache size (simple FIFO eviction)
                if len(_ai_genre_cache) > AI_CACHE_MAX_SIZE:
                    # Remove oldest entries
                    sorted_cache = sorted(_ai_genre_cache.items(), key=lambda x: x[1][1])
                    for old_key, _ in sorted_cache[:100]:  # Remove 100 oldest entries
                        del _ai_genre_cache[old_key]
                
                logger.info(f"AI detected genre for '{title[:50]}...' -> {detected_genre}")
                return detected_genre
            else:
                logger.warning(f"AI returned invalid genre '{detected_genre}' for '{title[:50]}...'")
                
    except Exception as e:
        logger.error(f"AI genre detection failed for '{title[:50]}...': {e}")
    
    return None

async def detect_video_genre(
    title: str,
    channel: str = '',
    category: str = '',
    force_ai: bool = False
) -> str:
    """
    Multi-tier genre detection with AI enhancement.
    Production-ready implementation with proper fallbacks.
    
    Args:
        title: Video title
        channel: Channel name
        category: Playlist category
        force_ai: Skip keyword detection and use AI directly
        
    Returns:
        Detected genre (guaranteed to be valid)
    """
    # Tier 1: Keyword detection (fastest, unless force_ai)
    if not force_ai:
        keyword_genre = _detect_genre_from_title(title, category)
        if keyword_genre != 'trivia-facts':  # Found something specific
            logger.debug(f"Keyword detection: '{title[:50]}...' -> {keyword_genre}")
            return keyword_genre
    
    # Tier 2: AI Detection (intelligent)
    if _gemini_model:
        try:
            ai_genre = await _ai_detect_genre(title, channel, category, AVAILABLE_GENRES)
            if ai_genre and ai_genre in AVAILABLE_GENRES:
                return ai_genre
        except Exception as e:
            logger.warning(f"AI detection error, falling back: {e}")
    
    # Tier 3: Enhanced keyword fallback with category hints
    if category:
        category_lower = category.lower()
        if 'tech' in category_lower or 'programming' in category_lower:
            return 'coding-programming'
        elif 'business' in category_lower:
            return 'entrepreneurship'
        elif 'design' in category_lower:
            return 'design'
        elif 'science' in category_lower:
            return 'physics'  # Generic science default
    
    # Tier 4: Safe default based on common educational content
    logger.debug(f"Using default genre for '{title[:50]}...'")
    return 'coding-programming'  # Most common educational content

async def batch_detect_genres(
    videos: List[Dict[str, str]],
    max_batch_size: int = 10
) -> Dict[str, str]:
    """
    Batch process multiple videos for genre detection.
    Optimized for performance with parallel AI calls.
    
    Args:
        videos: List of dicts with 'id', 'title', 'channel', 'category'
        max_batch_size: Maximum number of parallel AI calls
        
    Returns:
        Dict mapping video_id to detected genre
    """
    results = {}
    
    # Process in batches to avoid overwhelming the API
    for i in range(0, len(videos), max_batch_size):
        batch = videos[i:i + max_batch_size]
        
        # Create tasks for parallel processing
        tasks = [
            detect_video_genre(
                video.get('title', ''),
                video.get('channel', ''),
                video.get('category', '')
            )
            for video in batch
        ]
        
        # Execute tasks in parallel
        genres = await asyncio.gather(*tasks)
        
        # Map results
        for video, genre in zip(batch, genres):
            results[video['id']] = genre
    
    logger.info(f"Batch detected genres for {len(videos)} videos")
    return results

async def get_user_data(user_id: str) -> Dict[str, Any]:
    """
    Fetch user data from DynamoDB
    """
    if not user_id:
        return {}
    
    try:
        dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
        
        # Get user's activity data
        activities_table = dynamodb.Table('Activities')
        response = activities_table.query(
            IndexName='userId-timestamp-index',  # Use the GSI for querying by userId
            KeyConditionExpression='userId = :uid',
            ExpressionAttributeValues={':uid': user_id},
            Limit=100,
            ScanIndexForward=False  # Get most recent activities first
        )
        
        activities = response.get('Items', [])
        
        # Extract genres and watched video IDs
        watched_genres = []
        watched_ids = []
        
        for activity in activities:
            # Get videoId from either 'videoId' field or 'item' field
            video_id = activity.get('videoId') or activity.get('item', '')
            if video_id:
                watched_ids.append(video_id)
            
            # Get genre from 'genre' field (new schema)
            if 'genre' in activity and activity['genre']:
                watched_genres.append(activity['genre'])
        
        logger.info(f"User {user_id}: Found {len(watched_ids)} watched videos, {len(watched_genres)} genres")
        
        return {
            'watched_genres': watched_genres,
            'watched_ids': watched_ids,
            'activity_count': len(activities)
        }
    except ClientError as e:
        logger.error(f"Error fetching user data: {e}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error fetching user data: {e}")
        return {}

# ============= API Endpoints =============

@router.post("/smart-feed", response_model=SmartFeedResponse)
async def get_smart_feed(
    request: SmartFeedRequest,
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> SmartFeedResponse:
    """
    Generate a personalized smart feed with multiple contextual sections
    
    Returns:
        - continue_learning: Videos from user's active genres
        - recommended: Based on watch history and similar users
        - trending: Popular content in user's interests
        - discover: High-quality videos outside comfort zone
    """
    try:
        user_data = await get_user_data(request.user_id)
        
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(
            executor,
            agent.build_smart_feed,
            user_data.get('watched_genres', []),
            user_data.get('watched_ids', []),
            request.limit
        )

        sections = SmartFeedSections(
            continueLearning=[VideoRecommendation(**rec) for rec in feed.get('continue_learning', [])],
            recommended=[VideoRecommendation(**rec) for rec in feed.get('recommended', [])],
            trending=[VideoRecommendation(**rec) for rec in feed.get('trending', [])],
            discover=[VideoRecommendation(**rec) for rec in feed.get('discover', [])]
        )

        metadata = feed.get('metadata', {})
        metadata.update({
            'user_id': request.user_id,
            'activities_considered': user_data.get('activity_count', 0)
        })

        return SmartFeedResponse(
            success=True,
            sections=sections,
            metadata=metadata,
            message="Personalized smart feed generated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating smart feed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate smart feed: {str(e)}"
        )

@router.post("/sync-playlist-videos", response_model=PlaylistSyncResponse)
async def sync_playlist_videos(
    request: PlaylistSyncRequest,
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> PlaylistSyncResponse:
    """
    Sync playlist videos to user activity history for personalized recommendations
    
    Process:
    1. Extract videos from all user playlists
    2. Match each video against CSV dataset to determine genre
    3. Create DynamoDB activities with genre metadata
    4. Deduplicate to avoid duplicate entries
    5. Return sync statistics
    
    This enables the smart feed to learn from user's playlist preferences.
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
        activities_table = dynamodb.Table('Activities')
        
        # Step 0: If force_resync, DELETE all existing activities for this user
        if request.force_resync:
            try:
                logger.info(f"FORCE RESYNC: Deleting all existing activities for user {request.user_id}")
                
                # Query all activities for this user
                response = activities_table.query(
                    IndexName='userId-timestamp-index',
                    KeyConditionExpression='userId = :uid',
                    ExpressionAttributeValues={':uid': request.user_id},
                    ProjectionExpression='id, userId, #ts',
                    ExpressionAttributeNames={'#ts': 'timestamp'}
                )
                
                items_to_delete = response.get('Items', [])
                deleted_count = 0
                
                # Batch delete (25 items per batch)
                while items_to_delete:
                    batch = items_to_delete[:25]
                    items_to_delete = items_to_delete[25:]
                    
                    delete_requests = [{
                        'DeleteRequest': {
                            'Key': {
                                'id': item['id'],
                                'timestamp': item['timestamp']
                            }
                        }
                    } for item in batch]
                    
                    if delete_requests:
                        activities_table.meta.client.batch_write_item(
                            RequestItems={'Activities': delete_requests}
                        )
                        deleted_count += len(delete_requests)
                
                logger.info(f"FORCE RESYNC: Deleted {deleted_count} old activities")
            except Exception as e:
                logger.error(f"Error deleting old activities: {e}")
                # Continue with sync even if delete fails
        
        # Step 1: Query existing activities to avoid duplicates
        existing_video_ids = set()
        if not request.force_resync:
            try:
                existing_response = activities_table.query(
                    IndexName='userId-timestamp-index',
                    KeyConditionExpression='userId = :uid',
                    ExpressionAttributeValues={':uid': request.user_id},
                    ProjectionExpression='#vid',
                    ExpressionAttributeNames={'#vid': 'videoId'},
                    Limit=1000
                )
                for item in existing_response.get('Items', []):
                    if 'videoId' in item and item['videoId']:
                        existing_video_ids.add(item['videoId'])
                
                logger.info(f"Found {len(existing_video_ids)} existing activities for user {request.user_id}")
            except Exception as e:
                logger.warning(f"Could not query existing activities: {e}. Proceeding with sync.")
        
        # Step 2: Match videos against CSV to extract genres
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(executor, lambda: agent.df)
        
        synced_count = 0
        skipped_count = 0
        failed_count = 0
        genres_extracted = set()
        batch_items = []
        
        for playlist in request.playlists:
            for video in playlist.videos:
                video_id = video.id
                
                # Skip if already tracked (unless force_resync)
                if video_id in existing_video_ids:
                    skipped_count += 1
                    continue
                
                # Match video against CSV dataset
                genre = None
                try:
                    # NEW APPROACH: AI-powered similarity search (NO KEYWORDS!)
                    # First check if video exists in CSV
                    matches = df[df['video_id'] == video_id]
                    
                    if not matches.empty:
                        # Video is in CSV, use its genre
                        genre = matches.iloc[0]['genre']
                        logger.info(f"✓ Video {video_id} found in CSV with genre: {genre}")
                    else:
                        # Video NOT in CSV: Use AI to find similar content
                        logger.info(f"🤖 AI analyzing '{video.title[:40]}...' to find similar content in CSV")
                        
                        similar_videos = await _ai_find_similar_videos_in_csv(
                            video_title=video.title,
                            video_channel=video.channel or '',
                            agent=agent,
                            top_n=10  # Get top 10 similar videos
                        )
                        
                        # Extract genres from similar videos and use most common
                        if similar_videos:
                            from collections import Counter
                            similar_genres = [v.get('genre') for v in similar_videos if v.get('genre')]
                            
                            if similar_genres:
                                genre_counts = Counter(similar_genres)
                                genre = genre_counts.most_common(1)[0][0]
                                all_similar = list(set(similar_genres))
                                logger.info(f"✓ AI found {len(similar_videos)} similar videos in genres: {all_similar}")
                                logger.info(f"  → Selected primary genre: {genre}")
                            else:
                                genre = 'trivia-facts'
                                logger.warning(f"⚠ AI completed but no genres found, using fallback")
                        else:
                            genre = 'trivia-facts'
                            logger.warning(f"⚠ AI similarity search returned no results, using fallback")
                    
                    if genre:
                        genres_extracted.add(genre)
                        
                        # Create activity item for batch write
                        activity_id = f"{request.user_id}_{video_id}_{int(datetime.now(timezone.utc).timestamp()*1000)}"
                        activity = {
                            'id': activity_id,
                            'userId': request.user_id,
                            'action': 'added_to_playlist',
                            'item': video_id,
                            'type': 'created',
                            'videoId': video_id,
                            'genre': genre,
                            'videoTitle': video.title,
                            'channelName': video.channel or 'Unknown',
                            'playlistId': playlist.playlist_id,
                            'timestamp': int(datetime.now(timezone.utc).timestamp() * 1000)
                        }
                        
                        batch_items.append({'PutRequest': {'Item': activity}})
                        synced_count += 1
                        
                        # Batch write when we have 25 items (DynamoDB batch limit)
                        if len(batch_items) >= 25:
                            try:
                                activities_table.meta.client.batch_write_item(
                                    RequestItems={
                                        'Activities': batch_items
                                    }
                                )
                                batch_items = []
                            except Exception as batch_error:
                                logger.error(f"Batch write error: {batch_error}")
                                failed_count += len(batch_items)
                                batch_items = []
                    else:
                        failed_count += 1
                        logger.warning(f"Could not determine genre for video: {video_id} - {video.title}")
                        
                except Exception as match_error:
                    logger.error(f"Error matching video {video_id}: {match_error}")
                    failed_count += 1
        
        # Write remaining batch items
        if batch_items:
            try:
                activities_table.meta.client.batch_write_item(
                    RequestItems={
                        'Activities': batch_items
                    }
                )
            except Exception as batch_error:
                logger.error(f"Final batch write error: {batch_error}")
                failed_count += len(batch_items)
        
        message = f"Synced {synced_count} videos, skipped {skipped_count} duplicates"
        if failed_count > 0:
            message += f", {failed_count} failed"
        
        logger.info(f"Playlist sync complete for user {request.user_id}: {message}")
        
        return PlaylistSyncResponse(
            success=True,
            syncedCount=synced_count,
            skippedCount=skipped_count,
            failedCount=failed_count,
            genresExtracted=sorted(list(genres_extracted)),
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing playlist videos: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync playlist videos: {str(e)}"
        )

@router.post("/suggest", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    background_tasks: BackgroundTasks,
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> RecommendationResponse:
    """
    Get video recommendations based on genre or user history
    
    - **genre**: Filter by specific genre
    - **user_id**: Get personalized recommendations
    - **exclude_ids**: Videos to exclude from results
    - **top_n**: Number of recommendations (1-100)
    """
    try:
        # If user_id provided, get personalized recommendations
        if request.user_id:
            user_data = await get_user_data(request.user_id)
            
            if user_data.get('watched_genres'):
                # Run blocking operation in thread pool
                loop = asyncio.get_event_loop()
                recommendations = await loop.run_in_executor(
                    executor,
                    agent.recommend_by_user_history,
                    user_data['watched_genres'],
                    user_data['watched_ids'] + request.exclude_ids,
                    request.top_n
                )
                
                return RecommendationResponse(
                    success=True,
                    recommendations=[VideoRecommendation(**rec) for rec in recommendations],
                    count=len(recommendations),
                    message="Personalized recommendations based on watch history",
                    metadata={
                        "user_id": request.user_id,
                        "based_on_activities": user_data['activity_count']
                    }
                )
        
        # Genre-based recommendations
        if request.genre:
            loop = asyncio.get_event_loop()
            recommendations = await loop.run_in_executor(
                executor,
                agent.recommend_by_genre,
                request.genre,
                request.top_n,
                request.exclude_ids
            )
            
            return RecommendationResponse(
                success=True,
                recommendations=[VideoRecommendation(**rec) for rec in recommendations],
                count=len(recommendations),
                message=f"Genre-based recommendations for '{request.genre}'",
                metadata={"genre": request.genre}
            )
        
        # Default: trending videos
        loop = asyncio.get_event_loop()
        recommendations = await loop.run_in_executor(
            executor,
            agent.get_trending_videos,
            request.top_n,
            None,
            request.exclude_ids
        )
        
        return RecommendationResponse(
            success=True,
            recommendations=[VideoRecommendation(**rec) for rec in recommendations],
            count=len(recommendations),
            message="Trending videos",
            metadata={"type": "trending"}
        )
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )

@router.get("/trending", response_model=RecommendationResponse)
async def get_trending(
    genre: Optional[str] = Query(None, description="Filter by genre"),
    top_n: int = Query(10, ge=1, le=50, description="Number of results"),
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> RecommendationResponse:
    """
    Get trending videos with optional genre filter
    """
    try:
        loop = asyncio.get_event_loop()
        recommendations = await loop.run_in_executor(
            executor,
            agent.get_trending_videos,
            top_n,
            genre
        )
        
        return RecommendationResponse(
            success=True,
            recommendations=[VideoRecommendation(**rec) for rec in recommendations],
            count=len(recommendations),
            message=f"Trending {'videos in ' + genre if genre else 'videos'}",
            metadata={"genre": genre} if genre else {}
        )
    except Exception as e:
        logger.error(f"Error fetching trending videos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch trending videos: {str(e)}"
        )

@router.post("/search", response_model=RecommendationResponse)
async def search_videos(
    request: SearchRequest,
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> RecommendationResponse:
    """
    Search videos by keywords
    """
    try:
        duration_range = None
        if request.duration:
            duration_range = (
                request.duration.min_seconds,
                request.duration.max_seconds
            )
            if duration_range == (None, None):
                duration_range = None

        loop = asyncio.get_event_loop()
        uploaded_after = request.uploaded_after
        if uploaded_after and uploaded_after.tzinfo is not None:
            uploaded_after = uploaded_after.astimezone(timezone.utc).replace(tzinfo=None)
        recommendations = await loop.run_in_executor(
            executor,
            agent.search_by_keywords,
            request.keywords,
            request.top_n,
            request.search_fields,
            request.genres,
            request.channels,
            request.min_quality_score,
            duration_range,
            request.difficulty_levels,
            uploaded_after,
            request.sort_by or 'relevance'
        )
        
        return RecommendationResponse(
            success=True,
            recommendations=[VideoRecommendation(**rec) for rec in recommendations],
            count=len(recommendations),
            message="Search results",
            metadata={
                "keywords": request.keywords,
                "genres": request.genres,
                "channels": request.channels,
                "difficulty_levels": request.difficulty_levels,
                "min_quality_score": request.min_quality_score,
                "uploaded_after": uploaded_after.isoformat() if uploaded_after else None,
                "sort_by": request.sort_by or 'relevance'
            }
        )
    except Exception as e:
        logger.error(f"Error searching videos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/similar/{video_id}", response_model=RecommendationResponse)
async def get_similar_videos(
    video_id: str,
    top_n: int = Query(10, ge=1, le=50),
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> RecommendationResponse:
    """
    Get videos similar to a specific video
    """
    try:
        loop = asyncio.get_event_loop()
        recommendations = await loop.run_in_executor(
            executor,
            agent.get_similar_videos,
            video_id,
            top_n
        )
        
        if not recommendations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video '{video_id}' not found"
            )
        
        return RecommendationResponse(
            success=True,
            recommendations=[VideoRecommendation(**rec) for rec in recommendations],
            count=len(recommendations),
            message=f"Videos similar to '{video_id}'",
            metadata={"reference_video": video_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding similar videos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find similar videos: {str(e)}"
        )

@router.get("/topics/hierarchy", response_model=TopicHierarchyResponse)
async def get_topics_hierarchy(
    max_topics: int = Query(12, ge=5, le=30, description="Maximum number of topics to return"),
    samples_per_topic: int = Query(6, ge=3, le=10, description="Sample videos per topic"),
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> TopicHierarchyResponse:
    """
    Get dynamic topic hierarchy for the explore experience
    
    Returns auto-generated topics based on actual dataset content,
    with sample videos and top keywords for each topic.
    """
    try:
        loop = asyncio.get_event_loop()
        raw_topics = await loop.run_in_executor(
            executor,
            agent.get_topic_hierarchy,
            max_topics,
            samples_per_topic
        )

        topics_payload: List[TopicNode] = []
        for topic in raw_topics.get('topics', []):
            sample_videos = [VideoRecommendation(**rec) for rec in topic.get('sample_videos', [])]
            topics_payload.append(TopicNode(
                id=topic['id'],
                title=topic['title'],
                videoCount=topic['video_count'],
                averageQualityScore=topic['average_quality_score'],
                totalViews=topic['total_views'],
                topKeywords=topic['top_keywords'],
                sampleVideos=sample_videos
            ))

        metadata = {
            'generated_at': raw_topics.get('generated_at'),
            'available_genres': agent.available_genres,
            'total_videos': len(agent.df)
        }

        return TopicHierarchyResponse(
            success=True,
            topics=topics_payload,
            totalTopics=raw_topics.get('total_topics', len(topics_payload)),
            metadata=metadata
        )
    except Exception as e:
        logger.error(f"Error building topic hierarchy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate topic hierarchy: {str(e)}"
        )

@router.get("/creators/top", response_model=CreatorResponse)
async def get_top_creators(
    genre: Optional[str] = Query(None, description="Filter creators by genre"),
    sort_by: str = Query('quality', regex="^(quality|views|videos)$", description="Sort by: quality, views, or videos"),
    limit: int = Query(20, ge=5, le=100, description="Maximum creators to return"),
    min_videos: int = Query(2, ge=1, le=10, description="Minimum videos per creator"),
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> CreatorResponse:
    """
    Get top educational creators with aggregated metrics
    
    Useful for the creator hub feature, showing channels worth following
    based on content quality, view counts, or video volume.
    """
    try:
        loop = asyncio.get_event_loop()
        creators_raw = await loop.run_in_executor(
            executor,
            agent.get_top_creators,
            genre,
            sort_by,
            limit,
            min_videos
        )

        creators_payload = [
            CreatorSummary(
                channelName=creator['channel_name'],
                channelId=creator.get('channel_id'),
                videoCount=creator['video_count'],
                averageQualityScore=creator['average_quality_score'],
                totalViews=creator['total_views'],
                genres=creator['genres'],
                topVideos=[VideoRecommendation(**rec) for rec in creator['top_videos']]
            )
            for creator in creators_raw
        ]

        metadata = {
            'genre': genre,
            'sort_by': sort_by,
            'min_videos': min_videos,
            'generated_at': datetime.utcnow().isoformat() + 'Z'
        }

        return CreatorResponse(
            success=True,
            creators=creators_payload,
            count=len(creators_payload),
            metadata=metadata
        )
    except Exception as e:
        logger.error(f"Error fetching top creators: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch top creators: {str(e)}"
        )

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> SystemStats:
    """
    Get recommendation system statistics
    """
    try:
        stats = agent.get_statistics()
        return SystemStats(
            **stats,
            last_refresh=datetime.now()
        )
    except Exception as e:
        logger.error(f"Error fetching system stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system statistics: {str(e)}"
        )

@router.post("/refresh", response_model=Dict[str, str])
async def refresh_data(
    background_tasks: BackgroundTasks,
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> Dict[str, str]:
    """
    Refresh recommendation data (admin endpoint)
    """
    try:
        csv_path = os.path.join(
            os.path.dirname(__file__),
            "educational_youtube_content.csv"
        )
        
        # Schedule refresh in background
        background_tasks.add_task(agent.refresh_data, csv_path)
        
        return {
            "status": "success",
            "message": "Data refresh initiated in background"
        }
    except Exception as e:
        logger.error(f"Error initiating data refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate refresh: {str(e)}"
        )

# ============= Health Check =============

@router.get("/health", response_model=Dict[str, Any])
async def health_check(
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> Dict[str, Any]:
    """
    Health check endpoint for the recommendation service
    """
    try:
        stats = agent.get_statistics()
        return {
            "status": "healthy",
            "service": "CSV Recommendation Engine",
            "ai_genre_detection": "enabled" if _gemini_model else "disabled",
            "total_videos": stats['total_videos'],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

# ============= AI Genre Detection Testing Endpoint =============

class GenreDetectionTestRequest(BaseModel):
    """Request model for testing AI genre detection"""
    title: str = Field(..., description="Video title to analyze")
    channel: Optional[str] = Field(None, description="Channel name for context")
    category: Optional[str] = Field(None, description="Playlist category for hints")
    force_ai: bool = Field(False, description="Skip keyword detection and use AI directly")

class GenreDetectionTestResponse(BaseModel):
    """Response model for genre detection test"""
    detected_genre: str
    detection_method: str  # "keyword", "ai", "fallback"
    confidence: Optional[float] = None
    cache_hit: bool = False
    processing_time_ms: float

@router.post("/test-genre-detection", response_model=GenreDetectionTestResponse)
async def test_genre_detection(
    request: GenreDetectionTestRequest
) -> GenreDetectionTestResponse:
    """
    Test endpoint for AI genre detection.
    Useful for debugging and demonstrating the AI capability.
    
    Example:
    ```
    POST /api/recommendations/test-genre-detection
    {
        "title": "Oracle Database Administration Tutorial",
        "channel": "Tech Education",
        "category": "technology"
    }
    ```
    """
    import time
    start_time = time.time()
    
    # Check if it's a cache hit
    cache_key = _get_ai_cache_key(request.title, request.channel or '', request.category or '')
    cache_hit = cache_key in _ai_genre_cache
    
    # Detect the genre
    detected_genre = await detect_video_genre(
        title=request.title,
        channel=request.channel or '',
        category=request.category or '',
        force_ai=request.force_ai
    )
    
    # Determine detection method
    if cache_hit and _gemini_model:
        detection_method = "ai_cached"
    elif request.force_ai and _gemini_model:
        detection_method = "ai"
    elif not request.force_ai and _detect_genre_from_title(request.title, request.category or '') != 'trivia-facts':
        detection_method = "keyword"
    elif _gemini_model and detected_genre not in ['trivia-facts', 'coding-programming']:
        detection_method = "ai"
    else:
        detection_method = "fallback"
    
    processing_time_ms = (time.time() - start_time) * 1000
    
    return GenreDetectionTestResponse(
        detected_genre=detected_genre,
        detection_method=detection_method,
        cache_hit=cache_hit,
        processing_time_ms=processing_time_ms
    )
