#!/usr/bin/env python3
"""
Initialize MongoDB System for StreamSmart
Loads all collected videos from JSON files into MongoDB
"""

import asyncio
import logging
import os
import sys
import time
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add services directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))

async def main():
    """Main function to initialize MongoDB system"""
    
    print("🚀 StreamSmart MongoDB Initialization")
    print("=" * 50)
    
    try:
        # Import the smart recommendation service
        from smart_recommendation_service import get_smart_recommendation_service
        
        # Get the service instance
        service = await get_smart_recommendation_service()
        
        # Initialize the service (connects to MongoDB)
        print("🔗 Connecting to MongoDB...")
        success = await service.initialize()
        
        if not success:
            print("❌ Failed to initialize MongoDB connection")
            return False
        
        print("✅ MongoDB connection established")
        
        # Load videos from JSON files
        print("\n📂 Loading videos from JSON files...")
        start_time = time.time()
        
        total_loaded = await service.load_videos_from_json_files(force_reload=False)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ Loaded {total_loaded} videos in {duration:.2f} seconds")
        
        # Get statistics
        print("\n📊 Database Statistics:")
        stats = await service.get_stats()
        
        if "error" not in stats:
            print(f"   Total Videos: {stats['total_videos']}")
            print(f"   Genres Available: {len(stats['genres'])}")
            
            print("\n📈 Genre Distribution:")
            for genre_data in stats['genres'][:10]:  # Show top 10
                genre_name = genre_data['genre'].replace('-', ' ').title()
                print(f"   {genre_name}: {genre_data['count']} videos")
            
            if len(stats['genres']) > 10:
                print(f"   ... and {len(stats['genres']) - 10} more genres")
        else:
            print(f"   Error getting stats: {stats['error']}")
        
        # Test recommendations
        print("\n🤖 Testing Smart Recommendations...")
        
        test_recommendations = await service.get_smart_recommendations(
            user_id="test_user",
            genre="coding-programming",
            limit=5
        )
        
        if test_recommendations.get("success"):
            print(f"✅ Successfully generated {len(test_recommendations['videos'])} recommendations")
            print(f"   Algorithm Used: {test_recommendations.get('algorithm_used', 'unknown')}")
            
            # Show sample recommendations
            print("\n🎯 Sample Recommendations:")
            for i, video in enumerate(test_recommendations['videos'][:3], 1):
                print(f"   {i}. {video.get('title', 'Untitled')[:60]}...")
        else:
            print("❌ Failed to generate test recommendations")
        
        print("\n🎉 MongoDB System Initialization Complete!")
        print("=" * 50)
        
        # Instructions for next steps
        print("\n📋 Next Steps:")
        print("1. Start the FastAPI server: python -m uvicorn main:app --reload --port 8000")
        print("2. Your genre pages will now use the MongoDB-based smart recommendations")
        print("3. Use the AI Refresh button on genre pages for fresh recommendations")
        print("4. The system returns 51 videos at a time instead of all 18K videos")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("Make sure you have installed all dependencies:")
        print("pip install motor pymongo")
        return False
        
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        print(f"❌ Initialization failed: {str(e)}")
        return False
    
    finally:
        # Close the service
        try:
            await service.close()
        except:
            pass

async def force_reload():
    """Force reload all videos (even if they exist in MongoDB)"""
    
    print("🔄 Force Reloading All Videos into MongoDB")
    print("=" * 50)
    
    try:
        from smart_recommendation_service import get_smart_recommendation_service
        
        service = await get_smart_recommendation_service()
        await service.initialize()
        
        print("🗑️  Clearing existing videos...")
        
        # Clear existing videos
        if service.videos_collection is not None:
            result = await service.videos_collection.delete_many({})
            print(f"   Deleted {result.deleted_count} existing videos")
        
        # Load all videos fresh
        print("\n📂 Loading all videos fresh...")
        start_time = time.time()
        
        total_loaded = await service.load_videos_from_json_files(force_reload=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ Force loaded {total_loaded} videos in {duration:.2f} seconds")
        
        await service.close()
        return True
        
    except Exception as e:
        logger.error(f"Error during force reload: {e}")
        print(f"❌ Force reload failed: {str(e)}")
        return False

def print_help():
    """Print help information"""
    print("StreamSmart MongoDB Initialization Script")
    print("=" * 50)
    print("\nUsage:")
    print("  python initialize_mongodb_system.py [option]")
    print("\nOptions:")
    print("  (no args)    - Initialize MongoDB system (skip if videos already loaded)")
    print("  --force      - Force reload all videos (clear existing and reload)")
    print("  --help       - Show this help message")
    print("\nExamples:")
    print("  python initialize_mongodb_system.py")
    print("  python initialize_mongodb_system.py --force")

if __name__ == "__main__":
    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--help":
            print_help()
            sys.exit(0)
        elif sys.argv[1] == "--force":
            print("🔄 Force reload requested")
            success = asyncio.run(force_reload())
        else:
            print(f"❌ Unknown option: {sys.argv[1]}")
            print_help()
            sys.exit(1)
    else:
        # Normal initialization
        success = asyncio.run(main())
    
    # Exit with appropriate code
    sys.exit(0 if success else 1) 