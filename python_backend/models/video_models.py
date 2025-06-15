#!/usr/bin/env python3
"""
MongoDB Models for StreamSmart Video Storage and Recommendations
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import numpy as np

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class VideoModel(BaseModel):
    """MongoDB model for storing video data with BERT embeddings"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    # Basic video information
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    description: str = Field(default="", description="Video description")
    thumbnail_url: str = Field(..., description="Video thumbnail URL")
    duration: str = Field(default="", description="Video duration (e.g., '12:34')")
    channel: str = Field(..., description="Channel name")
    
    # Metadata
    genre: str = Field(..., description="Video genre/category")
    difficulty: str = Field(default="intermediate", description="Difficulty level")
    view_count: int = Field(default=0, description="YouTube view count")
    quality_score: float = Field(default=0.0, description="AI quality score")
    
    # URLs and links
    url: str = Field(..., description="YouTube video URL")
    
    # Collection metadata
    search_query: str = Field(default="", description="Search query used to find video")
    collected_at: datetime = Field(default_factory=datetime.now)
    published_at: Optional[str] = Field(default=None, description="Video publish date")
    
    # BERT embeddings (stored as list for MongoDB compatibility)
    bert_embedding: Optional[List[float]] = Field(default=None, description="BERT text embeddings")
    embedding_computed: bool = Field(default=False, description="Whether BERT embedding is computed")
    
    # Search and filtering
    tags: List[str] = Field(default=[], description="Video tags for filtering")
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserPreferenceModel(BaseModel):
    """MongoDB model for user viewing preferences and history"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    user_id: str = Field(..., description="User identifier")
    
    # User preferences
    preferred_genres: List[str] = Field(default=[], description="User's preferred genres")
    preferred_difficulty: List[str] = Field(default=[], description="Preferred difficulty levels")
    preferred_channels: List[str] = Field(default=[], description="Preferred channels")
    
    # Viewing history
    watched_videos: List[str] = Field(default=[], description="List of watched video IDs")
    liked_videos: List[str] = Field(default=[], description="List of liked video IDs")
    disliked_videos: List[str] = Field(default=[], description="List of disliked video IDs")
    
    # BERT-based preferences (computed from user behavior)
    preference_embedding: Optional[List[float]] = Field(default=None, description="User preference embedding")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class RecommendationRequest(BaseModel):
    """Request model for getting AI recommendations"""
    user_id: str = Field(..., description="User identifier")
    genre: Optional[str] = Field(default=None, description="Optional genre filter")
    difficulty: Optional[str] = Field(default=None, description="Optional difficulty filter")
    limit: int = Field(default=51, description="Number of recommendations to return")
    exclude_watched: bool = Field(default=True, description="Exclude already watched videos")
    refresh: bool = Field(default=False, description="Force refresh recommendations")

class RecommendationResponse(BaseModel):
    """Response model for AI recommendations"""
    success: bool
    videos: List[Dict[str, Any]]
    total_available: int
    user_id: str
    algorithm_used: str
    embedding_similarity: bool
    message: str
    recommendation_id: str = Field(default_factory=lambda: str(ObjectId()))

class VideoInteractionModel(BaseModel):
    """MongoDB model for tracking video interactions"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    user_id: str = Field(..., description="User identifier")
    video_id: str = Field(..., description="YouTube video ID")
    
    # Interaction types
    interaction_type: str = Field(..., description="watch, like, dislike, share, save")
    watch_duration: Optional[int] = Field(default=None, description="Seconds watched")
    watch_percentage: Optional[float] = Field(default=None, description="Percentage of video watched")
    
    # Context
    genre: str = Field(..., description="Video genre")
    recommendation_source: str = Field(default="", description="How user found this video")
    
    # Metadata
    timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Helper functions for working with embeddings
def embedding_to_list(embedding: np.ndarray) -> List[float]:
    """Convert numpy array to list for MongoDB storage"""
    if embedding is None:
        return None
    return embedding.flatten().tolist()

def list_to_embedding(embedding_list: List[float]) -> np.ndarray:
    """Convert list from MongoDB to numpy array"""
    if embedding_list is None:
        return None
    return np.array(embedding_list).reshape(1, -1)

def cosine_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """Calculate cosine similarity between two embeddings"""
    if not embedding1 or not embedding2:
        return 0.0
    
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2) 