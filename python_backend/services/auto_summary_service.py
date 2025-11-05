"""
Auto-Summary Service - Proactive AI Assistant (Feature 8)
Automatically generates video summaries and key moments on load
"""

import logging
from typing import Dict, Any, List, Optional
from openai import OpenAI
import os
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class AutoSummaryService:
    """
    Generates automatic video summaries and identifies key moments
    """
    
    def __init__(self):
        """
        Initialize with OpenAI client and cache
        """
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.cache = {}  # In-memory cache (would use Redis in production)
        self.cache_ttl = 3600  # 1 hour
        logger.info("✅ AutoSummaryService initialized")
    
    async def generate_video_summary(
        self,
        video_id: str,
        transcript: str,
        title: str = "",
        generate_levels: int = 3
    ) -> Dict[str, Any]:
        """
        Generate multi-level summary on video load
        
        Args:
            video_id: YouTube video ID
            transcript: Full video transcript
            title: Video title
            generate_levels: Number of summary levels (1-3)
        
        Returns:
            Dict with summaries at different levels
        """
        try:
            # Check cache first
            cache_key = f"summary:{video_id}:{generate_levels}"
            if cache_key in self.cache:
                cached_data = self.cache[cache_key]
                if (datetime.now().timestamp() - cached_data['timestamp']) < self.cache_ttl:
                    logger.info(f"✅ Returning cached summary for {video_id}")
                    return cached_data['summary']
            
            # Limit transcript length for API
            max_transcript_length = 12000  # ~3000 tokens
            if len(transcript) > max_transcript_length:
                transcript = transcript[:max_transcript_length] + "..."
            
            # Generate summaries
            summaries = {}
            
            if generate_levels >= 1:
                # TL;DR (ultra-concise)
                summaries['tldr'] = await self._generate_tldr(transcript, title)
            
            if generate_levels >= 2:
                # Medium (balanced)
                summaries['medium'] = await self._generate_medium_summary(transcript, title)
            
            if generate_levels >= 3:
                # Detailed (comprehensive)
                summaries['detailed'] = await self._generate_detailed_summary(transcript, title)
            
            result = {
                'video_id': video_id,
                'title': title,
                'summaries': summaries,
                'word_counts': {
                    level: len(text.split()) for level, text in summaries.items()
                },
                'generated_at': datetime.now().isoformat()
            }
            
            # Cache the result
            self.cache[cache_key] = {
                'summary': result,
                'timestamp': datetime.now().timestamp()
            }
            
            logger.info(f"✅ Generated {generate_levels}-level summary for {video_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}", exc_info=True)
            # Return fallback
            return {
                'video_id': video_id,
                'title': title,
                'summaries': {
                    'tldr': f"Summary for: {title}",
                    'medium': "Unable to generate summary at this time.",
                    'detailed': "Please try again later."
                },
                'generated_at': datetime.now().isoformat()
            }
    
    async def _generate_tldr(self, transcript: str, title: str) -> str:
        """
        Generate ultra-concise TL;DR (1-2 sentences)
        """
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a master summarizer. Create an ultra-concise TL;DR summary.

REQUIREMENTS:
- Maximum 2 sentences
- Capture the absolute core message
- Use clear, simple language
- No fluff or filler words
- Focus on key takeaway"""
                    },
                    {
                        "role": "user",
                        "content": f"Title: {title}\n\nTranscript:\n{transcript}\n\nProvide TL;DR (2 sentences max):"
                    }
                ],
                temperature=0.3,
                max_tokens=100
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating TL;DR: {e}")
            return f"This video covers {title}"
    
    async def _generate_medium_summary(self, transcript: str, title: str) -> str:
        """
        Generate balanced summary (3-5 sentences)
        """
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a master summarizer. Create a balanced, informative summary.

REQUIREMENTS:
- 3-5 sentences
- Cover main topics
- Include key points
- Clear and engaging
- Structured flow"""
                    },
                    {
                        "role": "user",
                        "content": f"Title: {title}\n\nTranscript:\n{transcript}\n\nProvide medium summary (3-5 sentences):"
                    }
                ],
                temperature=0.5,
                max_tokens=200
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating medium summary: {e}")
            return f"A comprehensive overview of {title}"
    
    async def _generate_detailed_summary(self, transcript: str, title: str) -> str:
        """
        Generate comprehensive summary (paragraph format)
        """
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a master summarizer. Create a comprehensive, detailed summary.

REQUIREMENTS:
- Full paragraph format (6-10 sentences)
- Cover all major topics
- Include important details
- Logical flow
- Educational tone
- Capture nuances"""
                    },
                    {
                        "role": "user",
                        "content": f"Title: {title}\n\nTranscript:\n{transcript}\n\nProvide detailed summary (paragraph):"
                    }
                ],
                temperature=0.5,
                max_tokens=400
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating detailed summary: {e}")
            return f"An in-depth exploration of {title}"
    
    async def identify_key_moments(
        self,
        video_id: str,
        transcript: str,
        title: str = "",
        max_moments: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Identify important moments in the video
        
        Args:
            video_id: YouTube video ID
            transcript: Full video transcript with timestamps
            title: Video title
            max_moments: Maximum number of key moments to identify
        
        Returns:
            List of key moments with timestamps and categories
        """
        try:
            # Check cache
            cache_key = f"moments:{video_id}"
            if cache_key in self.cache:
                cached_data = self.cache[cache_key]
                if (datetime.now().timestamp() - cached_data['timestamp']) < self.cache_ttl:
                    logger.info(f"✅ Returning cached key moments for {video_id}")
                    return cached_data['moments']
            
            # Parse transcript to find segments with timestamps
            segments = self._parse_transcript_segments(transcript)
            
            if not segments:
                logger.warning(f"No timestamp segments found in transcript for {video_id}")
                return []
            
            # Use AI to identify key moments
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert at identifying important moments in educational videos.

