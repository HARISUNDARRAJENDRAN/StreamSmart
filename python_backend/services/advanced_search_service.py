"""
Advanced Search & Retrieval Service - Feature 10
Semantic search across videos with filters, ranking, and search history
"""

import logging
import os
from typing import Dict, Any, List, Optional
from openai import OpenAI
import boto3
from datetime import datetime, timedelta
import json
import hashlib
from collections import defaultdict

logger = logging.getLogger(__name__)


class AdvancedSearchService:
    """
    Handles advanced search capabilities including semantic search,
    filters, ranking, and search history
    """
    
    def __init__(self):
        """
        Initialize with OpenAI for embeddings and DynamoDB for persistence
        """
        self._openai_client = None
        self._dynamodb = None
        self._videos_table = None
        self._search_history_table = None
        self._saved_searches_table = None
        
        # Embedding model
        self.embedding_model = "text-embedding-3-small"
        
        # In-memory cache for embeddings (upgrade to Redis for production)
        self._embedding_cache: Dict[str, List[float]] = {}
        
        logger.info("✅ AdvancedSearchService initialized (lazy loading)")
    
    @property
    def openai_client(self):
        """Lazy load OpenAI client"""
        if self._openai_client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set in environment")
            self._openai_client = OpenAI(api_key=api_key)
        return self._openai_client
    
    @property
    def dynamodb(self):
        """Lazy load DynamoDB resource"""
        if self._dynamodb is None:
            self._dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'ap-south-2'))
        return self._dynamodb
    
    @property
    def videos_table(self):
        """Lazy load videos table"""
        if self._videos_table is None:
            self._videos_table = self.dynamodb.Table(os.getenv('DYNAMODB_TABLE_NAME', 'StreamSmart-Videos'))
        return self._videos_table
    
    @property
    def search_history_table(self):
        """Lazy load search history table"""
        if self._search_history_table is None:
            self._search_history_table = self._get_or_create_search_history_table()
        return self._search_history_table
    
    @property
    def saved_searches_table(self):
        """Lazy load saved searches table"""
        if self._saved_searches_table is None:
            self._saved_searches_table = self._get_or_create_saved_searches_table()
        return self._saved_searches_table
    
    def _get_or_create_search_history_table(self):
        """Get or create search history table"""
        table_name = 'StreamSmart-SearchHistory'
        try:
            return self.dynamodb.Table(table_name)
        except Exception as e:
            logger.warning(f"Search history table not found: {e}")
            return None
    
    def _get_or_create_saved_searches_table(self):
        """Get or create saved searches table"""
        table_name = 'StreamSmart-SavedSearches'
        try:
            return self.dynamodb.Table(table_name)
        except Exception as e:
            logger.warning(f"Saved searches table not found: {e}")
            return None
    
    async def semantic_search(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Perform semantic search across video transcripts and metadata
        
        Args:
            query: Search query
            user_id: Optional user ID for personalization
            limit: Maximum results to return
            filters: Optional filters (topics, dates, difficulty, etc.)
        
        Returns:
            Dict with search results and metadata
        """
        try:
            logger.info(f"Semantic search: '{query}' (limit: {limit})")
            
            # Generate query embedding
            query_embedding = await self._get_embedding(query)
            
            # Get all videos (in production, use vector database like OpenSearch)
            videos = await self._get_all_videos()
            
            # Calculate similarity scores
            scored_results = []
            for video in videos:
                # Apply filters first
                if filters and not self._matches_filters(video, filters):
                    continue
                
                # Calculate relevance score
                score = await self._calculate_relevance(
                    video=video,
                    query=query,
                    query_embedding=query_embedding,
                    user_id=user_id
                )
                
                scored_results.append({
                    'video': video,
                    'score': score,
                    'match_type': self._get_match_type(video, query)
                })
            
            # Sort by score
            scored_results.sort(key=lambda x: x['score'], reverse=True)
            
            # Limit results
            top_results = scored_results[:limit]
            
            # Format results
            formatted_results = []
            for item in top_results:
                video = item['video']
                formatted_results.append({
                    'video_id': video.get('videoId'),
                    'title': video.get('title'),
                    'description': video.get('description', ''),
                    'thumbnail': video.get('thumbnail'),
                    'duration': video.get('duration'),
                    'topics': video.get('topics', []),
                    'difficulty': video.get('difficulty', 'intermediate'),
                    'relevance_score': round(item['score'], 3),
                    'match_type': item['match_type'],
                    'snippet': self._extract_snippet(video, query)
                })
            
            # Track search if user_id provided
            if user_id:
                await self._track_search(
                    user_id=user_id,
                    query=query,
                    filters=filters,
                    results_count=len(formatted_results)
                )
            
            return {
                'query': query,
                'results': formatted_results,
                'total_count': len(formatted_results),
                'has_more': len(scored_results) > limit,
                'filters_applied': filters or {},
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Semantic search error: {e}", exc_info=True)
            return {
                'error': str(e),
                'query': query,
                'results': [],
                'total_count': 0
            }
    
    async def advanced_search(
        self,
        query: str,
        user_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = 'relevance',
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Advanced search with multiple ranking factors
        
        Args:
            query: Search query
            user_id: Optional user ID
            filters: Filters dict with keys:
                - topics: List[str]
                - date_range: Dict[str, str] (start, end)
                - difficulty: str (beginner/intermediate/advanced/expert)
                - min_duration: int (seconds)
                - max_duration: int (seconds)
            sort_by: Sort criteria (relevance/recency/popularity/duration)
            limit: Maximum results
        
        Returns:
            Search results with advanced ranking
        """
        try:
            # First, do semantic search
            results = await self.semantic_search(
                query=query,
                user_id=user_id,
                limit=limit * 2,  # Get more for re-ranking
                filters=filters
            )
            
            # Re-rank based on sort_by
            ranked_results = self._rerank_results(
                results=results['results'],
                sort_by=sort_by,
                user_id=user_id
            )
            
            # Limit after re-ranking
            final_results = ranked_results[:limit]
            
            return {
                'query': query,
                'results': final_results,
                'total_count': len(final_results),
                'sort_by': sort_by,
                'filters_applied': filters or {},
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Advanced search error: {e}", exc_info=True)
            return {
                'error': str(e),
                'results': [],
                'total_count': 0
            }
    
    async def get_search_history(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get user's search history
        
        Args:
            user_id: User ID
            limit: Maximum history items
        
        Returns:
            List of recent searches
        """
        try:
            if not self.search_history_table:
                return []
            
            response = self.search_history_table.query(
                KeyConditionExpression='PK = :pk',
                ExpressionAttributeValues={
                    ':pk': f'USER#{user_id}'
                },
                ScanIndexForward=False,  # Most recent first
                Limit=limit
            )
            
            history = []
            for item in response.get('Items', []):
                history.append({
                    'query': item.get('query'),
                    'filters': item.get('filters', {}),
                    'results_count': item.get('results_count', 0),
                    'clicked_result': item.get('clicked_result'),
                    'timestamp': item.get('timestamp')
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting search history: {e}")
            return []
    
    async def save_search(
        self,
        user_id: str,
        name: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save a search for quick recall
        
        Args:
            user_id: User ID
            name: Display name for saved search
            query: Search query
            filters: Optional filters
        
        Returns:
            Saved search info
        """
        try:
            if not self.saved_searches_table:
                return {'error': 'Saved searches not available'}
            
            search_id = hashlib.md5(f"{user_id}{name}{query}".encode()).hexdigest()[:12]
            
            item = {
                'PK': f'USER#{user_id}',
                'SK': f'SAVED#{search_id}',
                'name': name,
                'query': query,
                'filters': filters or {},
                'createdAt': datetime.now().isoformat(),
                'lastUsed': datetime.now().isoformat()
            }
            
            self.saved_searches_table.put_item(Item=item)
            
            logger.info(f"✅ Saved search '{name}' for user {user_id}")
            
            return {
                'search_id': search_id,
                'name': name,
                'query': query,
                'filters': filters,
                'created_at': item['createdAt']
            }
            
        except Exception as e:
            logger.error(f"Error saving search: {e}")
            return {'error': str(e)}
    
    async def get_saved_searches(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get user's saved searches
        
        Args:
            user_id: User ID
        
        Returns:
            List of saved searches
        """
        try:
            if not self.saved_searches_table:
                return []
            
            response = self.saved_searches_table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'USER#{user_id}',
                    ':sk': 'SAVED#'
                }
            )
            
            searches = []
            for item in response.get('Items', []):
                search_id = item['SK'].replace('SAVED#', '')
                searches.append({
                    'search_id': search_id,
                    'name': item.get('name'),
                    'query': item.get('query'),
                    'filters': item.get('filters', {}),
                    'created_at': item.get('createdAt'),
                    'last_used': item.get('lastUsed')
                })
            
            return searches
            
        except Exception as e:
            logger.error(f"Error getting saved searches: {e}")
            return []
    
    async def delete_saved_search(
        self,
        user_id: str,
        search_id: str
    ) -> bool:
        """Delete a saved search"""
        try:
            if not self.saved_searches_table:
                return False
            
            self.saved_searches_table.delete_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'SAVED#{search_id}'
                }
            )
            
            logger.info(f"✅ Deleted saved search {search_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting saved search: {e}")
            return False
    
    # Helper methods
    
    async def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text"""
        # Check cache
        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]
        
        # Generate embedding
        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        
        embedding = response.data[0].embedding
        
        # Cache it
        self._embedding_cache[cache_key] = embedding
        
        return embedding
    
    async def _get_all_videos(self) -> List[Dict[str, Any]]:
        """Get all videos from DynamoDB"""
        try:
            response = self.videos_table.scan()
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting videos: {e}")
            return []
    
    def _matches_filters(self, video: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Check if video matches filters"""
        # Topics filter
        if 'topics' in filters:
            video_topics = set(video.get('topics', []))
            filter_topics = set(filters['topics'])
            if not video_topics.intersection(filter_topics):
                return False
        
        # Difficulty filter
        if 'difficulty' in filters:
            if video.get('difficulty') != filters['difficulty']:
                return False
        
        # Duration filter
        if 'min_duration' in filters:
            if video.get('duration', 0) < filters['min_duration']:
                return False
        
        if 'max_duration' in filters:
            if video.get('duration', 0) > filters['max_duration']:
                return False
        
        # Date range filter
        if 'date_range' in filters:
            video_date = video.get('uploadDate')
            if video_date:
                video_datetime = datetime.fromisoformat(video_date)
                start_date = datetime.fromisoformat(filters['date_range'].get('start', '2000-01-01'))
                end_date = datetime.fromisoformat(filters['date_range'].get('end', '2100-01-01'))
                if not (start_date <= video_datetime <= end_date):
                    return False
        
        return True
    
    async def _calculate_relevance(
        self,
        video: Dict[str, Any],
        query: str,
        query_embedding: List[float],
        user_id: Optional[str]
    ) -> float:
        """Calculate relevance score for video"""
        score = 0.0
        
        # Semantic similarity (using title + description)
        video_text = f"{video.get('title', '')} {video.get('description', '')}"
        video_embedding = await self._get_embedding(video_text)
        
        # Cosine similarity
        similarity = self._cosine_similarity(query_embedding, video_embedding)
        score += similarity * 0.6  # 60% weight
        
        # Keyword matching bonus
        query_lower = query.lower()
        title_lower = video.get('title', '').lower()
        
        if query_lower in title_lower:
            score += 0.2  # Exact match bonus
        
        # Topic relevance
        video_topics = [t.lower() for t in video.get('topics', [])]
        for topic in video_topics:
            if topic in query_lower or query_lower in topic:
                score += 0.1
        
        # Recency bonus (videos from last 30 days)
        upload_date = video.get('uploadDate')
        if upload_date:
            days_old = (datetime.now() - datetime.fromisoformat(upload_date)).days
            if days_old < 30:
                score += 0.05 * (30 - days_old) / 30
        
        # Popularity bonus (view count, if available)
        views = video.get('views', 0)
        if views > 1000:
            score += min(0.1, views / 100000)
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def _get_match_type(self, video: Dict[str, Any], query: str) -> str:
        """Determine type of match"""
        query_lower = query.lower()
        title_lower = video.get('title', '').lower()
        
        if query_lower in title_lower:
            return 'title_match'
        
        video_topics = [t.lower() for t in video.get('topics', [])]
        for topic in video_topics:
            if topic in query_lower or query_lower in topic:
                return 'topic_match'
        
        return 'semantic_match'
    
    def _extract_snippet(self, video: Dict[str, Any], query: str, max_length: int = 150) -> str:
        """Extract relevant snippet from video description"""
        description = video.get('description', '')
        if not description:
            return video.get('title', '')[:max_length]
        
        # Find query in description
        query_lower = query.lower()
        desc_lower = description.lower()
        
        index = desc_lower.find(query_lower)
        if index != -1:
            # Extract context around query
            start = max(0, index - 50)
            end = min(len(description), index + len(query) + 50)
            snippet = description[start:end]
            if start > 0:
                snippet = '...' + snippet
            if end < len(description):
                snippet = snippet + '...'
            return snippet
        
        # Otherwise, just return beginning of description
        return description[:max_length] + ('...' if len(description) > max_length else '')
    
    def _rerank_results(
        self,
        results: List[Dict[str, Any]],
        sort_by: str,
        user_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Re-rank results based on sort criteria"""
        if sort_by == 'relevance':
            # Already sorted by relevance
            return results
        
        elif sort_by == 'recency':
            # Sort by upload date (newest first)
            return sorted(results, key=lambda x: x.get('upload_date', ''), reverse=True)
        
        elif sort_by == 'popularity':
            # Sort by views (highest first)
            return sorted(results, key=lambda x: x.get('views', 0), reverse=True)
        
        elif sort_by == 'duration':
            # Sort by duration (shortest first)
            return sorted(results, key=lambda x: x.get('duration', 0))
        
        return results
    
    async def _track_search(
        self,
        user_id: str,
        query: str,
        filters: Optional[Dict[str, Any]],
        results_count: int
    ):
        """Track search in history"""
        if not self.search_history_table:
            return
        
        try:
            timestamp = datetime.now().isoformat()
            
            item = {
                'PK': f'USER#{user_id}',
                'SK': f'SEARCH#{timestamp}',
                'query': query,
                'filters': filters or {},
                'results_count': results_count,
                'timestamp': timestamp
            }
            
            self.search_history_table.put_item(Item=item)
            
        except Exception as e:
            logger.error(f"Error tracking search: {e}")


# Singleton instance
advanced_search_service = AdvancedSearchService()
