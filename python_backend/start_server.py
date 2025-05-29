#!/usr/bin/env python3
"""
Startup script for StreamSmart ML Backend
"""
import os
import sys
import uvicorn
import logging
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are installed"""
    # Map package names to their import names
    required_packages = {
        'torch': 'torch',
        'transformers': 'transformers', 
        'sentence_transformers': 'sentence_transformers',
        'whisper_timestamped': 'whisper_timestamped',
        'clip': 'clip',
        'fastapi': 'fastapi',
        'uvicorn': 'uvicorn',
        'yt_dlp': 'yt_dlp',
        'opencv-python': 'cv2',
        'pillow': 'PIL',
        'numpy': 'numpy'
    }
    
    missing_packages = []
    for package_name, import_name in required_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append(package_name)
    
    if missing_packages:
        logger.error(f"Missing required packages: {', '.join(missing_packages)}")
        logger.error("Please install them using: pip install -r requirements.txt")
        return False
    
    return True

def create_directories():
    """Create necessary directories"""
    directories = ['cache', 'temp', 'logs']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    logger.info("Created necessary directories")

def main():
    """Main startup function"""
    logger.info("Starting StreamSmart ML Backend...")
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Load environment variables
    host = os.getenv('API_HOST', '0.0.0.0')
    port = int(os.getenv('API_PORT', '8000'))
    
    logger.info(f"Starting server on {host}:{port}")
    
    # Start the server
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=True,  # Enable auto-reload for development
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 