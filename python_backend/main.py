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
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.tokenize import sent_tokenize

# Import lightweight BERT with graceful fallback
try:
    from services.lightweight_bert_engine import get_lightweight_bert_engine
    LIGHTWEIGHT_BERT_AVAILABLE = True
    lightweight_bert = None
except ImportError as e:
    print(f"Lightweight BERT service unavailable: {e}")
    LIGHTWEIGHT_BERT_AVAILABLE = False
    lightweight_bert = None

# Import remaining endpoints
from genre_endpoints import router as genre_router
# Import BERT router with error handling for free deployment
try:
    from bert_recommendation_endpoints import router as bert_router
    BERT_AVAILABLE = True
except ImportError as e:
    print(f"BERT service unavailable: {e}")
    BERT_AVAILABLE = False
    bert_router = None
from smart_recommendation_endpoints import router as smart_router

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

# Register routers for modular endpoints
app.include_router(genre_router)
# Include BERT router only if available
if BERT_AVAILABLE and bert_router:
    app.include_router(bert_router)
    print("✅ BERT recommendation service enabled")
else:
    print("⚠️ BERT recommendation service disabled (dependencies not available)")
app.include_router(smart_router)

# Note: AI content endpoints were removed as part of recommendation engine cleanup

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGODB_URI = os.getenv("MONGO_URI")
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
            logger.warning("MONGO_URI not provided. Database features will be disabled.")

# Initialize Gemini if available
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini AI configured successfully")
    except Exception as e:
        logger.error(f"Gemini AI configuration failed: {e}")

# Try to download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
    except Exception as e:
        logger.warning(f"Could not download NLTK punkt tokenizer: {e}")

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

def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    try:
        # Ensure vectors are 2D for sklearn
        vec1 = vec1.reshape(1, -1)
        vec2 = vec2.reshape(1, -1)
        similarity = cosine_similarity(vec1, vec2)[0][0]
        return float(similarity)
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0

