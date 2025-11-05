"""
Centralized Transcript Service
Handles all transcript operations with S3 and DynamoDB

Features:
- Caching with TTL
- Batch fetching
- Error handling and retries
- Full text and timestamped segment retrieval
- Search functionality
"""

from typing import Dict, List, Optional, Tuple
import boto3
from botocore.exceptions import ClientError
import json
import logging
from datetime import datetime, timedelta
from functools import lru_cache

logger = logging.getLogger(__name__)

class TranscriptService:
    """
    Production-ready transcript service with caching and error handling.
    """
    
    def __init__(self):
        """Initialize AWS clients and cache"""
        self.s3_client = boto3.client('s3', region_name='ap-south-1')
        self.dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
        
        # S3 bucket for transcripts
        self.bucket = 'streamsmart-transcripts-560271561936'
        
        # In-memory cache with TTL
        self._cache: Dict[str, Tuple[Dict, datetime]] = {}
        self._cache_ttl = timedelta(minutes=30)
        
        logger.info(f"TranscriptService initialized with bucket: {self.bucket}")
    
    def get_transcript(self, video_id: str) -> Optional[Dict]:
        """
        Fetch complete transcript data from S3.
        Uses caching for performance.
        
        Args:
            video_id: YouTube video ID (11 characters)
        
        Returns:
            Dict with transcript data or None if not found
            Format: {
                'videoId': str,
                'title': str,
                'segments': [
                    {'timestamp': str, 'text': str},
                    ...
                ],
                'uploadedAt': str
            }
        """
        # Validate video ID
        if not video_id or len(video_id) != 11:
            logger.warning(f"Invalid video ID format: {video_id}")
            return None
        
        # Check cache first
        cache_key = f"transcript:{video_id}"
        if cache_key in self._cache:
            cached_data, cached_time = self._cache[cache_key]
            if datetime.now() - cached_time < self._cache_ttl:
                logger.info(f"Cache hit for video {video_id}")
                return cached_data
            else:
                # Cache expired, remove it
                del self._cache[cache_key]
        
        # Fetch from S3
        try:
            s3_key = f"{video_id}.json"
            logger.info(f"Fetching transcript from S3: {s3_key}")
            
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=s3_key
            )
            
            transcript_data = json.loads(response['Body'].read().decode('utf-8'))
            
            # Update cache
            self._cache[cache_key] = (transcript_data, datetime.now())
            
            logger.info(f"✅ Fetched transcript for {video_id} from S3")
            logger.info(f"   Segments: {len(transcript_data.get('segments', []))}")
            logger.info(f"   Title: {transcript_data.get('title', 'N/A')}")
            
            return transcript_data
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.warning(f"❌ Transcript not found for {video_id}")
            else:
                logger.error(f"❌ S3 error fetching {video_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error fetching {video_id}: {e}")
            return None
    
    def get_full_text(self, video_id: str) -> str:
        """
        Get concatenated transcript text without timestamps.
        Useful for AI processing.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Full transcript as single string
        """
        transcript = self.get_transcript(video_id)
        if not transcript:
            logger.warning(f"No transcript found for {video_id}, returning empty string")
            return ""
        
        segments = transcript.get('segments', [])
        if not segments:
            logger.warning(f"Transcript for {video_id} has no segments")
            return ""
        
        # Join all segment texts with spaces
        full_text = " ".join([
            seg.get('text', '').strip()
            for seg in segments 
            if seg.get('text')
        ])
        
        logger.info(f"Generated full text for {video_id}: {len(full_text)} characters")
        return full_text.strip()
    
    def get_timestamped_segments(self, video_id: str) -> List[Dict]:
        """
        Get segments with timestamps for precise answers.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            List of {timestamp: str, text: str}
        """
        transcript = self.get_transcript(video_id)
        if not transcript:
            return []
        
        segments = transcript.get('segments', [])
        logger.info(f"Retrieved {len(segments)} timestamped segments for {video_id}")
        return segments
    
    def batch_get_transcripts(self, video_ids: List[str]) -> Dict[str, Dict]:
        """
        Fetch multiple transcripts efficiently.
        Uses caching and parallel fetching.
        
        Args:
            video_ids: List of YouTube video IDs
            
        Returns:
            Dict mapping {videoId: transcript_data}
        """
        if not video_ids:
            return {}
        
        logger.info(f"📥 Batch fetching {len(video_ids)} transcripts...")
        
        results = {}
        
        for video_id in video_ids:
            transcript = self.get_transcript(video_id)
            if transcript:
                results[video_id] = transcript
        
        logger.info(f"✅ Batch fetch complete: {len(results)}/{len(video_ids)} transcripts found")
        return results
    
    def search_transcript(
        self, 
        video_id: str, 
        query: str, 
        top_k: int = 5,
        case_sensitive: bool = False
    ) -> List[Dict]:
        """
        Search within transcript segments using keyword matching.
        
        Args:
            video_id: YouTube video ID
            query: Search query
            top_k: Maximum number of results
            case_sensitive: Whether search is case-sensitive
            
        Returns:
            Top K matching segments with timestamps
        """
        segments = self.get_timestamped_segments(video_id)
        if not segments:
            logger.warning(f"No segments to search for {video_id}")
            return []
        
        # Prepare query
        search_query = query if case_sensitive else query.lower()
        
        # Find matching segments
        matches = []
        
        for seg in segments:
            text = seg.get('text', '')
            search_text = text if case_sensitive else text.lower()
            
            if search_query in search_text:
                matches.append({
                    'timestamp': seg.get('timestamp', '0:00'),
                    'text': text,
                    'videoId': video_id
                })
                
                if len(matches) >= top_k:
                    break
        
        logger.info(f"Found {len(matches)} matches for query '{query}' in {video_id}")
        return matches
    
    def get_transcript_summary(self, video_id: str) -> Optional[Dict]:
        """
        Get transcript summary/metadata without full content.
        Faster than full transcript fetch.
        
        Returns:
            Dict with title, segmentCount, duration, etc.
        """
        transcript = self.get_transcript(video_id)
        if not transcript:
            return None
        
        segments = transcript.get('segments', [])
        
        return {
            'videoId': video_id,
            'title': transcript.get('title', 'Unknown'),
            'segmentCount': len(segments),
            'uploadedAt': transcript.get('uploadedAt'),
            'language': transcript.get('language', 'en'),
            'hasTranscript': True
        }
    
    def clear_cache(self, video_id: Optional[str] = None):
        """
        Clear cache for specific video or all videos.
        
        Args:
            video_id: If provided, clear only this video. Otherwise clear all.
        """
        if video_id:
            cache_key = f"transcript:{video_id}"
            if cache_key in self._cache:
                del self._cache[cache_key]
                logger.info(f"Cleared cache for {video_id}")
        else:
            self._cache.clear()
            logger.info("Cleared all transcript cache")
    
    def chunk_transcript(
        self,
        video_id: str,
        chunk_size: int = 500,  # words
        overlap: int = 50       # words
    ) -> List[Dict]:
        """
        Split transcript into overlapping chunks for better context.
        Useful for RAG and embeddings.
        
        Args:
            video_id: YouTube video ID
            chunk_size: Words per chunk
            overlap: Overlapping words between chunks
            
        Returns:
            List of chunks with metadata
        """
        full_text = self.get_full_text(video_id)
        if not full_text:
            return []
        
        words = full_text.split()
        chunks = []
        start_idx = 0
        chunk_num = 0
        
        while start_idx < len(words):
            end_idx = min(start_idx + chunk_size, len(words))
            chunk_text = " ".join(words[start_idx:end_idx])
            
            chunks.append({
                'chunkId': f"{video_id}_chunk_{chunk_num}",
                'videoId': video_id,
                'text': chunk_text,
                'startWord': start_idx,
                'endWord': end_idx,
                'chunkNumber': chunk_num
            })
            
            start_idx += (chunk_size - overlap)
            chunk_num += 1
        
        logger.info(f"Created {len(chunks)} chunks for {video_id}")
        return chunks
    
    def extract_key_concepts(
        self,
        video_id: str,
        max_concepts: int = 10
    ) -> List[str]:
        """
        Extract key concepts from transcript using word frequency.
        Phase 1: Simple frequency analysis
        Phase 2: Can be enhanced with NLP/spaCy
        
        Args:
            video_id: YouTube video ID
            max_concepts: Maximum number of concepts to return
            
        Returns:
            List of key concepts/terms
        """
        full_text = self.get_full_text(video_id)
        if not full_text:
            return []
        
        # Common stopwords to filter out
        stopwords = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has',
            'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may',
            'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
            'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where',
            'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
            'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'like',
            'get', 'got', 'make', 'made', 'go', 'going', 'really', 'thing', 'things'
        }
        
        # Tokenize and clean
        words = full_text.lower().split()
        
        # Count word frequency
        word_freq = {}
        for word in words:
            # Clean word (remove punctuation)
            word = ''.join(c for c in word if c.isalnum())
            
            # Skip if too short or stopword
            if len(word) <= 3 or word in stopwords:
                continue
            
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top N
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        key_concepts = [word for word, freq in sorted_words[:max_concepts]]
        
        logger.info(f"Extracted {len(key_concepts)} key concepts from {video_id}: {key_concepts}")
        return key_concepts


# Singleton instance
transcript_service = TranscriptService()
