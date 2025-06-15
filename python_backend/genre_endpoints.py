#!/usr/bin/env python3
"""
Simplified Genre-based video endpoints for StreamSmart frontend
Basic genre routes without AI-powered recommendations
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import json
import os
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/genre", tags=["Genre Videos"])

# Basic genre mappings without AI dependencies
GENRE_ROUTES = {
    # 🎯 Skill-Based Genres
    "coding-programming": "Coding & Programming",
    "data-science-ai": "Data Science & AI/ML",
    "design": "Design (UI/UX, Graphic, Product)",
    "digital-marketing": "Digital Marketing",
    "productivity": "Productivity & Time Management",
    "financial-literacy": "Financial Literacy & Investing",
    "soft-skills": "Soft Skills",
    "entrepreneurship": "Entrepreneurship & Startups",
    "writing-content": "Writing & Content Creation",
    "public-speaking": "Public Speaking",
    
    # 📚 Academic Genres
    "mathematics": "Mathematics",
    "physics": "Physics",
    "biology": "Biology",
    "chemistry": "Chemistry",
    "history-civics": "History & Civics",
    "economics": "Economics",
    "geography": "Geography",
    "language-learning": "Language Learning",
    
    # 💼 Career & Professional Development
    "resume-job-hunting": "Resume Building & Job Hunting",
    "interview-preparation": "Interview Preparation",
    "freelancing-remote": "Freelancing & Remote Work",
    "certifications": "Certifications",
    
    # 🧠 Tech News & Trends
    "tech-news": "Tech News & Product Launches",
    "ai-innovation": "AI & Innovation",
    "startups": "Startups & Unicorns",
    "cybersecurity": "Cybersecurity & Privacy",
    "space-future-tech": "Space & Future Tech",
    
    # 🧩 Mind-expanding & Curiosity Genres
    "trivia-facts": "Did You Know / Trivia",
    "science-experiments": "Science Experiments",
    "psychology": "Psychology & Human Behavior",
    "philosophy": "Philosophy & Critical Thinking",
    
    # 🛠️ DIY & Hands-on Learning
    "robotics-iot": "Robotics & IoT",
    "electronics-arduino": "Electronics & Arduino",
    "diy-projects": "DIY Projects & Hacks",
    
    # 🌱 Lifestyle Learning
    "health-fitness": "Health & Fitness",
    "mental-wellness": "Mental Health & Wellness",
    "sustainable-living": "Sustainable Living",
    
    # 🚀 Personalized Genres
    "trending-now": "Trending Now",
    "recommended-for-you": "Recommended For You",
    "based-on-interests": "Based on Your Interests"
}

@router.get("/")
async def list_genres():
    """List all available genre routes"""
    try:
        genres = []
        for slug, name in GENRE_ROUTES.items():
            genres.append({
                "slug": slug,
                "name": name,
                "route": f"/genre/{slug}",
                "status": "available"
            })
        
        return {
            "success": True, 
            "genres": genres,
            "message": "AI-powered content collection will be implemented in the new recommendation system"
        }
        
    except Exception as e:
        logger.error(f"Error listing genres: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{genre_slug}")
async def get_genre_videos(genre_slug: str):
    """Get videos for a specific genre from collected data"""
    try:
        if genre_slug not in GENRE_ROUTES:
            raise HTTPException(status_code=404, detail="Genre not found")
        
        genre_name = GENRE_ROUTES[genre_slug]
        
        # Load videos from the collected JSON files
        genre_file_path = f"genre_population_results/{genre_slug}_videos.json"
        
        if not os.path.exists(genre_file_path):
            logger.warning(f"No video file found for genre: {genre_slug}")
            return {
                "success": True,
                "genre": genre_slug,
                "genre_name": genre_name,
                "videos": [],
                "total": 0,
                "message": f"No videos collected yet for {genre_name}. Run the video collection script first."
            }
        
        # Read and parse the JSON file
        try:
            with open(genre_file_path, 'r', encoding='utf-8') as f:
                genre_data = json.load(f)
                
            videos = genre_data.get('videos', [])
            
            # Transform video data for frontend consumption
            transformed_videos = []
            for video in videos:
                # Determine difficulty based on keywords in title
                difficulty = determine_video_difficulty(video.get('title', ''))
                
                # Parse duration if available
                duration_str = video.get('duration', '')
                if duration_str and ':' in duration_str:
                    # Keep original duration format (e.g., "12:34")
                    formatted_duration = duration_str
                else:
                    formatted_duration = "N/A"
                
                # Extract video ID from URL if available
                video_id = video.get('video_id', '')
                if not video_id and video.get('url'):
                    # Extract from URL
                    import re
                    match = re.search(r'(?:youtube\.com/watch\?v=|youtu\.be/)([^&\n?#]+)', video.get('url', ''))
                    if match:
                        video_id = match.group(1)
                
                transformed_video = {
                    "youtubeId": video_id,
                    "title": video.get('title', ''),
                    "description": video.get('description', ''),
                    "thumbnail": video.get('thumbnail', ''),
                    "thumbnail_url": video.get('thumbnail', ''),  # Alternate field name
                    "duration": formatted_duration,
                    "category": genre_name,
                    "channelTitle": video.get('channel', ''),
                    "channel_name": video.get('channel', ''),  # Alternate field name
                    "publishedAt": video.get('published', video.get('collected_at', '')),
                    "viewCount": video.get('view_count', 0),
                    "likeCount": 0,  # Not available in collected data
                    "youtubeURL": video.get('url', f"https://youtube.com/watch?v={video_id}"),
                    "tags": [],  # Not available in collected data
                    "difficulty": difficulty,
                    "quality_score": video.get('quality_score', 0),
                    "search_query": video.get('search_query', ''),
                    "collected_at": video.get('collected_at', '')
                }
                transformed_videos.append(transformed_video)
            
            logger.info(f"Loaded {len(transformed_videos)} videos for genre: {genre_slug}")
            
            return {
                "success": True,
                "genre": genre_slug,
                "genre_name": genre_name,
                "videos": transformed_videos,
                "total": len(transformed_videos),
                "last_updated": genre_data.get('last_updated', genre_data.get('timestamp', '')),
                "message": f"Found {len(transformed_videos)} videos for {genre_name}"
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON file for {genre_slug}: {e}")
            raise HTTPException(status_code=500, detail="Error reading video data")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting videos for {genre_slug}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch videos")

def determine_video_difficulty(title: str) -> str:
    """Determine video difficulty based on title keywords"""
    title_lower = title.lower()
    
    # Beginner keywords
    beginner_keywords = ['beginner', 'introduction', 'intro', 'basics', 'fundamentals', 'getting started', 'first', '101', 'start', 'learn']
    
    # Advanced keywords  
    advanced_keywords = ['advanced', 'expert', 'master', 'deep dive', 'complex', 'professional', 'enterprise', 'optimization']
    
    # Check for advanced first (more specific)
    if any(keyword in title_lower for keyword in advanced_keywords):
        return 'advanced'
    
    # Then check for beginner
    if any(keyword in title_lower for keyword in beginner_keywords):
        return 'beginner'
    
    # Default to intermediate
    return 'intermediate'

@router.get("/{genre_slug}/featured")
async def get_featured_genre_videos(genre_slug: str):
    """Get featured videos for a genre (placeholder implementation)"""
    try:
        if genre_slug not in GENRE_ROUTES:
            raise HTTPException(status_code=404, detail="Genre not found")
        
        genre_name = GENRE_ROUTES[genre_slug]
        
        return {
            "success": True,
            "genre": genre_slug,
            "genre_name": genre_name,
            "featured_videos": [],
            "message": f"Featured content for {genre_name} will be available with the new recommendation system"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get featured videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch featured videos")

@router.get("/{genre_slug}/stats")
async def get_genre_stats(genre_slug: str):
    """Get statistics for a genre (placeholder implementation)"""
    try:
        if genre_slug not in GENRE_ROUTES:
            raise HTTPException(status_code=404, detail="Genre not found")
        
        genre_name = GENRE_ROUTES[genre_slug]
        
        return {
            "success": True,
            "genre": genre_slug,
            "genre_name": genre_name,
            "stats": {
                "total_videos": 0,
                "message": f"Statistics for {genre_name} will be available with the new recommendation system"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting genre stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stats")

@router.post("/refresh/{genre_slug}")
async def refresh_genre_content(genre_slug: str):
    """Refresh content for a genre (placeholder implementation)"""
    try:
        if genre_slug not in GENRE_ROUTES:
            raise HTTPException(status_code=404, detail="Genre not found")
        
        genre_name = GENRE_ROUTES[genre_slug]
        
        return {
            "success": True,
            "message": f"Content refresh for {genre_name} will be implemented with the new recommendation system",
            "genre": genre_slug,
            "genre_name": genre_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing genre content: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh content")

def format_duration(seconds: int) -> str:
    """Format duration in seconds to readable format"""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{minutes}m {remaining_seconds}s" if remaining_seconds > 0 else f"{minutes}m"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"

def get_genre_description(genre: str) -> str:
    """Get description for a genre"""
    descriptions = {
        "Coding & Programming": "Learn programming languages, web development, and software engineering",
        "Data Science & AI/ML": "Master data science, machine learning, and artificial intelligence",
        "Mathematics": "Explore mathematical concepts from basic to advanced levels",
        "Physics": "Understand the fundamental laws and principles of physics",
        "Design (UI/UX, Graphic, Product)": "Develop UI/UX, graphic design, and creative skills",
        "Digital Marketing": "Learn digital marketing strategies and online promotion",
        "Productivity & Time Management": "Get professional development and career guidance",
        "Tech News & Product Launches": "Stay updated with latest technology trends and news",
        # Add more descriptions as needed
    }
    
    return descriptions.get(genre, f"Educational content for {genre}")

# Initialize content collection
async def start_content_collection():
    """Start the periodic content collection"""
    try:
        # Placeholder for content collection
        logger.info("Started content collection system")
    except Exception as e:
        logger.error(f"Failed to start content collection: {e}")

# Export router
__all__ = ["router", "start_content_collection"] 