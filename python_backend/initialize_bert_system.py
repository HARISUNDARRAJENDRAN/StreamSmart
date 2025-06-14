#!/usr/bin/env python3
"""
Initialization script for BERT-based recommendation system
Downloads dataset, initializes system, and runs tests
"""

import os
import sys
import logging
import time
import pandas as pd
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.bert_recommendation_engine import BertRecommendationEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bert_system_init.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are installed"""
    logger.info("🔍 Checking dependencies...")
    
    required_packages = [
        'pandas',
        'numpy', 
        'sklearn',
        'transformers',
        'tensorflow',
        'torch',
        'pymongo'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"✅ {package} - OK")
        except ImportError:
            missing_packages.append(package)
            logger.error(f"❌ {package} - MISSING")
    
    # Check Kaggle separately to avoid authentication issues
    try:
        import kaggle
        logger.info("✅ kaggle - OK")
    except ImportError:
        missing_packages.append('kaggle')
        logger.error("❌ kaggle - MISSING")
    except Exception as e:
        logger.info("✅ kaggle - OK (authentication will be handled later)")
    
    if missing_packages:
        logger.error(f"Missing packages: {', '.join(missing_packages)}")
        logger.info("Run: pip install -r requirements.txt")
        return False
    
    logger.info("✅ All dependencies satisfied")
    return True

def setup_kaggle_credentials():
    """Set up Kaggle API credentials"""
    logger.info("🔑 Setting up Kaggle credentials...")
    
    # Load environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv()
    
    kaggle_json_path = os.path.expanduser("~/.kaggle/kaggle.json")
    
    if os.path.exists(kaggle_json_path):
        logger.info("✅ Kaggle credentials found in ~/.kaggle/kaggle.json")
        return True
    
    # Create kaggle directory if it doesn't exist
    kaggle_dir = os.path.dirname(kaggle_json_path)
    os.makedirs(kaggle_dir, exist_ok=True)
    
    # Check for environment variables
    username = os.getenv('KAGGLE_USERNAME')
    key = os.getenv('KAGGLE_KEY')
    
    logger.info(f"Environment check - Username: {'✅' if username else '❌'}, Key: {'✅' if key else '❌'}")
    
    if username and key:
        kaggle_config = {
            "username": username,
            "key": key
        }
        
        import json
        with open(kaggle_json_path, 'w') as f:
            json.dump(kaggle_config, f)
        
        # Set permissions (Windows compatible)
        try:
            os.chmod(kaggle_json_path, 0o600)
        except:
            pass  # Windows doesn't support chmod the same way
        
        logger.info("✅ Kaggle credentials created from environment variables")
        logger.info(f"Created: {kaggle_json_path}")
        return True
    
    logger.warning("⚠️ Kaggle credentials not found")
    logger.info("Please either:")
    logger.info("1. Set KAGGLE_USERNAME and KAGGLE_KEY in your .env file")
    logger.info("2. Set KAGGLE_USERNAME and KAGGLE_KEY environment variables")
    logger.info("3. Place kaggle.json in ~/.kaggle/")
    logger.info("4. The system will create a sample dataset instead")
    
    return False

def download_and_prepare_dataset():
    """Download and prepare the educational YouTube dataset"""
    logger.info("📥 Downloading and preparing dataset...")
    
    try:
        engine = BertRecommendationEngine()
        
        # Try to download the dataset
        if setup_kaggle_credentials():
            try:
                engine.download_dataset()
                logger.info("✅ Dataset downloaded from Kaggle")
            except Exception as e:
                logger.warning(f"⚠️ Kaggle download failed: {e}")
                logger.info("Creating sample dataset instead...")
                engine._create_sample_dataset()
        else:
            logger.info("Creating sample dataset...")
            engine._create_sample_dataset()
        
        # Load and preprocess the dataset
        success = engine.load_and_preprocess_dataset()
        
        if success:
            logger.info(f"✅ Dataset prepared: {len(engine.df_yt)} videos")
            return engine
        else:
            logger.error("❌ Failed to prepare dataset")
            return None
            
    except Exception as e:
        logger.error(f"❌ Dataset preparation failed: {e}")
        return None

def initialize_bert_model(engine):
    """Initialize BERT model and compute embeddings"""
    logger.info("🧠 Initializing BERT model and computing embeddings...")
    
    try:
        start_time = time.time()
        
        # Compute all embeddings
        success = engine.compute_all_embeddings()
        
        if success:
            computation_time = time.time() - start_time
            logger.info(f"✅ BERT embeddings computed in {computation_time:.2f} seconds")
            return True
        else:
            logger.error("❌ Failed to compute embeddings")
            return False
            
    except Exception as e:
        logger.error(f"❌ BERT initialization failed: {e}")
        return False

def run_system_tests(engine):
    """Run comprehensive system tests"""
    logger.info("🧪 Running system tests...")
    
    test_results = {
        'content_based': False,
        'genre_based': False,
        'popular': False,
        'embeddings': False
    }
    
    try:
        # Test content-based recommendations
        logger.info("Testing content-based recommendations...")
        recommendations = engine.recommend_videos("Python programming tutorial", top_n=3)
        if not recommendations.empty:
            test_results['content_based'] = True
            logger.info(f"✅ Content-based: {len(recommendations)} recommendations")
        
        # Test genre-based recommendations
        logger.info("Testing genre-based recommendations...")
        if 'genre' in engine.df_yt.columns:
            genres = engine.df_yt['genre'].unique()
            if len(genres) > 0:
                genre_recs = engine.get_genre_recommendations(genres[0], top_n=3)
                if not genre_recs.empty:
                    test_results['genre_based'] = True
                    logger.info(f"✅ Genre-based: {len(genre_recs)} recommendations")
        
        # Test popular recommendations
        logger.info("Testing popular recommendations...")
        popular_recs = engine.get_popular_recommendations(top_n=5)
        if not popular_recs.empty:
            test_results['popular'] = True
            logger.info(f"✅ Popular: {len(popular_recs)} recommendations")
        
        # Test embeddings
        logger.info("Testing BERT embeddings...")
        test_text = "machine learning tutorial"
        embeddings = engine.get_bert_embeddings(test_text)
        if embeddings.shape[1] == 768:  # BERT base dimension
            test_results['embeddings'] = True
            logger.info(f"✅ Embeddings: {embeddings.shape}")
        
        # Overall test result
        passed_tests = sum(test_results.values())
        total_tests = len(test_results)
        
        logger.info(f"📊 Test Results: {passed_tests}/{total_tests} passed")
        
        if passed_tests == total_tests:
            logger.info("🎉 All tests passed!")
            return True
        else:
            logger.warning("⚠️ Some tests failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ System tests failed: {e}")
        return False

def create_system_summary(engine):
    """Create a summary of the initialized system"""
    logger.info("📋 Creating system summary...")
    
    try:
        stats = engine.get_system_stats()
        
        summary = f"""
