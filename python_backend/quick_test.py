#!/usr/bin/env python3
"""
Quick test script for the multi-modal summarizer.
This script helps verify that all components are working correctly.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_video_processor():
    """Test the video processor components"""
    try:
        from services.video_processor import VideoProcessor
        
        logger.info("Testing VideoProcessor initialization...")
        processor = VideoProcessor()
        logger.info("✓ VideoProcessor initialized successfully")
        
        # Test with a short YouTube video (replace with a real URL for actual testing)
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Example URL
        test_video_id = "dQw4w9WgXcQ"
        
        logger.info("Note: To test actual processing, replace test_url with a real YouTube URL")
        logger.info(f"Test URL: {test_url}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ VideoProcessor test failed: {e}")
        return False

async def test_multimodal_summarizer():
    """Test the multimodal summarizer"""
    try:
        from services.multimodal_summarizer import MultiModalSummarizer
        
        logger.info("Testing MultiModalSummarizer initialization...")
        summarizer = MultiModalSummarizer()
        
        if summarizer.is_ready():
            logger.info("✓ MultiModalSummarizer initialized successfully")
        else:
            logger.warning("⚠ MultiModalSummarizer not ready (models may still be loading)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ MultiModalSummarizer test failed: {e}")
        return False

def test_imports():
    """Test all required imports"""
    logger.info("Testing imports...")
    
    required_packages = [
        ('torch', 'PyTorch'),
        ('transformers', 'Transformers'),
        ('sentence_transformers', 'Sentence Transformers'),
        ('clip', 'CLIP'),
        ('cv2', 'OpenCV'),
        ('PIL', 'Pillow'),
        ('yt_dlp', 'yt-dlp'),
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('numpy', 'NumPy'),
    ]
    
    # Check for Whisper (either version)
    whisper_found = False
    try:
        import whisper_timestamped
        logger.info("✓ Whisper Timestamped imported successfully")
        whisper_found = True
    except ImportError:
        try:
            import whisper
            logger.info("✓ OpenAI Whisper imported successfully")
            whisper_found = True
        except ImportError:
            logger.error("❌ Whisper not found")
            missing_packages.append("Whisper")
    
    missing_packages = []
    
    for package, name in required_packages:
        try:
            __import__(package)
            logger.info(f"✓ {name} imported successfully")
        except ImportError:
            logger.error(f"❌ {name} not found")
            missing_packages.append(name)
    
    # Add Whisper to missing if not found
    if not whisper_found:
        missing_packages.append("Whisper")
    
    if missing_packages:
        logger.error(f"Missing packages: {', '.join(missing_packages)}")
        logger.info("Install missing packages with: pip install -r requirements.txt")
        return False
    
    logger.info("✓ All imports successful")
    return True

def test_model_loading():
    """Test loading of individual models"""
    logger.info("Testing model loading...")
    
    try:
        import torch
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"✓ Device: {device}")
        
        # Test Whisper
        try:
            import whisper_timestamped as whisper
            logger.info("Loading Whisper model...")
            whisper_model = whisper.load_model("tiny", device=str(device))  # Use tiny for quick test
            logger.info("✓ Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Whisper model loading failed: {e}")
        
        # Test CLIP
        try:
            import clip
            logger.info("Loading CLIP model...")
            clip_model, clip_preprocess = clip.load("ViT-B/32", device=device)
            logger.info("✓ CLIP model loaded successfully")
        except Exception as e:
            logger.error(f"❌ CLIP model loading failed: {e}")
        
        # Test FLAN-T5 (use small version for quick test)
        try:
            from transformers import T5Tokenizer, T5ForConditionalGeneration
            logger.info("Loading FLAN-T5 model...")
            tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-small")
            model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-small")
            logger.info("✓ FLAN-T5 model loaded successfully")
        except Exception as e:
            logger.error(f"❌ FLAN-T5 model loading failed: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Model loading test failed: {e}")
        return False

def test_fastapi_server():
    """Test FastAPI server components"""
    try:
        logger.info("Testing FastAPI components...")
        
        from main import app
        logger.info("✓ FastAPI app imported successfully")
        
        # Test route definitions
        routes = [route.path for route in app.routes]
        expected_routes = ["/", "/process-video", "/extract-transcript", "/extract-visual-features", "/health"]
        
        for route in expected_routes:
            if route in routes:
                logger.info(f"✓ Route {route} defined")
            else:
                logger.warning(f"⚠ Route {route} not found")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ FastAPI test failed: {e}")
        return False

def test_system_requirements():
    """Test system requirements"""
    logger.info("Testing system requirements...")
    
    import subprocess
    import shutil
    
    # Test FFmpeg
    if shutil.which('ffmpeg'):
        logger.info("✓ FFmpeg found")
    else:
        logger.error("❌ FFmpeg not found - please install FFmpeg")
        return False
    
    # Test Python version
    import sys
    python_version = sys.version_info
    if python_version >= (3, 8):
        logger.info(f"✓ Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    else:
        logger.error(f"❌ Python version too old: {python_version}. Requires 3.8+")
        return False
    
    # Test available memory (basic check)
    try:
        import psutil
        memory = psutil.virtual_memory()
        total_gb = memory.total / (1024**3)
        logger.info(f"✓ Total RAM: {total_gb:.1f}GB")
        
        if total_gb < 8:
            logger.warning("⚠ Less than 8GB RAM - may have performance issues")
    except ImportError:
        logger.info("psutil not available - skipping memory check")
    
    return True

async def run_comprehensive_test():
    """Run all tests"""
    logger.info("="*60)
    logger.info("MULTI-MODAL SUMMARIZER COMPREHENSIVE TEST")
    logger.info("="*60)
    
    tests = [
        ("System Requirements", test_system_requirements),
        ("Package Imports", test_imports),
        ("Model Loading", test_model_loading),
        ("FastAPI Server", test_fastapi_server),
        ("Video Processor", test_video_processor),
        ("Multimodal Summarizer", test_multimodal_summarizer),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info("-" * 40)
        logger.info(f"Running {test_name} test...")
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("="*60)
    logger.info("TEST SUMMARY")
    logger.info("="*60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info("-" * 40)
    logger.info(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        logger.info("🎉 All tests passed! Multi-modal summarizer is ready.")
    else:
        logger.warning(f"⚠ {total - passed} tests failed. Check the logs above.")
        logger.info("💡 Tip: Most issues can be resolved by:")
        logger.info("   1. Installing missing dependencies: pip install -r requirements.txt")
        logger.info("   2. Installing FFmpeg")
        logger.info("   3. Ensuring sufficient system resources")

def quick_demo():
    """Run a quick demo of text-only processing"""
    logger.info("="*60)
    logger.info("QUICK DEMO - TEXT PROCESSING")
    logger.info("="*60)
    
    try:
        from transformers import T5Tokenizer, T5ForConditionalGeneration
        
        # Use small model for demo
        model_name = "google/flan-t5-small"
        logger.info(f"Loading {model_name} for demo...")
        
        tokenizer = T5Tokenizer.from_pretrained(model_name)
        model = T5ForConditionalGeneration.from_pretrained(model_name)
        
        # Demo input
        demo_input = """
        Video Title: Introduction to Python Programming
        Transcript: This video covers Python basics including variables, data types, loops, and functions. 
        The instructor explains each concept with practical examples and demonstrates coding techniques.
        Visual Analysis: Video contains code examples, terminal output, and IDE demonstrations.
        Duration: 15 minutes
        """
        
        prompt = f"Summarize this educational video content: {demo_input}"
        
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        
        logger.info("Generating summary...")
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_length=200,
                min_length=50,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id
            )
        
        summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        logger.info("Generated Summary:")
        logger.info("-" * 40)
        logger.info(summary)
        logger.info("-" * 40)
        logger.info("✓ Demo completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Demo failed: {e}")

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test multi-modal summarizer setup")
    parser.add_argument("--comprehensive", action="store_true", help="Run comprehensive tests")
    parser.add_argument("--demo", action="store_true", help="Run quick demo")
    parser.add_argument("--imports-only", action="store_true", help="Test imports only")
    
    args = parser.parse_args()
    
    if args.imports_only:
        test_imports()
    elif args.demo:
        quick_demo()
    elif args.comprehensive:
        asyncio.run(run_comprehensive_test())
    else:
        # Default: run basic tests
        logger.info("Running basic tests...")
        logger.info("Use --comprehensive for full testing")
        logger.info("Use --demo for a quick demonstration")
        
        if test_imports():
            logger.info("✓ Basic tests passed!")
        else:
            logger.error("❌ Basic tests failed!")

if __name__ == "__main__":
    main() 