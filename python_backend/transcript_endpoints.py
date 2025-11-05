"""
Transcript Upload and Management Endpoints
Handles transcript extraction from browser extension and manual uploads
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import boto3
from botocore.exceptions import ClientError
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcripts", tags=["Transcripts"])

# Pydantic Models
class TranscriptSegment(BaseModel):
    timestamp: str
    text: str

class TranscriptUploadRequest(BaseModel):
    videoId: str
    youtubeUrl: str
    title: str
    segments: List[TranscriptSegment]
    language: str = "en"
    userId: Optional[str] = "anonymous"
    channelTitle: Optional[str] = None

class TranscriptUploadResponse(BaseModel):
    success: bool
    message: str
    cached: bool
    s3Key: Optional[str] = None
    videoId: str

class TranscriptCheckResponse(BaseModel):
    cached: bool
    metadata: Optional[Dict[str, Any]] = None
    s3Key: Optional[str] = None

# AWS Configuration
DYNAMODB_REGION = "ap-south-2"  # DynamoDB table is in ap-south-2
S3_REGION = "ap-south-1"  # S3 bucket is in ap-south-1
S3_BUCKET = "streamsmart-transcripts-560271561936"
DYNAMODB_TABLE = "Transcripts"

def get_dynamodb_table():
    """Get DynamoDB table resource"""
    try:
        dynamodb = boto3.resource('dynamodb', region_name=DYNAMODB_REGION)
        return dynamodb.Table(DYNAMODB_TABLE)
    except Exception as e:
        logger.error(f"Failed to connect to DynamoDB: {e}")
        raise

def get_s3_client():
    """Get S3 client"""
    try:
        return boto3.client('s3', region_name=S3_REGION)
    except Exception as e:
        logger.error(f"Failed to connect to S3: {e}")
        raise

@router.post("/upload", response_model=TranscriptUploadResponse)
async def upload_transcript(
    request: TranscriptUploadRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Upload transcript from browser extension or manual input
    Stores transcript in S3 and metadata in DynamoDB
    """
    try:
        logger.info(f"Received transcript upload request for video: {request.videoId}")
        
        # Validate video ID format
        if not request.videoId or len(request.videoId) != 11:
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube video ID format"
            )
        
        # Check if already cached
        table = get_dynamodb_table()
        
        try:
            existing = table.get_item(Key={'videoId': request.videoId})
            if 'Item' in existing:
                logger.info(f"Transcript already cached for video: {request.videoId}")
                return TranscriptUploadResponse(
                    success=True,
                    message="Transcript already cached",
                    cached=True,
                    s3Key=existing['Item'].get('s3Key'),
                    videoId=request.videoId
                )
        except ClientError as e:
            logger.error(f"Error checking existing transcript: {e}")
            # Continue with upload if check fails
        
        # Prepare transcript data
        transcript_data = {
            "videoId": request.videoId,
            "youtubeUrl": request.youtubeUrl,
            "title": request.title,
            "segments": [seg.dict() for seg in request.segments],
            "language": request.language,
            "uploadedBy": request.userId,
            "uploadedAt": datetime.utcnow().isoformat(),
            "channelTitle": request.channelTitle
        }
        
        # Store in S3
        s3_client = get_s3_client()
        s3_key = f"{request.videoId}.json"
        
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=s3_key,
                Body=json.dumps(transcript_data, indent=2),
                ContentType='application/json',
                Metadata={
                    'videoId': request.videoId,
                    'language': request.language,
                    'uploadedBy': request.userId
                }
            )
            logger.info(f"Transcript uploaded to S3: s3://{S3_BUCKET}/{s3_key}")
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to store transcript in S3: {str(e)}"
            )
        
        # Store metadata in DynamoDB
        try:
            table.put_item(Item={
                'videoId': request.videoId,
                'youtubeUrl': request.youtubeUrl,
                'title': request.title,
                's3Key': s3_key,
                's3Bucket': S3_BUCKET,
                'language': request.language,
                'uploadedBy': request.userId,
                'uploadedAt': datetime.utcnow().isoformat(),
                'processingStatus': 'uploaded',
                'segmentCount': len(request.segments),
                'channelTitle': request.channelTitle or 'Unknown',
                'lastAccessedAt': datetime.utcnow().isoformat()
            })
            logger.info(f"Metadata stored in DynamoDB for video: {request.videoId}")
        except ClientError as e:
            logger.error(f"Failed to store metadata in DynamoDB: {e}")
            # Don't fail the request if DynamoDB fails, S3 is the source of truth
            logger.warning("Transcript stored in S3 but metadata not in DynamoDB")
        
        return TranscriptUploadResponse(
            success=True,
            message="Transcript uploaded successfully",
            cached=False,
            s3Key=s3_key,
            videoId=request.videoId
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading transcript: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/check/{videoId}", response_model=TranscriptCheckResponse)
async def check_transcript_cached(videoId: str):
    """
    Check if transcript is already cached for a video
    Returns cache status and metadata if available
    """
    try:
        logger.info(f"Checking transcript cache for video: {videoId}")
        
        # Validate video ID
        if not videoId or len(videoId) != 11:
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube video ID format"
            )
        
        # Check DynamoDB
        table = get_dynamodb_table()
        
        try:
            response = table.get_item(Key={'videoId': videoId})
            
            if 'Item' in response:
                item = response['Item']
                
                # Update last accessed time
                try:
                    table.update_item(
                        Key={'videoId': videoId},
                        UpdateExpression='SET lastAccessedAt = :timestamp',
                        ExpressionAttributeValues={
                            ':timestamp': datetime.utcnow().isoformat()
                        }
                    )
                except ClientError:
                    pass  # Non-critical, continue
                
                return TranscriptCheckResponse(
                    cached=True,
                    metadata={
                        'title': item.get('title'),
                        'language': item.get('language'),
                        'segmentCount': item.get('segmentCount'),
                        'uploadedAt': item.get('uploadedAt'),
                        'processingStatus': item.get('processingStatus')
                    },
                    s3Key=item.get('s3Key')
                )
            else:
                return TranscriptCheckResponse(
                    cached=False,
                    metadata=None,
                    s3Key=None
                )
                
        except ClientError as e:
            logger.error(f"Error checking DynamoDB: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error checking transcript cache: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in check_transcript_cached: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/download/{videoId}")
