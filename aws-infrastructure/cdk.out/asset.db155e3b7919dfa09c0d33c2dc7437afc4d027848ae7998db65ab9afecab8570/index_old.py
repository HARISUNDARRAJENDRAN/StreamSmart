"""
Lambda function for real-time video recommendation using semantic search
Integrates with SageMaker for embeddings and OpenSearch for vector search
"""

import json
import os
import boto3
import logging
from typing import Dict, List, Any, Optional
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

# Initialize AWS clients
region = os.getenv('REGION', 'ap-south-2')
sagemaker_runtime = boto3.client('sagemaker-runtime', region_name=region)
session = boto3.Session()
credentials = session.get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    region,
    'es',
    session_token=credentials.token
)

# OpenSearch configuration
opensearch_endpoint = os.getenv('OPENSEARCH_ENDPOINT', '').replace('https://', '')
opensearch_index = os.getenv('OPENSEARCH_INDEX', 'streamsmart-vectors')
sagemaker_endpoint = os.getenv('SAGEMAKER_ENDPOINT', '')

# Initialize OpenSearch client
opensearch_client = OpenSearch(
    hosts=[{'host': opensearch_endpoint, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=30
)


def get_embedding(text: str) -> List[float]:
    """
    Get embedding vector from SageMaker endpoint
    
    Args:
        text: Input text to embed
        
    Returns:
        Embedding vector
    """
    try:
        # Prepare input for sentence-transformers model
        payload = {
            "inputs": text,
            "parameters": {}
        }
        
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=sagemaker_endpoint,
            ContentType='application/json',
            Body=json.dumps(payload)
        )
        
        result = json.loads(response['Body'].read().decode())
        
        # Handle different response formats
        if isinstance(result, list):
            embedding = result[0] if isinstance(result[0], list) else result
        elif isinstance(result, dict) and 'embeddings' in result:
            embedding = result['embeddings'][0]
        else:
            embedding = result
            
        logger.info(f"Generated embedding of dimension: {len(embedding)}")
        return embedding
        
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        raise


def search_similar_videos(
    embedding: List[float],
    top_n: int = 10,
    min_score: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Search for similar videos using k-NN in OpenSearch
    
    Args:
        embedding: Query embedding vector
        top_n: Number of results to return
        min_score: Minimum similarity score threshold
        
    Returns:
        List of similar videos with metadata
    """
    try:
        query = {
            "size": top_n,
            "min_score": min_score,
            "query": {
                "knn": {
                    "embedding_vector": {
                        "vector": embedding,
                        "k": top_n
                    }
                }
            },
            "_source": [
                "video_id",
                "title",
                "channel_name",
                "channel_id",
                "thumbnail_url",
                "duration",
                "genre",
                "quality_score",
                "view_count",
                "youtube_url",
                "description",
                "upload_date"
            ]
        }
        
        response = opensearch_client.search(
            index=opensearch_index,
            body=query
        )
        
        results = []
        for hit in response['hits']['hits']:
            video = hit['_source']
            video['similarity_score'] = hit['_score']
            results.append(video)
            
        logger.info(f"Found {len(results)} similar videos")
        return results
        
    except Exception as e:
        logger.error(f"Error searching OpenSearch: {str(e)}")
        raise


def format_response(videos: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Format videos for API response
    
    Args:
        videos: List of video documents
        
    Returns:
        Formatted response
    """
    formatted_videos = []
    
    for video in videos:
        formatted_videos.append({
            'video_id': video.get('video_id', ''),
            'title': video.get('title', ''),
            'channelName': video.get('channel_name', ''),
            'channelId': video.get('channel_id', ''),
            'thumbnailUrl': video.get('thumbnail_url', ''),
            'duration': video.get('duration', ''),
            'genre': video.get('genre', ''),
            'qualityScore': float(video.get('quality_score', 0.0)),
            'viewCount': int(video.get('view_count', 0)),
            'youtubeUrl': video.get('youtube_url', ''),
            'description': video.get('description', ''),
            'uploadDate': video.get('upload_date', ''),
            'similarityScore': float(video.get('similarity_score', 0.0))
        })
    
    return {
        'success': True,
        'recommendations': formatted_videos,
        'count': len(formatted_videos),
        'metadata': {
            'model': 'sentence-transformers',
            'search_method': 'knn',
            'index': opensearch_index
        }
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for recommendation requests
    
    Args:
        event: Lambda event containing video information
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
            
        title = body.get('title', '')
        description = body.get('description', '')
        top_n = min(int(body.get('topN', 10)), 50)  # Cap at 50
        
        if not title:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing required field: title'
                })
            }
        
        # Combine title and description for better context
        query_text = f"{title}. {description}" if description else title
        
        logger.info(f"Processing recommendation request for: {title}")
        
        # Generate embedding
        embedding = get_embedding(query_text)
        
        # Search for similar videos
        similar_videos = search_similar_videos(embedding, top_n=top_n)
        
        if not similar_videos:
            logger.warning("No similar videos found")
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'recommendations': [],
                    'count': 0,
                    'message': 'No similar videos found'
                })
            }
        
        # Format and return response
        response = format_response(similar_videos)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': 'Internal server error',
                'message': str(e)
            })
        }
