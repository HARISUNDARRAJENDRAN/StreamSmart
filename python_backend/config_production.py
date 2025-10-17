"""
Production Configuration for BERT Backend
Environment-specific settings for DynamoDB integration
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ProductionConfig:
    """Production configuration settings"""
    
    # BERT Model Configuration
    SENTENCE_TRANSFORMER_MODEL = 'all-MiniLM-L6-v2'
    EMBEDDING_DIMENSION = 384
    
    # DynamoDB Settings
    USE_DYNAMODB = os.getenv('USE_DYNAMODB', 'true').lower() == 'true'
    AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
    VIDEOS_TABLE = os.getenv('VIDEOS_TABLE', 'Videos')
    
    # Cache Settings
    CACHE_TTL = int(os.getenv('BERT_CACHE_TTL', '3600'))  # 1 hour
    BATCH_SIZE = int(os.getenv('DYNAMODB_BATCH_SIZE', '1000'))
    
    # Performance Settings
    MAX_CONCURRENT_RECOMMENDATIONS = int(os.getenv('MAX_CONCURRENT_RECS', '50'))
    EMBEDDING_BATCH_SIZE = int(os.getenv('EMBEDDING_BATCH_SIZE', '50'))
    
    # Monitoring
    ENABLE_PERFORMANCE_LOGGING = os.getenv('ENABLE_PERF_LOGGING', 'true').lower() == 'true'
    METRICS_COLLECTION_INTERVAL = int(os.getenv('METRICS_INTERVAL', '300'))  # 5 minutes

class DevelopmentConfig:
    """Development configuration settings"""
    
    # Use CSV for development (faster iteration)
    USE_DYNAMODB = os.getenv('USE_DYNAMODB', 'false').lower() == 'true'
    
    # Fallback settings
    AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
    VIDEOS_TABLE = os.getenv('VIDEOS_TABLE', 'Videos')
    
    # Development cache settings (shorter TTL for testing)
    CACHE_TTL = 300  # 5 minutes
    BATCH_SIZE = 500
    
    # Model settings
    SENTENCE_TRANSFORMER_MODEL = 'all-MiniLM-L6-v2'
    EMBEDDING_DIMENSION = 384

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('ENVIRONMENT', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    else:
        return DevelopmentConfig()

# Configuration instance
config = get_config()

# Log configuration
import logging
logger = logging.getLogger(__name__)

logger.info("🔧 BERT Backend Configuration:")
logger.info(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
logger.info(f"   Using DynamoDB: {config.USE_DYNAMODB}")
logger.info(f"   AWS Region: {config.AWS_REGION}")
logger.info(f"   Cache TTL: {config.CACHE_TTL} seconds")
logger.info(f"   Batch Size: {config.BATCH_SIZE}")
