#!/usr/bin/env python3
"""
Populate database with sample educational videos for immediate testing
This ensures the frontend shows content while YouTube API quota resets
"""

import os
import asyncio
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

def populate_sample_videos():
    """Populate database with high-quality educational video samples"""
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGO_URI")
    if not mongodb_uri:
        print("❌ MONGO_URI not found in environment variables")
        return False
    
    try:
        client = MongoClient(mongodb_uri)
        db = client.streamsmart
        videos_collection = db.genre_videos
        
        print("🎯 Populating database with sample educational videos...")
        
        # Sample videos for each genre
        sample_videos = [
            # Coding & Programming
            {
                "video_id": "rfscVS0vtbw",
                "title": "Learn Python - Full Course for Beginners",
                "description": "Complete Python tutorial for beginners",
                "channel_name": "freeCodeCamp.org",
                "duration": 14400,
                "view_count": 35000000,
                "upload_date": datetime.utcnow() - timedelta(days=30),
                "thumbnail_url": "https://i.ytimg.com/vi/rfscVS0vtbw/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
                "genre": "coding_programming",
                "confidence": 0.95,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            {
                "video_id": "PkZNo7MFNFg",
                "title": "Learn JavaScript - Full Course for Beginners",
                "description": "Complete JavaScript tutorial",
                "channel_name": "freeCodeCamp.org",
                "duration": 11700,
                "view_count": 28000000,
                "upload_date": datetime.utcnow() - timedelta(days=25),
                "thumbnail_url": "https://i.ytimg.com/vi/PkZNo7MFNFg/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=PkZNo7MFNFg",
                "genre": "coding_programming",
                "confidence": 0.94,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Data Science & AI/ML
            {
                "video_id": "ua-CiDNNj30",
                "title": "Machine Learning Course for Beginners",
                "description": "Complete machine learning tutorial",
                "channel_name": "freeCodeCamp.org",
                "duration": 10800,
                "view_count": 15000000,
                "upload_date": datetime.utcnow() - timedelta(days=20),
                "thumbnail_url": "https://i.ytimg.com/vi/ua-CiDNNj30/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=ua-CiDNNj30",
                "genre": "data_science_ai_ml",
                "confidence": 0.96,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            {
                "video_id": "aircAruvnKk",
                "title": "But what is a neural network?",
                "description": "Neural networks explained visually",
                "channel_name": "3Blue1Brown",
                "duration": 1140,
                "view_count": 12000000,
                "upload_date": datetime.utcnow() - timedelta(days=15),
                "thumbnail_url": "https://i.ytimg.com/vi/aircAruvnKk/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=aircAruvnKk",
                "genre": "data_science_ai_ml",
                "confidence": 0.94,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Mathematics
            {
                "video_id": "WUvTyaaNkzM",
                "title": "The essence of calculus",
                "description": "Beautiful calculus explanation",
                "channel_name": "3Blue1Brown",
                "duration": 1020,
                "view_count": 8500000,
                "upload_date": datetime.utcnow() - timedelta(days=12),
                "thumbnail_url": "https://i.ytimg.com/vi/WUvTyaaNkzM/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=WUvTyaaNkzM",
                "genre": "mathematics",
                "confidence": 0.97,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            {
                "video_id": "fNk_zzaMoSs",
                "title": "Linear algebra - Chapter 1",
                "description": "Visual introduction to linear algebra",
                "channel_name": "3Blue1Brown",
                "duration": 900,
                "view_count": 6200000,
                "upload_date": datetime.utcnow() - timedelta(days=10),
                "thumbnail_url": "https://i.ytimg.com/vi/fNk_zzaMoSs/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=fNk_zzaMoSs",
                "genre": "mathematics",
                "confidence": 0.96,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Physics
            {
                "video_id": "kS25vitrZ6g",
                "title": "How Gravity Actually Works",
                "description": "Einstein's general relativity explained",
                "channel_name": "Veritasium",
                "duration": 1380,
                "view_count": 9200000,
                "upload_date": datetime.utcnow() - timedelta(days=8),
                "thumbnail_url": "https://i.ytimg.com/vi/kS25vitrZ6g/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=kS25vitrZ6g",
                "genre": "physics",
                "confidence": 0.95,
                "collected_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Design
            {
                "video_id": "YiLUYf4HDh4",
                "title": "UI/UX Design Tutorial - Figma",
                "description": "Complete UI/UX design course",
                "channel_name": "DesignCourse",
                "duration": 7200,
                "view_count": 2800000,
                "upload_date": datetime.utcnow() - timedelta(days=5),
                "thumbnail_url": "https://i.ytimg.com/vi/YiLUYf4HDh4/maxresdefault.jpg",
                "url": "https://www.youtube.com/watch?v=YiLUYf4HDh4",
                "genre": "design",
                "confidence": 0.93,
                "collected_at": datetime.utcnow(),
                "is_active": True
            }
        ]
        
        # Clear existing sample data
        videos_collection.delete_many({"video_id": {"$in": [v["video_id"] for v in sample_videos]}})
        
        # Insert sample videos
        result = videos_collection.insert_many(sample_videos)
        
        print(f"✅ Successfully inserted {len(result.inserted_ids)} sample videos")
        
        # Print summary by genre
        genres = {}
        for video in sample_videos:
            genre = video['genre']
            if genre not in genres:
                genres[genre] = 0
            genres[genre] += 1
        
        print("\n📊 Videos by genre:")
        for genre, count in genres.items():
            print(f"  • {genre}: {count} videos")
        
        print(f"\n🌐 Frontend routes ready:")
        for genre in genres.keys():
            route = genre.replace('_', '-')
            print(f"  • http://localhost:3000/genre/{route}")
        
        print(f"\n🚀 Your frontend should now show videos!")
        return True
        
    except Exception as e:
        print(f"❌ Error populating database: {e}")
        return False

if __name__ == "__main__":
    success = populate_sample_videos()
    if success:
        print("\n🎉 Database populated successfully! Refresh your frontend to see videos.")
    else:
        print("\n⚠️ Failed to populate database. Check your MongoDB connection.") 