BERT RECOMMENDATION SYSTEM - INITIALIZATION COMPLETE
====================================================

System Status: {stats.get('system_status', 'Unknown')}
Initialization Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

📊 Dataset Statistics:
• Total Videos: {stats.get('total_videos', 0)}
• Unique Genres: {stats.get('unique_genres', 0)}
• Cached Embeddings: {stats.get('cached_embeddings', 0)}

🎯 Available Genres:
"""
        
        if 'genres' in stats:
            for genre, count in list(stats['genres'].items())[:10]:
                summary += f"• {genre}: {count} videos\n"
        
        summary += f"""
🧠 AI Model Information:
• Model: BERT (bert-base-uncased)
• Embedding Dimension: 768
• Tokenizer: BERT Tokenizer
• Similarity Metric: Cosine Similarity

🔧 System Capabilities:
• Content-based recommendations using semantic similarity
• Genre-based recommendations
• Personalized recommendations based on viewing history
• Popular content recommendations
• Real-time embedding computation
• User activity tracking

🌐 API Endpoints Available:
• POST /api/bert-recommendations/initialize
• GET /api/bert-recommendations/stats
• POST /api/bert-recommendations/recommend
• POST /api/bert-recommendations/recommend-by-genre
• POST /api/bert-recommendations/recommend-personalized
• GET /api/bert-recommendations/popular
• GET /api/bert-recommendations/genres

🚀 Next Steps:
1. Start the FastAPI server: uvicorn main:app --reload
2. Visit http://localhost:8000/docs for API documentation
3. Access the frontend at http://localhost:3000/recommendations
4. Begin collecting user viewing data for personalization

System is ready for production use!
====================================================
"""
        
        # Save summary to file
        with open('bert_system_summary.txt', 'w') as f:
            f.write(summary)
        
        logger.info("✅ System summary created: bert_system_summary.txt")
        print(summary)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create system summary: {e}")
        return False

def main():
    """Main initialization function"""
    print("🚀 BERT RECOMMENDATION SYSTEM INITIALIZATION")
    print("=" * 60)
    
    start_time = time.time()
    
    # Step 1: Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Step 2: Download and prepare dataset
    engine = download_and_prepare_dataset()
    if not engine:
        sys.exit(1)
    
    # Step 3: Initialize BERT model
    if not initialize_bert_model(engine):
        sys.exit(1)
    
    # Step 4: Run system tests
    if not run_system_tests(engine):
        logger.warning("⚠️ Some tests failed, but system may still be functional")
    
    # Step 5: Create system summary
    create_system_summary(engine)
    
    # Final summary
    total_time = time.time() - start_time
    
    print("\n" + "=" * 60)
    print("🎉 INITIALIZATION COMPLETE!")
    print(f"⏱️ Total Time: {total_time:.2f} seconds")
    print("=" * 60)
    
    print("\n💡 Quick Start Commands:")
    print("Backend: uvicorn main:app --reload --port 8000")
    print("Frontend: npm run dev")
    print("Docs: http://localhost:8000/docs")
    print("App: http://localhost:3000/recommendations")

if __name__ == "__main__":
    main() 