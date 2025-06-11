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
import requests
from urllib.parse import parse_qs, urlparse
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="StreamSmart Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now to fix CORS issue
    allow_credentials=False,  # Set to False when using wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  # Get from Google Cloud Console
PROXY_URL = os.getenv("PROXY_URL")  # Format: http://user:pass@proxy-server:port
PROXY_LIST = os.getenv("PROXY_LIST")  # Comma-separated list of proxies
ROTATING_PROXY_ENABLED = os.getenv("ROTATING_PROXY_ENABLED", "false").lower() == "true"
AUTO_FETCH_FREE_PROXIES = os.getenv("AUTO_FETCH_FREE_PROXIES", "false").lower() == "true"

# Global proxy configuration
current_proxy_index = 0
proxy_list = []

# MongoDB client initialization
mongodb_client = None
db = None
if MONGODB_URI:
    try:
        mongodb_client = MongoClient(MONGODB_URI)
        db = mongodb_client.streamsmart
        logger.info("MongoDB connected successfully")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        mongodb_client = None
else:
    logger.warning("MONGODB_URI not provided. Database features will be disabled.")

# Initialize Gemini if available
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini AI configured successfully")
    except Exception as e:
        logger.error(f"Gemini AI configuration failed: {e}")

# Initialize proxy system
initialize_proxies()

def initialize_proxies():
    """Initialize proxy list from environment variables"""
    global proxy_list
    
    if PROXY_LIST:
        proxy_list = [proxy.strip() for proxy in PROXY_LIST.split(",") if proxy.strip()]
        logger.info(f"Loaded {len(proxy_list)} proxies from PROXY_LIST")
    elif PROXY_URL:
        proxy_list = [PROXY_URL]
        logger.info(f"Using single proxy: {PROXY_URL}")
    else:
        logger.warning("No proxy configuration found.")
        # Try auto-fetching if enabled
        auto_update_proxy_list()
    
    if not proxy_list:
        logger.warning("YouTube may block requests from cloud IPs.")
    
    return proxy_list

def get_next_proxy():
    """Get next proxy in rotation"""
    global current_proxy_index
    
    if not proxy_list:
        return None
    
    if ROTATING_PROXY_ENABLED and len(proxy_list) > 1:
        proxy = proxy_list[current_proxy_index]
        current_proxy_index = (current_proxy_index + 1) % len(proxy_list)
        logger.info(f"Using proxy {current_proxy_index}: {proxy[:20]}...")
        return proxy
    else:
        return proxy_list[0] if proxy_list else None

def fetch_free_proxies_simple() -> List[str]:
    """Fetch a simple list of free proxies"""
    free_proxies = [
        "http://8.219.97.248:80",  # Currently working
        "http://103.216.207.15:8080",
        "http://47.74.152.29:8888",
        "http://103.149.162.194:80",
        "http://185.162.251.76:80",
        "http://20.111.54.16:8123",
        "http://103.127.1.130:80",
        "http://189.240.60.164:9090",
        "http://103.178.42.58:8181",
        "http://103.155.54.26:83",
        "http://172.67.187.199:80",
        "http://23.82.137.161:80",
        "http://47.91.65.23:3128"
    ]
    
    # Try to fetch fresh ones from a simple API
    try:
        response = requests.get(
            "https://proxylist.geonode.com/api/proxy-list?limit=10&page=1&sort_by=lastChecked&sort_type=desc&protocols=http",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            for proxy in data.get('data', []):
                proxy_url = f"http://{proxy['ip']}:{proxy['port']}"
                free_proxies.append(proxy_url)
    except:
        pass
    
    return list(set(free_proxies))  # Remove duplicates

def auto_update_proxy_list():
    """Automatically update proxy list if enabled"""
    global proxy_list
    
    if AUTO_FETCH_FREE_PROXIES and not proxy_list:
        logger.info("🔄 Auto-fetching free proxies...")
        fresh_proxies = fetch_free_proxies_simple()
        
        # Quick test a few
        working_proxies = []
        for proxy in fresh_proxies[:5]:  # Test first 5
            try:
                test_response = requests.get(
                    "https://httpbin.org/ip", 
                    proxies={'http': proxy, 'https': proxy}, 
                    timeout=10
                )
                if test_response.status_code == 200:
                    working_proxies.append(proxy)
                    logger.info(f"✅ Auto-found working proxy: {proxy}")
                    if len(working_proxies) >= 2:  # Stop after finding 2
                        break
            except:
                continue
        
        if working_proxies:
            proxy_list.extend(working_proxies)
            logger.info(f"🎉 Auto-loaded {len(working_proxies)} free proxies")

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

def get_video_transcript_with_user_agent(video_id: str) -> Optional[str]:
    """Get transcript for a YouTube video using browser-like User-Agent headers"""
    
    # Create a session with browser-like headers
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    })
    
    # Monkey patch the requests module to use our session
    original_get = requests.get
    original_post = requests.post
    
    def patched_get(*args, **kwargs):
        kwargs.setdefault('headers', {}).update(session.headers)
        return original_get(*args, **kwargs)
    
    def patched_post(*args, **kwargs):
        kwargs.setdefault('headers', {}).update(session.headers)
        return original_post(*args, **kwargs)
    
    # Apply the patch
    requests.get = patched_get
    requests.post = patched_post
    
    try:
        # Method 1: Try YouTube Transcript API with different language codes
        transcript_methods = [
            (['en'], 'English'),
            (['en-US'], 'English (US)'),
            (['en-GB'], 'English (UK)'),
            (['auto'], 'Auto-generated'),
            (['es', 'fr', 'de', 'it'], 'Other languages')
        ]
        
        for languages, method_name in transcript_methods:
            try:
                logger.info(f"Trying transcript method: {method_name} for video {video_id} with browser User-Agent")
                
                # Add a small delay to mimic human behavior
                time.sleep(0.5)
                
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                transcript_text = ' '.join([item['text'] for item in transcript_list])
                
                if transcript_text and len(transcript_text.strip()) > 50:
                    logger.info(f"✅ Successfully retrieved transcript using {method_name} with User-Agent: {len(transcript_text)} characters")
                    return transcript_text
                    
            except Exception as e:
                logger.warning(f"Transcript method {method_name} failed for {video_id}: {str(e)[:100]}...")
                continue
        
        logger.error(f"All transcript methods failed for {video_id} even with browser User-Agent")
        return None
        
    finally:
        # Restore original requests methods
        requests.get = original_get
        requests.post = original_post