async def download_transcript(videoId: str):
    """
    Download transcript content from S3
    Returns the full transcript with segments
    """
    try:
        logger.info(f"Downloading transcript for video: {videoId}")
        
        # Validate video ID
        if not videoId or len(videoId) != 11:
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube video ID format"
            )
        
        # Get S3 key from DynamoDB
        table = get_dynamodb_table()
        
        try:
            response = table.get_item(Key={'videoId': videoId})
            
            if 'Item' not in response:
                raise HTTPException(
                    status_code=404,
                    detail="Transcript not found for this video"
                )
            
            s3_key = response['Item'].get('s3Key')
            if not s3_key:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid transcript metadata (missing S3 key)"
                )
            
        except ClientError as e:
            logger.error(f"Error fetching from DynamoDB: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching transcript metadata: {str(e)}"
            )
        
        # Download from S3
        s3_client = get_s3_client()
        
        try:
            s3_response = s3_client.get_object(
                Bucket=S3_BUCKET,
                Key=s3_key
            )
            
            transcript_content = s3_response['Body'].read().decode('utf-8')
            transcript_data = json.loads(transcript_content)
            
            return {
                "success": True,
                "videoId": videoId,
                "transcript": transcript_data
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise HTTPException(
                    status_code=404,
                    detail="Transcript file not found in storage"
                )
            logger.error(f"Error downloading from S3: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error downloading transcript: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in download_transcript: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.delete("/delete/{videoId}")
async def delete_transcript(videoId: str):
    """
    Delete transcript from S3 and DynamoDB
    Admin only endpoint (add authentication later)
    """
    try:
        logger.info(f"Deleting transcript for video: {videoId}")
        
        # Get S3 key from DynamoDB
        table = get_dynamodb_table()
        
        try:
            response = table.get_item(Key={'videoId': videoId})
            
            if 'Item' not in response:
                raise HTTPException(
                    status_code=404,
                    detail="Transcript not found"
                )
            
            s3_key = response['Item'].get('s3Key')
            
        except ClientError as e:
            logger.error(f"Error fetching from DynamoDB: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching transcript metadata: {str(e)}"
            )
        
        # Delete from S3
        if s3_key:
            s3_client = get_s3_client()
            try:
                s3_client.delete_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key
                )
                logger.info(f"Deleted from S3: {s3_key}")
            except ClientError as e:
                logger.error(f"Error deleting from S3: {e}")
                # Continue to delete from DynamoDB even if S3 fails
        
        # Delete from DynamoDB
        try:
            table.delete_item(Key={'videoId': videoId})
            logger.info(f"Deleted metadata from DynamoDB for video: {videoId}")
        except ClientError as e:
            logger.error(f"Error deleting from DynamoDB: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting transcript metadata: {str(e)}"
            )
        
        return {
            "success": True,
            "message": "Transcript deleted successfully",
            "videoId": videoId
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_transcript: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/stats")
async def get_transcript_stats():
    """
    Get statistics about stored transcripts
    """
    try:
        table = get_dynamodb_table()
        
        # Scan to get all items (use pagination for large datasets)
        response = table.scan(Select='COUNT')
        total_count = response.get('Count', 0)
        
        return {
            "success": True,
            "totalTranscripts": total_count,
            "bucket": S3_BUCKET,
            "s3Region": S3_REGION,
            "dynamodbRegion": DYNAMODB_REGION
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting transcript statistics: {str(e)}"
        )

class TranscriptDeleteRequest(BaseModel):
    videoId: str
    s3Key: Optional[str] = None

@router.post("/delete")
async def delete_transcript(request: TranscriptDeleteRequest):
    """
    Delete transcript from S3 bucket
    """
    try:
        logger.info(f"[Delete] Deleting S3 transcript for video: {request.videoId}")
        
        # Determine S3 key
        s3_key = request.s3Key or f"{request.videoId}.json"
        
        # Delete from S3
        s3_client = boto3.client('s3', region_name=S3_REGION)
        
        try:
            s3_client.delete_object(
                Bucket=S3_BUCKET,
                Key=s3_key
            )
            logger.info(f"[Delete] ✅ Deleted S3 object: {s3_key}")
            
            return {
                "success": True,
                "message": f"Transcript deleted from S3",
                "s3Key": s3_key
            }
        except ClientError as e:
            # If object doesn't exist, still return success
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.info(f"[Delete] S3 object not found (already deleted): {s3_key}")
                return {
                    "success": True,
                    "message": f"Transcript not found (already deleted)",
                    "s3Key": s3_key
                }
            else:
                raise
                
    except Exception as e:
        logger.error(f"[Delete] Error deleting S3 transcript: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete transcript: {str(e)}"
        )

class TranscriptMetadataDeleteRequest(BaseModel):
    videoId: str

@router.post("/delete-metadata")
async def delete_transcript_metadata(request: TranscriptMetadataDeleteRequest):
    """
    Delete transcript metadata from DynamoDB
    """
    try:
        logger.info(f"[Delete] Deleting DynamoDB metadata for video: {request.videoId}")
        
        # Validate video ID
        if not request.videoId or len(request.videoId) != 11:
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube video ID format"
            )
        
        # Delete from DynamoDB
        table = get_dynamodb_table()
        
        try:
            response = table.delete_item(
                Key={'videoId': request.videoId},
                ReturnValues='ALL_OLD'
            )
            
            if 'Attributes' in response:
                logger.info(f"[Delete] ✅ Deleted DynamoDB metadata: {request.videoId}")
                return {
                    "success": True,
                    "message": "Transcript metadata deleted",
                    "videoId": request.videoId
                }
            else:
                logger.info(f"[Delete] DynamoDB entry not found (already deleted): {request.videoId}")
                return {
                    "success": True,
                    "message": "Metadata not found (already deleted)",
                    "videoId": request.videoId
                }
                
        except ClientError as e:
            logger.error(f"[Delete] DynamoDB error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"DynamoDB error: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Delete] Error deleting metadata: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete metadata: {str(e)}"
        )
