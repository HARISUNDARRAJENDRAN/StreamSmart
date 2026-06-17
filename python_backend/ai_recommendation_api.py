"""
AI Recommendation API v1 Endpoint
Provides the /api/v1/recommend endpoint that the frontend expects
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import the CSV recommendation agent
try:
    from csv_recommendation_agent import CSVRecommendationAgent
    CSV_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ CSV recommendation agent unavailable: {e}")
    CSV_AVAILABLE = False
    CSVRecommendationAgent = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Thread pool for blocking operations
executor = ThreadPoolExecutor(max_workers=4)

# Create router with the exact prefix the frontend expects
router = APIRouter(
    prefix="/api/v1",
    tags=["AI Recommendations V1"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Internal server error"}
    }
)

# ============= Request/Response Models =============

class AIRecommendationRequestV1(BaseModel):
    """Request model matching frontend expectations"""
    title: str
    description: Optional[str] = ""
    topN: Optional[int] = 10

class AIVideoRecommendationV1(BaseModel):
    """Response model for individual video recommendation"""
    video_id: str
    title: str
    channelName: str
    channelId: Optional[str] = None
    thumbnailUrl: str
    duration: str
    genre: str
    qualityScore: float
    viewCount: int
    youtubeUrl: str
    description: Optional[str] = None
    uploadDate: Optional[str] = None
    similarityScore: Optional[float] = None

class AIRecommendationResponseV1(BaseModel):
    """Response model matching frontend expectations"""
    success: bool
    recommendations: List[AIVideoRecommendationV1]
    count: int
    metadata: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

# ============= Dependency Injection =============

_agent_instance = None

def get_recommendation_agent() -> CSVRecommendationAgent:
    """Get or create the recommendation agent instance (singleton pattern)"""
    global _agent_instance
    
    if not CSV_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Recommendation service is not available"
        )
    
    if _agent_instance is None:
        csv_path = os.path.join(
            os.path.dirname(__file__),
            'educational_youtube_content.csv'
        )
        
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found at {csv_path}")
            raise HTTPException(
                status_code=500,
                detail="Recommendation data not found"
            )
        
        try:
            _agent_instance = CSVRecommendationAgent(csv_path)
            logger.info("Recommendation agent initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize recommendation agent: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize recommendation system: {e}"
            )
    
    return _agent_instance

# ============= Main Endpoint =============

@router.post("/recommend", response_model=AIRecommendationResponseV1)
async def get_ai_recommendations(
    request: AIRecommendationRequestV1,
    agent: CSVRecommendationAgent = Depends(get_recommendation_agent)
) -> AIRecommendationResponseV1:
    """
    Get AI-powered video recommendations based on title and description.
    This endpoint matches the frontend's expectation for /api/v1/recommend
    """
    try:
        top_n = max(1, min(int(request.topN or 10), 50))
        logger.info(f"AI Recommendation request - Title: '{request.title}', TopN: {top_n}")

        # Build compact keyword set from title + optional description.
        search_keywords = [word.strip().lower() for word in request.title.split() if word.strip()]
        if request.description:
            search_keywords.extend(
                [word.strip().lower() for word in request.description.split()[:8] if word.strip()]
            )

        loop = asyncio.get_event_loop()
        recommendations = await loop.run_in_executor(
            executor,
            lambda: agent.search_by_keywords(
                keywords=search_keywords,
                top_n=top_n,
                search_fields=['title', 'description', 'channel'],
                sort_by='relevance'
            )
        )

        # If no semantic/keyword match, return trending content for graceful onboarding.
        if not recommendations:
            logger.info("No keyword matches found, falling back to trending videos")
            recommendations = await loop.run_in_executor(
                executor,
                lambda: agent.get_trending_videos(top_n=top_n)
            )
        
        # Transform recommendations to match frontend expected format
        formatted_recommendations = []
        for idx, rec in enumerate(recommendations):
            # Ensure all required fields are present
            formatted_rec = AIVideoRecommendationV1(
                video_id=rec.get('video_id', ''),
                title=rec.get('title', 'Unknown Title'),
                channelName=rec.get('channelName', rec.get('channel_name', 'Unknown Channel')),
                channelId=rec.get('channelId', rec.get('channel_id')),
                thumbnailUrl=rec.get('thumbnailUrl', rec.get('thumbnail_url', '')),
                duration=rec.get('duration', '0:00'),
                genre=rec.get('genre', 'General'),
                qualityScore=rec.get('qualityScore', rec.get('quality_score', 0.5)),
                viewCount=int(rec.get('viewCount', rec.get('view_count', 0))),
                youtubeUrl=rec.get('youtubeUrl', rec.get('youtube_url', f"https://youtube.com/watch?v={rec.get('video_id', '')}")),
                description=rec.get('description'),
                uploadDate=rec.get('uploadDate', rec.get('upload_date')),
                similarityScore=0.95 - (idx * 0.05)  # Simulated similarity score
            )
            formatted_recommendations.append(formatted_rec)
        
        return AIRecommendationResponseV1(
            success=True,
            recommendations=formatted_recommendations,
            count=len(formatted_recommendations),
            message="Recommendations generated successfully",
            metadata={
                "model": "csv-based",
                "search_method": "keyword_search_with_trending_fallback",
                "index": "youtube_education_videos"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating AI recommendations: {e}")
        # Return empty results instead of error to prevent frontend crash
        return AIRecommendationResponseV1(
            success=False,
            recommendations=[],
            count=0,
            message=f"Error generating recommendations: {str(e)}",
            metadata={"error": str(e)}
        )

@router.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Health check for AI recommendation service"""
    try:
        agent = get_recommendation_agent()
        stats = agent.get_statistics()
        
        return {
            "status": "healthy",
            "service": "ai-recommendations-v1",
            "total_videos": stats.get("total_videos", 0),
            "available": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "ai-recommendations-v1",
            "error": str(e),
            "available": False
        }
