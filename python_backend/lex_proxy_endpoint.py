"""
Lex Proxy Endpoint - Backend handles Lex communication
Flow: Frontend → Backend → Lex → OpenAI → Backend → Frontend
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
import logging
import json
from typing import Optional

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

class LexVoiceResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    sessionId: str
    audioUrl: Optional[str] = None

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
        
        # Step 2: Generate answer with OpenAI (from your existing RAG endpoint)
        logger.info("🧠 Generating answer with OpenAI...")
        
        # Import the RAG function from main
        from main import get_transcripts_from_s3
        import requests
        
        # Get transcripts from S3
        # Extract actual YouTube video IDs from the database IDs passed
        transcripts = []
        if request.videoIds:
            logger.info(f"Video IDs received: {request.videoIds}")
            
            # Check if these are database IDs (like video_xxx) or YouTube IDs
            youtube_ids = []
            for vid in request.videoIds:
                if vid.startswith('video_'):
                    # This is a database ID - we need to extract the YouTube ID
                    # For now, try to get it from DynamoDB or just skip
                    logger.warning(f"Database ID {vid} passed, need YouTube ID")
                else:
                    # This is already a YouTube ID
                    youtube_ids.append(vid)
            
            # Also try searching S3 directly to see what's available
            import boto3
            s3_client = boto3.client('s3', region_name='ap-south-1')
            try:
                s3_response = s3_client.list_objects_v2(
                    Bucket='streamsmart-transcripts-560271561936',
                    MaxKeys=10
                )
                if 'Contents' in s3_response:
                    available_keys = [obj['Key'] for obj in s3_response['Contents'] if obj['Key'].endswith('.json')]
                    logger.info(f"Available transcripts in S3: {available_keys}")
                    
                    # Use all available transcripts for now
                    youtube_ids = [key.replace('.json', '') for key in available_keys]
            except Exception as e:
                logger.error(f"Could not list S3: {e}")
            
            if youtube_ids:
                logger.info(f"Using YouTube IDs: {youtube_ids}")
                transcripts = get_transcripts_from_s3(youtube_ids)
        
        # Build context
        context = ""
        if transcripts:
            context_parts = []
            for t in transcripts:
                title = t.get('title', 'Unknown')
                transcript_text = t.get('transcript', '')
                if isinstance(transcript_text, list):
                    transcript_text = ' '.join([seg.get('text', '') for seg in transcript_text])
                
                context_parts.append(f"Video: {title}\nTranscript: {transcript_text[:3000]}")
            
            context = "\n\n".join(context_parts)
        
        # Generate answer with OpenAI
        import os
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        
        if not context:
            answer = "I couldn't find any transcripts for the videos you're asking about. Please upload transcripts first using the Chrome extension or manual upload feature."
        else:
            prompt = f"""Based on the following video transcripts, answer the user's question naturally and conversationally.

Question: {request.text}

Transcripts:
{context}

Provide a clear, conversational answer."""
            
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
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
                answer = "I'm having trouble generating an answer right now. Please try again."
        
        # Return response
        return LexVoiceResponse(
            answer=answer,
            intent=intent_name,
            sessionId=request.sessionId
        )
        
    except Exception as e:
        logger.error(f"Error in voice chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