Analyze the transcript and identify the top {max_moments} key moments.

MOMENT CATEGORIES:
- definition: Core concept definitions
- example: Practical examples or demonstrations
- insight: Key insights or "aha" moments
- summary: Section summaries or recaps
- question: Important questions posed/answered
- visual: References to diagrams or visual aids

Return ONLY a JSON array in this format:
[
  {{
    "timestamp": "00:15",
    "category": "definition",
    "title": "Brief title (5-7 words)",
    "description": "One sentence description",
    "importance": 0.95
  }}
]
"""
                    },
                    {
                        "role": "user",
                        "content": f"Title: {title}\n\nTranscript with timestamps:\n{transcript[:8000]}\n\nIdentify top {max_moments} key moments:"
                    }
                ],
                temperature=0.4,
                max_tokens=600
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Parse JSON response
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            moments = json.loads(response_text)
            
            # Add video_id to each moment
            for moment in moments:
                moment['video_id'] = video_id
            
            # Cache the result
            self.cache[cache_key] = {
                'moments': moments,
                'timestamp': datetime.now().timestamp()
            }
            
            logger.info(f"✅ Identified {len(moments)} key moments for {video_id}")
            
            return moments[:max_moments]
            
        except Exception as e:
            logger.error(f"Error identifying key moments: {e}", exc_info=True)
            return []
    
    def _parse_transcript_segments(self, transcript: str) -> List[Dict[str, Any]]:
        """
        Parse transcript into segments with timestamps
        """
        # Simple parsing - assumes format like "[00:15] text"
        # In production, use actual transcript API format
        segments = []
        lines = transcript.split('\n')
        
        for line in lines:
            if '[' in line and ']' in line:
                try:
                    timestamp = line.split('[')[1].split(']')[0]
                    text = line.split(']')[1].strip()
                    segments.append({
                        'timestamp': timestamp,
                        'text': text
                    })
                except:
                    continue
        
        return segments
    
    async def generate_proactive_insights(
        self,
        video_id: str,
        transcript: str,
        title: str,
        user_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate proactive insights shown immediately on video load
        
        Combines:
        - Auto-summary
        - Key moments
        - Personalized quick questions
        - Estimated watch time
        
        Args:
            video_id: YouTube video ID
            transcript: Full transcript
            title: Video title
            user_profile: Optional user profile for personalization
        
        Returns:
            Dict with all proactive insights
        """
        try:
            # Generate summary
            summary = await self.generate_video_summary(
                video_id=video_id,
                transcript=transcript,
                title=title,
                generate_levels=3
            )
            
            # Identify key moments
            key_moments = await self.identify_key_moments(
                video_id=video_id,
                transcript=transcript,
                title=title,
                max_moments=5
            )
            
            # Calculate video stats
            word_count = len(transcript.split())
            estimated_duration = word_count / 150  # Assume 150 words per minute
            
            # Personalized quick start questions
            quick_questions = await self._generate_quick_questions(
                title,
                summary['summaries'].get('tldr', ''),
                user_profile
            )
            
            insights = {
                'video_id': video_id,
                'title': title,
                'summary': summary,
                'key_moments': key_moments,
                'stats': {
                    'word_count': word_count,
                    'estimated_duration_minutes': round(estimated_duration, 1),
                    'total_key_moments': len(key_moments)
                },
                'quick_questions': quick_questions,
                'generated_at': datetime.now().isoformat()
            }
            
            logger.info(f"✅ Generated proactive insights for {video_id}")
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating proactive insights: {e}", exc_info=True)
            return {
                'video_id': video_id,
                'title': title,
                'error': 'Unable to generate insights'
            }
    
    async def _generate_quick_questions(
        self,
        title: str,
        summary: str,
        user_profile: Optional[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate 3 quick-start questions for immediate engagement
        """
        try:
            level = user_profile.get('educationLevel', 'intermediate') if user_profile else 'intermediate'
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""Generate 3 engaging questions a {level} learner might ask about this video.

Questions should be:
- Natural and conversational
- Relevant to the content
- Vary in type (what, how, why)
- Encourage deeper engagement

Return ONLY a JSON array of strings: ["Question 1?", "Question 2?", "Question 3?"]"""
                    },
                    {
                        "role": "user",
                        "content": f"Title: {title}\nSummary: {summary}\n\nGenerate 3 questions:"
                    }
                ],
                temperature=0.8,
                max_tokens=150
            )
            
            response_text = response.choices[0].message.content.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            questions = json.loads(response_text)
            return questions[:3]
            
        except Exception as e:
            logger.error(f"Error generating quick questions: {e}")
            return [
                "What is this video about?",
                "Can you explain the main concept?",
                "How does this apply to real-world scenarios?"
            ]


# Singleton instance
auto_summary_service = AutoSummaryService()
