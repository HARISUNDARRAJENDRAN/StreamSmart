#!/usr/bin/env python3
"""
Smart Recommendation API Endpoints for StreamSmart
Provides MongoDB-based video storage and intelligent recommendations
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Any, Optional
import logging
import os

# Import the smart recommendation service
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))
from smart_recommendation_service import get_smart_recommendation_service

router = APIRouter(prefix="/api/smart", tags=["smart-recommendations"])
logger = logging.getLogger(__name__)

@router.on_event("startup")
async def startup_event():
    """Initialize the smart recommendation service on startup"""
    try:
        service = await get_smart_recommendation_service()
        await service.initialize()
        logger.info("Smart recommendation service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize smart recommendation service: {e}")

@router.post("/load-videos")
async def load_videos_to_mongodb(
    background_tasks: BackgroundTasks,
    force_reload: bool = Query(default=False, description="Force reload videos even if they exist")
):
    """Load all collected videos from JSON files into MongoDB"""
    try:
        service = await get_smart_recommendation_service()
        
        if force_reload:
            # Run in background for force reload
            background_tasks.add_task(service.load_videos_from_json_files, True)
            return {
                "success": True,
                "message": "Video loading started in background (force reload)",
                "status": "loading"
            }
        
        # Check current status first
        total_loaded = await service.load_videos_from_json_files(False)
        
        return {
            "success": True,
            "videos_loaded": total_loaded,
            "message": f"Successfully loaded {total_loaded} videos into MongoDB",
            "status": "completed"
        }
        
    except Exception as e:
        logger.error(f"Error loading videos: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading videos: {str(e)}")

@router.get("/recommendations/{user_id}")
async def get_smart_recommendations(
    user_id: str,
    genre: Optional[str] = Query(default=None, description="Filter by genre"),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty"),
    limit: int = Query(default=51, description="Number of recommendations to return"),
    refresh: bool = Query(default=False, description="Force refresh recommendations")
):
    """Get intelligent video recommendations for a user"""
    try:
        service = await get_smart_recommendation_service()
        
        recommendations = await service.get_smart_recommendations(
            user_id=user_id,
            genre=genre,
            difficulty=difficulty,
            limit=limit,
            refresh=refresh
        )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}")

@router.get("/genre/{genre_slug}")
async def get_genre_videos_smart(
    genre_slug: str,
    user_id: str = Query(default="guest", description="User ID for personalization"),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty"),
    limit: int = Query(default=51, description="Number of videos to return"),
    refresh: bool = Query(default=False, description="Force refresh recommendations")
):
    """Get personalized videos for a specific genre using smart recommendations"""
    try:
        service = await get_smart_recommendation_service()
        
        # Get smart recommendations for the genre
        recommendations = await service.get_smart_recommendations(
            user_id=user_id,
            genre=genre_slug,
            difficulty=difficulty,
            limit=limit,
            refresh=refresh
        )
        
        # Add genre-specific metadata
        recommendations["genre"] = genre_slug
        recommendations["personalized"] = user_id != "guest"
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting genre videos: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting genre videos: {str(e)}")

@router.post("/interaction")
async def record_user_interaction(
    user_id: str,
    video_id: str,
    interaction_type: str,  # "watch", "like", "dislike", "share"
    watch_duration: Optional[int] = None,
    watch_percentage: Optional[float] = None
):
    """Record user interaction with a video for better recommendations"""
    try:
        service = await get_smart_recommendation_service()
        
        await service.record_interaction(user_id, video_id, interaction_type)
        
        return {
            "success": True,
            "message": f"Recorded {interaction_type} interaction for user {user_id}",
            "user_id": user_id,
            "video_id": video_id,
            "interaction_type": interaction_type
        }
        
    except Exception as e:
        logger.error(f"Error recording interaction: {e}")
        raise HTTPException(status_code=500, detail=f"Error recording interaction: {str(e)}")

@router.get("/user/{user_id}/preferences")
async def get_user_preferences(user_id: str):
    """Get user preferences and viewing history"""
    try:
        service = await get_smart_recommendation_service()
        
        user_prefs = await service.users_collection.find_one({"user_id": user_id})
        
        if not user_prefs:
            return {
                "user_id": user_id,
                "preferences_found": False,
                "message": "No preferences found for user"
            }
        
        # Remove MongoDB ObjectId for JSON serialization
        user_prefs.pop("_id", None)
        
        return {
            "user_id": user_id,
            "preferences_found": True,
            "preferences": user_prefs
        }
        
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting user preferences: {str(e)}")

@router.get("/stats")
async def get_database_stats():
    """Get statistics about the video database"""
    try:
        service = await get_smart_recommendation_service()
        stats = await service.get_stats()
        
        return {
            "success": True,
            "stats": stats,
            "mongodb_connected": service.client is not None
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@router.post("/ai-refresh/{user_id}")
async def ai_refresh_recommendations(
    user_id: str,
    genre: Optional[str] = Query(default=None, description="Refresh for specific genre"),
    limit: int = Query(default=51, description="Number of new recommendations")
):
    """AI Refresh - Get fresh personalized recommendations"""
    try:
        service = await get_smart_recommendation_service()
        
        # Force refresh with new recommendations
        recommendations = await service.get_smart_recommendations(
            user_id=user_id,
            genre=genre,
            limit=limit,
            refresh=True  # Force refresh
        )
        
        # Add refresh metadata
        recommendations["refreshed"] = True
        recommendations["refresh_timestamp"] = str(service.datetime.now() if hasattr(service, 'datetime') else "unknown")
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error refreshing recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Error refreshing recommendations: {str(e)}")

# Genre mapping for URL routes
GENRE_ROUTES = {
    "coding-programming": "Coding & Programming",
    "data-science-ai": "Data Science & AI/ML",
    "design": "Design (UI/UX, Graphic, Product)",
    "digital-marketing": "Digital Marketing",
    "productivity": "Productivity & Time Management",
    "financial-literacy": "Financial Literacy & Investing",
    "soft-skills": "Soft Skills (Communication, Leadership)",
    "entrepreneurship": "Entrepreneurship & Startups",
    "writing-content": "Writing & Content Creation",
    "public-speaking": "Public Speaking",
    "mathematics": "Mathematics",
    "physics": "Physics",
    "biology": "Biology",
    "chemistry": "Chemistry",
    "history-civics": "History & Civics",
    "language-learning": "Language Learning",
    "resume-job-hunting": "Resume Building & Job Hunting", 
    "interview-preparation": "Interview Preparation",
    "freelancing-remote": "Freelancing & Remote Work",
    "certifications": "Certifications (AWS, Azure, PMP, etc.)",
    "tech-news": "Tech News & Product Launches",
    "ai-innovation": "AI & Innovation",
    "startups": "Startups & Unicorns",
    "cybersecurity": "Cybersecurity & Privacy",
    "trivia-facts": "Did You Know / Trivia",
    "science-experiments": "Science Experiments",
    "psychology": "Psychology & Human Behavior",
    "philosophy": "Philosophy & Critical Thinking",
    "robotics-iot": "Robotics & IoT",
    "electronics-arduino": "Electronics & Arduino",
    "diy-projects": "DIY Projects & Hacks",
    "health-fitness": "Health & Fitness",
    "mental-wellness": "Mental Health & Wellness",
    "sustainableliving": "Sustainable Living"
}

@router.get("/genres")
async def get_available_genres():
    """Get all available genres with video counts"""
    try:
        service = await get_smart_recommendation_service()
        stats = await service.get_stats()
        
        # Combine with route mapping
        genres_with_routes = []
        for genre_data in stats.get("genres", []):
            genre_slug = genre_data["genre"]
            genre_name = GENRE_ROUTES.get(genre_slug, genre_slug.replace('-', ' ').title())
            
            genres_with_routes.append({
                "slug": genre_slug,
                "name": genre_name,
                "count": genre_data["count"],
                "route": f"/genre/{genre_slug}"
            })
        
        return {
            "success": True,
            "genres": genres_with_routes,
            "total_genres": len(genres_with_routes)
        }
        
    except Exception as e:
        logger.error(f"Error getting genres: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting genres: {str(e)}")

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for smart recommendation service"""
    try:
        service = await get_smart_recommendation_service()
        
        # Check MongoDB connection
        if service.client:
            # Try a simple operation
            await service.videos_collection.count_documents({}, limit=1)
            mongodb_status = "connected"
        else:
            mongodb_status = "disconnected"
        
        return {
            "status": "healthy",
            "mongodb": mongodb_status,
            "service": "smart_recommendation_service",
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "service": "smart_recommendation_service"
        } 