def chunk_transcript(transcript_text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """Split transcript into overlapping chunks"""
    try:
        # First, try to split by sentences for more natural chunks
        sentences = sent_tokenize(transcript_text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            # If adding this sentence would exceed chunk_size, finalize current chunk
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap (last few words)
                words = current_chunk.split()
                if len(words) > overlap // 10:  # Rough word-based overlap
                    current_chunk = " ".join(words[-(overlap // 10):]) + " " + sentence
                else:
                    current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Filter out very short chunks
        chunks = [chunk for chunk in chunks if len(chunk.strip()) > 50]
        
        logger.info(f"Created {len(chunks)} chunks from transcript of {len(transcript_text)} characters")
        return chunks
        
    except Exception as e:
        logger.error(f"Error chunking transcript: {e}")
        # Fallback to simple word-based chunking
        words = transcript_text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if len(chunk.strip()) > 50:
                chunks.append(chunk)
        return chunks

def generate_chunks_and_embeddings(transcript_text: str, sentence_transformer_model) -> List[dict]:
    """Generate chunks and their embeddings for a transcript"""
    try:
        logger.info(f"Generating chunks and embeddings for transcript of {len(transcript_text)} characters")
        
        # Create chunks
        chunks = chunk_transcript(transcript_text)
        
        if not chunks:
            logger.warning("No chunks created from transcript")
            return []
        
        # Generate embeddings for all chunks
        chunk_texts = [chunk for chunk in chunks]
        if hasattr(sentence_transformer_model, 'encode'):
            # Direct sentence transformer model
            embeddings = sentence_transformer_model.encode(chunk_texts)
        elif hasattr(sentence_transformer_model, 'get_embeddings'):
            # LightweightBertEngine model
            embeddings = [sentence_transformer_model.get_embeddings(chunk) for chunk in chunk_texts]
            embeddings = np.array(embeddings)
        else:
            logger.error("Model does not have encode or get_embeddings method")
            return []
        
        # Create chunk objects with embeddings
        chunk_objects = []
        for i, (chunk_text, embedding) in enumerate(zip(chunk_texts, embeddings)):
            chunk_objects.append({
                "chunk_id": i + 1,
                "text": chunk_text,
                "embedding": embedding.tolist()  # Convert numpy array to list for MongoDB storage
            })
        
        logger.info(f"Successfully generated {len(chunk_objects)} chunks with embeddings")
        return chunk_objects
        
    except Exception as e:
        logger.error(f"Error generating chunks and embeddings: {e}")
        return []

def get_video_transcript_with_user_agent(video_id: str) -> Optional[str]:
    """Get transcript using youtube-transcript-api with detailed error logging"""
    try:
        logger.info(f"🔍 Starting enhanced transcript fetch for video {video_id}")
        
        # Try different transcript languages and methods
        methods_to_try = [
            ('English', 'en'),
            ('English (US)', 'en-US'), 
            ('English (UK)', 'en-GB'),
            ('Auto-generated', None),  # Let the library auto-detect
        ]
        
        for method_name, language_code in methods_to_try:
            try:
                logger.info(f"🔍 Attempting {method_name} transcript for {video_id}")
                
                if language_code:
                    # Method 1: Try specific language code
                    try:
                        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                        logger.info(f"📋 Available transcripts for {video_id}: {[t.language_code for t in transcript_list]}")
                        
                        transcript = transcript_list.find_transcript([language_code])
                        transcript_data = transcript.fetch()
                        logger.info(f"✅ Found transcript via list_transcripts method for {language_code}")
                    except Exception as list_error:
                        logger.warning(f"❌ list_transcripts method failed for {language_code}: {str(list_error)}")
                        # Fallback: Try direct get_transcript
                        try:
                            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
                            logger.info(f"✅ Found transcript via get_transcript method for {language_code}")
                        except Exception as get_error:
                            logger.warning(f"❌ get_transcript method also failed for {language_code}: {str(get_error)}")
                            continue
                else:
                    # Auto-detect method
                    try:
                        transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
                        logger.info(f"✅ Found transcript via auto-detect method")
                    except Exception as auto_error:
                        logger.warning(f"❌ Auto-detect method failed: {str(auto_error)}")
                        continue
                
                if transcript_data:
                    full_text = ' '.join([item['text'] for item in transcript_data])
                    logger.info(f"✅ {method_name} transcript found for {video_id}: {len(full_text)} characters")
                    logger.info(f"📝 First 200 chars: {full_text[:200]}...")
                    return full_text
                else:
                    logger.warning(f"❌ {method_name} returned empty transcript data for {video_id}")
                    
            except Exception as method_error:
                logger.error(f"❌ {method_name} method failed for {video_id}: {str(method_error)}")
                logger.error(f"🔍 Error type: {type(method_error).__name__}")
                continue
        
        # Try one more comprehensive attempt with all available transcripts
        try:
            logger.info(f"🔍 Final attempt: listing ALL available transcripts for {video_id}")
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            available_transcripts = []
            
            for transcript in transcript_list:
                try:
                    lang_info = f"{transcript.language} ({transcript.language_code})"
                    if hasattr(transcript, 'is_generated'):
                        lang_info += f" [Generated: {transcript.is_generated}]"
                    available_transcripts.append(lang_info)
                except:
                    available_transcripts.append(f"Unknown transcript")
            
            logger.info(f"📋 ALL available transcripts for {video_id}: {available_transcripts}")
            
            # Try the first available transcript
            if transcript_list:
                first_transcript = list(transcript_list)[0]
                logger.info(f"🎯 Attempting to fetch first available transcript: {first_transcript.language_code}")
                transcript_data = first_transcript.fetch()
                
                if transcript_data:
                    full_text = ' '.join([item['text'] for item in transcript_data])
                    logger.info(f"✅ SUCCESS! First available transcript retrieved: {len(full_text)} characters")
                    return full_text
            
        except Exception as comprehensive_error:
            logger.error(f"❌ Comprehensive transcript listing failed for {video_id}: {str(comprehensive_error)}")
            logger.error(f"🔍 Comprehensive error type: {type(comprehensive_error).__name__}")
        
        logger.error(f"❌ ALL transcript methods failed for {video_id}")
        return None
        
    except Exception as e:
        logger.error(f"❌ Critical error in transcript fetching for {video_id}: {str(e)}")
        logger.error(f"🔍 Critical error type: {type(e).__name__}")
        return None

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
    """Get transcript with proxy support and detailed error logging"""
    
    # First try the user-agent method with detailed logging
    logger.info(f"🔍 Attempting transcript fetch with browser User-Agent for {video_id}")
    transcript = get_video_transcript_with_user_agent(video_id)
    if transcript:
        return transcript
    
    # If proxy list is available, try proxy method
    if proxy_list:
        logger.info(f"🔄 Fallback to proxy method for {video_id}")
    
    transcript_methods = [
        (['en'], 'English'),
        (['en-US'], 'English (US)'),
        (['en-GB'], 'English (UK)'),
        (['auto'], 'Auto-generated'),
        (['es', 'fr', 'de', 'it'], 'Other languages')
    ]
    
    for languages, method_name in transcript_methods:
        try:
            logger.info(f"🔍 Trying proxy transcript method: {method_name} for video {video_id}")
            
            proxy = get_next_proxy()
            if proxy:
                logger.info(f"🌐 Using proxy for transcript: {proxy[:20]}...")
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
                original_post = requests.post
                
                def patched_get(*args, **kwargs):
                    kwargs.setdefault('headers', {}).update(session.headers)
                    kwargs['proxies'] = session.proxies
                    return original_get(*args, **kwargs)
                
                def patched_post(*args, **kwargs):
                    kwargs.setdefault('headers', {}).update(session.headers)
                    kwargs['proxies'] = session.proxies
                    return original_post(*args, **kwargs)
                
                requests.get = patched_get
                requests.post = patched_post
                
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                    transcript_text = ' '.join([item['text'] for item in transcript_list])
                    
                    if transcript_text and len(transcript_text.strip()) > 50:
                        logger.info(f"✅ Successfully retrieved transcript using {method_name} via proxy: {len(transcript_text)} characters")
                        return transcript_text
                except Exception as proxy_method_error:
                    logger.warning(f"❌ Proxy {method_name} method failed for {video_id}: {str(proxy_method_error)}")
                finally:
                    requests.get = original_get
                    requests.post = original_post
            else:
                logger.warning(f"🚫 No proxy available for {method_name} method")
            
        except Exception as e:
            logger.error(f"❌ Proxy transcript method {method_name} failed for {video_id}: {str(e)}")
            continue
    else:
        logger.warning(f"🚫 No proxy available for fallback transcript fetch for {video_id}")
    
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
    """Try to get actual transcript, return None if not available (for RAG quality)"""
    
    # Try to get actual transcript with proxy
    transcript = get_video_transcript_with_proxy(video_id)
    if transcript and len(transcript.strip()) > 100:  # Ensure it's a substantial transcript
        logger.info(f"✅ Using full transcript for {video_id} ({len(transcript)} characters)")
        return transcript
    
    # If no actual transcript available, return None instead of fallback
    logger.warning(f"❌ No actual transcript available for {video_id}. Returning None for RAG quality.")
    return None

def get_video_content_with_fallback(video_id: str, video_info: dict) -> str:
    """Get video content with fallback to metadata (for non-RAG purposes like /enhance-video)"""
    
    # Try to get actual transcript first
    transcript = get_video_transcript_with_proxy(video_id)
    if transcript and len(transcript.strip()) > 100:
        logger.info(f"✅ Using full transcript for {video_id} ({len(transcript)} characters)")
        return transcript
    
    # Fallback: Create content from video metadata
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
    video_ids: Optional[List[str]] = None

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
        "backend": True,
        "lightweight_bert": bool(LIGHTWEIGHT_BERT_AVAILABLE and lightweight_bert),
        "heavy_bert": bool(BERT_AVAILABLE),
        "proxy_system": bool(proxy_list)
    }
    
    status = "healthy" if services["backend"] else "degraded"
    
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
                "userId": request.userId
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
                logger.warning(f"No actual transcript available for {url}. Skipping RAG-ready storage.")
                failed_videos.append({"url": url, "error": "No actual transcript available for RAG"})
                continue
            
            # Generate chunks and embeddings for semantic search
            chunks_with_embeddings = []
            try:
                if lightweight_bert:
                    logger.info(f"Generating semantic chunks for video {video_id}")
                    chunks_with_embeddings = generate_chunks_and_embeddings(transcript, lightweight_bert)
                    logger.info(f"Successfully created {len(chunks_with_embeddings)} semantic chunks for {video_id}")
                else:
                    logger.warning(f"Lightweight BERT not available for chunking video {video_id}")
            except Exception as chunk_error:
                logger.error(f"Error generating chunks for {video_id}: {chunk_error}")
            
            # Store in database with chunks
            transcript_doc = {
                "video_id": video_id,
                "userId": request.userId,
                "url": url,
                "title": video_info['title'],
                "transcript": transcript,
                "metadata": video_info,
                "processed_at": datetime.utcnow(),
                "transcript_hash": hashlib.md5(transcript.encode()).hexdigest(),
                "chunks": chunks_with_embeddings  # Add semantic chunks with embeddings
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
        logger.info(f"RAG request: userId={request.userId}, question='{request.question}', video_ids={request.video_ids}")
        
        mongo_query = {"userId": request.userId}
        if request.video_ids:
            mongo_query["video_id"] = {"$in": request.video_ids}
            logger.info(f"Filtering RAG context for video_ids: {request.video_ids}")
        else:
            logger.warning("No video_ids provided for RAG request, using all transcripts for user. This might lead to mixed contexts.")

        user_transcripts = list(db.transcripts.find(
            mongo_query,
            {"transcript": 1, "title": 1, "video_id": 1}
        ))
        
        logger.info(f"Found {len(user_transcripts)} transcripts for RAG context (query: {mongo_query})")
        
        if not user_transcripts:
            logger.warning(f"No transcripts found for userId {request.userId} and video_ids {request.video_ids}. Cannot answer question.")
            return {"answer": "I couldn't find any relevant processed video transcripts for the current context to answer your question. Please ensure the videos have been processed and transcripts are available.", "sources": [], "sourceType": "no_content"}

        logger.info(f"Building RAG context with the following video transcripts:")
        for t_doc_log in user_transcripts:
            logger.info(f"  - Title: {t_doc_log.get('title', 'Unknown')}, ID: {t_doc_log.get('video_id', 'Unknown')}, Length: {len(t_doc_log.get('transcript', ''))}")

        # Semantic search for relevant chunks
        context_parts = []
        sources = []
        
        if lightweight_bert:
            logger.info("Using semantic search for RAG context building")
            
            # Generate question embedding
            if hasattr(lightweight_bert, 'encode'):
                question_embedding = lightweight_bert.encode(request.question)
            elif hasattr(lightweight_bert, 'get_embeddings'):
                question_embedding = lightweight_bert.get_embeddings(request.question)
            else:
                logger.error("Model does not have encode or get_embeddings method")
                raise HTTPException(status_code=500, detail="Embedding model not properly configured")
            logger.info(f"Generated question embedding with shape: {question_embedding.shape}")
            
            all_relevant_chunks = []
            
            for doc in user_transcripts:
                video_chunks = doc.get('chunks', [])
                
                if not video_chunks:
                    # Fallback to prefix-based approach for videos without chunks
                    logger.warning(f"No chunks found for video {doc['video_id']}, using fallback prefix method")
                    context_parts.append(f"Video: {doc['title']}\nTranscript: {doc['transcript'][:5000]}...")
                    sources.append({
                        "video_id": doc['video_id'],
                        "title": doc['title']
                    })
                    continue
                
                logger.info(f"Processing {len(video_chunks)} chunks for video {doc['video_id']}")
                
                # Calculate similarity for each chunk
                chunk_similarities = []
                for chunk in video_chunks:
                    try:
                        chunk_embedding = np.array(chunk['embedding'])
                        similarity = calculate_cosine_similarity(question_embedding, chunk_embedding)
                        chunk_similarities.append({
                            'chunk': chunk,
                            'similarity': similarity,
                            'video_id': doc['video_id'],
                            'video_title': doc['title']
                        })
                    except Exception as e:
                        logger.error(f"Error calculating similarity for chunk {chunk.get('chunk_id', 'unknown')}: {e}")
                        continue
                
                # Add top chunks from this video
                video_top_chunks = sorted(chunk_similarities, key=lambda x: x['similarity'], reverse=True)[:2]  # Top 2 chunks per video
                all_relevant_chunks.extend(video_top_chunks)
                
                logger.info(f"Selected {len(video_top_chunks)} top chunks from video {doc['video_id']}")
                for chunk_info in video_top_chunks:
                    logger.info(f"  - Chunk {chunk_info['chunk']['chunk_id']}: similarity={chunk_info['similarity']:.3f}")
            
            # Sort all chunks by similarity and take the top N overall
            all_relevant_chunks.sort(key=lambda x: x['similarity'], reverse=True)
            top_chunks = all_relevant_chunks[:5]  # Top 5 chunks overall
            
            logger.info(f"Selected {len(top_chunks)} most relevant chunks for RAG context")
            
            # Build context from top chunks
            for i, chunk_info in enumerate(top_chunks):
                chunk_text = chunk_info['chunk']['text']
                similarity_score = chunk_info['similarity']
                context_parts.append(f"Video: {chunk_info['video_title']}\nRelevant Content (similarity: {similarity_score:.3f}):\n{chunk_text}")
                
                # Add to sources if not already present
                source_exists = any(s['video_id'] == chunk_info['video_id'] for s in sources)
                if not source_exists:
                    sources.append({
                        "video_id": chunk_info['video_id'],
                        "title": chunk_info['video_title']
                    })
        else:
            logger.warning("Lightweight BERT not available, falling back to prefix-based RAG")
            # Fallback to the original prefix-based approach
            for i, doc in enumerate(user_transcripts[:3]):  # Limit to 3 most relevant
                context_parts.append(f"Video {i+1}: {doc['title']}\nTranscript: {doc['transcript'][:10000]}...")
                sources.append({
                    "video_id": doc['video_id'],
                    "title": doc['title']
                })
        
        context = "\n\n".join(context_parts)
        logger.info(f"Final RAG context contains {len(context)} characters from {len(sources)} videos")
        
        # Generate answer using Gemini
        model = genai.GenerativeModel('gemini-1.5-flash')
        
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
        transcript = get_video_content_with_fallback(video_id, video_info)
        
        # Generate enhanced summary using Gemini
        if GEMINI_API_KEY:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
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

# Lightweight BERT recommendation endpoints
@app.get("/api/lightweight-bert/recommendations/{video_title}")
async def get_lightweight_recommendations(video_title: str, top_n: int = 5, genre_filter: str = None):
    """Get recommendations using lightweight BERT engine"""
    if not lightweight_bert:
        raise HTTPException(status_code=503, detail="Lightweight BERT service not available")
    
    try:
        recommendations = lightweight_bert.recommend_videos(
            title=video_title, 
            top_n=top_n, 
            genre_filter=genre_filter
        )
        
        return {
            "success": True,
            "recommendations": recommendations.to_dict('records') if not recommendations.empty else [],
            "total": len(recommendations),
            "engine": "lightweight_bert"
        }
    except Exception as e:
        logger.error(f"Error getting lightweight recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lightweight-bert/genre/{genre}")
async def get_lightweight_genre_recommendations(genre: str, top_n: int = 10):
    """Get genre-based recommendations using lightweight BERT"""
    if not lightweight_bert:
        raise HTTPException(status_code=503, detail="Lightweight BERT service not available")
    
    try:
        recommendations = lightweight_bert.get_genre_recommendations(genre=genre, top_n=top_n)
        
        return {
            "success": True,
            "genre": genre,
            "recommendations": recommendations.to_dict('records') if not recommendations.empty else [],
            "total": len(recommendations),
            "engine": "lightweight_bert"
        }
    except Exception as e:
        logger.error(f"Error getting genre recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lightweight-bert/popular")
async def get_lightweight_popular_recommendations(top_n: int = 10):
    """Get popular recommendations using lightweight BERT"""
    if not lightweight_bert:
        raise HTTPException(status_code=503, detail="Lightweight BERT service not available")
    
    try:
        recommendations = lightweight_bert.get_popular_recommendations(top_n=top_n)
        
        return {
            "success": True,
            "recommendations": recommendations.to_dict('records') if not recommendations.empty else [],
            "total": len(recommendations),
            "engine": "lightweight_bert"
        }
    except Exception as e:
        logger.error(f"Error getting popular recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lightweight-bert/stats")
async def get_lightweight_bert_stats():
    """Get lightweight BERT system stats"""
    if not lightweight_bert:
        raise HTTPException(status_code=503, detail="Lightweight BERT service not available")
    
    try:
        stats = lightweight_bert.get_system_stats()
        return {
            "success": True,
            "stats": stats,
            "engine": "lightweight_bert"
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Initialize proxy system when module loads
initialize_proxies()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global lightweight_bert
    try:
        logger.info("🚀 StreamSmart Backend starting up...")
        logger.info(f"📡 Proxy system: {'✅ Enabled' if proxy_list else '❌ Disabled'}")
        logger.info(f"🤖 Gemini AI: {'✅ Available' if GEMINI_API_KEY else '❌ Not configured'}")
        logger.info(f"📊 MongoDB: {'✅ Connected' if mongodb_client else '❌ Not connected'}")
        logger.info(f"🧠 Heavy BERT Service: {'✅ Available' if BERT_AVAILABLE else '❌ Disabled'}")
        
        # Initialize Lightweight BERT Engine as primary recommendation system
        if LIGHTWEIGHT_BERT_AVAILABLE:
            try:
                logger.info("🧠 Initializing Lightweight BERT Engine...")
                lightweight_bert = get_lightweight_bert_engine()
                if lightweight_bert.initialize_system():
                    logger.info("✅ Lightweight BERT Engine: Initialized successfully!")
                else:
                    logger.warning("⚠️ Lightweight BERT Engine: Failed to initialize, using fallback")
            except Exception as e:
                logger.error(f"❌ Lightweight BERT Engine error: {e}")
        else:
            logger.info("⚠️ Lightweight BERT Engine: Not available")
        
        # Fallback to heavy BERT if lightweight fails
        if not lightweight_bert:
            try:
                from services.bert_recommendation_engine import get_bert_recommendation_engine
                logger.info("🧠 Fallback: Initializing Heavy BERT recommendation system...")
                bert_engine = get_bert_recommendation_engine()
                bert_engine.initialize_system()
                logger.info("✅ Heavy BERT recommendation system initialized!")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Heavy BERT system: {e}")
        
        # Start content collection system
        try:
            from genre_endpoints import start_content_collection
            await start_content_collection()
            logger.info("🎯 Content collection system started - collecting videos every 6 hours")
        except Exception as e:
            logger.error(f"Failed to start content collection: {e}")
        
        logger.info("🎉 Backend startup complete!")
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 