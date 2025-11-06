"""
Lex Proxy Endpoint - Backend handles Lex communication
Flow: Frontend → Backend → Lex → OpenAI → Backend → Frontend

Enhanced with TranscriptService for automatic S3 fetching
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
import logging
import json
from typing import Optional
from services.transcript_service import transcript_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Lex configuration
LEX_BOT_ID = "8PLHOZHCUV"
LEX_BOT_ALIAS_ID = "PU4IPD1W0D"
LEX_LOCALE_ID = "en_US"
LEX_REGION = "us-east-1"

# Initialize Lex Runtime client
try:
    lex_runtime = boto3.client('lexv2-runtime', region_name=LEX_REGION)
    logger.info("✅ Lex Runtime client initialized")
except Exception as e:
    logger.error(f"Failed to initialize Lex client: {e}")
    lex_runtime = None

class LexVoiceRequest(BaseModel):
    text: str
    sessionId: str
    userId: str
    videoIds: Optional[list] = []

class SourceReference(BaseModel):
    videoId: str
    videoTitle: Optional[str] = None
    timestamp: Optional[str] = None
    confidence: Optional[float] = None
    snippet: Optional[str] = None

class LexVoiceResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    sessionId: str
    audioUrl: Optional[str] = None
    sources: Optional[list[SourceReference]] = []
    confidence: Optional[float] = None

@router.post("/lex-voice-chat", response_model=LexVoiceResponse)
async def lex_voice_chat(request: LexVoiceRequest):
    """
    Handle voice chat through Lex conversation layer
    Flow: Lex (intent) → OpenAI (answer) → Response
    """
    try:
        logger.info(f"🎤 Voice chat request: '{request.text}' (user: {request.userId})")
        
        # Step 1: Process through Lex (conversation management)
        intent_name = "FallbackIntent"  # Default
        
        if lex_runtime:
            try:
                logger.info("📤 Sending to Amazon Lex...")
                lex_response = lex_runtime.recognize_text(
                    botId=LEX_BOT_ID,
                    botAliasId=LEX_BOT_ALIAS_ID,
                    localeId=LEX_LOCALE_ID,
                    sessionId=request.sessionId,
                    text=request.text,
                    sessionState={
                        'sessionAttributes': {
                            'userId': request.userId,
                            'videoIds': json.dumps(request.videoIds)
                        }
                    }
                )
                
                intent_name = lex_response.get('sessionState', {}).get('intent', {}).get('name', 'FallbackIntent')
                logger.info(f"✅ Lex processed - Intent: {intent_name}")
                
            except Exception as lex_error:
                logger.warning(f"⚠️ Lex error (continuing without): {lex_error}")
        
        # Step 2: Use TranscriptService to fetch transcripts from S3
        logger.info(f"📥 Fetching transcripts using TranscriptService for {len(request.videoIds)} videos...")
        
        import requests
        
        if not request.videoIds or len(request.videoIds) == 0:
            logger.warning("No video IDs provided in request")
            return LexVoiceResponse(
                answer="I don't have any video context to answer from. Please make sure:\n1. You've added videos to this playlist\n2. Transcripts have been extracted from the videos\n3. Try refreshing the page",
                sessionId=request.sessionId,
                intent=intent_name
            )
        
        # Extract YouTube IDs (handle both database IDs and YouTube IDs)
        youtube_ids = []
        for vid in request.videoIds:
            if vid.startswith('video_'):
                # Database ID - extract YouTube ID (last 11 chars if possible)
                # Or skip for now - need proper mapping
                logger.warning(f"Database ID {vid} - needs YouTube ID mapping")
            elif len(vid) == 11:
                # This looks like a YouTube ID
                youtube_ids.append(vid)
            else:
                logger.warning(f"Unknown ID format: {vid}")
        
        if not youtube_ids:
            logger.warning(f"No valid YouTube IDs found from: {request.videoIds}")
            # Just use the IDs as-is and let transcript service handle it
            youtube_ids = request.videoIds
        
        logger.info(f"Using YouTube IDs: {youtube_ids}")
        
        # Use Multi-Video Context Manager for intelligent context building
        from services.multi_video_context import multi_video_context_manager
        
        context_result = multi_video_context_manager.build_context(
            video_ids=youtube_ids,
            query=request.text,
            query_type='auto'  # Auto-classify query type
        )
        
        if not context_result.get('formatted_context'):
            logger.error(f"No context built from transcripts. Context result: {context_result}")
            return LexVoiceResponse(
                answer="I couldn't find any transcript data for these videos. This usually means:\n\n1. Transcripts haven't been extracted yet - Use the StreamSmart extension on YouTube to extract them\n2. Transcripts are still being processed - Try again in a moment\n3. The videos don't have captions available\n\nPlease extract transcripts using the Chrome extension and try again.",
                sessionId=request.sessionId,
                intent=intent_name
            )
        
        context = context_result['formatted_context']
        query_type = context_result['query_type']
        video_count = context_result['video_count']
        
        logger.info(f"✅ Built context: {len(context)} chars from {video_count} videos (type: {query_type})")
        
        # Step 3: Generate answer with OpenAI
        logger.info("🧠 Generating answer with OpenAI...")
        import os
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        
        # Build enhanced prompt
        system_prompt = """You are an educational AI assistant helping users learn from video content.

Your role:
- Answer questions based on the provided video transcripts
- Explain concepts clearly and simply
- Be conversational and encouraging
- If the answer isn't in the transcripts, say so politely
- Provide examples when helpful

Guidelines:
- Keep answers concise but complete (200-300 words)
- Use bullet points for lists
- Bold key terms with **term**
- Reference the video when relevant"""

        user_prompt = f"""Based on these video transcripts, answer the question:

{context}

Question: {request.text}

Answer:"""
        
        try:
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 500,
                "temperature": 0.7
            }
            
            openai_response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if openai_response.ok:
                data = openai_response.json()
                answer = data['choices'][0]['message']['content']
                logger.info(f"✅ Generated answer: {answer[:100]}...")
            else:
                logger.error(f"OpenAI API error: {openai_response.status_code}")
                answer = "I'm having trouble generating an answer right now. Please try again in a moment."
                
        except Exception as openai_error:
            logger.error(f"OpenAI request failed: {openai_error}")
            answer = "I apologize, but I'm having trouble processing your question. Please try again."
        
        # Build sources from context result
        sources = []
        for source_data in context_result.get('sources', []):
            sources.append(SourceReference(
                videoId=source_data['videoId'],
                videoTitle=source_data['videoTitle'],
                confidence=source_data.get('confidence', 0.85),
                snippet=source_data.get('snippet', '')
            ))
        
        # Return response with sources
        return LexVoiceResponse(
            answer=answer,
            intent=intent_name,
            sessionId=request.sessionId,
            sources=sources,
            confidence=context_result.get('confidence', 0.85)
        )
        
    except Exception as e:
        logger.error(f"Error in voice chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
