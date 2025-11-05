"""
Batch script to generate embeddings for all videos and upload to OpenSearch
Run this locally or as a SageMaker Processing Job
"""

import pandas as pd
import boto3
import json
import logging
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from opensearchpy import OpenSearch, RequestsHttpConnection, helpers
from requests_aws4auth import AWS4Auth
import argparse
from tqdm import tqdm
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VideoEmbeddingGenerator:
    """Generate and upload embeddings for video dataset"""
    
    def __init__(
        self,
        model_name: str = 'sentence-transformers/all-MiniLM-L6-v2',
        region: str = 'ap-south-2',
        opensearch_endpoint: str = None,
        index_name: str = 'streamsmart-vectors'
    ):
        """
        Initialize the embedding generator
        
        Args:
            model_name: Sentence transformer model to use
            region: AWS region
            opensearch_endpoint: OpenSearch domain endpoint
            index_name: OpenSearch index name
        """
        self.region = region
        self.index_name = index_name
        
        # Load sentence transformer model
        logger.info(f"Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        logger.info(f"Model loaded. Embedding dimension: {self.model.get_sentence_embedding_dimension()}")
        
        # Initialize AWS clients
        session = boto3.Session(region_name=region)
        credentials = session.get_credentials()
        
        self.awsauth = AWS4Auth(
            credentials.access_key,
            credentials.secret_key,
            region,
            'es',
            session_token=credentials.token
        )
        
        # Initialize OpenSearch client
        if opensearch_endpoint:
            self.opensearch_endpoint = opensearch_endpoint.replace('https://', '')
            self.opensearch_client = OpenSearch(
                hosts=[{'host': self.opensearch_endpoint, 'port': 443}],
                http_auth=self.awsauth,
                use_ssl=True,
                verify_certs=True,
                connection_class=RequestsHttpConnection,
                timeout=60
            )
            logger.info(f"Connected to OpenSearch: {self.opensearch_endpoint}")
        else:
            self.opensearch_client = None
            logger.warning("No OpenSearch endpoint provided, will only generate embeddings")
    
    def create_index(self):
        """Create OpenSearch index with k-NN configuration"""
        if not self.opensearch_client:
            logger.warning("OpenSearch client not initialized")
            return
        
        try:
            if self.opensearch_client.indices.exists(index=self.index_name):
                logger.info(f"Index {self.index_name} already exists")
                response = input(f"Delete and recreate index {self.index_name}? (yes/no): ")
                if response.lower() == 'yes':
                    self.opensearch_client.indices.delete(index=self.index_name)
                    logger.info(f"Deleted existing index")
                else:
                    return
            
            # Index configuration for k-NN
            index_body = {
                "settings": {
                    "index": {
                        "knn": True,
                        "knn.algo_param.ef_search": 512,
                        "number_of_shards": 2,
                        "number_of_replicas": 1,
                        "refresh_interval": "30s"  # Faster indexing
                    }
                },
                "mappings": {
                    "properties": {
                        "video_id": {"type": "keyword"},
                        "title": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "channel_name": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
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
                            "dimension": self.model.get_sentence_embedding_dimension(),
                            "method": {
                                "name": "hnsw",
                                "space_type": "cosinesimil",
                                "engine": "nmslib",
                                "parameters": {
                                    "ef_construction": 512,
                                    "m": 16
                                }
                            }
                        },
                        "indexed_at": {"type": "date"}
                    }
                }
            }
            
            self.opensearch_client.indices.create(index=self.index_name, body=index_body)
            logger.info(f"Created index: {self.index_name}")
            
        except Exception as e:
            logger.error(f"Error creating index: {str(e)}")
            raise
    
    def generate_embeddings(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings
            batch_size: Batch size for encoding
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        return embeddings.tolist()
    
    def process_csv(self, csv_path: str, batch_size: int = 100):
        """
        Process CSV file and generate embeddings
        
        Args:
            csv_path: Path to CSV file
            batch_size: Batch size for processing
        """
        logger.info(f"Loading CSV from: {csv_path}")
        df = pd.read_csv(csv_path)
        
        logger.info(f"Loaded {len(df)} videos")
        logger.info(f"Columns: {df.columns.tolist()}")
        
        # Clean data
        df['title'].fillna('Untitled Video', inplace=True)
        df['description'].fillna('', inplace=True)
        df['channel_name'].fillna('Unknown', inplace=True)
        
        # Create combined text for embedding
        logger.info("Creating combined texts for embedding...")
        df['combined_text'] = df.apply(
            lambda row: f"{row['title']}. {row['description']}" if row['description'] else row['title'],
            axis=1
        )
        
        # Generate embeddings in batches
        logger.info("Generating embeddings...")
        all_embeddings = []
        
        for i in tqdm(range(0, len(df), batch_size), desc="Processing batches"):
            batch_df = df.iloc[i:i+batch_size]
            texts = batch_df['combined_text'].tolist()
            embeddings = self.generate_embeddings(texts, batch_size=32)
            all_embeddings.extend(embeddings)
        
        df['embedding_vector'] = all_embeddings
        logger.info(f"Generated {len(all_embeddings)} embeddings")
        
        # Upload to OpenSearch if client is available
        if self.opensearch_client:
            self.upload_to_opensearch(df, batch_size=batch_size)
        
        return df
    
    def upload_to_opensearch(self, df: pd.DataFrame, batch_size: int = 100):
        """
        Upload embeddings to OpenSearch
        
        Args:
            df: DataFrame with embeddings
            batch_size: Batch size for bulk upload
        """
        logger.info("Uploading to OpenSearch...")
        
        from datetime import datetime
        
        for i in tqdm(range(0, len(df), batch_size), desc="Uploading batches"):
            batch_df = df.iloc[i:i+batch_size]
            
            # Prepare documents for bulk indexing
            documents = []
            for _, row in batch_df.iterrows():
                doc = {
                    '_index': self.index_name,
                    '_id': row['video_id'],
                    '_source': {
                        'video_id': row['video_id'],
                        'title': row['title'],
                        'channel_name': row['channel_name'],
                        'channel_id': row.get('channel_id', ''),
                        'description': row['description'],
                        'genre': row['genre'],
                        'quality_score': float(row['quality_score']),
                        'view_count': int(row['view_count']),
                        'duration': row['duration'],
                        'thumbnail_url': row['thumbnail_url'],
                        'youtube_url': row['youtube_url'],
                        'upload_date': row.get('upload_date', ''),
                        'embedding_vector': row['embedding_vector'],
                        'indexed_at': datetime.utcnow().isoformat()
                    }
                }
                documents.append(doc)
            
            # Bulk index
            try:
                success, failed = helpers.bulk(
                    self.opensearch_client,
                    documents,
                    raise_on_error=False,
                    raise_on_exception=False,
                    chunk_size=50,
                    request_timeout=60
                )
                logger.info(f"Batch {i//batch_size + 1}: Indexed {success} documents, {len(failed)} failed")
                
                if failed:
                    logger.warning(f"Failed documents: {failed[:5]}")  # Show first 5
                    
            except Exception as e:
                logger.error(f"Error in batch {i//batch_size + 1}: {str(e)}")
        
        # Refresh index
        self.opensearch_client.indices.refresh(index=self.index_name)
        logger.info("Upload complete and index refreshed")


def main():
    parser = argparse.ArgumentParser(description='Generate embeddings for video dataset')
    parser.add_argument('--csv-path', required=True, help='Path to CSV file')
    parser.add_argument('--model', default='sentence-transformers/all-MiniLM-L6-v2', help='Model name')
    parser.add_argument('--region', default='ap-south-2', help='AWS region')
    parser.add_argument('--opensearch-endpoint', help='OpenSearch endpoint')
    parser.add_argument('--index-name', default='streamsmart-vectors', help='Index name')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size')
    parser.add_argument('--create-index', action='store_true', help='Create OpenSearch index')
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = VideoEmbeddingGenerator(
        model_name=args.model,
        region=args.region,
        opensearch_endpoint=args.opensearch_endpoint,
        index_name=args.index_name
    )
    
    # Create index if requested
    if args.create_index and args.opensearch_endpoint:
        generator.create_index()
    
    # Process CSV
    generator.process_csv(args.csv_path, batch_size=args.batch_size)
    
    logger.info("Processing complete!")


if __name__ == '__main__':
    main()
