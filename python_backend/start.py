#!/usr/bin/env python3
"""
Simplified startup script for StreamSmart Backend on Railway
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

def create_directories():
    """Create necessary directories"""
    directories = ['cache', 'temp', 'logs']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    logger.info("Created necessary directories")

def main():
    """Main startup function"""
    logger.info("Starting StreamSmart Backend on Railway...")
    
    # Create directories
    create_directories()
    
    # Load environment variables
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '8000'))
    
    logger.info(f"Starting server on {host}:{port}")
    
    # Start the server
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=False,  # Disable auto-reload for production
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