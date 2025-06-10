#!/usr/bin/env python3
"""
Multi-User StreamSmart ML Backend
FastAPI application with user authentication, user-scoped data, and multi-tenant RAG services
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
from typing import List, Optional, Dict, Any
import uvicorn
import logging
from datetime import datetime

# Import services
from services.user_service import (
    UserService, get_user_service, get_current_user,
    UserRegistration, UserLogin, UserProfile, UsageStats
)
from services.multiuser_rag_service import (
    MultiUserRAGService, UserTranscriptRequest, UserRAGQuery, 
    UserRAGResponse, ChatSession
)
from services.multimodal_summarizer import MultiModalSummarizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="StreamSmart Multi-User ML Backend",
    description="Multi-tenant video analysis platform with RAG chatbot and AI summarization",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://yourdomain.com"  # Add your production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
gemini_api_key = os.getenv('GEMINI_API_KEY')

if not gemini_api_key:
    logger.warning("GEMINI_API_KEY not found. Some features may not work.")

# Global service instances
rag_service = None
summarizer = MultiModalSummarizer()

def get_rag_service() -> MultiUserRAGService:
    """Get RAG service instance"""
    global rag_service
    if rag_service is None and gemini_api_key:
        rag_service = MultiUserRAGService(mongodb_uri, gemini_api_key)
    return rag_service

# Pydantic models for API requests/responses
class VideoProcessRequest(BaseModel):
    videoUrl: str
    videoTitle: Optional[str] = None
    tags: List[str] = []
    isPublic: bool = False

class SummaryResponse(BaseModel):
    summary: str
    keyTopics: List[str]
    visualInsights: List[str]
    timestampHighlights: List[dict]
    transcriptId: str
    videoId: str

class TranscriptResponse(BaseModel):
    transcriptId: str
    videoId: str
    videoTitle: str
    textLength: int
    isNew: bool
    processingStatus: str

class ChatSessionRequest(BaseModel):
    sessionName: str
    transcriptIds: List[str]

class ChatSessionResponse(BaseModel):
    chatSessionId: str
    sessionName: str
    transcriptIds: List[str]
    createdAt: str

# Helper function to get client IP
def get_client_ip(request: Request) -> str:
    """Get client IP address"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host

