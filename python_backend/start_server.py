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

# Load environment variables from project root BEFORE importing main
try:
    from dotenv import load_dotenv
    env_path = current_dir.parent / '.env'
    load_dotenv(env_path)
    print(f"[OK] Loaded environment variables from {env_path}")
except ImportError:
    print("[WARNING] python-dotenv not installed")
except Exception as e:
    print(f"[WARNING] Could not load .env file: {e}")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Note: Hugging Face compatibility patch removed - not used in this project

def check_dependencies():
    """Check if all required dependencies are installed"""
    # Map package names to their import names
    required_packages = {
        'fastapi': 'fastapi',
        'uvicorn': 'uvicorn',
        'pandas': 'pandas',
        'numpy': 'numpy',
        'boto3': 'boto3'
    }
    
    # Optional packages (not required for basic functionality)
    optional_packages = {
        'pillow': 'PIL',
        'yt_dlp': 'yt_dlp',
        'opencv-python': 'cv2',
        'scikit-learn': 'sklearn',
        # ML packages removed - using CSV-based recommendations
    }
    
    missing_packages = []
    missing_optional = []
    
    # Check required packages
    for package_name, import_name in required_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append(package_name)
    
    # Check optional packages
    for package_name, import_name in optional_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_optional.append(package_name)
    
    # Check NumPy version for TensorFlow compatibility
    try:
        import numpy
        numpy_version = numpy.__version__
        logger.info(f"NumPy version: {numpy_version}")
        if numpy_version.startswith('2.'):
            logger.warning("NumPy 2.x detected. This may cause issues with TensorFlow 2.15")
            logger.warning("Consider downgrading: pip install \"numpy<2\"")
        else:
            logger.info("✅ NumPy version compatible with TensorFlow 2.15")
    except ImportError:
        logger.error("NumPy not available")
    
    if missing_packages:
        logger.error(f"Missing required packages: {', '.join(missing_packages)}")
        logger.error("Please install them using: pip install -r requirements.txt")
        return False
    
    if missing_optional:
        logger.warning(f"Missing optional packages: {', '.join(missing_optional)}")
        logger.warning("Some features may not be available")
    
    logger.info("✅ All required dependencies are available")
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
        reload_flag = os.getenv('API_RELOAD', 'true').lower() == 'true'
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            # Enable auto-reload for development (configurable)
            reload=reload_flag,
            # Ignore noisy or heavy paths to reduce spurious reload events
            reload_excludes=[
                "**/.venv/**",
                "**/__pycache__/**",
                "**/logs/**",
                "**/cache/**",
                "**/*.csv",
                "python_backend/vector_db/**",
                "python_backend/transcripts/**"
            ],
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