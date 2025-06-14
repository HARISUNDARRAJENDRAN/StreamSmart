from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from services.bert_recommendation_engine import get_bert_recommendation_engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bert-recommendations", tags=["BERT Recommendations"])

# Pydantic models for request/response
class RecommendationRequest(BaseModel):
    title: str
    top_n: int = 5
    genre_filter: Optional[str] = None
    user_id: Optional[str] = None

class GenreRecommendationRequest(BaseModel):
    genre: str
    top_n: int = 10
    user_id: Optional[str] = None

class PersonalizedRecommendationRequest(BaseModel):
    user_id: str
    top_n: int = 10

class VideoRecommendation(BaseModel):
    title: str
    channelTitle: str
    likes: int
    dislikes: int
    thumbnail_link: str
    genre: str
    similarity: Optional[float] = None

class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[Dict]
    total_count: int
    message: Optional[str] = None

@router.post("/initialize", response_model=Dict)
async def initialize_bert_system():
    """Initialize the BERT recommendation system"""
    try:
        engine = get_bert_recommendation_engine()
        success = engine.initialize_system()
        
        if success:
            stats = engine.get_system_stats()
            return {
                "success": True,
                "message": "BERT recommendation system initialized successfully",
                "stats": stats
            }
        else:
            return {
                "success": False,
                "message": "Failed to initialize BERT recommendation system"
            }
            
    except Exception as e:
        logger.error(f"Error initializing BERT system: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=Dict)
async def get_system_stats():
    """Get BERT recommendation system statistics"""
    try:
        engine = get_bert_recommendation_engine()
        stats = engine.get_system_stats()
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend", response_model=RecommendationResponse)
async def get_content_based_recommendations(request: RecommendationRequest):
    """Get content-based recommendations using BERT embeddings"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Get recommendations
        recommendations_df = engine.recommend_videos(
            title=request.title,
            top_n=request.top_n,
            genre_filter=request.genre_filter,
            user_id=request.user_id
        )
        
        if recommendations_df.empty:
            return RecommendationResponse(
                success=False,
                recommendations=[],
                total_count=0,
                message="No recommendations found"
            )
        
        # Convert to dict
        recommendations = recommendations_df.to_dict('records')
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            total_count=len(recommendations),
            message=f"Found {len(recommendations)} recommendations"
        )
        
    except Exception as e:
        logger.error(f"Error getting content-based recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend-by-genre", response_model=RecommendationResponse)
async def get_genre_based_recommendations(request: GenreRecommendationRequest):
    """Get genre-based recommendations"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Get recommendations
        recommendations_df = engine.get_genre_recommendations(
            genre=request.genre,
            top_n=request.top_n,
            user_id=request.user_id
        )
        
        if recommendations_df.empty:
            return RecommendationResponse(
                success=False,
                recommendations=[],
                total_count=0,
                message=f"No recommendations found for genre: {request.genre}"
            )
        
        # Convert to dict
        recommendations = recommendations_df.to_dict('records')
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            total_count=len(recommendations),
            message=f"Found {len(recommendations)} recommendations for {request.genre}"
        )
        
    except Exception as e:
        logger.error(f"Error getting genre-based recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend-personalized", response_model=RecommendationResponse)
async def get_personalized_recommendations(request: PersonalizedRecommendationRequest):
    """Get personalized recommendations based on user viewing history"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Get recommendations
        recommendations_df = engine.get_personalized_recommendations(
            user_id=request.user_id,
            top_n=request.top_n
        )
        
        if recommendations_df.empty:
            return RecommendationResponse(
                success=False,
                recommendations=[],
                total_count=0,
                message="No personalized recommendations found"
            )
        
        # Convert to dict
        recommendations = recommendations_df.to_dict('records')
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            total_count=len(recommendations),
            message=f"Found {len(recommendations)} personalized recommendations"
        )
        
    except Exception as e:
        logger.error(f"Error getting personalized recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/popular", response_model=RecommendationResponse)
async def get_popular_recommendations(
    top_n: int = Query(10, description="Number of popular videos to return")
):
    """Get popular video recommendations based on likes"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Get recommendations
        recommendations_df = engine.get_popular_recommendations(top_n=top_n)
        
        if recommendations_df.empty:
            return RecommendationResponse(
                success=False,
                recommendations=[],
                total_count=0,
                message="No popular recommendations found"
            )
        
        # Convert to dict
        recommendations = recommendations_df.to_dict('records')
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            total_count=len(recommendations),
            message=f"Found {len(recommendations)} popular recommendations"
        )
        
    except Exception as e:
        logger.error(f"Error getting popular recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/genres", response_model=Dict)
async def get_available_genres():
    """Get all available genres in the dataset"""
    try:
        engine = get_bert_recommendation_engine()
        
        if engine.df_yt is None or engine.df_yt.empty:
            return {
                "success": False,
                "genres": [],
                "message": "Dataset not loaded"
            }
        
        genres = engine.df_yt['genre'].unique().tolist()
        genre_counts = engine.df_yt['genre'].value_counts().to_dict()
        
        return {
            "success": True,
            "genres": genres,
            "genre_counts": genre_counts,
            "total_genres": len(genres)
        }
        
    except Exception as e:
        logger.error(f"Error getting available genres: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-viewing", response_model=Dict)
async def log_user_viewing(
    user_id: str = Body(...),
    video_title: str = Body(...),
    genre: str = Body(...),
    watch_duration: Optional[int] = Body(None)
):
    """Log user viewing activity for personalized recommendations"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Create viewing log entry
        from datetime import datetime
        log_entry = {
            "user_id": user_id,
            "video_title": video_title,
            "genre": genre,
            "watch_duration": watch_duration,
            "timestamp": datetime.now()
        }
        
        # Insert into MongoDB
        engine.db.user_viewing_history.insert_one(log_entry)
        
        return {
            "success": True,
            "message": "Viewing activity logged successfully"
        }
        
    except Exception as e:
        logger.error(f"Error logging viewing activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-history/{user_id}", response_model=Dict)
async def get_user_viewing_history(
    user_id: str,
    limit: int = Query(20, description="Number of recent entries to return")
):
    """Get user's viewing history"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Get user's viewing history
        history = list(engine.db.user_viewing_history.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit))
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error getting user viewing history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/user-history/{user_id}", response_model=Dict)
async def clear_user_viewing_history(user_id: str):
    """Clear user's viewing history"""
    try:
        engine = get_bert_recommendation_engine()
        
        # Delete user's viewing history
        result = engine.db.user_viewing_history.delete_many({"user_id": user_id})
        
        return {
            "success": True,
            "message": f"Cleared {result.deleted_count} viewing history entries",
            "deleted_count": result.deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error clearing user viewing history: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 