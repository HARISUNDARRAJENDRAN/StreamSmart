"""
EmbeddingService - Semantic Search & Vector Embeddings
Provides embedding generation and semantic search for transcripts using OpenAI embeddings
"""

import os
import json
import numpy as np
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
from functools import lru_cache
from openai import OpenAI

# Import transcript service for chunking
from .transcript_service import TranscriptService


class EmbeddingService:
    """
    Service for generating embeddings and performing semantic search on video transcripts.
    Uses OpenAI's text-embedding-3-small model for efficient vector generation.
    """
    
    def __init__(self, openai_api_key: str):
        """
        Initialize the embedding service.
        
        Args:
            openai_api_key: OpenAI API key for embeddings generation
        """
        self.client = OpenAI(api_key=openai_api_key)
        self.transcript_service = TranscriptService()
        
        # Embedding model configuration
        self.embedding_model = "text-embedding-3-small"
        self.embedding_dimension = 1536  # Dimension for text-embedding-3-small
        
        # In-memory cache for embeddings (video_id -> List of chunk embeddings)
        self._embedding_cache: Dict[str, Dict] = {}
        self._cache_ttl = timedelta(hours=1)  # 1 hour cache
        
        print(f"[EmbeddingService] Initialized with model: {self.embedding_model}")
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for a single text string.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            # Truncate text if too long (OpenAI limit is 8191 tokens)
            if len(text) > 8000:
                text = text[:8000]
            
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            
            embedding = response.data[0].embedding
            return embedding
            
        except Exception as e:
            print(f"[EmbeddingService] Error generating embedding: {str(e)}")
            raise
    
    def embed_transcript_chunks(
        self, 
        video_id: str, 
        force_refresh: bool = False
    ) -> Dict[str, any]:
        """
        Generate embeddings for all chunks of a video transcript.
        Results are cached for performance.
        
        Args:
            video_id: YouTube video ID
            force_refresh: If True, bypass cache and regenerate embeddings
            
        Returns:
            Dictionary containing:
                - video_id: str
                - chunks: List of text chunks
                - embeddings: List of embedding vectors (same length as chunks)
                - timestamp: Cache timestamp
                - chunk_metadata: List of metadata dicts (start/end positions)
        """
        # Check cache first
        if not force_refresh and video_id in self._embedding_cache:
            cached = self._embedding_cache[video_id]
            cache_age = datetime.now() - cached['timestamp']
            
            if cache_age < self._cache_ttl:
                print(f"[EmbeddingService] Using cached embeddings for {video_id} (age: {cache_age.seconds}s)")
                return cached
        
        print(f"[EmbeddingService] Generating embeddings for video: {video_id}")
        
        try:
            # Get transcript chunks
            chunks_data = self.transcript_service.chunk_transcript(
                video_id=video_id,
                chunk_size=500,  # 500 words per chunk
                overlap=50       # 50 words overlap
            )
            
            if not chunks_data or not chunks_data.get('chunks'):
                raise ValueError(f"No transcript chunks found for video {video_id}")
            
            chunks = chunks_data['chunks']
            chunk_metadata = chunks_data['metadata']
            
            # Generate embeddings for each chunk
            embeddings = []
            for i, chunk_text in enumerate(chunks):
                try:
                    embedding = self.generate_embedding(chunk_text)
                    embeddings.append(embedding)
                    
                    if (i + 1) % 5 == 0:
                        print(f"[EmbeddingService] Generated {i + 1}/{len(chunks)} embeddings")
                        
                except Exception as e:
                    print(f"[EmbeddingService] Error embedding chunk {i}: {str(e)}")
                    # Use zero vector as fallback
                    embeddings.append([0.0] * self.embedding_dimension)
            
            # Build result
            result = {
                'video_id': video_id,
                'chunks': chunks,
                'embeddings': embeddings,
                'chunk_metadata': chunk_metadata,
                'timestamp': datetime.now(),
                'embedding_count': len(embeddings)
            }
            
            # Cache the result
            self._embedding_cache[video_id] = result
            
            print(f"[EmbeddingService] Generated {len(embeddings)} embeddings for {video_id}")
            return result
            
        except Exception as e:
            print(f"[EmbeddingService] Error in embed_transcript_chunks: {str(e)}")
            raise
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity score (0 to 1, higher is more similar)
        """
        try:
            # Convert to numpy arrays for efficient computation
            a = np.array(vec1)
            b = np.array(vec2)
            
            # Calculate cosine similarity
            dot_product = np.dot(a, b)
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            similarity = dot_product / (norm_a * norm_b)
            return float(similarity)
            
        except Exception as e:
            print(f"[EmbeddingService] Error calculating cosine similarity: {str(e)}")
            return 0.0
    
    def semantic_search(
        self,
        query: str,
        video_ids: List[str],
        top_k: int = 5,
        similarity_threshold: float = 0.5
    ) -> List[Dict]:
        """
        Perform semantic search across multiple video transcripts.
        
        Args:
            query: Natural language query
            video_ids: List of video IDs to search in
            top_k: Number of top results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of dictionaries containing:
                - video_id: str
                - chunk_index: int
                - chunk_text: str
                - similarity_score: float
                - metadata: dict (start/end positions)
        """
        print(f"[EmbeddingService] Semantic search for query: '{query}' across {len(video_ids)} videos")
        
        try:
            # Generate embedding for the query
            query_embedding = self.generate_embedding(query)
            
            # Collect all chunks and their embeddings from all videos
            all_results = []
            
            for video_id in video_ids:
                try:
                    # Get embeddings for this video
                    video_embeddings = self.embed_transcript_chunks(video_id)
                    
                    # Calculate similarity for each chunk
                    for i, chunk_embedding in enumerate(video_embeddings['embeddings']):
                        similarity = self.cosine_similarity(query_embedding, chunk_embedding)
                        
                        if similarity >= similarity_threshold:
                            all_results.append({
                                'video_id': video_id,
                                'chunk_index': i,
                                'chunk_text': video_embeddings['chunks'][i],
                                'similarity_score': similarity,
                                'metadata': video_embeddings['chunk_metadata'][i]
                            })
                
                except Exception as e:
                    print(f"[EmbeddingService] Error searching video {video_id}: {str(e)}")
                    continue
            
            # Sort by similarity score (descending)
            all_results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            # Return top K results
            top_results = all_results[:top_k]
            
            print(f"[EmbeddingService] Found {len(all_results)} matches, returning top {len(top_results)}")
            
            return top_results
            
        except Exception as e:
            print(f"[EmbeddingService] Error in semantic_search: {str(e)}")
            return []
    
    def batch_semantic_search(
        self,
        queries: List[str],
        video_ids: List[str],
        top_k_per_query: int = 3
    ) -> Dict[str, List[Dict]]:
        """
        Perform semantic search for multiple queries simultaneously.
        Useful for multi-turn conversations or related questions.
        
        Args:
            queries: List of natural language queries
            video_ids: List of video IDs to search in
            top_k_per_query: Number of results per query
            
        Returns:
            Dictionary mapping query -> list of results
        """
        results = {}
        
        for query in queries:
            results[query] = self.semantic_search(
                query=query,
                video_ids=video_ids,
                top_k=top_k_per_query
            )
        
        return results
    
    def find_related_chunks(
        self,
        reference_text: str,
        video_ids: List[str],
        top_k: int = 5,
        exclude_video_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Find chunks similar to a reference text (e.g., find related content).
        
        Args:
            reference_text: Reference text to find similar content
            video_ids: List of video IDs to search in
            top_k: Number of similar chunks to return
            exclude_video_id: Optional video ID to exclude from results
            
        Returns:
            List of similar chunks with metadata
        """
        # Filter out excluded video
        if exclude_video_id:
            video_ids = [vid for vid in video_ids if vid != exclude_video_id]
        
        return self.semantic_search(
            query=reference_text,
            video_ids=video_ids,
            top_k=top_k,
            similarity_threshold=0.6  # Higher threshold for "related" content
        )
    
    def clear_cache(self, video_id: Optional[str] = None):
        """
        Clear embedding cache.
        
        Args:
            video_id: If provided, clear only this video's cache. 
                     If None, clear entire cache.
        """
        if video_id:
            if video_id in self._embedding_cache:
                del self._embedding_cache[video_id]
                print(f"[EmbeddingService] Cleared cache for video: {video_id}")
        else:
            self._embedding_cache.clear()
            print("[EmbeddingService] Cleared entire embedding cache")
    
    def get_cache_stats(self) -> Dict:
        """
        Get statistics about the embedding cache.
        
        Returns:
            Dictionary with cache statistics
        """
        total_videos = len(self._embedding_cache)
        total_embeddings = sum(
            len(cached['embeddings']) 
            for cached in self._embedding_cache.values()
        )
        
        return {
            'cached_videos': total_videos,
            'total_embeddings': total_embeddings,
            'cache_ttl_hours': self._cache_ttl.total_seconds() / 3600,
            'model': self.embedding_model,
            'dimension': self.embedding_dimension
        }
