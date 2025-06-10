"""
Simplified FastAPI backend for StreamSmart RAG functionality
Focuses on core features without heavy ML dependencies for easier deployment
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
from pymongo import MongoClient
import hashlib
from datetime import datetime
from youtube_transcript_api import YouTubeTranscriptApi
import re
import yt_dlp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="StreamSmart Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")

# Initialize services
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini AI configured successfully")

# MongoDB client
mongodb_client = None
if MONGODB_URI:
    try:
        mongodb_client = MongoClient(MONGODB_URI)
        db = mongodb_client.streamsmart
        logger.info("MongoDB connected successfully")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")

# Pydantic models
class ProcessVideosRequest(BaseModel):
    urls: List[str]
    userId: str

class RAGAnswerRequest(BaseModel):
    question: str
    userId: str

class HealthResponse(BaseModel):
    status: str
    services: dict

@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "message": "StreamSmart Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services = {
        "gemini_ai": bool(GEMINI_API_KEY),
        "mongodb": bool(mongodb_client),
        "backend": True
    }
    
    status = "healthy" if all(services.values()) else "degraded"
    
    return HealthResponse(
        status=status,
        services=services
    )

def extract_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
        r'youtube\.com/watch\?.*v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_video_transcript(video_id: str) -> Optional[str]:
    """Get transcript for a YouTube video"""
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US'])
        transcript_text = ' '.join([item['text'] for item in transcript_list])
        return transcript_text
    except Exception as e:
        logger.error(f"Error getting transcript for {video_id}: {e}")
        return None

def get_video_info(url: str) -> dict:
    """Get video information using yt-dlp"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extractaudio': False,
            'extract_flat': False
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'Unknown Title'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'description': info.get('description', '')[:500]  # Limit description
            }
    except Exception as e:
        logger.error(f"Error getting video info for {url}: {e}")
        return {'title': 'Unknown Title', 'duration': 0, 'uploader': 'Unknown', 'description': ''}

@app.post("/process-videos")
async def process_videos(request: ProcessVideosRequest):
    """Process YouTube videos and store transcripts"""
    if not mongodb_client:
        raise HTTPException(status_code=500, detail="Database not available")
    
    processed_videos = []
    failed_videos = []
    
    for url in request.urls:
        try:
            video_id = extract_video_id(url)
            if not video_id:
                failed_videos.append({"url": url, "error": "Invalid YouTube URL"})
                continue
            
            # Check if already processed
            existing = db.transcripts.find_one({
                "video_id": video_id,
                "user_id": request.userId
            })
            
            if existing:
                processed_videos.append({
                    "video_id": video_id,
                    "title": existing.get("title", "Unknown"),
                    "status": "already_processed"
                })
                continue
            
            # Get video info and transcript
            video_info = get_video_info(url)
            transcript = get_video_transcript(video_id)
            
            if not transcript:
                failed_videos.append({"url": url, "error": "No transcript available"})
                continue
            
            # Store in database
            transcript_doc = {
                "video_id": video_id,
                "user_id": request.userId,
                "url": url,
                "title": video_info['title'],
                "transcript": transcript,
                "metadata": video_info,
                "processed_at": datetime.utcnow(),
                "transcript_hash": hashlib.md5(transcript.encode()).hexdigest()
            }
            
            db.transcripts.insert_one(transcript_doc)
            
            processed_videos.append({
                "video_id": video_id,
                "title": video_info['title'],
                "status": "processed"
            })
            
        except Exception as e:
            logger.error(f"Error processing video {url}: {e}")
            failed_videos.append({"url": url, "error": str(e)})
    
    return {
        "processed": processed_videos,
        "failed": failed_videos,
        "total": len(request.urls)
    }

@app.post("/rag-answer")
async def rag_answer(request: RAGAnswerRequest):
    """Answer questions using RAG with stored transcripts"""
    if not mongodb_client:
        raise HTTPException(status_code=500, detail="Database not available")
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not available")
    
    try:
        # Get user's transcripts
        user_transcripts = list(db.transcripts.find(
            {"user_id": request.userId},
            {"transcript": 1, "title": 1, "video_id": 1}
        ))
        
        if not user_transcripts:
            return {
                "answer": "I don't have any video transcripts to search through. Please process some videos first.",
                "sources": [],
                "sourceType": "no_data"
            }
        
        # Simple text search (basic RAG without embeddings)
        relevant_transcripts = []
        question_lower = request.question.lower()
        
        for transcript_doc in user_transcripts:
            transcript_text = transcript_doc.get('transcript', '')
            if any(word in transcript_text.lower() for word in question_lower.split()):
                relevant_transcripts.append(transcript_doc)
        
        if not relevant_transcripts:
            # Use all transcripts if no specific matches
            relevant_transcripts = user_transcripts[:3]  # Limit to first 3
        
        # Prepare context for Gemini
        context_parts = []
        sources = []
        
        for i, doc in enumerate(relevant_transcripts[:3]):  # Limit to 3 most relevant
            context_parts.append(f"Video {i+1}: {doc['title']}\nTranscript: {doc['transcript'][:2000]}...")  # Limit transcript length
            sources.append({
                "title": doc['title'],
                "video_id": doc['video_id']
            })
        
        context = "\n\n".join(context_parts)
        
        # Generate answer using Gemini
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Based on the following video transcripts, answer the user's question. Be specific and cite which video(s) you're referencing.
        
        Question: {request.question}
        
        Video Transcripts:
        {context}
        
        Please provide a helpful, accurate answer based on the transcript content. If the transcripts don't contain relevant information, say so clearly.
        """
        
        response = model.generate_content(prompt)
        
        return {
            "answer": response.text,
            "sources": sources,
            "sourceType": "transcripts"
        }
        
    except Exception as e:
        logger.error(f"Error in RAG answer: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 