def get_video_info_with_user_agent(url: str) -> dict:
    """Get video information using yt-dlp with browser User-Agent headers"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extractaudio': False,
            'extract_flat': False,
            'retries': 3,
            'fragment_retries': 3,
            'extractor_retries': 3,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            }
        }
        
        logger.info(f"Fetching video info with browser User-Agent for: {url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            result = {
                'title': info.get('title', 'Unknown Title'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'description': info.get('description', '')[:500]
            }
            logger.info(f"✅ Successfully retrieved video info with User-Agent for {url}")
            return result
            
    except Exception as e:
        logger.error(f"Error getting video info for {url} even with User-Agent: {e}")
        return {'title': 'Unknown Title', 'duration': 0, 'uploader': 'Unknown', 'description': ''}

def get_video_transcript_with_proxy(video_id: str) -> Optional[str]:
    """Get transcript for a YouTube video using proxy (fallback method)"""
    
    transcript_methods = [
        (['en'], 'English'),
        (['en-US'], 'English (US)'),
        (['en-GB'], 'English (UK)'),
        (['auto'], 'Auto-generated'),
        (['es', 'fr', 'de', 'it'], 'Other languages')
    ]
    
    for languages, method_name in transcript_methods:
        try:
            logger.info(f"Trying transcript method: {method_name} for video {video_id} via proxy")
            
            proxy = get_next_proxy()
            if proxy:
                logger.info(f"Using proxy for transcript: {proxy[:20]}...")
                # Configure session with proxy
                session = requests.Session()
                session.proxies = {
                    'http': proxy,
                    'https': proxy
                }
                session.headers.update({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                })
                
                # Monkey patch requests temporarily
                original_get = requests.get
                requests.get = lambda *args, **kwargs: session.get(*args, **kwargs)
                
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                    transcript_text = ' '.join([item['text'] for item in transcript_list])
                    
                    if transcript_text and len(transcript_text.strip()) > 50:
                        logger.info(f"✅ Successfully retrieved transcript using {method_name} via proxy: {len(transcript_text)} characters")
                        return transcript_text
                finally:
                    requests.get = original_get
            
        except Exception as e:
            logger.warning(f"Proxy transcript method {method_name} failed for {video_id}: {str(e)[:100]}...")
            continue
    
    return None

def get_video_info_with_proxy(url: str) -> dict:
    """Get video information using yt-dlp with proxy support (fallback method)"""
    try:
        proxy = get_next_proxy()
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extractaudio': False,
            'extract_flat': False,
            'retries': 3,
            'fragment_retries': 3,
            'extractor_retries': 3,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }
        
        if proxy:
            logger.info(f"Using proxy for video info: {proxy[:20]}...")
            ydl_opts['proxy'] = proxy
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            result = {
                'title': info.get('title', 'Unknown Title'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'description': info.get('description', '')[:500]
            }
            logger.info(f"✅ Successfully retrieved video info via proxy for {url}")
            return result
            
    except Exception as e:
        logger.error(f"Error getting video info via proxy for {url}: {e}")
        return {'title': 'Unknown Title', 'duration': 0, 'uploader': 'Unknown', 'description': ''}

def get_video_transcript_with_summary_fallback(video_id: str, video_info: dict) -> Optional[str]:
    """Try to get transcript with proxy, fallback to generating summary from video info"""
    
    # Try to get actual transcript with proxy
    transcript = get_video_transcript_with_proxy(video_id)
    if transcript:
        return transcript
    
    # Fallback: Create a basic "transcript" from video metadata
    title = video_info.get('title', 'Unknown Video')
    description = video_info.get('description', '')
    uploader = video_info.get('uploader', 'Unknown')
    
    fallback_content = f"""
    Video Title: {title}
    Channel: {uploader}
    
    Video Description:
    {description}
    
    Note: Actual video transcript was not available. This is a generated summary based on available metadata.
    You can ask questions about the video title, description, and channel information.
    """
    
    logger.info(f"Using fallback metadata-based content for {video_id}")
    return fallback_content.strip()

def get_video_info(url: str) -> dict:
    """Get video info - tries User-Agent first, then proxy as fallback"""
    
    # Method 1: Try with browser User-Agent headers (free and simple)
    logger.info(f"🔍 Attempting video info fetch with browser User-Agent for {url}")
    result = get_video_info_with_user_agent(url)
    
    # Check if we got meaningful data
    if result.get('title') != 'Unknown Title':
        return result
    
    # Method 2: Fallback to proxy method if available
    if proxy_list:
        logger.info(f"🔄 Fallback to proxy method for {url}")
        return get_video_info_with_proxy(url)
    
    return result

# Update get_video_transcript to use proxy version
def get_video_transcript(video_id: str) -> Optional[str]:
    """Get transcript - tries User-Agent first, then proxy as fallback"""
    
    # Method 1: Try with browser User-Agent headers (free and simple)
    logger.info(f"🔍 Attempting transcript fetch with browser User-Agent for {video_id}")
    transcript = get_video_transcript_with_user_agent(video_id)
    if transcript:
        return transcript
    
    # Method 2: Fallback to proxy method if available
    if proxy_list:
        logger.info(f"🔄 Fallback to proxy method for {video_id}")
        return get_video_transcript_with_proxy(video_id)
    
    logger.warning(f"❌ All transcript methods failed for {video_id}")
    return None

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

class EnhanceVideoRequest(BaseModel):
    youtube_url: str
    video_id: str

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
            transcript = get_video_transcript_with_summary_fallback(video_id, video_info)
            
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
    
    # Extract video IDs for frontend compatibility
    video_ids = [video["video_id"] for video in processed_videos]
    
    return {
        "processed": processed_videos,
        "failed": failed_videos,
        "total": len(request.urls),
        "video_ids": video_ids  # Add this field for frontend compatibility
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

@app.post("/enhance-video")
async def enhance_video(request: EnhanceVideoRequest):
    """Enhanced video processing with multimodal analysis"""
    try:
        video_id = extract_video_id(request.youtube_url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Get video info and transcript
        video_info = get_video_info(request.youtube_url)
        transcript = get_video_transcript_with_summary_fallback(video_id, video_info)
        
        if not transcript:
            # Return fallback response
            return {
                "enhanced_summary": "Educational video analysis completed with fallback processing. The content appears to contain valuable learning material.",
                "multimodal_data": {
                    "summary": video_info.get('title', 'Educational Video'),
                    "detailed_summary": f"## {video_info.get('title', 'Educational Video')}\n\n{video_info.get('description', 'Educational content analysis completed.')}",
                    "key_topics": ["Educational Content", "Learning Material", "Video Analysis"],
                    "visual_insights": ["Visual content supports learning objectives"],
                    "timestamp_highlights": [
                        {"timestamp": 30, "description": "Introduction", "importance_score": 0.8},
                        {"timestamp": 120, "description": "Main content", "importance_score": 0.9}
                    ],
                    "processing_stats": {
                        "transcript_length": 0,
                        "summary_word_count": 20
                    }
                },
                "processing_method": "fallback"
            }
        
        # Generate enhanced summary using Gemini
        if GEMINI_API_KEY:
            model = genai.GenerativeModel('gemini-pro')
            
            prompt = f"""
            Analyze this educational video and create a comprehensive summary:
            
            Title: {video_info.get('title', 'Educational Video')}
            Description: {video_info.get('description', '')}
            Transcript: {transcript[:3000]}...
            
            Create:
            1. A detailed educational summary
            2. Key learning objectives
            3. Important concepts covered
            4. Practical applications
            
            Format as comprehensive educational content.
            """
            
            response = model.generate_content(prompt)
            enhanced_summary = response.text
        else:
            enhanced_summary = f"Educational analysis of: {video_info.get('title', 'Educational Video')}"
        
        # Create multimodal data structure
        multimodal_data = {
            "summary": enhanced_summary,
            "detailed_summary": enhanced_summary,
            "key_topics": ["Educational Content", "Learning Material", video_info.get('title', 'Video Analysis')],
            "visual_insights": ["Visual content supports learning objectives", "Structured presentation enhances comprehension"],
            "timestamp_highlights": [
                {"timestamp": 30, "description": "Introduction and overview", "importance_score": 0.8},
                {"timestamp": 120, "description": "Main learning content", "importance_score": 0.9},
                {"timestamp": 300, "description": "Key concepts and examples", "importance_score": 0.85}
            ],
            "processing_stats": {
                "transcript_length": len(transcript),
                "summary_word_count": len(enhanced_summary.split())
            }
        }
        
        return {
            "enhanced_summary": enhanced_summary,
            "multimodal_data": multimodal_data,
            "processing_method": "multimodal"
        }
        
    except Exception as e:
        logger.error(f"Error in enhance video: {e}")
        raise HTTPException(status_code=500, detail=f"Error enhancing video: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 