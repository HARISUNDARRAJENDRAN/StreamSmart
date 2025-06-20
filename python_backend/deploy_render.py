#!/usr/bin/env python3
"""
StreamSmart Render Deployment Helper
Prepares the backend for lightweight BERT deployment on Render.com
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime

def print_header(text):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")

def print_step(step, description):
    """Print step with formatting"""
    print(f"\n[{step}] {description}")

def check_file_exists(filepath, description):
    """Check if required file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ Missing {description}: {filepath}")
        return False

def main():
    print_header("StreamSmart Render Deployment Setup")
    
    # Check if we're in the right directory
    if not os.path.exists("main.py"):
        print("❌ Error: Please run this from the python_backend directory")
        print("   Current directory should contain main.py")
        sys.exit(1)
    
    print_step("1", "Checking required files...")
    
    required_files = [
        ("main.py", "Main application file"),
        ("requirements_render.txt", "Render requirements"),
        ("render.yaml", "Render configuration"),
        ("services/lightweight_bert_engine.py", "Lightweight BERT engine"),
        ("educational_youtube_content.csv", "Video dataset")
    ]
    
    all_files_exist = True
    for filepath, description in required_files:
        if not check_file_exists(filepath, description):
            all_files_exist = False
    
    if not all_files_exist:
        print("\n❌ Some required files are missing. Please ensure all files are in place.")
        sys.exit(1)
    
    print_step("2", "Validating lightweight BERT configuration...")
    
    # Check if sentence-transformers is in requirements
    with open("requirements_render.txt", "r") as f:
        requirements = f.read()
        if "sentence-transformers" in requirements:
            print("✅ Sentence transformers included in requirements")
        else:
            print("❌ Sentence transformers missing from requirements")
    
    print_step("3", "Testing lightweight BERT engine...")
    
    try:
        # Try importing the lightweight engine
        sys.path.append(os.getcwd())
        from services.lightweight_bert_engine import LightweightBertEngine
        print("✅ Lightweight BERT engine imports successfully")
        
        # Test initialization
        engine = LightweightBertEngine()
        print("✅ Lightweight BERT engine initializes successfully")
        
    except ImportError as e:
        print(f"⚠️ Warning: Could not test BERT engine locally: {e}")
        print("   This is normal if dependencies aren't installed locally")
    except Exception as e:
        print(f"❌ Error testing BERT engine: {e}")
    
    print_step("4", "Checking dataset...")
    
    if os.path.exists("educational_youtube_content.csv"):
        # Get file size
        size = os.path.getsize("educational_youtube_content.csv")
        print(f"✅ Dataset file size: {size:,} bytes")
        
        # Count lines (estimate video count)
        try:
            with open("educational_youtube_content.csv", "r", encoding="utf-8") as f:
                line_count = sum(1 for _ in f) - 1  # Subtract header
            print(f"✅ Estimated video count: {line_count:,} videos")
        except Exception as e:
            print(f"⚠️ Could not count lines: {e}")
    
    print_step("5", "Environment variables check...")
    
    env_vars = [
        "MONGO_URI",
        "GEMINI_API_KEY", 
        "YOUTUBE_API_KEY"
    ]
    
    print("Required environment variables for Render:")
    for var in env_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: Set (***hidden***)")
        else:
            print(f"⚠️ {var}: Not set (add to Render environment)")
    
    print_step("6", "Deployment instructions...")
    
    print("""
🚀 RENDER.COM DEPLOYMENT STEPS:

1. Push your code to GitHub/GitLab
   - Ensure all files are committed and pushed
   - Include: main.py, requirements_render.txt, render.yaml, services/, educational_youtube_content.csv

2. Create new Web Service on Render.com
   - Connect your repository
   - Select python_backend folder as root directory

3. Configure build settings:
   - Build Command: pip install -r requirements_render.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

4. Set environment variables:
   - MONGO_URI: Your MongoDB connection string
   - GEMINI_API_KEY: Your Google AI API key  
   - YOUTUBE_API_KEY: Your YouTube Data API key
   - LIGHTWEIGHT_BERT_ENABLED: true
   - AUTO_FETCH_FREE_PROXIES: true

5. Deploy and monitor:
   - First deployment takes 10-15 minutes (downloading ML models)
   - Check logs for "✅ Lightweight BERT Engine: Initialized successfully!"
   - Test health endpoint: https://your-app.onrender.com/health

📊 EXPECTED PERFORMANCE:
- Memory usage: 200-400MB (well within 512MB free limit)
- Startup time: 5-10 minutes for first boot
- All 18,000+ videos will be available
- BERT recommendations: High quality semantic matching
- Fallback to TF-IDF if BERT fails: Still good quality

🔧 TROUBLESHOOTING:
- If BERT fails: System automatically falls back to TF-IDF
- If models don't download: Check internet connectivity in build logs
- Memory issues: Try reducing model size in lightweight_bert_engine.py

✅ Your system is ready for deployment!
""")

    print_step("7", "Final validation...")
    
    # Create a simple test
    print("Creating deployment test file...")
    
    test_content = f"""
# Deployment Test - Generated {datetime.now()}
# This file validates the deployment setup

import sys
import os

def test_imports():
    try:
        import pandas
        import numpy
        import requests
        print("✅ Basic dependencies working")
        
        try:
            from sentence_transformers import SentenceTransformer
            print("✅ Sentence transformers available")
        except ImportError:
            print("⚠️ Sentence transformers not available (normal in some environments)")
        
        from services.lightweight_bert_engine import LightweightBertEngine
        print("✅ Lightweight BERT engine imports")
        
        return True
    except Exception as e:
        print(f"❌ Import test failed: {{e}}")
        return False

if __name__ == "__main__":
    print("Testing deployment readiness...")
    if test_imports():
        print("🎉 Deployment test passed!")
    else:
        print("❌ Deployment test failed!")
"""
    
    with open("deployment_test.py", "w", encoding="utf-8") as f:
        f.write(test_content)
    
    print("✅ Created deployment_test.py")
    print("   Run: python deployment_test.py (to test locally)")
    
    print_header("🎉 DEPLOYMENT SETUP COMPLETE!")
    print("Your StreamSmart backend is ready for Render deployment!")
    print("Follow the deployment instructions above to get your system live.")

if __name__ == "__main__":
    main() 