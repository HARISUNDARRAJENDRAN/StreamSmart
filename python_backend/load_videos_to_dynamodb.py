"""
Load videos from educational_youtube_content.csv into DynamoDB Videos table
"""
import pandas as pd
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
import uuid
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_to_dynamodb_format(value):
    """Convert pandas values to DynamoDB-compatible format"""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        # Convert to Decimal for DynamoDB
        return Decimal(str(value))
    return str(value)

def load_videos_from_csv_to_dynamodb():
    """Load videos from CSV to DynamoDB"""
    try:
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
        table = dynamodb.Table('Videos')
        
        # Read CSV
        logger.info("Reading CSV file...")
        df = pd.read_csv('../educational_youtube_content.csv')
        logger.info(f"Found {len(df)} videos in CSV")
        
        # Show sample genres
        logger.info(f"Sample genres: {df['genre'].unique()[:10].tolist()}")
        
        # Process videos in batches
        batch_size = 25  # DynamoDB batch write limit
        success_count = 0
        error_count = 0
        
        with table.batch_writer() as batch:
            for idx, row in df.iterrows():
                try:
                    # Create video item
                    video_item = {
                        'id': str(uuid.uuid4()),  # Generate unique ID
                        'youtubeId': str(row['video_id']),
                        'title': str(row['title']),
                        'description': str(row.get('description', '')),
                        'thumbnail': str(row['thumbnail_url']),
                        'duration': str(row.get('duration', 'N/A')),
                        'category': str(row['genre']),  # Store genre as category
                        'channelTitle': str(row['channel_name']),
                        'viewCount': convert_to_dynamodb_format(row.get('view_count', 0)),
                        'youtubeURL': str(row.get('youtube_url', f"https://youtube.com/watch?v={row['video_id']}")),
                        'publishedAt': str(row.get('upload_date', '')),
                        'createdAt': datetime.now().isoformat()
                    }
                    
                    # Add optional fields
                    if 'quality_score' in row and not pd.isna(row['quality_score']):
                        video_item['qualityScore'] = convert_to_dynamodb_format(row['quality_score'])
                    
                    if 'educational_indicators' in row and not pd.isna(row['educational_indicators']):
                        video_item['educationalIndicators'] = str(row['educational_indicators'])
                    
                    # Write to DynamoDB
                    batch.put_item(Item=video_item)
                    success_count += 1
                    
                    # Log progress every 100 videos
                    if (idx + 1) % 100 == 0:
                        logger.info(f"Processed {idx + 1}/{len(df)} videos...")
                    
                except Exception as e:
                    logger.error(f"Error processing video at index {idx}: {e}")
                    error_count += 1
                    continue
        
        logger.info(f"\n{'='*50}")
        logger.info(f"Load complete!")
        logger.info(f"Successfully loaded: {success_count} videos")
        logger.info(f"Errors: {error_count} videos")
        logger.info(f"{'='*50}\n")
        
        # Verify the data
        logger.info("Verifying data in DynamoDB...")
        response = table.scan(Select='COUNT')
        total_count = response['Count']
        logger.info(f"Total videos in DynamoDB: {total_count}")
        
        # Show sample genres in DynamoDB
        sample_response = table.scan(Limit=10, ProjectionExpression='category')
        sample_genres = [item.get('category') for item in sample_response.get('Items', [])]
        logger.info(f"Sample genres in DynamoDB: {sample_genres}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error loading videos: {e}")
        return False

if __name__ == "__main__":
    logger.info("Starting video load process...")
    success = load_videos_from_csv_to_dynamodb()
    
    if success:
        logger.info("\n✅ Videos loaded successfully!")
    else:
        logger.error("\n❌ Failed to load videos")
