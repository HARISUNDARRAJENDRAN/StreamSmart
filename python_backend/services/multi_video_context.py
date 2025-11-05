"""
Multi-Video Context Manager - Intelligent cross-video RAG system
Enables querying across multiple videos simultaneously with smart chunking
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from services.transcript_service import transcript_service
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)

class MultiVideoContextManager:
    """
    Manages context building from multiple videos for RAG queries
    Features:
    - Semantic search across all videos
    - Intelligent chunking within token limits
    - Source attribution per video
    - Query classification (single vs multi-video)
    """
    
    def __init__(self, max_context_tokens: int = 6000):
        self.max_context_tokens = max_context_tokens
        self.chunk_size = 500  # characters per chunk
        self.overlap = 50  # character overlap between chunks
        
    def build_context(
        self,
        video_ids: List[str],
        query: str,
        query_type: str = 'auto'
    ) -> Dict[str, Any]:
        """
        Build optimal context from multiple videos
        
        Args:
            video_ids: List of YouTube video IDs
            query: User's question
            query_type: 'single', 'multi', 'compare', 'synthesize', or 'auto'
            
        Returns:
            Dict with formatted_context, sources, and metadata
        """
        try:
            # Classify query type if auto
            if query_type == 'auto':
                query_type = self.classify_query(query, len(video_ids))
            
            logger.info(f"Building context for {len(video_ids)} videos, type: {query_type}")
            
            # Fetch all transcripts
            transcripts_data = self._fetch_all_transcripts(video_ids)
            
            if not transcripts_data:
                return {
                    'formatted_context': '',
                    'sources': [],
                    'query_type': query_type,
                    'video_count': 0
                }
            
            # Build chunks from all videos
            all_chunks = self._create_chunks(transcripts_data)
            
            # Semantic search across all chunks
            relevant_chunks = self._semantic_search(query, all_chunks)
            
            # Select best chunks within token limit
            selected_chunks = self._select_chunks(
                relevant_chunks,
                max_tokens=self.max_context_tokens
            )
            
            # Group by video
            grouped_chunks = self._group_by_video(selected_chunks)
            
            # Format context based on query type
            formatted_context = self._format_context(
                grouped_chunks,
                query_type,
                query
            )
            
            # Build source references
            sources = self._build_sources(grouped_chunks, transcripts_data)
            
            return {
                'formatted_context': formatted_context,
                'sources': sources,
                'query_type': query_type,
                'video_count': len(grouped_chunks),
                'chunk_count': len(selected_chunks),
                'confidence': self._calculate_confidence(relevant_chunks)
            }
            
        except Exception as e:
            logger.error(f"Error building context: {e}", exc_info=True)
            return {
                'formatted_context': '',
                'sources': [],
                'query_type': query_type,
                'video_count': 0,
                'error': str(e)
            }
    
    def classify_query(self, query: str, video_count: int) -> str:
        """
        Classify query type based on keywords and video count
        
        Returns: 'single', 'multi', 'compare', or 'synthesize'
        """
        query_lower = query.lower()
        
        # Multi-video indicators
        compare_keywords = ['compare', 'contrast', 'difference', 'versus', 'vs', 'better']
        multi_keywords = ['all videos', 'across', 'throughout', 'overall', 'together']
        navigation_keywords = ['which video', 'what video', 'find video', 'video about']
        synthesis_keywords = ['combine', 'synthesize', 'merge', 'unify', 'overall view']
        
        # Check for comparison
        if any(keyword in query_lower for keyword in compare_keywords):
            return 'compare'
        
        # Check for synthesis
        if any(keyword in query_lower for keyword in synthesis_keywords):
            return 'synthesize'
        
        # Check for navigation
        if any(keyword in query_lower for keyword in navigation_keywords):
            return 'navigation'
        
        # Check for explicit multi-video
        if any(keyword in query_lower for keyword in multi_keywords):
            return 'multi'
        
        # Check for video-specific references (Video 1, first video, etc.)
        video_refs = ['video 1', 'video 2', 'first video', 'second video', 'both videos']
        if any(ref in query_lower for ref in video_refs) and video_count > 1:
            return 'multi'
        
        # Default: single video focus, but use all for context
        return 'single' if video_count == 1 else 'multi'
    
    def _fetch_all_transcripts(self, video_ids: List[str]) -> Dict[str, Dict]:
        """Fetch transcripts for all videos"""
        transcripts = {}
        
        for video_id in video_ids:
            try:
                transcript_data = transcript_service.get_transcript(video_id)
                if transcript_data:
                    transcripts[video_id] = transcript_data
            except Exception as e:
                logger.warning(f"Could not fetch transcript for {video_id}: {e}")
                continue
        
        return transcripts
    
    def _create_chunks(
        self,
        transcripts_data: Dict[str, Dict]
    ) -> List[Dict[str, Any]]:
        """
        Create chunks from all transcripts with overlap
        Each chunk includes video_id, text, and timestamp info
        """
        chunks = []
        
        for video_id, transcript_data in transcripts_data.items():
            full_text = transcript_service.get_full_text(video_id)
            title = transcript_data.get('title', 'Unknown Video')
            
            # Create overlapping chunks
            text_length = len(full_text)
            start = 0
            
            while start < text_length:
                end = min(start + self.chunk_size, text_length)
                chunk_text = full_text[start:end]
                
                chunks.append({
                    'video_id': video_id,
                    'video_title': title,
                    'text': chunk_text,
                    'start_char': start,
                    'end_char': end,
                    'relevance_score': 0.0  # Will be set by semantic search
                })
                
                # Move start position with overlap
                start += self.chunk_size - self.overlap
        
        logger.info(f"Created {len(chunks)} chunks from {len(transcripts_data)} videos")
        return chunks
    
    def _semantic_search(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search across chunks
        Simple implementation using keyword matching and TF-IDF-like scoring
        Production: Use embeddings + cosine similarity
        """
        query_words = set(query.lower().split())
        
        # Score each chunk
        for chunk in chunks:
            chunk_words = set(chunk['text'].lower().split())
            
            # Calculate overlap (simple relevance)
            common_words = query_words & chunk_words
            relevance = len(common_words) / max(len(query_words), 1)
            
            # Boost if query words appear close together
            chunk_lower = chunk['text'].lower()
            for word in query_words:
                if word in chunk_lower:
                    relevance += 0.1
            
            chunk['relevance_score'] = min(relevance, 1.0)
        
        # Sort by relevance
        sorted_chunks = sorted(
            chunks,
            key=lambda x: x['relevance_score'],
            reverse=True
        )
        
        # Return top K chunks
        top_chunks = sorted_chunks[:top_k]
        logger.info(f"Selected top {len(top_chunks)} chunks (max score: {top_chunks[0]['relevance_score']:.2f})")
        
        return top_chunks
    
    def _select_chunks(
        self,
        chunks: List[Dict[str, Any]],
        max_tokens: int
    ) -> List[Dict[str, Any]]:
        """
        Select best chunks within token limit
        Rough estimate: 1 token ≈ 4 characters
        """
        max_chars = max_tokens * 4
        selected = []
        total_chars = 0
        
        for chunk in chunks:
            chunk_chars = len(chunk['text'])
            
            if total_chars + chunk_chars <= max_chars:
                selected.append(chunk)
                total_chars += chunk_chars
            else:
                # Try to fit partial chunk
                remaining = max_chars - total_chars
                if remaining > 100:  # Only if meaningful amount left
                    partial_chunk = chunk.copy()
                    partial_chunk['text'] = chunk['text'][:remaining]
                    selected.append(partial_chunk)
                break
        
        logger.info(f"Selected {len(selected)} chunks ({total_chars} chars)")
        return selected
    
    def _group_by_video(
        self,
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group chunks by video ID"""
        grouped = defaultdict(list)
        
        for chunk in chunks:
            grouped[chunk['video_id']].append(chunk)
        
        return dict(grouped)
    
    def _format_context(
        self,
        grouped_chunks: Dict[str, List[Dict[str, Any]]],
        query_type: str,
        query: str
    ) -> str:
        """
        Format context based on query type
        """
        if query_type == 'compare':
            return self._format_comparison_context(grouped_chunks)
        elif query_type == 'synthesize':
            return self._format_synthesis_context(grouped_chunks)
        elif query_type == 'navigation':
            return self._format_navigation_context(grouped_chunks, query)
        else:
            return self._format_standard_context(grouped_chunks)
    
    def _format_standard_context(
        self,
        grouped_chunks: Dict[str, List[Dict[str, Any]]]
    ) -> str:
        """Standard context formatting"""
        context = "=== VIDEO CONTENT ===\n\n"
        
        for video_id, chunks in grouped_chunks.items():
            video_title = chunks[0]['video_title']
            context += f"📹 VIDEO: {video_title}\n"
            context += f"ID: {video_id}\n\n"
            
            for i, chunk in enumerate(chunks, 1):
                context += f"Excerpt {i}:\n{chunk['text']}\n\n"
            
            context += "---\n\n"
        
        return context
    
    def _format_comparison_context(
        self,
        grouped_chunks: Dict[str, List[Dict[str, Any]]]
    ) -> str:
        """Format for comparison queries"""
        context = "=== COMPARING VIDEOS ===\n\n"
        
        for i, (video_id, chunks) in enumerate(grouped_chunks.items(), 1):
            video_title = chunks[0]['video_title']
            context += f"## VIDEO {i}: {video_title}\n\n"
            
            # Combine all chunks for this video
            combined_text = " ".join(chunk['text'] for chunk in chunks)
            context += f"{combined_text}\n\n"
            context += "---\n\n"
        
        context += "\n📊 TASK: Compare and contrast these videos on the requested topic.\n"
        return context
    
    def _format_synthesis_context(
        self,
        grouped_chunks: Dict[str, List[Dict[str, Any]]]
    ) -> str:
        """Format for synthesis queries"""
        context = "=== SYNTHESIZING MULTIPLE SOURCES ===\n\n"
        
        for video_id, chunks in grouped_chunks.items():
            video_title = chunks[0]['video_title']
            combined_text = " ".join(chunk['text'] for chunk in chunks)
            
            context += f"From \"{video_title}\":\n{combined_text}\n\n"
        
        context += "\n🔄 TASK: Synthesize information from all sources into a unified explanation.\n"
        return context
    
    def _format_navigation_context(
        self,
        grouped_chunks: Dict[str, List[Dict[str, Any]]],
        query: str
    ) -> str:
        """Format for navigation queries (find specific video)"""
        context = "=== FINDING RELEVANT VIDEO ===\n\n"
        context += f"Query: {query}\n\n"
        
        # Show video titles and best matching excerpts
        for video_id, chunks in grouped_chunks.items():
            video_title = chunks[0]['video_title']
            best_chunk = max(chunks, key=lambda x: x['relevance_score'])
            
            context += f"📹 {video_title}\n"
            context += f"Match Score: {best_chunk['relevance_score']:.2f}\n"
            context += f"Excerpt: {best_chunk['text'][:200]}...\n\n"
        
        context += "\n🔍 TASK: Recommend which video(s) best answer the query.\n"
        return context
    
    def _build_sources(
        self,
        grouped_chunks: Dict[str, List[Dict[str, Any]]],
        transcripts_data: Dict[str, Dict]
    ) -> List[Dict[str, Any]]:
        """Build source references for each video"""
        sources = []
        
        for video_id, chunks in grouped_chunks.items():
            video_title = chunks[0]['video_title']
            relevance = sum(c['relevance_score'] for c in chunks) / len(chunks)
            
            # Get best snippet
            best_chunk = max(chunks, key=lambda x: x['relevance_score'])
            snippet = best_chunk['text'][:100] + "..."
            
            sources.append({
                'videoId': video_id,
                'videoTitle': video_title,
                'confidence': min(relevance, 0.95),
                'snippet': snippet,
                'chunkCount': len(chunks)
            })
        
        # Sort by confidence
        sources.sort(key=lambda x: x['confidence'], reverse=True)
        
        return sources
    
    def _calculate_confidence(self, chunks: List[Dict[str, Any]]) -> float:
        """Calculate overall confidence based on chunk relevance"""
        if not chunks:
            return 0.0
        
        avg_relevance = sum(c['relevance_score'] for c in chunks) / len(chunks)
        
        # Boost confidence if multiple high-relevance chunks
        high_relevance_count = sum(1 for c in chunks if c['relevance_score'] > 0.5)
        boost = min(high_relevance_count * 0.05, 0.2)
        
        return min(avg_relevance + boost, 0.95)

# Global singleton
multi_video_context_manager = MultiVideoContextManager()
