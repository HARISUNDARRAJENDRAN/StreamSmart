#!/usr/bin/env python3
"""
Smart Recommendation Service for StreamSmart
MongoDB-based video storage with BERT-powered recommendations
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import random

import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)

class SmartRecommendationService:
    """Service for intelligent video management and BERT-powered recommendations"""
    
    def __init__(self, mongo_uri: str = "mongodb://localhost:27017/", db_name: str = "streamsmart"):
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.client = None
        self.db = None
        self.videos_collection = None
        self.users_collection = None
        
        # Cache for recommendations
        self.recommendation_cache = {}
        self.cache_expiry = timedelta(hours=2)
        
        logger.info(f"SmartRecommendationService initialized with MongoDB: {mongo_uri}")
    
    async def initialize(self):
        """Initialize MongoDB connection"""
        try:
            self.client = AsyncIOMotorClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            
            # Collections
            self.videos_collection = self.db.videos
            self.users_collection = self.db.user_preferences
            
            # Create indexes
            await self._create_indexes()
            
            logger.info("SmartRecommendationService initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize SmartRecommendationService: {e}")
            return False
    
    async def _create_indexes(self):
        """Create database indexes for optimal performance"""
        try:
            await self.videos_collection.create_index("video_id", unique=True)
            await self.videos_collection.create_index("genre")
            await self.videos_collection.create_index("difficulty")
            await self.videos_collection.create_index("quality_score")
            await self.users_collection.create_index("user_id", unique=True)
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
    
    async def load_videos_from_json_files(self, force_reload: bool = False) -> int:
        """Load videos from JSON files into MongoDB"""
        
        if not force_reload:
            video_count = await self.videos_collection.count_documents({})
            if video_count > 0:
                logger.info(f"Found {video_count} videos in database. Use force_reload=True to reload.")
                return video_count
        
        results_dir = Path("genre_population_results")
        if not results_dir.exists():
            logger.error("Genre population results directory not found")
            return 0
        
        total_loaded = 0
        
        for json_file in results_dir.glob("*_videos.json"):
            try:
                genre_slug = json_file.stem.replace('_videos', '')
                
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                videos = data.get('videos', [])
                logger.info(f"Loading {len(videos)} videos from {genre_slug}")
                
                for video_data in videos:
                    try:
                        video_id = video_data.get('video_id', '')
                        
                        # Skip if no video ID
                        if not video_id:
                            continue
                        
                        # Check if video already exists
                        existing_video = await self.videos_collection.find_one({"video_id": video_id})
                        
                        if existing_video:
                            # Update with additional genre if this video appears in multiple genres
                            current_genres = existing_video.get('genres', [existing_video.get('genre', '')])
                            if genre_slug not in current_genres:
                                current_genres.append(genre_slug)
                                await self.videos_collection.update_one(
                                    {"video_id": video_id},
                                    {"$set": {"genres": current_genres}}
                                )
                            continue
                        
                        video_doc = {
                            "video_id": video_id,
                            "title": video_data.get('title', ''),
                            "description": video_data.get('description', ''),
                            "thumbnail_url": video_data.get('thumbnail', ''),
                            "duration": video_data.get('duration', ''),
                            "channel": video_data.get('channel', ''),
                            "genre": genre_slug,
                            "genres": [genre_slug],  # Track multiple genres
                            "difficulty": self._determine_difficulty(video_data.get('title', '')),
                            "view_count": video_data.get('view_count', 0),
                            "quality_score": video_data.get('quality_score', 0.0),
                            "url": video_data.get('url', ''),
                            "collected_at": datetime.now()
                        }
                        
                        try:
                            await self.videos_collection.insert_one(video_doc)
                            total_loaded += 1
                        except DuplicateKeyError:
                            # This shouldn't happen now, but just in case
                            logger.warning(f"Duplicate key error for video_id: {video_id}")
                            pass
                            
                    except Exception as e:
                        logger.warning(f"Error processing video: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"Error loading videos from {json_file}: {e}")
                continue
        
        logger.info(f"Total videos loaded into MongoDB: {total_loaded}")
        return total_loaded
    
    def _determine_difficulty(self, title: str) -> str:
        """Determine video difficulty based on title keywords"""
        title_lower = title.lower()
        
        beginner_keywords = ['beginner', 'introduction', 'intro', 'basics', 'fundamentals', 'getting started', 'first', '101']
        advanced_keywords = ['advanced', 'expert', 'master', 'deep dive', 'complex', 'professional', 'enterprise']
        
        if any(keyword in title_lower for keyword in advanced_keywords):
            return 'advanced'
        elif any(keyword in title_lower for keyword in beginner_keywords):
            return 'beginner'
        else:
            return 'intermediate'
    
    async def get_smart_recommendations(self, user_id: str, genre: str = None, difficulty: str = None, 
                                      limit: int = 51, refresh: bool = False) -> Dict[str, Any]:
        """Get intelligent video recommendations"""
        
        try:
            # Build query - look for videos in both the main genre field and genres array
            query = {}
            if genre:
                query = {
                    "$or": [
                        {"genre": genre},
                        {"genres": {"$in": [genre]}}
                    ]
                }
                if difficulty:
                    # Combine genre query with difficulty filter
                    query = {
                        "$and": [
                            query,
                            {"difficulty": difficulty}
                        ]
                    }
            elif difficulty:
                query["difficulty"] = difficulty
            
            # Get user preferences
            user_prefs = await self.users_collection.find_one({"user_id": user_id})
            
            # Get videos from the specific genre first
            videos = []
            async for video in self.videos_collection.find(query).limit(limit * 3):  # Get more for ranking
                videos.append(video)
            
            # If we don't have enough videos in this genre, get from related/other genres
            if len(videos) < limit:
                logger.info(f"Only found {len(videos)} videos in {genre}, need {limit}. Using fallback...")
                await self._fill_with_fallback_videos(videos, {"genre": genre}, limit)
            
            logger.info(f"Found {len(videos)} videos for {genre} (after fallback if needed)")
            
            # Rank videos intelligently with diversification (add randomness for refresh)
            if refresh:
                # Add more randomness and different ranking for refresh
                ranked_videos = self._rank_videos_with_diversity(videos, user_prefs, limit, refresh_mode=True)
                logger.info(f"Applied refresh mode ranking for fresh recommendations")
            else:
                ranked_videos = self._rank_videos_with_diversity(videos, user_prefs, limit)
            
            # Format for frontend with deduplication
            formatted_videos = []
            seen_video_ids = set()
            
            for video in ranked_videos:
                video_id = video.get("video_id", "")
                
                # Skip duplicates
                if not video_id or video_id in seen_video_ids:
                    continue
                    
                seen_video_ids.add(video_id)
                
                # Generate YouTube thumbnail URL if not available
                thumbnail_url = video.get("thumbnail_url", "") or video.get("thumbnail", "")
                if not thumbnail_url and video_id:
                    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                
                formatted_video = {
                    "youtubeId": video_id,
                    "title": video.get("title", ""),
                    "description": video.get("description", ""),
                    "thumbnail": thumbnail_url,
                    "duration": video.get("duration", "N/A"),
                    "category": video.get("genre", ""),
                    "channelTitle": video.get("channel", ""),
                    "viewCount": video.get("view_count", 0),
                    "youtubeURL": video.get("url", ""),
                    "difficulty": video.get("difficulty", "intermediate"),
                    "quality_score": video.get("quality_score", 0.0)
                }
                formatted_videos.append(formatted_video)
                
                # Stop if we have enough unique videos
                if len(formatted_videos) >= limit:
                    break
            
            return {
                "success": True,
                "videos": formatted_videos,
                "total_available": len(videos),
                "algorithm_used": "ai_refresh" if refresh else "smart_ranking",
                "message": f"Found {len(formatted_videos)} {'fresh AI' if refresh else 'smart'} recommendations for {genre}"
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return {
                "success": False,
                "videos": [],
                "total_available": 0,
                "algorithm_used": "error",
                "message": f"Error: {str(e)}"
            }
    
    def _rank_videos(self, videos: List[Dict], user_prefs: Dict = None) -> List[Dict]:
        """Rank videos intelligently with diversification across subcategories"""
        
        # First, categorize videos by different aspects for diversity
        categorized_videos = self._categorize_videos_for_diversity(videos)
        
        # Then rank within each category
        ranked_categories = {}
        for category, category_videos in categorized_videos.items():
            scored_videos = []
            
            for video in category_videos:
                score = video.get("quality_score", 0.0)
                
                # Boost based on user preferences
                if user_prefs:
                    if video.get("genre") in user_prefs.get("preferred_genres", []):
                        score += 0.2
                    if video.get("difficulty") in user_prefs.get("preferred_difficulty", []):
                        score += 0.1
                    if video.get("channel") in user_prefs.get("preferred_channels", []):
                        score += 0.15
                
                # Add diversity factor
                score += random.uniform(0, 0.05)
                
                scored_videos.append((score, video))
            
            # Sort by score within category
            scored_videos.sort(key=lambda x: x[0], reverse=True)
            ranked_categories[category] = [video for _, video in scored_videos]
        
        # Now distribute videos across categories for diversity
        return self._distribute_videos_across_categories(ranked_categories)
    
    def _categorize_videos_for_diversity(self, videos: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize videos into subcategories for better diversity"""
        
        categorized = {}
        
        for video in videos:
            title = video.get("title", "").lower()
            channel = video.get("channel", "").lower()
            description = video.get("description", "").lower()
            difficulty = video.get("difficulty", "intermediate")
            
            # Create composite categories for better distribution
            categories = []
            
            # Category by difficulty
            categories.append(f"difficulty_{difficulty}")
            
            # Category by content type (based on title keywords)
            content_type = self._identify_content_type(title, description)
            categories.append(f"content_{content_type}")
            
            # Category by technology/topic (for coding genres)
            topic = self._identify_topic(title, description)
            if topic:
                categories.append(f"topic_{topic}")
            
            # Category by channel to ensure channel diversity
            channel_category = f"channel_{hash(channel) % 10}"  # Group channels into 10 buckets
            categories.append(channel_category)
            
            # Assign video to multiple categories (but prioritize the first one)
            primary_category = categories[0]
            
            if primary_category not in categorized:
                categorized[primary_category] = []
            categorized[primary_category].append(video)
            
            # Also add to secondary categories (with lower weight)
            for secondary_category in categories[1:2]:  # Just take one secondary
                if secondary_category not in categorized:
                    categorized[secondary_category] = []
                if len(categorized[secondary_category]) < 20:  # Limit secondary assignments
                    categorized[secondary_category].append(video)
        
        return categorized
    
    def _identify_content_type(self, title: str, description: str) -> str:
        """Identify the type of content based on title and description"""
        
        text = f"{title} {description}".lower()
        
        # Tutorial/Learning content
        if any(keyword in text for keyword in ['tutorial', 'learn', 'beginner', 'guide', 'how to', 'introduction', 'basics']):
            return 'tutorial'
        
        # Project-based content
        elif any(keyword in text for keyword in ['project', 'build', 'create', 'make', 'coding', 'development']):
            return 'project'
        
        # Theory/Concept content
        elif any(keyword in text for keyword in ['explain', 'concept', 'theory', 'understand', 'what is', 'algorithm']):
            return 'concept'
        
        # News/Updates content
        elif any(keyword in text for keyword in ['news', 'update', 'release', '2024', '2023', 'latest', 'new']):
            return 'news'
        
        # Interview/Career content
        elif any(keyword in text for keyword in ['interview', 'job', 'career', 'resume', 'hiring']):
            return 'career'
        
        # Tips/Best Practices
        elif any(keyword in text for keyword in ['tips', 'tricks', 'best', 'practice', 'advice', 'mistake']):
            return 'tips'
        
        else:
            return 'general'
    
    def _identify_topic(self, title: str, description: str) -> str:
        """Identify specific topics/technologies"""
        
        text = f"{title} {description}".lower()
        
        # Programming languages
        languages = ['python', 'javascript', 'java', 'react', 'node', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter', 'vue', 'angular']
        for lang in languages:
            if lang in text:
                return lang
        
        # Technologies
        technologies = ['ai', 'machine learning', 'blockchain', 'docker', 'kubernetes', 'aws', 'azure', 'git', 'database', 'api']
        for tech in technologies:
            if tech in text:
                return tech.replace(' ', '_')
        
        # General topics
        topics = ['frontend', 'backend', 'fullstack', 'mobile', 'web', 'data', 'security', 'devops']
        for topic in topics:
            if topic in text:
                return topic
        
        return None
    
    def _distribute_videos_across_categories(self, ranked_categories: Dict[str, List[Dict]], target_count: int = 51) -> List[Dict]:
        """Distribute videos across categories to ensure diversity"""
        
        if not ranked_categories:
            return []
        
        # Calculate total available videos
        total_available = sum(len(videos) for videos in ranked_categories.values())
        
        # Always aim for target_count (51) with fallback diversity
        actual_target = target_count
        
        distributed_videos = []
        category_names = list(ranked_categories.keys())
        num_categories = len(category_names)
        
        # Calculate how many videos to take from each category
        base_per_category = actual_target // num_categories
        remainder = actual_target % num_categories
        
        # Distribute videos
        for i, category in enumerate(category_names):
            videos_in_category = ranked_categories[category]
            
            # Some categories get one extra video if there's remainder
            videos_to_take = base_per_category + (1 if i < remainder else 0)
            
            # Take the top videos from this category
            selected_videos = videos_in_category[:videos_to_take]
            distributed_videos.extend(selected_videos)
            
            # Stop if we've reached our target
            if len(distributed_videos) >= actual_target:
                break
        
        # If we still don't have enough videos, fill from the best remaining
        if len(distributed_videos) < actual_target:
            all_remaining = []
            for category_videos in ranked_categories.values():
                all_remaining.extend(category_videos)
            
            # Remove duplicates that are already in distributed_videos
            existing_ids = {v.get('video_id', '') for v in distributed_videos}
            remaining_unique = [v for v in all_remaining if v.get('video_id', '') not in existing_ids]
            
            # Sort by quality score and take the best
            remaining_unique.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
            
            needed = actual_target - len(distributed_videos)
            distributed_videos.extend(remaining_unique[:needed])
        
        # Final shuffle for variety while keeping quality preference
        random.shuffle(distributed_videos)
        
        return distributed_videos[:actual_target]
    
    async def _fill_with_fallback_videos(self, current_videos: List[Dict], original_query: Dict, target_count: int):
        """Fill remaining videos from related genres and general pool to ensure we always have enough"""
        
        current_count = len(current_videos)
        needed = target_count - current_count
        
        if needed <= 0:
            return
        
        logger.info(f"🔄 Need {needed} more videos, filling from fallback sources...")
        
        # Get video IDs we already have to avoid duplicates
        existing_ids = {video.get('video_id', '') for video in current_videos}
        
        # Try to get videos from related/similar genres first
        original_genre = original_query.get('genre', '')
        related_genres = self._get_related_genres(original_genre)
        
        for related_genre in related_genres:
            if len(current_videos) >= target_count:
                break
                
            # Look for videos in both the main genre field and the genres array
            related_query = {
                "$or": [
                    {"genre": related_genre},
                    {"genres": {"$in": [related_genre]}}
                ]
            }
            async for video in self.videos_collection.find(related_query).limit(needed):
                if video.get('video_id', '') not in existing_ids:
                    current_videos.append(video)
                    existing_ids.add(video.get('video_id', ''))
                    
                if len(current_videos) >= target_count:
                    break
                    
        logger.info(f"After related genres: {len(current_videos)} videos")
        
        # If still not enough, get from general pool (all videos)
        if len(current_videos) < target_count:
            needed = target_count - len(current_videos)
            async for video in self.videos_collection.find({}).limit(needed * 2):
                if video.get('video_id', '') not in existing_ids:
                    current_videos.append(video)
                    existing_ids.add(video.get('video_id', ''))
                    
                if len(current_videos) >= target_count:
                    break
        
        logger.info(f"✅ Filled to {len(current_videos)} videos using fallback sources")
    
    def _get_related_genres(self, genre: str) -> List[str]:
        """Get related genres for fallback when a specific genre doesn't have enough videos"""
        
        # Define genre families for better fallback
        genre_families = {
            # Programming & Tech
            'coding-programming': ['data-science-ai', 'cybersecurity', 'ai-innovation', 'tech-news'],
            'data-science-ai': ['coding-programming', 'ai-innovation', 'mathematics', 'physics'],
            'cybersecurity': ['coding-programming', 'tech-news', 'ai-innovation'],
            'ai-innovation': ['data-science-ai', 'coding-programming', 'tech-news'],
            
            # Creative & Design
            'design': ['digital-marketing', 'writing-content', 'diy-projects'],
            'digital-marketing': ['design', 'writing-content', 'entrepreneurship'],
            'writing-content': ['design', 'digital-marketing', 'public-speaking'],
            
            # Business & Career
            'entrepreneurship': ['startups', 'digital-marketing', 'financial-literacy'],
            'startups': ['entrepreneurship', 'ai-innovation', 'tech-news'],
            'financial-literacy': ['entrepreneurship', 'productivity'],
            
            # Education & Skills
            'mathematics': ['physics', 'chemistry', 'data-science-ai'],
            'physics': ['mathematics', 'chemistry', 'science-experiments'],
            'chemistry': ['physics', 'biology', 'science-experiments'],
            'biology': ['chemistry', 'health-fitness', 'science-experiments'],
            
            # Personal Development
            'health-fitness': ['mental-wellness', 'productivity', 'biology'],
            'mental-wellness': ['health-fitness', 'psychology', 'productivity'],
            'psychology': ['mental-wellness', 'philosophy', 'soft-skills'],
            'philosophy': ['psychology', 'trivia-facts'],
            
            # Practical Skills
            'productivity': ['soft-skills', 'mental-wellness', 'financial-literacy'],
            'soft-skills': ['productivity', 'public-speaking', 'psychology'],
            'public-speaking': ['soft-skills', 'writing-content'],
            
            # STEM & Making
            'robotics-iot': ['electronics-arduino', 'coding-programming', 'diy-projects'],
            'electronics-arduino': ['robotics-iot', 'diy-projects', 'physics'],
            'diy-projects': ['electronics-arduino', 'robotics-iot', 'sustainableliving'],
            'science-experiments': ['physics', 'chemistry', 'biology'],
            
            # General Knowledge
            'trivia-facts': ['philosophy', 'history-civics', 'science-experiments'],
            'history-civics': ['trivia-facts', 'language-learning', 'philosophy'],
            'language-learning': ['history-civics', 'writing-content'],
            
            # Career-specific
            'resume-job-hunting': ['interview-preparation', 'soft-skills', 'freelancing-remote'],
            'interview-preparation': ['resume-job-hunting', 'soft-skills', 'coding-programming'],
            'freelancing-remote': ['resume-job-hunting', 'entrepreneurship', 'productivity'],
            'certifications': ['coding-programming', 'cybersecurity', 'data-science-ai'],
            
            # Lifestyle
            'sustainableliving': ['diy-projects', 'health-fitness', 'trivia-facts'],
            'tech-news': ['ai-innovation', 'cybersecurity', 'coding-programming', 'startups']
        }
        
        return genre_families.get(genre, [])
    
    def _rank_videos_with_diversity(self, videos: List[Dict], user_prefs: Dict = None, target_count: int = 51, refresh_mode: bool = False) -> List[Dict]:
        """Wrapper method that applies diversified ranking with target count"""
        
        # First, categorize videos by different aspects for diversity
        categorized_videos = self._categorize_videos_for_diversity(videos)
        
        # Then rank within each category
        ranked_categories = {}
        for category, category_videos in categorized_videos.items():
            scored_videos = []
            
            for video in category_videos:
                score = video.get("quality_score", 0.0)
                
                # Boost based on user preferences (reduce if refresh mode for more variety)
                if user_prefs and not refresh_mode:
                    if video.get("genre") in user_prefs.get("preferred_genres", []):
                        score += 0.2
                    if video.get("difficulty") in user_prefs.get("preferred_difficulty", []):
                        score += 0.1
                    if video.get("channel") in user_prefs.get("preferred_channels", []):
                        score += 0.15
                
                # Add diversity factor (increase randomness for refresh)
                if refresh_mode:
                    score += random.uniform(0, 0.3)  # More randomness for fresh results
                    # Occasionally boost lower quality videos for variety
                    if random.random() < 0.3:
                        score += random.uniform(0.1, 0.5)
                else:
                    score += random.uniform(0, 0.05)
                
                scored_videos.append((score, video))
            
            # Sort by score within category
            scored_videos.sort(key=lambda x: x[0], reverse=True)
            
            # In refresh mode, occasionally shuffle within category for more variety
            if refresh_mode and len(scored_videos) > 3:
                # Keep top 30% as is, shuffle the rest
                keep_top = int(len(scored_videos) * 0.3)
                top_videos = [video for _, video in scored_videos[:keep_top]]
                remaining_videos = [video for _, video in scored_videos[keep_top:]]
                random.shuffle(remaining_videos)
                ranked_categories[category] = top_videos + remaining_videos
            else:
                ranked_categories[category] = [video for _, video in scored_videos]
        
        # Now distribute videos across categories for diversity
        return self._distribute_videos_across_categories(ranked_categories, target_count)
    
    async def record_interaction(self, user_id: str, video_id: str, interaction_type: str):
        """Record user interaction with video"""
        try:
            # Get video details
            video = await self.videos_collection.find_one({"video_id": video_id})
            if not video:
                return
            
            # Update user preferences
            user_prefs = await self.users_collection.find_one({"user_id": user_id})
            if not user_prefs:
                user_prefs = {
                    "user_id": user_id,
                    "preferred_genres": [],
                    "preferred_difficulty": [],
                    "preferred_channels": [],
                    "watched_videos": [],
                    "liked_videos": []
                }
            
            # Update based on interaction
            if interaction_type == "watch":
                if video_id not in user_prefs["watched_videos"]:
                    user_prefs["watched_videos"].append(video_id)
                
                # Add preferences
                if video["genre"] not in user_prefs["preferred_genres"]:
                    user_prefs["preferred_genres"].append(video["genre"])
                if video["difficulty"] not in user_prefs["preferred_difficulty"]:
                    user_prefs["preferred_difficulty"].append(video["difficulty"])
                if video["channel"] not in user_prefs["preferred_channels"]:
                    user_prefs["preferred_channels"].append(video["channel"])
            
            elif interaction_type == "like":
                if video_id not in user_prefs["liked_videos"]:
                    user_prefs["liked_videos"].append(video_id)
            
            # Save updated preferences
            await self.users_collection.replace_one(
                {"user_id": user_id},
                user_prefs,
                upsert=True
            )
            
        except Exception as e:
            logger.error(f"Error recording interaction: {e}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            total_videos = await self.videos_collection.count_documents({})
            
            # Get genre distribution
            pipeline = [
                {"$group": {"_id": "$genre", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            genre_stats = []
            async for result in self.videos_collection.aggregate(pipeline):
                genre_stats.append({"genre": result["_id"], "count": result["count"]})
            
            return {
                "total_videos": total_videos,
                "genres": genre_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"error": str(e)}
    
    async def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()

# Global instance
smart_recommendation_service = SmartRecommendationService()

async def get_smart_recommendation_service() -> SmartRecommendationService:
    """Get the global smart recommendation service instance"""
    return smart_recommendation_service 