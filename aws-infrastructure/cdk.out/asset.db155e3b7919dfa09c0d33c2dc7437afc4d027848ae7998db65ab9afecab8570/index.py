"""
Simple Lambda for video recommendations using OpenSearch
Uses boto3 (built-in) to query OpenSearch with signed requests
"""

import json
import os
import boto3
import logging
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import urllib3

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

# Initialize AWS clients
region = os.getenv('REGION', 'ap-south-2')
session = boto3.Session()
credentials = session.get_credentials()

# OpenSearch configuration
opensearch_endpoint = os.getenv('OPENSEARCH_ENDPOINT', '')
opensearch_index = os.getenv('OPENSEARCH_INDEX', 'streamsmart-ai-vectors')

# HTTP client
http = urllib3.PoolManager()


def sign_request(method, url, body=None):
    """Sign request with AWS SigV4"""
    request = AWSRequest(method=method, url=url, data=body, headers={
        'Content-Type': 'application/json'
    })
    SigV4Auth(credentials, 'es', region).add_auth(request)
    return request


def search_opensearch(query_text, top_n=10):
    """
    Search OpenSearch for similar videos using text search
    """
    try:
        # Build OpenSearch query
        query = {
            "size": top_n,
            "query": {
                "multi_match": {
                    "query": query_text,
                    "fields": ["title^3", "description^2", "genre", "channel_name"],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            },
            "_source": [
                "video_id", "title", "channel_name", "channel_id",
                "thumbnail_url", "duration", "genre", "quality_score",
                "view_count", "youtube_url", "description", "upload_date"
            ]
        }
        
        # Make signed request to OpenSearch
        url = f"https://{opensearch_endpoint}/{opensearch_index}/_search"
        request = sign_request('POST', url, json.dumps(query).encode('utf-8'))
        
        response = http.request(
            request.method,
            request.url,
            body=request.body,
            headers=request.headers
        )
        
        if response.status != 200:
            logger.error(f"OpenSearch error: {response.status} - {response.data}")
            return []
        
        data = json.loads(response.data.decode('utf-8'))
        results = []
        
        for hit in data.get('hits', {}).get('hits', []):
            video = hit['_source']
            video['similarity_score'] = hit['_score'] / 10.0  # Normalize
            results.append(video)
        
        logger.info(f"Found {len(results)} videos via text search")
        return results
        
    except Exception as e:
        logger.error(f"Error searching OpenSearch: {str(e)}", exc_info=True)
        return []


def format_response(videos, search_method='text'):
    """Format videos for API response"""
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
            'search_method': search_method,
            'index': opensearch_index
        }
    }


def handler(event, context):
    """Lambda handler for recommendation requests"""
    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
            
        title = body.get('title', '')
        description = body.get('description', '')
        top_n = min(int(body.get('topN', 10)), 50)
        
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
        
        # Combine title and description
        query_text = f"{title}. {description}" if description else title
        
        logger.info(f"Processing recommendation request for: {title}")
        
        # Search OpenSearch
        similar_videos = search_opensearch(query_text, top_n=top_n)
        
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
                    'message': f'No videos found for: {title}'
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