# Authentication endpoints
@app.post("/auth/register")
async def register_user(registration: UserRegistration, request: Request):
    """Register a new user account"""
    try:
        user_service = get_user_service()
        result = await user_service.register_user(registration)
        
        logger.info(f"New user registered: {result['userId']}")
        return {
            "success": True,
            "message": "User registered successfully",
            "user": {
                "userId": result["userId"],
                "email": result["email"],
                "username": result["username"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@app.post("/auth/login")
async def login_user(login: UserLogin, request: Request):
    """Login user and create session"""
    try:
        user_service = get_user_service()
        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        result = await user_service.login_user(login, ip_address, user_agent)
        
        logger.info(f"User logged in: {result['user']['userId']}")
        return {
            "success": True,
            "message": "Login successful",
            "token": result["token"],
            "user": result["user"],
            "session": result["session"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@app.post("/auth/guest-session")
async def create_guest_session(request: Request):
    """Create a guest session for unauthenticated users"""
    try:
        user_service = get_user_service()
        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        result = await user_service.create_guest_session(ip_address, user_agent)
        
        logger.info(f"Guest session created: {result['user']['userId']}")
        return {
            "success": True,
            "message": "Guest session created",
            "token": result["token"],
            "user": result["user"],
            "session": result["session"]
        }
    except Exception as e:
        logger.error(f"Guest session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create guest session"
        )

@app.post("/auth/logout")
async def logout_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout user and invalidate session"""
    try:
        user_service = get_user_service()
        session_id = current_user.get("sessionId")
        
        if session_id:
            await user_service.logout_user(session_id)
        
        logger.info(f"User logged out: {current_user['userId']}")
        return {"success": True, "message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

# User profile endpoints
@app.get("/user/profile", response_model=UserProfile)
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    try:
        if current_user["type"] == "guest":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile not available for guest users"
            )
        
        return UserProfile(
            userId=current_user["userId"],
            email=current_user["email"],
            username=current_user["username"],
            firstName=current_user["profile"]["firstName"],
            lastName=current_user["profile"]["lastName"],
            subscription=current_user["subscription"],
            preferences=current_user["profile"]["preferences"],
            createdAt=datetime.fromisoformat(current_user.get("createdAt", datetime.utcnow().isoformat())),
            lastLogin=datetime.fromisoformat(current_user.get("lastLogin", datetime.utcnow().isoformat()))
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get profile"
        )

@app.get("/user/usage", response_model=UsageStats)
async def get_usage_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get user's usage statistics"""
    try:
        user_service = get_user_service()
        stats = await user_service.get_user_usage_stats(current_user["userId"])
        return stats
    except Exception as e:
        logger.error(f"Usage stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage statistics"
        )

# Video processing endpoints
@app.post("/video/process", response_model=SummaryResponse)
async def process_video(
    request: VideoProcessRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Process a video: extract transcript, generate summary, and create embeddings"""
    try:
        user_id = current_user["userId"]
        
        # Check usage limits
        user_service = get_user_service()
        can_process = await user_service.check_usage_limits(user_id, "process_video")
        
        if not can_process:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Video processing limit reached for your plan"
            )
        
        # Store transcript
        rag_service = get_rag_service()
        if not rag_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        transcript_request = UserTranscriptRequest(
            videoUrl=request.videoUrl,
            videoTitle=request.videoTitle,
            tags=request.tags,
            isPublic=request.isPublic
        )
        
        transcript_result = await rag_service.store_user_transcript(user_id, transcript_request)
        
        # Update usage
        await user_service.update_usage(user_id, "videosProcessed")
        
        # Generate summary in background
        background_tasks.add_task(
            _generate_summary_background,
            user_id, 
            transcript_result["transcriptId"],
            transcript_result["videoId"]
        )
        
        logger.info(f"Video processed for user {user_id}: {transcript_result['transcriptId']}")
        
        return SummaryResponse(
            summary="Video processed successfully. Summary generation in progress...",
            keyTopics=["Processing", "Video Analysis"],
            visualInsights=["Video content being analyzed"],
            timestampHighlights=[{"timestamp": 0, "description": "Processing started", "importance_score": 1.0}],
            transcriptId=transcript_result["transcriptId"],
            videoId=transcript_result["videoId"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video processing error for user {current_user['userId']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process video: {str(e)}"
        )

async def _generate_summary_background(user_id: str, transcript_id: str, video_id: str):
    """Background task to generate video summary"""
    try:
        # Get transcript from database
        rag_service = get_rag_service()
        transcript_doc = rag_service.transcripts_collection.find_one({
            "transcriptId": transcript_id,
            "userId": user_id
        })
        
        if not transcript_doc:
            logger.error(f"Transcript {transcript_id} not found for summary generation")
            return
        
        transcript_text = transcript_doc["transcript"]["fullText"]
        
        # Generate summary using the summarizer
        summary_result = await summarizer.generate_multimodal_summary(
            transcript_data={"full_text": transcript_text},
            visual_data={"frames": []},  # No visual data for now
            video_id=video_id
        )
        
        # Store summary in database
        summary_doc = {
            "summaryId": f"sum_{transcript_id}",
            "userId": user_id,
            "transcriptId": transcript_id,
            "videoId": video_id,
            "summary": {
                "mainSummary": summary_result.get("summary", "Summary generated"),
                "keyTopics": summary_result.get("key_topics", []),
                "visualInsights": summary_result.get("visual_insights", []),
                "timestampHighlights": summary_result.get("timestamp_highlights", []),
                "mindMap": summary_result.get("mind_map", {}),
                "sentiment": "neutral",
                "difficulty": "medium",
                "estimatedReadTime": len(transcript_text) // 200  # Rough estimate
            },
            "generationSettings": {
                "summaryLength": "detailed",
                "focusAreas": [],
                "customPrompt": ""
            },
            "processing": {
                "model": "flan-t5",
                "processingTime": 0,
                "tokensUsed": 0
            },
            "createdAt": datetime.utcnow(),
            "regenerationHistory": []
        }
        
        rag_service.summaries_collection.insert_one(summary_doc)
        logger.info(f"Summary generated for transcript {transcript_id}")
        
    except Exception as e:
        logger.error(f"Error generating summary for {transcript_id}: {e}")

@app.get("/video/transcripts")
async def get_user_transcripts(
    include_public: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all transcripts for the current user"""
    try:
        rag_service = get_rag_service()
        if not rag_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        transcripts = await rag_service.get_user_transcripts(
            current_user["userId"], 
            include_public
        )
        
        return {
            "transcripts": transcripts,
            "count": len(transcripts)
        }
        
    except Exception as e:
        logger.error(f"Error getting transcripts for user {current_user['userId']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transcripts"
        )

# RAG Chat endpoints
@app.post("/rag/search", response_model=UserRAGResponse)
async def rag_search(
    query: UserRAGQuery,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Search user's content using RAG"""
    try:
        user_id = current_user["userId"]
        
        # Check usage limits
        user_service = get_user_service()
        can_query = await user_service.check_usage_limits(user_id, "rag_query")
        
        if not can_query:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="RAG query limit reached for your plan"
            )
        
        rag_service = get_rag_service()
        if not rag_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        # Perform search
        result = await rag_service.search_user_content(user_id, query)
        
        # Update usage
        await user_service.update_usage(user_id, "ragQueriesUsed")
        
        logger.info(f"RAG search completed for user {user_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RAG search error for user {current_user['userId']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@app.post("/chat/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    request: ChatSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new chat session"""
    try:
        rag_service = get_rag_service()
        if not rag_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        result = await rag_service.create_chat_session(
            current_user["userId"],
            request.sessionName,
            request.transcriptIds
        )
        
        return ChatSessionResponse(**result)
        
    except Exception as e:
        logger.error(f"Error creating chat session for user {current_user['userId']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}"
        )

@app.get("/chat/sessions")
async def get_chat_sessions(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all chat sessions for the current user"""
    try:
        rag_service = get_rag_service()
        if not rag_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        sessions = await rag_service.get_user_chat_sessions(current_user["userId"])
        
        return {
            "sessions": sessions,
            "count": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error getting chat sessions for user {current_user['userId']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat sessions"
        )

@app.get("/chat/sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific chat session with message history"""
    try:
        rag_service = get_rag_service()
        if not rag_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        session = await rag_service.get_chat_session(current_user["userId"], session_id)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat session"
        )

# Health and utility endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected" if mongodb_uri else "not configured",
            "rag_service": "available" if get_rag_service() else "not available",
            "summarizer": "ready" if summarizer.is_ready() else "not ready"
        }
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "StreamSmart Multi-User ML Backend",
        "version": "2.0.0",
        "documentation": "/docs",
        "health": "/health"
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return {
        "error": True,
        "status_code": exc.status_code,
        "message": exc.detail,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled Exception: {str(exc)}")
    return {
        "error": True,
        "status_code": 500,
        "message": "Internal server error",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    # Load environment variables
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting StreamSmart Multi-User Backend on {host}:{port}")
    
    uvicorn.run(
        "main_multiuser:app",
        host=host,
        port=port,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False,
        log_level="info"
    ) 