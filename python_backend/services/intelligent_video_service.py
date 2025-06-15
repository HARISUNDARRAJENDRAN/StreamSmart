#!/usr/bin/env python3
"""
Intelligent Video Service for StreamSmart
Manages video storage in MongoDB and provides BERT-based recommendations
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
import random

import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import pickle

# Add models directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'models'))
from video_models import (
    VideoModel, UserPreferenceModel, RecommendationRequest, 
    RecommendationResponse, VideoInteractionModel,
    embedding_to_list, list_to_embedding, cosine_similarity
)

# Add services directory to path  
sys.path.append(os.path.join(os.path.dirname(__file__)))
from bert_recommendation_engine import BertRecommendationEngine

logger = logging.getLogger(__name__)

class IntelligentVideoService:
    """Service for intelligent video management and BERT-powered recommendations"""
    
    def __init__(self, mongo_uri: str = "mongodb://localhost:27017/", db_name: str = "streamsmart"):
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.client = None
        self.db = None
        self.videos_collection = None
        self.users_collection = None
        self.interactions_collection = None
        
        # BERT engine for embeddings
        self.bert_engine = None
        
        # Cache for recommendations
        self.recommendation_cache = {}
        self.cache_expiry = timedelta(hours=2)  # Cache expires after 2 hours
        
        logger.info(f"IntelligentVideoService initialized with MongoDB: {mongo_uri}")
    
    async def initialize(self):
        """Initialize MongoDB connection and BERT engine"""
        try:
            # Initialize MongoDB
            self.client = AsyncIOMotorClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            
            # Collections
            self.videos_collection = self.db.videos
            self.users_collection = self.db.user_preferences  
            self.interactions_collection = self.db.video_interactions
            
            # Create indexes for better performance
            await self._create_indexes()
            
            # Initialize BERT engine
            try:
                self.bert_engine = BertRecommendationEngine(mongo_uri=self.mongo_uri, db_name=self.db_name)
                await asyncio.to_thread(self.bert_engine._initialize_bert_model)
                logger.info("BERT recommendation engine initialized successfully")
            except Exception as e:
                logger.warning(f"BERT engine initialization failed: {e}")
                self.bert_engine = None
            
            logger.info("IntelligentVideoService initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize IntelligentVideoService: {e}")
            return False
    
    async def _create_indexes(self):
        """Create database indexes for optimal performance"""
        try:
            # Video indexes
            await self.videos_collection.create_index("video_id", unique=True)
            await self.videos_collection.create_index("genre")
            await self.videos_collection.create_index("difficulty")
            await self.videos_collection.create_index("quality_score")
            await self.videos_collection.create_index("view_count")
            await self.videos_collection.create_index([("title", "text"), ("description", "text")])
            
            # User preference indexes
            await self.users_collection.create_index("user_id", unique=True)
            
            # Interaction indexes
            await self.interactions_collection.create_index([("user_id", 1), ("timestamp", -1)])
            await self.interactions_collection.create_index("video_id")
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
    
    async def load_videos_from_json_files(self, force_reload: bool = False) -> int:
        """Load videos from JSON files into MongoDB with BERT embeddings"""
        
        if not force_reload:
            # Check if videos already exist
            video_count = await self.videos_collection.count_documents({})
            if video_count > 0:
                logger.info(f"Found {video_count} videos in database. Use force_reload=True to reload.")
                return video_count
        
        results_dir = Path("genre_population_results")
        if not results_dir.exists():
            logger.error("Genre population results directory not found")
            return 0
        
        total_loaded = 0
        
        # Load videos from all genre JSON files
        for json_file in results_dir.glob("*_videos.json"):
            try:
                genre_slug = json_file.stem.replace('_videos', '')
                
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                videos = data.get('videos', [])
                logger.info(f"Loading {len(videos)} videos from {genre_slug}")
                
                # Process videos in batches for better performance
                batch_size = 50
                for i in range(0, len(videos), batch_size):
                    batch = videos[i:i + batch_size]
                    loaded_count = await self._process_video_batch(batch, genre_slug)
                    total_loaded += loaded_count
                    
                    # Small delay to prevent overwhelming the system
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Error loading videos from {json_file}: {e}")
                continue
        
        logger.info(f"Total videos loaded into MongoDB: {total_loaded}")
        
        # Compute BERT embeddings for all videos
        if self.bert_engine:
            await self._compute_all_embeddings()
        
        return total_loaded
    
    async def _process_video_batch(self, videos: List[Dict], genre_slug: str) -> int:
        """Process a batch of videos and store in MongoDB"""
        loaded_count = 0
        
        for video_data in videos:
            try:
                # Create video model
                video_model = VideoModel(
                    video_id=video_data.get('video_id', ''),
                    title=video_data.get('title', ''),
                    description=video_data.get('description', ''),
                    thumbnail_url=video_data.get('thumbnail', ''),
                    duration=video_data.get('duration', ''),
                    channel=video_data.get('channel', ''),
                    genre=genre_slug,
                    difficulty=self._determine_difficulty(video_data.get('title', '')),
                    view_count=video_data.get('view_count', 0),
                    quality_score=video_data.get('quality_score', 0.0),
                    url=video_data.get('url', ''),
                    search_query=video_data.get('search_query', ''),
                    published_at=video_data.get('published', ''),
                    collected_at=datetime.fromisoformat(video_data.get('collected_at', datetime.now().isoformat()))
                )
                
                # Insert into MongoDB (skip duplicates)
                try:
                    await self.videos_collection.insert_one(video_model.dict(by_alias=True))
                    loaded_count += 1
                except DuplicateKeyError:
                    # Video already exists, skip
                    pass
                    
            except Exception as e:
                logger.warning(f"Error processing video: {e}")
                continue
        
        return loaded_count
    
    def _determine_difficulty(self, title: str) -> str:
        """Determine video difficulty based on title keywords"""
        title_lower = title.lower()
        
        beginner_keywords = ['beginner', 'introduction', 'intro', 'basics', 'fundamentals', 'getting started', 'first', '101', 'start', 'learn']
        advanced_keywords = ['advanced', 'expert', 'master', 'deep dive', 'complex', 'professional', 'enterprise', 'optimization']
        
        if any(keyword in title_lower for keyword in advanced_keywords):
            return 'advanced'
        elif any(keyword in title_lower for keyword in beginner_keywords):
            return 'beginner'
        else:
            return 'intermediate'
    
    async def _compute_all_embeddings(self):
        """Compute BERT embeddings for all videos that don't have them"""
        try:
            # Find videos without embeddings
            videos_without_embeddings = self.videos_collection.find(
                {"embedding_computed": {"$ne": True}}
            )
            
            count = 0
            async for video in videos_without_embeddings:
                try:
                    # Create text for embedding (title + description)
                    text_content = f"{video.get('title', '')} {video.get('description', '')}"
                    
                    # Get BERT embedding
                    embedding = await asyncio.to_thread(
                        self.bert_engine.get_bert_embeddings, 
                        text_content
                    )
                    
                    # Update video with embedding
                    await self.videos_collection.update_one(
                        {"_id": video["_id"]},
                        {
                            "$set": {
                                "bert_embedding": embedding_to_list(embedding),
                                "embedding_computed": True
                            }
                        }
                    )
                    
                    count += 1
                    if count % 100 == 0:
                        logger.info(f"Computed embeddings for {count} videos")
                        
                except Exception as e:
                    logger.warning(f"Error computing embedding for video {video.get('video_id', '')}: {e}")
                    continue
            
            logger.info(f"BERT embeddings computed for {count} videos")
            
        except Exception as e:
            logger.error(f"Error computing embeddings: {e}")
    
    async def get_intelligent_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        """Get intelligent video recommendations using BERT embeddings and user preferences"""
        
        try:
            # Check cache first (unless refresh is requested)
            cache_key = f"{request.user_id}_{request.genre}_{request.difficulty}_{request.limit}"
            
            if not request.refresh and cache_key in self.recommendation_cache:
                cached_result, timestamp = self.recommendation_cache[cache_key]
                if datetime.now() - timestamp < self.cache_expiry:
                    logger.info(f"Returning cached recommendations for user {request.user_id}")
                    return cached_result
            
            # Get user preferences
            user_prefs = await self._get_user_preferences(request.user_id)
            
            # Build MongoDB query
            query = {}
            if request.genre:
                query["genre"] = request.genre
            if request.difficulty:
                query["difficulty"] = request.difficulty
            
            # Exclude watched videos if requested
            if request.exclude_watched and user_prefs and user_prefs.watched_videos:
                query["video_id"] = {"$nin": user_prefs.watched_videos}
            
            # Get candidate videos
            candidate_videos = []
            async for video in self.videos_collection.find(query).limit(request.limit * 3):  # Get more candidates for better selection
                candidate_videos.append(video)
            
            if not candidate_videos:
                return RecommendationResponse(
                    success=False,
                    videos=[],
                    total_available=0,
                    user_id=request.user_id,
                    algorithm_used="none",
                    embedding_similarity=False,
                    message="No videos found matching criteria"
                )
            
            # Apply intelligent ranking
            ranked_videos = await self._rank_videos_intelligently(
                candidate_videos, user_prefs, request.limit
            )
            
            # Convert to frontend format
            formatted_videos = []
            for video in ranked_videos:
                formatted_video = {
                    "youtubeId": video.get("video_id", ""),
                    "title": video.get("title", ""),
                    "description": video.get("description", ""),
                    "thumbnail": video.get("thumbnail_url", ""),
                    "duration": video.get("duration", "N/A"),
                    "category": video.get("genre", ""),
                    "channelTitle": video.get("channel", ""),
                    "viewCount": video.get("view_count", 0),
                    "youtubeURL": video.get("url", ""),
                    "difficulty": video.get("difficulty", "intermediate"),
                    "quality_score": video.get("quality_score", 0.0),
                    "similarity_score": video.get("_similarity_score", 0.0)  # Our computed similarity
                }
                formatted_videos.append(formatted_video)
            
            # Create response
            response = RecommendationResponse(
                success=True,
                videos=formatted_videos,
                total_available=len(candidate_videos),
                user_id=request.user_id,
                algorithm_used="bert_embedding" if user_prefs and user_prefs.preference_embedding else "quality_based",
                embedding_similarity=bool(user_prefs and user_prefs.preference_embedding),
                message=f"Found {len(formatted_videos)} intelligent recommendations"
            )
            
            # Cache the result
            self.recommendation_cache[cache_key] = (response, datetime.now())
            
            return response
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return RecommendationResponse(
                success=False,
                videos=[],
                total_available=0,
                user_id=request.user_id,
                algorithm_used="error",
                embedding_similarity=False,
                message=f"Error: {str(e)}"
            )
    
    async def _get_user_preferences(self, user_id: str) -> Optional[UserPreferenceModel]:
        """Get user preferences from database"""
        try:
            user_doc = await self.users_collection.find_one({"user_id": user_id})
            if user_doc:
                return UserPreferenceModel(**user_doc)
            return None
        except Exception as e:
            logger.warning(f"Error getting user preferences: {e}")
            return None
    
    async def _rank_videos_intelligently(self, videos: List[Dict], user_prefs: Optional[UserPreferenceModel], limit: int) -> List[Dict]:
        """Rank videos using BERT embeddings and user preferences"""
        
        # If user has preference embedding, use BERT similarity
        if user_prefs and user_prefs.preference_embedding and self.bert_engine:
            return await self._rank_by_embedding_similarity(videos, user_prefs.preference_embedding, limit)
        
        # Otherwise, use quality-based ranking
        return self._rank_by_quality(videos, user_prefs, limit)
    
    async def _rank_by_embedding_similarity(self, videos: List[Dict], user_embedding: List[float], limit: int) -> List[Dict]:
        """Rank videos by BERT embedding similarity to user preferences"""
        
        video_scores = []
        
        for video in videos:
            video_embedding = video.get("bert_embedding")
            if video_embedding:
                # Calculate similarity
                similarity = cosine_similarity(user_embedding, video_embedding)
                
                # Combine with quality score
                quality_score = video.get("quality_score", 0.0)
                combined_score = (similarity * 0.7) + (quality_score * 0.3)  # 70% similarity, 30% quality
                
                video["_similarity_score"] = similarity
                video["_combined_score"] = combined_score
                video_scores.append((combined_score, video))
            else:
                # No embedding, use quality score only
                quality_score = video.get("quality_score", 0.0)
                video["_similarity_score"] = 0.0
                video["_combined_score"] = quality_score
                video_scores.append((quality_score, video))
        
        # Sort by combined score and return top videos
        video_scores.sort(key=lambda x: x[0], reverse=True)
        return [video for _, video in video_scores[:limit]]
    
    def _rank_by_quality(self, videos: List[Dict], user_prefs: Optional[UserPreferenceModel], limit: int) -> List[Dict]:
        """Rank videos by quality score and user preferences"""
        
        scored_videos = []
        
        for video in videos:
            score = video.get("quality_score", 0.0)
            
            # Boost score based on user preferences
            if user_prefs:
                # Prefer user's favorite genres
                if video.get("genre") in user_prefs.preferred_genres:
                    score += 0.2
                
                # Prefer user's difficulty level
                if video.get("difficulty") in user_prefs.preferred_difficulty:
                    score += 0.1
                
                # Prefer user's favorite channels
                if video.get("channel") in user_prefs.preferred_channels:
                    score += 0.15
            
            # Add some randomness for diversity
            score += random.uniform(0, 0.05)
            
            video["_similarity_score"] = 0.0
            video["_combined_score"] = score
            scored_videos.append((score, video))
        
        # Sort and return top videos
        scored_videos.sort(key=lambda x: x[0], reverse=True)
        return [video for _, video in scored_videos[:limit]]
    
    async def record_video_interaction(self, user_id: str, video_id: str, interaction_type: str, **kwargs):
        """Record user interaction with a video"""
        try:
            interaction = VideoInteractionModel(
                user_id=user_id,
                video_id=video_id,
                interaction_type=interaction_type,
                watch_duration=kwargs.get('watch_duration'),
                watch_percentage=kwargs.get('watch_percentage'),
                genre=kwargs.get('genre', ''),
                recommendation_source=kwargs.get('source', '')
            )
            
            await self.interactions_collection.insert_one(interaction.dict(by_alias=True))
            
            # Update user preferences based on interaction
            await self._update_user_preferences(user_id, video_id, interaction_type)
            
            # Clear recommendation cache for this user
            self._clear_user_cache(user_id)
            
        except Exception as e:
            logger.error(f"Error recording interaction: {e}")
    
    async def _update_user_preferences(self, user_id: str, video_id: str, interaction_type: str):
        """Update user preferences based on video interaction"""
        try:
            # Get video details
            video = await self.videos_collection.find_one({"video_id": video_id})
            if not video:
                return
            
            # Get or create user preferences
            user_prefs = await self.users_collection.find_one({"user_id": user_id})
            if not user_prefs:
                user_prefs = {
                    "user_id": user_id,
                    "preferred_genres": [],
                    "preferred_difficulty": [],
                    "preferred_channels": [],
                    "watched_videos": [],
                    "liked_videos": [],
                    "disliked_videos": [],
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
            
            # Update based on interaction type
            updates = {"updated_at": datetime.now()}
            
            if interaction_type == "watch":
                if video_id not in user_prefs.get("watched_videos", []):
                    updates["$addToSet"] = {"watched_videos": video_id}
                
                # Add preferences based on watched content
                genre = video.get("genre")
                difficulty = video.get("difficulty")
                channel = video.get("channel")
                
                if genre and genre not in user_prefs.get("preferred_genres", []):
                    updates.setdefault("$addToSet", {})["preferred_genres"] = genre
                if difficulty and difficulty not in user_prefs.get("preferred_difficulty", []):
                    updates.setdefault("$addToSet", {})["preferred_difficulty"] = difficulty
                if channel and channel not in user_prefs.get("preferred_channels", []):
                    updates.setdefault("$addToSet", {})["preferred_channels"] = channel
            
            elif interaction_type == "like":
                updates["$addToSet"] = {"liked_videos": video_id}
                # Remove from disliked if present
                updates["$pull"] = {"disliked_videos": video_id}
            
            elif interaction_type == "dislike":
                updates["$addToSet"] = {"disliked_videos": video_id}
                # Remove from liked if present  
                updates["$pull"] = {"liked_videos": video_id}
            
            # Apply updates
            await self.users_collection.update_one(
                {"user_id": user_id},
                {"$set": updates.get("$set", {})} | 
                {"$addToSet": updates.get("$addToSet", {})} |
                {"$pull": updates.get("$pull", {})},
                upsert=True
            )
            
            # Recompute user preference embedding if we have BERT
            if self.bert_engine:
                await self._recompute_user_embedding(user_id)
                
        except Exception as e:
            logger.error(f"Error updating user preferences: {e}")
    
    async def _recompute_user_embedding(self, user_id: str):
        """Recompute user preference embedding based on liked/watched videos"""
        try:
            user_prefs = await self.users_collection.find_one({"user_id": user_id})
            if not user_prefs:
                return
            
            # Get embeddings of liked and watched videos
            liked_videos = user_prefs.get("liked_videos", [])
            watched_videos = user_prefs.get("watched_videos", [])
            
            # Prioritize liked videos, then watched videos
            video_ids = liked_videos + watched_videos[-50:]  # Last 50 watched + all liked
            
            if not video_ids:
                return
            
            # Get video embeddings
            video_embeddings = []
            async for video in self.videos_collection.find(
                {"video_id": {"$in": video_ids}, "bert_embedding": {"$exists": True}}
            ):
                if video.get("bert_embedding"):
                    video_embeddings.append(video["bert_embedding"])
            
            if video_embeddings:
                # Compute average embedding
                avg_embedding = np.mean(video_embeddings, axis=0).tolist()
                
                # Update user preferences
                await self.users_collection.update_one(
                    {"user_id": user_id},
                    {"$set": {"preference_embedding": avg_embedding, "updated_at": datetime.now()}}
                )
                
                logger.info(f"Updated preference embedding for user {user_id}")
                
        except Exception as e:
            logger.error(f"Error recomputing user embedding: {e}")
    
    def _clear_user_cache(self, user_id: str):
        """Clear recommendation cache for a specific user"""
        keys_to_remove = [key for key in self.recommendation_cache.keys() if key.startswith(user_id)]
        for key in keys_to_remove:
            del self.recommendation_cache[key]
    
    async def get_video_stats(self) -> Dict[str, Any]:
        """Get statistics about the video database"""
        try:
            total_videos = await self.videos_collection.count_documents({})
            videos_with_embeddings = await self.videos_collection.count_documents({"embedding_computed": True})
            
            # Get genre distribution
            genre_pipeline = [
                {"$group": {"_id": "$genre", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            genre_stats = []
            async for result in self.videos_collection.aggregate(genre_pipeline):
                genre_stats.append({"genre": result["_id"], "count": result["count"]})
            
            return {
                "total_videos": total_videos,
                "videos_with_embeddings": videos_with_embeddings,
                "embedding_coverage": videos_with_embeddings / total_videos if total_videos > 0 else 0,
                "genres": genre_stats,
                "cache_size": len(self.recommendation_cache)
            }
            
        except Exception as e:
            logger.error(f"Error getting video stats: {e}")
            return {"error": str(e)}
    
    async def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()

# Global instance
intelligent_video_service = IntelligentVideoService()

async def get_intelligent_video_service() -> IntelligentVideoService:
    """Get the global intelligent video service instance"""
    return intelligent_video_service 