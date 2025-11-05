"""
Lambda function for batch processing of video embeddings
Reads CSV from S3, generates embeddings via SageMaker, and indexes into OpenSearch
"""

import json
import os
import boto3
import csv
import logging
from typing import Dict, List, Any
from io import StringIO
from opensearchpy import OpenSearch, RequestsHttpConnection, helpers
from requests_aws4auth import AWS4Auth

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

# Initialize AWS clients
region = os.getenv('REGION', 'ap-south-2')
s3_client = boto3.client('s3', region_name=region)
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

# Configuration
csv_bucket = os.getenv('CSV_BUCKET')
opensearch_endpoint = os.getenv('OPENSEARCH_ENDPOINT', '').replace('https://', '')
opensearch_index = os.getenv('OPENSEARCH_INDEX', 'streamsmart-vectors')
sagemaker_endpoint = os.getenv('SAGEMAKER_ENDPOINT')
batch_size = int(os.getenv('BATCH_SIZE', '100'))

# Initialize OpenSearch client
opensearch_client = OpenSearch(
    hosts=[{'host': opensearch_endpoint, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=60
)


def create_index_if_not_exists():
    """Create OpenSearch index with k-NN configuration if it doesn't exist"""
    try:
        if opensearch_client.indices.exists(index=opensearch_index):
            logger.info(f"Index {opensearch_index} already exists")
            return
        
        # Index mapping with k-NN configuration
        index_body = {
            "settings": {
                "index": {
                    "knn": True,
                    "knn.algo_param.ef_search": 512,
                    "number_of_shards": 2,
                    "number_of_replicas": 1
                }
            },
            "mappings": {
                "properties": {
                    "video_id": {"type": "keyword"},
                    "title": {"type": "text"},
                    "channel_name": {"type": "text"},
                    "channel_id": {"type": "keyword"},
                    "description": {"type": "text"},
                    "genre": {"type": "keyword"},
                    "quality_score": {"type": "float"},
                    "view_count": {"type": "long"},
                    "duration": {"type": "keyword"},
                    "thumbnail_url": {"type": "keyword"},
                    "youtube_url": {"type": "keyword"},
                    "upload_date": {"type": "text"},
                    "embedding_vector": {
                        "type": "knn_vector",
                        "dimension": 384,  # all-MiniLM-L6-v2 dimension
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "nmslib",
                            "parameters": {
                                "ef_construction": 512,
                                "m": 16
                            }
                        }
                    }
                }
            }
        }
        
        opensearch_client.indices.create(index=opensearch_index, body=index_body)
        logger.info(f"Created index {opensearch_index}")
        
    except Exception as e:
        logger.error(f"Error creating index: {str(e)}")
        raise


def get_embedding_batch(texts: List[str]) -> List[List[float]]:
    """
    Get embeddings for a batch of texts from SageMaker
    
    Args:
        texts: List of text strings
        
    Returns:
        List of embedding vectors
    """
    try:
        payload = {
            "inputs": texts,
            "parameters": {}
        }
        
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=sagemaker_endpoint,
            ContentType='application/json',
            Body=json.dumps(payload)
        )
        
        result = json.loads(response['Body'].read().decode())
        
        # Handle response format
        if isinstance(result, list) and isinstance(result[0], list):
            return result
        elif isinstance(result, dict) and 'embeddings' in result:
            return result['embeddings']
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting batch embeddings: {str(e)}")
        raise


def process_csv_batch(csv_key: str, start_row: int, end_row: int) -> Dict[str, Any]:
    """
    Process a batch of rows from the CSV file
    
    Args:
        csv_key: S3 key for CSV file
        start_row: Starting row index
        end_row: Ending row index
        
    Returns:
        Processing results
    """
    try:
        # Download CSV from S3
        response = s3_client.get_object(Bucket=csv_bucket, Key=csv_key)
        csv_content = response['Body'].read().decode('utf-8')
        
        # Parse CSV
        csv_reader = csv.DictReader(StringIO(csv_content))
        rows = list(csv_reader)
        
        # Get subset of rows for this batch
        batch_rows = rows[start_row:end_row]
        
        if not batch_rows:
            return {
                'status': 'SUCCESS',
                'processed': 0,
                'message': 'No rows to process'
            }
        
        # Prepare texts for embedding
        texts = []
        for row in batch_rows:
            title = row.get('title', '')
            description = row.get('description', '')
            text = f"{title}. {description}" if description else title
            texts.append(text)
        
        logger.info(f"Processing {len(texts)} videos")
        
        # Get embeddings in batches
        all_embeddings = []
        for i in range(0, len(texts), 10):  # Process 10 at a time
            batch_texts = texts[i:i+10]
            embeddings = get_embedding_batch(batch_texts)
            all_embeddings.extend(embeddings)
        
        # Prepare documents for indexing
        documents = []
        for i, row in enumerate(batch_rows):
            doc = {
                '_index': opensearch_index,
                '_id': row.get('video_id', ''),
                '_source': {
                    'video_id': row.get('video_id', ''),
                    'title': row.get('title', ''),
                    'channel_name': row.get('channel_name', ''),
                    'channel_id': row.get('channel_id', ''),
                    'description': row.get('description', ''),
                    'genre': row.get('genre', ''),
                    'quality_score': float(row.get('quality_score', 0.0)),
                    'view_count': int(row.get('view_count', 0)),
                    'duration': row.get('duration', ''),
                    'thumbnail_url': row.get('thumbnail_url', ''),
                    'youtube_url': row.get('youtube_url', ''),
                    'upload_date': row.get('upload_date', ''),
                    'embedding_vector': all_embeddings[i]
                }
            }
            documents.append(doc)
        
        # Bulk index into OpenSearch
        success, failed = helpers.bulk(
            opensearch_client,
            documents,
            raise_on_error=False,
            raise_on_exception=False
        )
        
        logger.info(f"Indexed {success} documents, {len(failed)} failed")
        
        return {
            'status': 'SUCCESS',
            'processed': success,
            'failed': len(failed),
            'start_row': start_row,
            'end_row': end_row
        }
        
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}", exc_info=True)
        return {
            'status': 'FAILED',
            'error': str(e)
        }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for batch processing
    
    Args:
        event: Lambda event with CSV location and batch info
        context: Lambda context
        
    Returns:
        Processing result
    """
    try:
        logger.info(f"Event: {json.dumps(event)}")
        
        # Create index if needed
        create_index_if_not_exists()
        
        # Get parameters
        csv_key = event.get('csv_key', 'educational_youtube_content.csv')
        start_row = event.get('start_row', 0)
        end_row = event.get('end_row', batch_size)
        
        # Process batch
        result = process_csv_batch(csv_key, start_row, end_row)
        
        return result
        
    except Exception as e:
        logger.error(f"Error in handler: {str(e)}", exc_info=True)
        return {
            'status': 'FAILED',
            'error': str(e)
        }
