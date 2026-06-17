"""
Simplified FastAPI backend for StreamSmart RAG functionality
Focuses on core features without heavy ML dependencies for easier deployment
"""

import os
import logging

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    import pathlib
    # Load from parent directory (project root)
    env_path = pathlib.Path(__file__).parent.parent / '.env'
    load_dotenv(env_path)
    print(f"[OK] Loaded environment variables from {env_path}")
except ImportError:
    print("[WARNING] python-dotenv not installed, using system environment variables only")
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import hashlib
from datetime import datetime
import re
import requests
from urllib.parse import parse_qs, urlparse
import time
import numpy as np
import json

# Optional AWS stack imports
try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    from opensearchpy import OpenSearch, RequestsHttpConnection
    from requests_aws4auth import AWS4Auth
    HAS_AWS_LIBS = True
except ImportError:
    HAS_AWS_LIBS = False
    boto3 = None
    AWS4Auth = None
    OpenSearch = None
    RequestsHttpConnection = None
    BotoCoreError = ClientError = Exception
    print("[WARNING] AWS SDK libraries not available - RAG AWS features disabled")

# Optional imports with graceful fallbacks
try:
    import google.generativeai as genai
    HAS_GOOGLE_AI = True
except ImportError:
    HAS_GOOGLE_AI = False
    genai = None
    print("[WARNING] Google AI not available - some features disabled")

# OpenAI import
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    openai = None
    print("[WARNING] OpenAI not available - suggestion generation disabled")

# MongoDB removed - using DynamoDB exclusively
HAS_MONGO = False
MongoClient = None

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    HAS_YOUTUBE_API = True
except ImportError:
    HAS_YOUTUBE_API = False
    YouTubeTranscriptApi = None
    print("[WARNING] YouTube Transcript API not available")

try:
    import yt_dlp
    HAS_YT_DLP = True
except ImportError:
    HAS_YT_DLP = False
    yt_dlp = None
    print("[WARNING] yt-dlp not available - video processing disabled")

try:
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    cosine_similarity = None
    print("[WARNING] scikit-learn not available - similarity calculations disabled")

try:
    import nltk
    from nltk.tokenize import sent_tokenize
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False
    nltk = None
    sent_tokenize = None
    print("[WARNING] NLTK not available - text processing may be limited")

# Lightweight BERT removed; keep placeholder for existing calls to no-op
    lightweight_bert = None

# Import services
try:
    from services.transcript_service import transcript_service
    from services.conversation_service import conversation_service
    from services.multi_modal_service import multi_modal_service
    from services.advanced_search_service import advanced_search_service
    HAS_SERVICES = True
except ImportError as e:
    print(f"[WARNING] Services not available: {e}")
    HAS_SERVICES = False
    transcript_service = None
    conversation_service = None
    multi_modal_service = None
    advanced_search_service = None

# Import remaining endpoints
from genre_endpoints import router as genre_router

# Import CSV-based recommendation router
try:
    from recommendation_endpoints import router as recommendation_router
    RECOMMENDATIONS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Recommendation endpoints unavailable: {e}")
    RECOMMENDATIONS_AVAILABLE = False
    recommendation_router = None

# Import AI Recommendation V1 API (for frontend compatibility)
try:
    from ai_recommendation_api import router as ai_v1_router
    AI_V1_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ AI Recommendation V1 API unavailable: {e}")
    AI_V1_AVAILABLE = False
    ai_v1_router = None

# Import Transcript router
try:
    from transcript_endpoints import router as transcript_router
    TRANSCRIPT_AVAILABLE = True
except ImportError as e:
    print(f"Transcript endpoints unavailable: {e}")
    TRANSCRIPT_AVAILABLE = False
    transcript_router = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="StreamSmart Backend", version="1.0.0")

# CORS middleware - Restricted for security
ALLOWED_ORIGINS = [
    "https://main.de7gjtsqdtkvr.amplifyapp.com",
    "https://streamsmart.vercel.app",
    "http://localhost:3000",  # Development only
    "http://127.0.0.1:3000",  # Development only
]

# Comma-separated additional origins for deployments (for example Vercel preview/prod URLs)
extra_origins = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
for origin in extra_origins:
    if origin not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(origin)

# In production, remove localhost origins
if os.getenv("ENVIRONMENT") == "production":
    ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if "localhost" not in o and "127.0.0.1" not in o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Register routers for modular endpoints
app.include_router(genre_router)

# Include CSV recommendation router
if RECOMMENDATIONS_AVAILABLE and recommendation_router:
    app.include_router(recommendation_router)
    print("[OK] CSV-based recommendation service enabled")
else:
    print("[WARNING] Recommendation service disabled")

# Include AI Recommendation V1 API (for frontend compatibility)
if AI_V1_AVAILABLE and ai_v1_router:
    app.include_router(ai_v1_router)
    print("[OK] AI Recommendation V1 API enabled (/api/v1/recommend)")
else:
    print("[WARNING] AI Recommendation V1 API disabled")

# Include Transcript router if available
if TRANSCRIPT_AVAILABLE and transcript_router:
    app.include_router(transcript_router)
    print("[OK] Transcript upload/download endpoints enabled")
else:
    print("[WARNING] Transcript endpoints disabled")

# Include Lex proxy router
try:
    from lex_proxy_endpoint import router as lex_router
    app.include_router(lex_router)
    print("[OK] Lex voice chat proxy endpoint enabled")
except Exception as e:
    print(f"[WARNING] Lex proxy endpoint not available: {e}")

# Note: AI content endpoints were removed as part of recommendation engine cleanup

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # For embeddings and chat
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  # Get from Google Cloud Console

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_RAG_S3_BUCKET = os.getenv("AWS_RAG_S3_BUCKET")
AWS_RAG_OPENSEARCH_ENDPOINT = os.getenv("AWS_RAG_OPENSEARCH_ENDPOINT")
AWS_RAG_OPENSEARCH_INDEX = os.getenv("AWS_RAG_OPENSEARCH_INDEX", "streamsmart-rag-chunks")
AWS_RAG_EMBED_MODEL = os.getenv("AWS_RAG_EMBED_MODEL", "amazon.titan-embed-text-v2")
AWS_RAG_LLM_MODEL = os.getenv("AWS_RAG_LLM_MODEL", "amazon.titan-text-express-v1")

AWS_RAG_ENABLED = bool(
    HAS_AWS_LIBS
    and AWS_RAG_S3_BUCKET
    and AWS_RAG_OPENSEARCH_ENDPOINT
)



# MongoDB removed - using DynamoDB for all database operations

# AWS RAG manager will be initialized after class definition
aws_rag_manager: Optional["AWSRAGManager"] = None

# Initialize Gemini if available
if GEMINI_API_KEY and HAS_GOOGLE_AI:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini AI configured successfully")
    except Exception as e:
        logger.error(f"Gemini AI configuration failed: {e}")

# Initialize OpenAI if available
if OPENAI_API_KEY and HAS_OPENAI:
    try:
        openai.api_key = OPENAI_API_KEY
        logger.info("OpenAI configured successfully")
    except Exception as e:
        logger.error(f"OpenAI configuration failed: {e}")

# Try to download required NLTK data
if HAS_NLTK:
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        try:
            nltk.download('punkt', quiet=True)
        except Exception as e:
            logger.warning(f"Could not download NLTK punkt tokenizer: {e}")
else:
    logger.warning("NLTK not available - text tokenization may be limited")



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


class AWSRAGManager:
    """Handles AWS-backed storage, retrieval, and generation for the RAG workflow."""

    def __init__(
        self,
        *,
        region: str,
        bucket: str,
        opensearch_endpoint: str,
        index: str,
        embed_model_id: str,
        llm_model_id: str,
    ) -> None:
        if not HAS_AWS_LIBS:
            raise RuntimeError("AWS SDK libraries are not available")

        self.region = region
        self.bucket = bucket
        self.index = index
        self.embed_model_id = embed_model_id
        self.llm_model_id = llm_model_id
        self._session = boto3.Session(region_name=region)
        self.logger = logging.getLogger("AWSRAGManager")
        self._init_clients(opensearch_endpoint)

    def _init_clients(self, opensearch_endpoint: str) -> None:
        self.s3 = self._session.client("s3")
        self.bedrock = self._session.client("bedrock-runtime", region_name=self.region)

        credentials = self._session.get_credentials()
        if credentials is None:
            raise RuntimeError("Unable to locate AWS credentials for RAG integration")

        frozen = credentials.get_frozen_credentials()
        host = opensearch_endpoint.replace("https://", "").replace("http://", "").rstrip("/")

        self.opensearch = OpenSearch(
            hosts=[{"host": host, "port": 443}],
            http_auth=AWS4Auth(
                frozen.access_key,
                frozen.secret_key,
                self.region,
                "es",
                session_token=frozen.token,
            ),
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
        )

        self.vector_dimension: Optional[int] = None

    def _ensure_index(self, dimension: int) -> None:
        if self.opensearch.indices.exists(index=self.index):
            if not self.vector_dimension:
                mapping = self.opensearch.indices.get_mapping(index=self.index)
                try:
                    self.vector_dimension = mapping[self.index]["mappings"]["properties"]["vector"]["dimension"]
                except KeyError:
                    self.vector_dimension = dimension
            if self.vector_dimension and self.vector_dimension != dimension:
                self.logger.warning(
                    "OpenSearch index %s dimension mismatch (expected %s, got %s)",
                    self.index,
                    self.vector_dimension,
                    dimension,
                )
            return

        body = {
            "settings": {"index": {"knn": True}},
            "mappings": {
                "properties": {
                    "vector": {
                        "type": "knn_vector",
                        "dimension": dimension,
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "faiss",
                        },
                    },
                    "user_id": {"type": "keyword"},
                    "video_id": {"type": "keyword"},
                    "video_title": {"type": "text"},
                    "chunk_id": {"type": "keyword"},
                    "text": {"type": "text"},
                    "source_url": {"type": "keyword"},
                    "s3_key": {"type": "keyword"},
                    "created_at": {"type": "date"},
                }
            },
        }

        self.opensearch.indices.create(index=self.index, body=body)
        self.vector_dimension = dimension
        self.logger.info("Created OpenSearch index %s (dimension=%s)", self.index, dimension)

    def _utc_now(self) -> str:
        return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    def _decode_body(self, response_body) -> Dict[str, Any]:
        payload = response_body.read()
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        return json.loads(payload)

    def _embed_text(self, text: str) -> List[float]:
        body = json.dumps({"inputText": text})
        response = self.bedrock.invoke_model(
            modelId=self.embed_model_id,
            body=body,
            accept="application/json",
            contentType="application/json",
        )

        result = self._decode_body(response["body"])
        embedding = result.get("embedding")

        if embedding is None and "embeddings" in result:
            embedding = result["embeddings"][0].get("embedding")

        if embedding is None and "vector" in result:
            embedding = result["vector"]

        if embedding is None:
            raise RuntimeError("Embedding model returned no vector data")

        return embedding

    def ingest_transcript(
        self,
        *,
        user_id: str,
        video_id: str,
        title: str,
        transcript_text: str,
        source_url: str,
    ) -> Dict[str, Any]:
        s3_key = f"transcripts/{user_id}/{video_id}.txt"

        self.s3.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=transcript_text.encode("utf-8"),
        )

        chunks = chunk_transcript(transcript_text)
        indexed = 0
        failures = 0

        for idx, chunk in enumerate(chunks):
            try:
                embedding = self._embed_text(chunk)
                self._ensure_index(len(embedding))

                doc_id = f"{user_id}:{video_id}:{idx:04d}"
                doc = {
                    "user_id": user_id,
                    "video_id": video_id,
                    "video_title": title,
                    "chunk_id": idx,
                    "text": chunk,
                    "vector": embedding,
                    "source_url": source_url,
                    "s3_key": s3_key,
                    "created_at": self._utc_now(),
                }

                self.opensearch.index(index=self.index, id=doc_id, body=doc)
                indexed += 1
            except Exception as exc:  # noqa: BLE001
                failures += 1
                self.logger.error("Failed to index chunk %s for %s: %s", idx, video_id, exc)

        return {
            "s3Key": s3_key,
            "chunksIndexed": indexed,
            "chunksFailed": failures,
        }

    def retrieve_relevant_chunks(
        self,
        *,
        question: str,
        user_id: str,
        video_filter: Optional[List[str]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        embedding = self._embed_text(question)
        self._ensure_index(len(embedding))

        search_size = max(top_k * 3, top_k)
        query = {
            "size": search_size,
            "query": {
                "knn": {
                    "vector": {
                        "vector": embedding,
                        "k": search_size,
                    }
                }
            },
        }

        response = self.opensearch.search(index=self.index, body=query)
        hits = []

        for hit in response.get("hits", {}).get("hits", []):
            source = hit.get("_source", {})

            if source.get("user_id") != user_id:
                continue

            if video_filter and source.get("video_id") not in video_filter:
                continue

            hits.append(
                {
                    "text": source.get("text", ""),
                    "video_id": source.get("video_id"),
                    "video_title": source.get("video_title"),
                    "source_url": source.get("source_url"),
                    "score": hit.get("_score", 0.0),
                }
            )

            if len(hits) >= top_k:
                break

        return hits

    def _generate_answer(self, question: str, context_blocks: List[Dict[str, Any]]) -> str:
        if not context_blocks:
            return ""

        context_parts = []
        for idx, block in enumerate(context_blocks, start=1):
            snippet = block["text"]
            if len(snippet) > 1600:
                snippet = snippet[:1600] + "..."
            context_parts.append(f"[Source {idx}] {block['video_title']}:\n{snippet}")

        prompt = (
            "You are StreamSmart's educational assistant. Use only the provided context to answer.\n"
            "Cite sources in the form [Source N]. If the context lacks the answer, say so.\n\n"
            f"Question: {question}\n\nContext:\n{chr(10).join(context_parts)}\n\nAnswer:"
        )

        body = json.dumps(
            {
                "inputText": prompt,
                "textGenerationConfig": {
                    "maxTokenCount": 600,
                    "temperature": 0.2,
                    "topP": 0.9,
                },
            }
        )

        response = self.bedrock.invoke_model(
            modelId=self.llm_model_id,
            body=body,
            accept="application/json",
            contentType="application/json",
        )

        result = self._decode_body(response["body"])

        if "results" in result and result["results"]:
            return result["results"][0].get("outputText", "").strip()

        if "outputText" in result:
            return result["outputText"].strip()

        return ""

    def answer_question(
        self,
        *,
        question: str,
        user_id: str,
        video_filter: Optional[List[str]],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        chunks = self.retrieve_relevant_chunks(
            question=question,
            user_id=user_id,
            video_filter=video_filter,
            top_k=top_k,
        )

        if not chunks:
            return {
                "answer": "",
                "sources": [],
                "chunks": [],
            }

        answer = self._generate_answer(question, chunks)

        sources = []
        for idx, chunk in enumerate(chunks, start=1):
            sources.append(
                {
                    "video_id": chunk.get("video_id"),
                    "title": chunk.get("video_title"),
                    "score": chunk.get("score"),
                    "source": f"Source {idx}",
                    "url": chunk.get("source_url"),
                }
            )

        return {
            "answer": answer,
            "sources": sources,
            "chunks": chunks,
        }

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





def get_video_transcript_with_summary_fallback(video_id: str, video_info: dict) -> Optional[str]:
    """Try to get actual transcript, return None if not available (for RAG quality)"""
    transcript = get_video_transcript_with_user_agent(video_id)
    if transcript and len(transcript.strip()) > 100:
        logger.info(f"✅ Using full transcript for {video_id} ({len(transcript)} characters)")
        return transcript
    logger.warning(f"❌ No actual transcript available for {video_id}. Returning None for RAG quality.")
    return None

def get_video_content_with_fallback(video_id: str, video_info: dict) -> str:
    """Get video content with fallback to metadata (for non-RAG purposes like /enhance-video)"""
    transcript = get_video_transcript_with_user_agent(video_id)
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
    """Get video info using browser User-Agent headers"""
    logger.info(f"🔍 Attempting video info fetch with browser User-Agent for {url}")
    result = get_video_info_with_user_agent(url)
    return result
    
def get_video_transcript(video_id: str) -> Optional[str]:
    """Get transcript using browser User-Agent method only"""
    logger.info(f"🔍 Attempting transcript fetch with browser User-Agent for {video_id}")
    transcript = get_video_transcript_with_user_agent(video_id)
    if transcript:
        return transcript
    logger.warning(f"❌ Transcript fetch failed for {video_id}")
    return None

# ============================================================================
# Initialize AWS RAG Manager (after class definition)
# ============================================================================
if AWS_RAG_ENABLED:
    try:
        aws_rag_manager = AWSRAGManager(
            region=AWS_REGION,
            bucket=AWS_RAG_S3_BUCKET,
            opensearch_endpoint=AWS_RAG_OPENSEARCH_ENDPOINT,
            index=AWS_RAG_OPENSEARCH_INDEX,
            embed_model_id=AWS_RAG_EMBED_MODEL,
            llm_model_id=AWS_RAG_LLM_MODEL,
        )
        logger.info(
            "✅ AWS RAG manager enabled (bucket=%s, index=%s)",
            AWS_RAG_S3_BUCKET,
            AWS_RAG_OPENSEARCH_INDEX,
        )
    except Exception as aws_error:
        aws_rag_manager = None
        logger.error("❌ Failed to initialize AWS RAG manager: %s", aws_error)
        import traceback
        logger.error("Full traceback: %s", traceback.format_exc())
else:
    logger.info("⚠️ AWS RAG manager disabled (missing configuration or libraries)")

# ============================================================================
# Pydantic models
# ============================================================================
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

class GenerateQuizRequest(BaseModel):
    video_id: str
    num_questions: Optional[int] = 5

class GenerateStudyPlanRequest(BaseModel):
    playlist_id: str
    video_titles: List[str]
    user_goal: Optional[str] = None

class SuggestRelatedRequest(BaseModel):
    video_id: str
    exclude_playlist_id: Optional[str] = None

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
    """Health check endpoint with detailed service status"""
    # Check TranscriptService
    from services.transcript_service import transcript_service
    transcript_status = bool(transcript_service)
    
    services = {
        "gemini_ai": bool(GEMINI_API_KEY),
        "openai": bool(OPENAI_API_KEY),
        "dynamodb": True,  # Using DynamoDB exclusively
        "backend": True,
        "recommendations": True,  # CSV-based recommendations
        "aws_rag": bool(aws_rag_manager) if 'aws_rag_manager' in globals() else False,
        "transcripts": transcript_status,  # S3-based transcript system
        "transcript_service": transcript_status,  # TranscriptService singleton
    }
    
    # Log AWS RAG status
    if services["aws_rag"]:
        logger.info(f"✅ AWS RAG Manager: ENABLED (Bucket: {AWS_RAG_S3_BUCKET}, Index: {AWS_RAG_OPENSEARCH_INDEX})")
    else:
        logger.warning(f"⚠️ AWS RAG Manager: DISABLED (Check: HAS_AWS_LIBS={HAS_AWS_LIBS}, BUCKET={bool(AWS_RAG_S3_BUCKET)}, ENDPOINT={bool(AWS_RAG_OPENSEARCH_ENDPOINT)})")
    
    status = "healthy" if services["backend"] else "degraded"
    
    return HealthResponse(
        status=status,
        services=services
    )

@app.post("/process-videos")
async def process_videos(request: ProcessVideosRequest):
    """Process YouTube videos and store transcripts in S3"""
    # Transcripts stored in S3 via Chrome extension
    
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
            
            chunks_with_embeddings: List[Dict[str, Any]] = []
            aws_rag_metadata: Optional[Dict[str, Any]] = None

            if aws_rag_manager:
                try:
                    aws_rag_metadata = aws_rag_manager.ingest_transcript(
                        user_id=request.userId,
                        video_id=video_id,
                        title=video_info['title'],
                        transcript_text=transcript,
                        source_url=url,
                    )
                    logger.info(
                        "Indexed %s chunks for %s via AWS RAG",
                        aws_rag_metadata.get("chunksIndexed", 0),
                        video_id,
                    )
                except Exception as aws_ingest_error:  # noqa: BLE001
                    logger.error(
                        "AWS RAG ingestion failed for %s: %s",
                        video_id,
                        aws_ingest_error,
                    )
            else:
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
                "chunks": chunks_with_embeddings,  # Legacy local chunk storage
                "awsRag": aws_rag_metadata,
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

def get_transcripts_from_s3(video_ids: list) -> list:
    """Fetch transcripts from S3 for given video IDs"""
    try:
        import boto3
        import json
        
        s3_client = boto3.client('s3', region_name='ap-south-1')
        transcripts = []
        
        for video_id in video_ids:
            try:
                s3_key = f"{video_id}.json"
                response = s3_client.get_object(
                    Bucket='streamsmart-transcripts-560271561936',
                    Key=s3_key
                )
                
                transcript_data = json.loads(response['Body'].read().decode('utf-8'))
                
                # Convert segments to text
                transcript_text = '\n'.join([
                    f"[{seg['timestamp']}] {seg['text']}" 
                    for seg in transcript_data.get('segments', [])
                ])
                
                transcripts.append({
                    'video_id': video_id,
                    'title': transcript_data.get('title', 'Unknown'),
                    'transcript': transcript_text
                })
                
                logger.info(f"Loaded transcript from S3 for video: {video_id}")
            except Exception as e:
                logger.warning(f"Could not load transcript for {video_id}: {e}")
                continue
        
        return transcripts
    except Exception as e:
        logger.error(f"Error fetching transcripts from S3: {e}")
        return []

@app.post("/rag-answer")
async def rag_answer(request: RAGAnswerRequest):
    """Answer questions using RAG with stored transcripts"""
    # Try S3 transcripts first (new system)
    use_s3_transcripts = True
    
    # We now use AWS Bedrock directly, so we only need boto3
    if not HAS_AWS_LIBS:
        raise HTTPException(status_code=500, detail="AWS Bedrock not available - boto3 required")
    
    try:
        logger.info(f"RAG request: userId={request.userId}, question='{request.question}', video_ids={request.video_ids}")

        if aws_rag_manager:
            try:
                aws_response = aws_rag_manager.answer_question(
                    question=request.question,
                    user_id=request.userId,
                    video_filter=request.video_ids,
                    top_k=5,
                )

                if aws_response["answer"]:
                    return {
                        "answer": aws_response["answer"],
                        "sources": aws_response["sources"],
                        "sourceType": "aws_rag",
                    }

                if not aws_response["sources"]:
                    return {
                        "answer": "I could not find any indexed transcripts for your question yet. Please process videos first and try again.",
                        "sources": [],
                        "sourceType": "aws_rag",
                    }

                # Fall back to local pipeline if AWS returned context without an answer
                logger.warning("AWS RAG returned context without answer; falling back to Gemini pipeline")
            except Exception as aws_error:  # noqa: BLE001
                logger.error("AWS RAG pipeline failed: %s", aws_error)
        
        if aws_rag_manager and not GEMINI_API_KEY:
            return {
                "answer": "I could not complete the response because the backup model is unavailable. Please retry in a moment.",
                "sources": [],
                "sourceType": "aws_rag",
            }

        # Try to get transcripts from S3 first (new system)
        user_transcripts = []
        
        if use_s3_transcripts and request.video_ids:
            logger.info("Attempting to fetch transcripts from S3...")
            user_transcripts = get_transcripts_from_s3(request.video_ids)
        
        # MongoDB removed - only using S3 for transcripts now
        if not user_transcripts:
            logger.info("[INFO] No transcripts found in S3")
            # Continue with empty list
        
        logger.info(f"Found {len(user_transcripts)} transcripts for RAG context")
        
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
        
        # Generate answer using OpenAI GPT-4o-mini (most cost-efficient)
        import os
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
        
        try:
            prompt = f"""Based on the following video transcripts, answer the user's question. Be specific and cite which video(s) you're referencing.

Question: {request.question}

Video Transcripts:
{context[:15000]}

Please provide a helpful, accurate answer based on the transcript content. If the transcripts don't contain relevant information, say so clearly."""
            
            # Call OpenAI API with GPT-4o-mini (cheapest at ~$0.15/1M input tokens)
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 1024,
                "temperature": 0.7
            }
            
            logger.info("[OPENAI] Calling GPT-4o-mini...")
            import requests
            response = requests.post(OPENAI_API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            response_data = response.json()
            answer = response_data['choices'][0]['message']['content']
            
            logger.info("[OPENAI] Generated answer using GPT-4o-mini (cost: ~$0.15/1M tokens)")
            
            return {
                "answer": answer,
                "sources": sources,
                "sourceType": "transcripts"
            }
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating answer with OpenAI: {str(e)}")
        
    except Exception as e:
        import traceback
        logger.error(f"Error in RAG answer: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
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

## ML endpoints removed - using CSV recommendations

@app.post("/generate-mindmap")
async def generate_mindmap(request: dict):
    """Generate mind map using Gemini API from video transcript"""
    # MongoDB removed - transcripts stored in S3
    # Note: GEMINI_API_KEY check removed as we now use OpenAI
    
    try:
        video_id = request.get("video_id")
        user_id = request.get("userId")
        
        if not video_id:
            raise HTTPException(status_code=400, detail="video_id is required")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")
        
        logger.info(f"🧠 Generating mind map for video {video_id}, user {user_id}")
        
        # First, try to get transcript from database
        transcript_doc = db.transcripts.find_one({
            "video_id": video_id,
            "userId": user_id
        })
        
        transcript_text = None
        video_title = "Educational Video"
        
        if transcript_doc:
            transcript_text = transcript_doc.get("transcript")
            video_title = transcript_doc.get("title", video_title)
            logger.info(f"📝 Found stored transcript for {video_id}: {len(transcript_text) if transcript_text else 0} characters")
        
        # If no transcript in database, try to fetch it directly
        if not transcript_text:
            logger.info(f"📝 No stored transcript found, attempting direct fetch for {video_id}")
            transcript_text = get_video_transcript_with_user_agent(video_id)
            
            # Try to get video title from YouTube API if available
            try:
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                video_info = get_video_info(video_url)
                video_title = video_info.get("title", video_title)
            except Exception as e:
                logger.warning(f"Could not fetch video info for {video_id}: {e}")
        
        if not transcript_text or len(transcript_text.strip()) < 100:
            logger.error(f"❌ No valid transcript available for {video_id}")
            raise HTTPException(
                status_code=404, 
                detail="No transcript available for this video. Please process the video first."
            )
        
        logger.info(f"✅ Using transcript of {len(transcript_text)} characters for mind map generation")
        
        # Prepare optimized transcript (limit to prevent token overflow)
        max_transcript_length = 8000  # Limit transcript to prevent token overflow
        optimized_transcript = transcript_text[:max_transcript_length]
        if len(transcript_text) > max_transcript_length:
            optimized_transcript += "... [transcript truncated for processing]"
        
        # Prepare the detailed prompt for Gemini
        mindmap_prompt = f"""You are an expert in analyzing educational content and structuring it into a hierarchical mind map.
Given the following transcript from a YouTube video, please generate a mind map.

CRITICAL: Your response must be ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or comments before or after the JSON.

The mind map should be structured with a clear root topic, main themes, key concepts under each theme, and further detailed sub-concepts where appropriate.
The goal is to create a visually intuitive and informative mind map that helps users understand the core ideas and relationships within the video content.

Return ONLY a complete, valid JSON object with "nodes" and "edges" arrays.

**Nodes:**
Each node object in the "nodes" array should strictly adhere to the following structure:
- id: (String) A unique string identifier for the node (e.g., "1", "node-abc", "theme-1-concept-2"). Ensure IDs are unique across all nodes.
- type: (String) Always set to "collapsible".
- data: (Object) An object containing:
    - label: (String) A concise and descriptive string for the node's title. Aim for clarity and brevity (e.g., max 60 characters, shorter for deeper levels).
    - description: (String, Optional) A brief string explaining the node's content in more detail if the label is very short (e.g., max 150 characters).
    - level: (Integer) An integer representing the hierarchy level (0 for the root topic, 1 for main themes, 2 for key concepts, 3 for sub-concepts/details, etc.).
    - childrenIds: (Array of Strings, Optional) An array of string IDs of its direct child nodes. This helps define the hierarchy. If a node has no children, this can be an empty array or omitted.
    - parentId: (String, Optional) The string ID of its parent node. The root node will not have a parentId.
    - width: (Integer, Optional) Suggested initial width for the node (e.g., 250 for level 0, 200 for level 1, 180 for level 2+). The frontend may adjust this.
    - height: (Integer, Optional) Suggested initial height for the node (e.g., 90 for level 0, 80 for level 1, 70 for level 2+). The frontend may adjust this.
- position: (Object) An object {{"x": 0, "y": 0}}. The frontend layout engine (ELK.js) will calculate the actual positions.

**Edges:**
Each edge object in the "edges" array should strictly adhere to the following structure:
- id: (String) A unique string identifier for the edge (e.g., "e_1-2", "edge_theme1_concept1a"). Ensure IDs are unique across all edges.
- source: (String) The string ID of the source node (parent).
- target: (String) The string ID of the target node (child).
- type: (String, Optional) Default to "curved" for aesthetically pleasing lines.
- animated: (Boolean, Optional) Set to true for edges connecting the root node to level 1 themes to draw attention. Otherwise, false or omit.
- style: (Object, Optional) An object for custom styles. For example:
    - {{"stroke": "#4F46E5", "strokeWidth": 3}} for root-to-theme edges.
    - {{"stroke": "#059669", "strokeWidth": 2.5}} for theme-to-concept edges.
    - {{"stroke": "#9CA3AF", "strokeWidth": 2}} for concept-to-detail edges.
    Adjust colors and strokeWidths to create a clear visual hierarchy.

**Hierarchy and Content Guidelines:**
1.  **Root Topic (Level 0):** Identify the single, overarching central theme or title of the video. This will be the only node at level 0.
2.  **Main Themes (Level 1):** Extract 3-5 major themes, sections, or primary arguments from the transcript. These should be direct children of the root topic.
3.  **Key Concepts (Level 2):** For each main theme, identify 3-7 key concepts, supporting ideas, important terminologies, or significant points discussed. These should be children of their respective themes.
4.  **Sub-Concepts/Details (Level 3+):** If a key concept is particularly complex or has multiple distinct sub-points, examples, or elaborations, break it down further. Aim for a maximum depth of 4-5 levels to maintain clarity and prevent visual clutter.
5.  **Conciseness & Clarity:** Node labels must be concise. Use the optional `description` field for more detailed explanations if needed, especially if the label has to be very short to fit.
6.  **Logical Flow & Relationships:** Edges must represent clear, logical relationships (e.g., a theme is composed of several concepts; a concept is elaborated by details).
7.  **Coverage:** The mind map should comprehensively cover the most important and salient information from the transcript, providing a good overview of the video's content.
8.  **Node and Edge Count:** Strive for a balanced mind map. Too few nodes might be uninformative, while too many (e.g., > 70-100 nodes for a typical 10-20 min video) can become overwhelming. Adjust the level of detail accordingly.

**Video Title:** {video_title}

**Video Transcript for Mind Map Generation:**
---
{optimized_transcript}
---

Generate the complete mind map JSON based on the provided transcript. Output ONLY the JSON object with no additional text."""

        # Generate mind map using Gemini
        logger.info(f"🤖 Sending transcript to Gemini for mind map generation...")
        model = genai.GenerativeModel('gemini-pro')
        
        # Configure generation for better JSON output with higher limits
        generation_config = genai.types.GenerationConfig(
            temperature=0.2,  # Even lower temperature for more consistent JSON structure
            top_p=0.9,
            top_k=40,
            max_output_tokens=16384,  # Increased token limit to prevent truncation
            candidate_count=1,  # Ensure single response
            stop_sequences=None  # No stop sequences to prevent early termination
        )
        
        response = model.generate_content(
            mindmap_prompt,
            generation_config=generation_config
        )
        
        if not response.text:
            raise HTTPException(status_code=500, detail="Gemini returned empty response")
        
        # Clean and parse the JSON response with robust error handling
        raw_response = response.text.strip()
        logger.info(f"📊 Gemini response received: {len(raw_response)} characters")
        
        # Remove potential markdown formatting
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]
        raw_response = raw_response.strip()
        
        # Parse JSON with multiple fallback strategies
        mindmap_data = None
        
        try:
            # First attempt: Direct JSON parsing
            mindmap_data = json.loads(raw_response)
            logger.info(f"✅ Successfully parsed mind map JSON with {len(mindmap_data.get('nodes', []))} nodes and {len(mindmap_data.get('edges', []))} edges")
            
        except json.JSONDecodeError as e:
            logger.warning(f"⚠️ First JSON parse failed: {e}")
            
            # Second attempt: Try to fix common JSON issues
            try:
                # Find the last complete closing brace
                last_brace = raw_response.rfind('}')
                if last_brace > 0:
                    truncated_response = raw_response[:last_brace + 1]
                    logger.info(f"🔧 Attempting to parse truncated response: {len(truncated_response)} characters")
                    mindmap_data = json.loads(truncated_response)
                    logger.info(f"✅ Successfully parsed truncated JSON with {len(mindmap_data.get('nodes', []))} nodes and {len(mindmap_data.get('edges', []))} edges")
                
            except json.JSONDecodeError as e2:
                logger.warning(f"⚠️ Truncated JSON parse failed: {e2}")
                
                # Third attempt: Extract JSON from text using regex
                try:
                    import re
                    json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
                    if json_match:
                        extracted_json = json_match.group(0)
                        logger.info(f"🔧 Attempting regex-extracted JSON: {len(extracted_json)} characters")
                        mindmap_data = json.loads(extracted_json)
                        logger.info(f"✅ Successfully parsed regex-extracted JSON with {len(mindmap_data.get('nodes', []))} nodes and {len(mindmap_data.get('edges', []))} edges")
                
                except (json.JSONDecodeError, AttributeError) as e3:
                    logger.error(f"❌ All JSON parsing attempts failed. Final error: {e3}")
                    logger.error(f"Raw response preview: {raw_response[:1000]}...")
                    logger.error(f"Raw response ending: ...{raw_response[-500:]}")
                    
                    # Fourth attempt: Generate a simple fallback mind map
                    logger.info("🔧 Generating fallback mind map structure...")
                    mindmap_data = {
                        "nodes": [
                            {
                                "id": "root",
                                "type": "collapsible",
                                "data": {
                                    "label": video_title or "Educational Content",
                                    "description": "AI-generated mind map from video transcript",
                                    "level": 0,
                                    "width": 300,
                                    "height": 100,
                                    "childrenIds": ["theme-1", "theme-2", "theme-3"]
                                },
                                "position": {"x": 0, "y": 0}
                            },
                            {
                                "id": "theme-1",
                                "type": "collapsible",
                                "data": {
                                    "label": "Main Concepts",
                                    "description": "Key ideas from the video",
                                    "level": 1,
                                    "width": 220,
                                    "height": 80,
                                    "parentId": "root",
                                    "childrenIds": []
                                },
                                "position": {"x": 0, "y": 0}
                            },
                            {
                                "id": "theme-2",
                                "type": "collapsible",
                                "data": {
                                    "label": "Learning Objectives",
                                    "description": "Educational goals and outcomes",
                                    "level": 1,
                                    "width": 220,
                                    "height": 80,
                                    "parentId": "root",
                                    "childrenIds": []
                                },
                                "position": {"x": 0, "y": 0}
                            },
                            {
                                "id": "theme-3",
                                "type": "collapsible",
                                "data": {
                                    "label": "Practical Applications",
                                    "description": "Real-world uses and examples",
                                    "level": 1,
                                    "width": 220,
                                    "height": 80,
                                    "parentId": "root",
                                    "childrenIds": []
                                },
                                "position": {"x": 0, "y": 0}
                            }
                        ],
                        "edges": [
                            {
                                "id": "e_root-theme1",
                                "source": "root",
                                "target": "theme-1",
                                "type": "curved",
                                "animated": True,
                                "style": {"stroke": "#4F46E5", "strokeWidth": 3}
                            },
                            {
                                "id": "e_root-theme2",
                                "source": "root",
                                "target": "theme-2",
                                "type": "curved",
                                "animated": True,
                                "style": {"stroke": "#4F46E5", "strokeWidth": 3}
                            },
                            {
                                "id": "e_root-theme3",
                                "source": "root",
                                "target": "theme-3",
                                "type": "curved",
                                "animated": True,
                                "style": {"stroke": "#4F46E5", "strokeWidth": 3}
                            }
                        ]
                    }
                    logger.info("✅ Generated fallback mind map structure")
        
        if not mindmap_data:
            raise HTTPException(
                status_code=500, 
                detail="Failed to generate mind map data from AI response"
            )
        
        # Validate the structure
        if not isinstance(mindmap_data, dict) or 'nodes' not in mindmap_data or 'edges' not in mindmap_data:
            logger.error("❌ Invalid mind map structure from Gemini")
            raise HTTPException(
                status_code=500, 
                detail="Invalid mind map structure received from AI"
            )
        
        nodes = mindmap_data.get('nodes', [])
        edges = mindmap_data.get('edges', [])
        
        if not nodes:
            logger.error("❌ No nodes in mind map from Gemini")
            raise HTTPException(
                status_code=500, 
                detail="No mind map nodes generated"
            )
        
        # Store the generated mind map in database for caching
        try:
            mindmap_doc = {
                "video_id": video_id,
                "userId": user_id,
                "video_title": video_title,
                "mindmap_data": mindmap_data,
                "generated_at": datetime.utcnow(),
                "transcript_hash": hashlib.md5(transcript_text.encode()).hexdigest(),
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
            
            # Upsert the mind map (replace if exists)
            db.mindmaps.replace_one(
                {"video_id": video_id, "userId": user_id},
                mindmap_doc,
                upsert=True
            )
            logger.info(f"💾 Stored mind map in database for {video_id}")
        except Exception as store_error:
            logger.warning(f"⚠️ Could not store mind map in database: {store_error}")
        
        # Return the mind map data
        return {
            "success": True,
            "video_id": video_id,
            "video_title": video_title,
            "mindmap_data": mindmap_data,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating mind map: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating mind map: {str(e)}")



# ============================================================================
# AI TUTOR ENDPOINTS - Phase 1 Implementation
# ============================================================================

@app.post("/generate-quiz")
async def generate_quiz(request: GenerateQuizRequest):
    """
    Generate an AI-powered quiz from video transcript
    Uses OpenAI GPT-4o-mini for quiz generation
    Enhanced with TranscriptService for automatic S3 fetching
    """
    try:
        logger.info(f"📝 Generating quiz for video: {request.video_id}")
        logger.info(f"📝 Video ID type: {type(request.video_id)}, length: {len(request.video_id)}")
        
        # Validate video ID format (should be 11 characters for YouTube)
        if len(request.video_id) != 11:
            logger.warning(f"⚠️ Invalid video ID format: '{request.video_id}' (expected 11 chars, got {len(request.video_id)})")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid video ID format. Expected YouTube video ID (11 characters), got: {request.video_id}"
            )
        
        # 1. Get transcript using TranscriptService (with caching!)
        from services.transcript_service import transcript_service
        
        transcript_text = transcript_service.get_full_text(request.video_id)
        
        if not transcript_text:
            logger.error(f"❌ No transcript found for video: {request.video_id}")
            raise HTTPException(
                status_code=404, 
                detail=f"Transcript not found for video {request.video_id}. Please extract it using the Chrome extension first."
            )
        
        # Get key concepts for better quiz generation
        key_concepts = transcript_service.extract_key_concepts(request.video_id, max_concepts=10)
        logger.info(f"📊 Key concepts: {key_concepts}")
        
        # Limit to first 6000 words to fit in context
        words = transcript_text.split()
        if len(words) > 6000:
            transcript_text = ' '.join(words[:6000])
            logger.info(f"Truncated transcript to 6000 words")
        
        logger.info(f"✅ Got transcript ({len(transcript_text)} chars, {len(words)} words)")
        
        # 2. Generate quiz with OpenAI
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=503, detail="OpenAI API not configured")
        
        # Enhanced prompt with key concepts
        key_concepts_str = ", ".join(key_concepts) if key_concepts else "various topics"
        
        prompt = f"""<system>
You are an expert tutor. Your task is to generate a high-quality, {request.num_questions}-question multiple-choice quiz based ONLY on the provided video transcript.

Key concepts in this video: {key_concepts_str}

Requirements:
1. Create educational questions that test understanding (not just memorization)
2. Each question must have 4 options (A, B, C, D)
3. Mark the correct answer
4. Provide a brief explanation for the correct answer
5. Focus on key concepts and practical application
6. Vary difficulty levels (easy, medium, hard)

You MUST return the quiz in the following exact JSON format. Do not include any other text or markdown.

{{
  "quizTitle": "Quiz: [Main Topic of Transcript]",
  "questions": [
    {{
      "questionId": "q1",
      "questionText": "[Question 1]",
      "difficulty": "easy|medium|hard",
      "options": [
        {{ "optionId": "a", "text": "[Option A]" }},
        {{ "optionId": "b", "text": "[Option B]" }},
        {{ "optionId": "c", "text": "[Option C]" }},
        {{ "optionId": "d", "text": "[Option D]" }}
      ],
      "correctOptionId": "b",
      "explanation": "[Why this answer is correct and why others are wrong]"
    }}
  ]
}}
</system>

<user>
Video Transcript:
{transcript_text}
</user>"""

        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2000,
            "temperature": 0.7,
            "response_format": { "type": "json_object" }
        }
        
        logger.info("🤖 Calling OpenAI...")
        openai_response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if not openai_response.ok:
            logger.error(f"OpenAI error: {openai_response.text}")
            raise HTTPException(status_code=500, detail="Failed to generate quiz")
        
        result = openai_response.json()
        quiz_json = json.loads(result['choices'][0]['message']['content'])
        
        logger.info(f"✅ Quiz generated: {len(quiz_json.get('questions', []))} questions")
        
        return {
            "success": True,
            "quiz": quiz_json,
            "videoId": request.video_id,
            "generatedAt": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")


@app.post("/generate-study-plan")
async def generate_study_plan(request: GenerateStudyPlanRequest):
    """
    Generate an AI-powered study plan for a playlist
    Uses OpenAI GPT-4o-mini for personalized learning path
    Enhanced with TranscriptService for intelligent content analysis from S3 transcripts
    """
    try:
        logger.info(f"📚 Generating study plan for playlist: {request.playlist_id}")
        
        if not request.video_titles:
            raise HTTPException(status_code=400, detail="No videos provided")
        
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=503, detail="OpenAI API not configured")
        
        # Fetch transcripts from S3 using TranscriptService
        from services.transcript_service import transcript_service
        
        # Get playlist data from DynamoDB to extract video IDs
        dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
        playlists_table = dynamodb.Table('Playlists')
        
        video_analyses = []
        video_ids = []
        
        # Try to fetch playlist to get video IDs
        try:
            response = playlists_table.get_item(Key={'id': request.playlist_id})
            if 'Item' in response:
                playlist = response['Item']
                videos = playlist.get('videos', [])
                
                logger.info(f"📋 Found {len(videos)} videos in playlist")
                
                for i, video in enumerate(videos):
                    video_id = video.get('youtubeId') or video.get('id', '').replace('video_', '')
                    video_title = video.get('title', request.video_titles[i] if i < len(request.video_titles) else f"Video {i+1}")
                    
                    video_info = {
                        'number': i + 1,
                        'title': video_title,
                        'hasTranscript': False,
                        'keyTopics': [],
                        'summary': None
                    }
                    
                    # Try to fetch transcript from S3 if valid video ID
                    if video_id and len(video_id) == 11:
                        video_ids.append(video_id)
                        try:
                            transcript_text = transcript_service.get_full_text(video_id)
                            if transcript_text:
                                video_info['hasTranscript'] = True
                                # Get first 500 chars as preview
                                video_info['summary'] = transcript_text[:500] + "..." if len(transcript_text) > 500 else transcript_text
                                logger.info(f"✅ Fetched transcript for video {i+1}: {video_id}")
                        except Exception as e:
                            logger.warning(f"⚠️ Could not fetch transcript for {video_id}: {e}")
                    
                    video_analyses.append(video_info)
            else:
                # Fallback: Use titles from request
                logger.warning(f"Playlist {request.playlist_id} not found, using titles only")
                for i, title in enumerate(request.video_titles):
                    video_analyses.append({
                        'number': i + 1,
                        'title': title,
                        'hasTranscript': False,
                        'keyTopics': []
                    })
        except Exception as e:
            logger.error(f"Error fetching playlist: {e}")
            # Fallback: Use titles from request
            for i, title in enumerate(request.video_titles):
                video_analyses.append({
                    'number': i + 1,
                    'title': title,
                    'hasTranscript': False,
                    'keyTopics': []
                })
        
        # Build rich context about the playlist with transcript insights
        video_list_parts = []
        transcripts_available = sum(1 for v in video_analyses if v.get('hasTranscript'))
        
        for v in video_analyses:
            video_entry = f"{v['number']}. {v['title']}"
            if v.get('hasTranscript') and v.get('summary'):
                video_entry += f"\n   Preview: {v['summary']}"
            video_list_parts.append(video_entry)
        
        video_list = "\n".join(video_list_parts)
        user_goal_text = f"\n\nUser's Learning Goal: {request.user_goal}" if request.user_goal else ""
        transcript_note = f"\n\nNote: {transcripts_available}/{len(video_analyses)} videos have full transcripts available for analysis." if transcripts_available > 0 else ""
        
        prompt = f"""You are an expert learning coach. Create a personalized study plan for this playlist of educational videos.

Videos in this playlist:
{video_list}
{user_goal_text}{transcript_note}

Generate a comprehensive study plan in markdown format that includes:

1. **Overview**: What this learning path covers (use transcript previews when available)
2. **Prerequisites**: What the learner should know before starting
3. **Recommended Order**: The optimal sequence to watch these videos and why
4. **Key Learning Objectives**: What they'll be able to do after completing this
5. **Study Tips**: How to get the most out of these videos
6. **Practice Suggestions**: Exercises or projects to reinforce learning
7. **Estimated Timeline**: How long this will take (be realistic)
8. **Key Topics by Video**: Break down main topics covered in each video

Make it engaging, motivational, and actionable. Use bullet points and clear sections. Be specific about the content based on the video transcripts provided."""

        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2500,  # Increased for more detailed analysis
            "temperature": 0.7  # Slightly lower for more focused output
        }
        
        logger.info("🤖 Calling OpenAI for study plan...")
        openai_response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if not openai_response.ok:
            logger.error(f"OpenAI error: {openai_response.text}")
            raise HTTPException(status_code=500, detail="Failed to generate study plan")
        
        result = openai_response.json()
        study_plan_markdown = result['choices'][0]['message']['content']
        
        logger.info(f"✅ Study plan generated ({len(study_plan_markdown)} chars)")
        
        return {
            "success": True,
            "studyPlanMarkdown": study_plan_markdown,
            "playlistId": request.playlist_id,
            "videoCount": len(request.video_titles),
            "generatedAt": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating study plan: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating study plan: {str(e)}")


@app.post("/suggest-related")
async def suggest_related(request: SuggestRelatedRequest):
    """
    Suggest related videos based on content similarity
    Uses OpenSearch k-NN search on existing embeddings
    """
    try:
        logger.info(f"🔗 Finding related videos for: {request.video_id}")
        
        if not HAS_AWS_LIBS or not opensearch_client:
            raise HTTPException(status_code=503, detail="OpenSearch not configured")
        
        # 1. Get the current video's embedding from OpenSearch
        try:
            # Search for this video's chunks to get its embedding
            search_query = {
                "size": 1,
                "query": {
                    "term": {
                        "videoId": request.video_id
                    }
                }
            }
            
            response = opensearch_client.search(
                index="streamsmart-ai-vectors",
                body=search_query
            )
            
            if not response['hits']['hits']:
                raise HTTPException(status_code=404, detail=f"Video {request.video_id} not found in index")
            
            # Get embedding from the first chunk
            video_embedding = response['hits']['hits'][0]['_source'].get('embedding')
            if not video_embedding:
                raise HTTPException(status_code=404, detail="No embedding found for video")
            
            logger.info(f"✅ Got embedding for video {request.video_id}")
            
        except Exception as e:
            logger.error(f"❌ Error getting video embedding: {e}")
            raise HTTPException(status_code=500, detail=f"Could not retrieve video data: {str(e)}")
        
        # 2. Find similar videos using k-NN search
        knn_query = {
            "size": 10,  # Get top 10 to filter down
            "query": {
                "knn": {
                    "embedding": {
                        "vector": video_embedding,
                        "k": 10
                    }
                }
            },
            "_source": ["videoId", "title", "description", "thumbnail"],
            # Filter out the current video
            "post_filter": {
                "bool": {
                    "must_not": [
                        {"term": {"videoId": request.video_id}}
                    ]
                }
            }
        }
        
        # If playlist is specified, also exclude videos from same playlist
        if request.exclude_playlist_id:
            knn_query["post_filter"]["bool"]["must_not"].append(
                {"term": {"playlistId": request.exclude_playlist_id}}
            )
        
        results = opensearch_client.search(
            index="streamsmart-ai-vectors",
            body=knn_query
        )
        
        # 3. Process and deduplicate results
        seen_videos = set()
        related_videos = []
        
        for hit in results['hits']['hits']:
            vid = hit['_source'].get('videoId')
            if vid and vid not in seen_videos:
                seen_videos.add(vid)
                related_videos.append({
                    "videoId": vid,
                    "title": hit['_source'].get('title', 'Unknown Video'),
                    "description": hit['_source'].get('description', '')[:200],
                    "thumbnail": hit['_source'].get('thumbnail', ''),
                    "similarity": round(hit['_score'], 3)
                })
                
                # Return top 5 unique videos
                if len(related_videos) >= 5:
                    break
        
        logger.info(f"✅ Found {len(related_videos)} related videos")
        
        return {
            "success": True,
            "relatedVideos": related_videos,
            "sourceVideoId": request.video_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error finding related videos: {e}")
        raise HTTPException(status_code=500, detail=f"Error finding related videos: {str(e)}")


# ============================================================================
# ADVANCED RAG WITH SEMANTIC SEARCH
# ============================================================================

from services.embedding_service import EmbeddingService

# Initialize embedding service (lazy initialization)
_embedding_service = None

def get_embedding_service():
    """Lazy initialization of embedding service"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService(openai_api_key=OPENAI_API_KEY)
    return _embedding_service


class SemanticChatRequest(BaseModel):
    """Request model for semantic chat with enhanced RAG"""
    text: str
    sessionId: str
    userId: str
    videoIds: list[str]


class SemanticChatResponse(BaseModel):
    """Response model for semantic chat"""
    answer: str
    sessionId: str
    sources: list[dict]  # List of relevant chunks with metadata
    videosSources: list[str]  # Video IDs that contributed to answer


@app.post("/semantic-chat", response_model=SemanticChatResponse)
async def semantic_chat(request: SemanticChatRequest):
    """
    Advanced RAG chatbot using semantic search with embeddings.
    Uses OpenAI embeddings for better context retrieval than keyword search.
    
    Flow:
    1. Generate query embedding
    2. Semantic search across transcript chunks
    3. Build context from top-K relevant chunks
    4. GPT-4o generates answer with full context
    """
    try:
        logger.info(f"🔍 Semantic chat query: '{request.text}' for user {request.userId}")
        logger.info(f"📹 Searching across {len(request.videoIds)} videos")
        
        if not request.videoIds:
            raise HTTPException(status_code=400, detail="No video IDs provided")
        
        # Get embedding service
        embedding_service = get_embedding_service()
        
        # Perform semantic search across all video transcripts
        search_results = embedding_service.semantic_search(
            query=request.text,
            video_ids=request.videoIds,
            top_k=5,  # Top 5 most relevant chunks
            similarity_threshold=0.5  # Only chunks with >50% similarity
        )
        
        if not search_results:
            # No relevant chunks found - provide general response
            logger.warning("⚠️ No relevant transcript chunks found")
            return SemanticChatResponse(
                answer="I couldn't find relevant information in the provided videos to answer your question. Could you rephrase or ask something more specific about the video content?",
                sessionId=request.sessionId,
                sources=[],
                videosSources=[]
            )
        
        # Build rich context from search results
        context_parts = []
        sources_metadata = []
        video_sources = set()
        
        for i, result in enumerate(search_results, 1):
            video_id = result['video_id']
            chunk_text = result['chunk_text']
            similarity = result['similarity_score']
            
            context_parts.append(
                f"[Source {i} - Video ID: {video_id}, Relevance: {similarity:.2%}]\n{chunk_text}\n"
            )
            
            sources_metadata.append({
                'videoId': video_id,
                'chunkIndex': result['chunk_index'],
                'similarityScore': round(similarity, 3),
                'text': chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text
            })
            
            video_sources.add(video_id)
        
        context = "\n".join(context_parts)
        
        # Build prompt for GPT-4o
        prompt = f"""You are an AI tutor helping a student understand video content. Answer their question using the provided transcript excerpts.

**Student Question:**
{request.text}

**Relevant Transcript Excerpts (ranked by relevance):**
{context}

**Instructions:**
- Provide a clear, comprehensive answer based on the transcript excerpts
- Reference specific sources when making claims (e.g., "According to Source 1...")
- If multiple sources cover the topic, synthesize the information
- Use simple language and include examples when helpful
- If the excerpts don't fully answer the question, acknowledge what's covered and what's not
- Be encouraging and educational

**Answer:**"""

        # Call OpenAI API
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 800,
            "temperature": 0.7
        }
        
        logger.info("🤖 Calling OpenAI with semantic context...")
        openai_response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if not openai_response.ok:
            logger.error(f"OpenAI error: {openai_response.text}")
            raise HTTPException(status_code=500, detail="Failed to generate answer")
        
        result = openai_response.json()
        answer = result['choices'][0]['message']['content']
        
        logger.info(f"✅ Generated answer ({len(answer)} chars) using {len(search_results)} sources from {len(video_sources)} videos")
        
        return SemanticChatResponse(
            answer=answer,
            sessionId=request.sessionId,
            sources=sources_metadata,
            videosSources=list(video_sources)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in semantic chat: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing semantic chat: {str(e)}")


# ============================================================================
# END AI TUTOR ENDPOINTS
# ============================================================================


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    # Initialize BERT embeddings engine on startup
    try:
        logger.info("[STARTUP] StreamSmart Backend starting...")
        logger.info(f"[GEMINI] {'Available' if GEMINI_API_KEY else 'Not configured'}")
        logger.info("[DATABASE] DynamoDB (ap-south-2) - Connected")
        logger.info("[RECOMMENDATIONS] CSV-based system - Active")
        
        # Start content collection system
        try:
            from genre_endpoints import start_content_collection
            await start_content_collection()
            logger.info("[CONTENT] Collection system started - collecting every 6 hours")
        except Exception as e:
            logger.error(f"Failed to start content collection: {e}")
        
        logger.info("🎉 Backend startup complete!")
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")

# ==================== FEATURE 1: SMART SUGGESTIONS ====================

class GenerateSuggestionsRequest(BaseModel):
    video_ids: List[str]
    user_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = []
    max_suggestions: int = 4

class SuggestionResponse(BaseModel):
    text: str
    category: str
    priority: int
    confidence: float

class SuggestionsResult(BaseModel):
    suggestions: List[SuggestionResponse]
    confidence: float
    generated_at: str

@app.post("/generate-suggestions", response_model=SuggestionsResult)
async def generate_suggestions(request: GenerateSuggestionsRequest):
    """
    Generate smart question suggestions based on video context
    Uses GPT-4o-mini to create contextual, relevant questions
    """
    try:
        video_ids = request.video_ids
        conversation_history = request.conversation_history or []
        max_suggestions = min(request.max_suggestions, 8)  # Cap at 8

        if not video_ids:
            raise HTTPException(status_code=400, detail="video_ids is required")

        # Check if required services are available
        if not HAS_OPENAI or not openai:
            logger.warning("OpenAI not available, returning fallback suggestions")
            return get_fallback_suggestions(len(video_ids) > 1, max_suggestions)

        if not HAS_SERVICES or not transcript_service:
            logger.warning("TranscriptService not available, generating without context")
            transcript_snippets = []
        else:
            # Fetch transcript snippets for context
            transcript_snippets = []
            for video_id in video_ids[:3]:  # Limit to first 3 videos
                try:
                    transcript = transcript_service.get_full_text(video_id)
                    if transcript:
                        # Get first 500 chars as context
                        snippet = transcript[:500] if len(transcript) > 500 else transcript
                        transcript_snippets.append({
                            'video_id': video_id,
                            'snippet': snippet
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch transcript for {video_id}: {e}")
                    continue

        # Check if we have conversation history
        has_history = len(conversation_history) > 0
        history_text = ""
        if has_history:
            history_text = "\n".join([
                f"{msg.get('role', 'user')}: {msg.get('content', '')}"
                for msg in conversation_history[-3:]  # Last 3 messages
            ])

        # Build context for GPT
        context_text = ""
        if transcript_snippets:
            context_text = "\n\n".join([
                f"Video {i+1} excerpt:\n{s['snippet']}"
                for i, s in enumerate(transcript_snippets)
            ])

        # Determine if single or multi-video
        is_multi_video = len(video_ids) > 1

        # Create prompt
        system_prompt = """You are an expert educational assistant. Generate helpful, specific question suggestions that will help the user learn from the video content.

Categories:
- summary: Overview/recap questions
- concept: Deep dive into specific concepts
- navigation: Finding specific information
- study: Application and understanding
- practice: Testing knowledge

Return ONLY a valid JSON array of suggestions in this exact format:
[
  {
    "text": "Question text here",
    "category": "category_name",
    "priority": 1,
    "confidence": 0.95
  }
]

Make questions:
1. Specific to the content (use actual topics from transcripts)
2. Actionable and clear
3. Varied in type and difficulty
4. Natural and conversational"""

        user_prompt = f"""Generate {max_suggestions} question suggestions.

Context:
{"Multiple videos" if is_multi_video else "Single video"} 
Total videos: {len(video_ids)}

Content preview:
{context_text if context_text else "No transcript available - suggest general questions"}

{"Recent conversation:" if has_history else ""}
{history_text if has_history else ""}

Generate {max_suggestions} diverse, helpful questions."""

        # Call OpenAI (using new API v1.0+)
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.8,  # Higher for creativity
            max_tokens=500,
            timeout=8
        )

        suggestions_text = response.choices[0].message.content.strip()

        # Parse JSON response
        try:
            # Remove markdown code blocks if present
            if suggestions_text.startswith("```"):
                suggestions_text = suggestions_text.split("```")[1]
                if suggestions_text.startswith("json"):
                    suggestions_text = suggestions_text[4:]
            
            suggestions_data = json.loads(suggestions_text)
            
            # Validate and convert
            suggestions = []
            for i, item in enumerate(suggestions_data[:max_suggestions]):
                suggestions.append(SuggestionResponse(
                    text=item.get('text', ''),
                    category=item.get('category', 'study'),
                    priority=item.get('priority', i + 1),
                    confidence=float(item.get('confidence', 0.85))
                ))

            return SuggestionsResult(
                suggestions=suggestions,
                confidence=0.9 if transcript_snippets else 0.7,
                generated_at=datetime.now().isoformat()
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT response as JSON: {e}")
            logger.error(f"Response was: {suggestions_text}")
            # Return fallback suggestions
            return get_fallback_suggestions(is_multi_video, max_suggestions)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}", exc_info=True)
        # Return fallback on error
        return get_fallback_suggestions(len(video_ids) > 1, request.max_suggestions)

def get_fallback_suggestions(is_multi_video: bool, max_suggestions: int) -> SuggestionsResult:
    """Fallback suggestions when AI generation fails"""
    
    single_video = [
        SuggestionResponse(
            text="Summarize this video",
            category="summary",
            priority=1,
            confidence=0.8
        ),
        SuggestionResponse(
            text="What are the main concepts?",
            category="concept",
            priority=2,
            confidence=0.8
        ),
        SuggestionResponse(
            text="Can you explain this in simple terms?",
            category="study",
            priority=3,
            confidence=0.75
        ),
        SuggestionResponse(
            text="Give me practice questions",
            category="practice",
            priority=4,
            confidence=0.75
        ),
    ]

    multi_video = [
        SuggestionResponse(
            text="Compare the concepts across these videos",
            category="concept",
            priority=1,
            confidence=0.8
        ),
        SuggestionResponse(
            text="Summarize all videos together",
            category="summary",
            priority=2,
            confidence=0.8
        ),
        SuggestionResponse(
            text="What order should I watch these?",
            category="navigation",
            priority=3,
            confidence=0.75
        ),
        SuggestionResponse(
            text="Create a study plan from all videos",
            category="study",
            priority=4,
            confidence=0.75
        ),
    ]

    suggestions = multi_video if is_multi_video else single_video

    return SuggestionsResult(
        suggestions=suggestions[:max_suggestions],
        confidence=0.7,
        generated_at=datetime.now().isoformat()
    )

# ==================== FEATURE 4: CONVERSATION MEMORY ====================

from services.conversation_service import conversation_service

class SaveConversationRequest(BaseModel):
    user_id: str
    playlist_id: str
    messages: List[Dict[str, Any]]
    title: Optional[str] = None
    conversation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ConversationSummary(BaseModel):
    conversationId: str
    title: str
    playlistId: str
    messageCount: int
    topics: List[str]
    starred: bool
    archived: bool
    createdAt: str
    updatedAt: str
    preview: str

class ListConversationsResponse(BaseModel):
    conversations: List[ConversationSummary]
    nextCursor: Optional[Dict] = None

@app.post("/conversations/save")
async def save_conversation(request: SaveConversationRequest):
    """Save or update a conversation"""
    try:
        result = conversation_service.save_conversation(
            user_id=request.user_id,
            playlist_id=request.playlist_id,
            messages=request.messages,
            title=request.title,
            conversation_id=request.conversation_id,
            metadata=request.metadata
        )
        
        return {
            "success": True,
            "conversation": result
        }
        
    except Exception as e:
        logger.error(f"Error saving conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{user_id}")
async def list_conversations(
    user_id: str,
    playlist_id: Optional[str] = None,
    limit: int = 20,
    archived: bool = False
):
    """List conversations for a user"""
    try:
        result = conversation_service.list_conversations(
            user_id=user_id,
            playlist_id=playlist_id,
            limit=limit,
            archived=archived
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{user_id}/{conversation_id}")
async def get_conversation(user_id: str, conversation_id: str):
    """Get a specific conversation"""
    try:
        conversation = conversation_service.get_conversation(user_id, conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return conversation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conversations/{user_id}/{conversation_id}")
async def delete_conversation(user_id: str, conversation_id: str):
    """Delete a conversation"""
    try:
        success = conversation_service.delete_conversation(user_id, conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"success": True, "message": "Conversation deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/conversations/{user_id}/{conversation_id}")
async def update_conversation_metadata(
    user_id: str,
    conversation_id: str,
    title: Optional[str] = None,
    starred: Optional[bool] = None,
    archived: Optional[bool] = None
):
    """Update conversation metadata"""
    try:
        success = conversation_service.update_metadata(
            user_id=user_id,
            conversation_id=conversation_id,
            title=title,
            starred=starred,
            archived=archived
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"success": True, "message": "Metadata updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{user_id}/search")
async def search_conversations(
    user_id: str,
    query: str,
    limit: int = 10
):
    """Search conversations by content"""
    try:
        results = conversation_service.search_conversations(
            user_id=user_id,
            query=query,
            limit=limit
        )
        
        return {"results": results, "total": len(results)}
        
    except Exception as e:
        logger.error(f"Error searching conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{user_id}/{conversation_id}/export")
async def export_conversation(
    user_id: str,
    conversation_id: str,
    format: str = "markdown"
):
    """Export conversation in various formats"""
    try:
        content = conversation_service.export_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            format=format
        )
        
        if not content:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Return appropriate content type
        if format == "json":
            from fastapi.responses import JSONResponse
            return JSONResponse(content=json.loads(content))
        elif format == "html":
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=content)
        else:  # markdown
            from fastapi.responses import PlainTextResponse
            return PlainTextResponse(content=content)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== LEARNING PROFILE ENDPOINTS (Feature 6) ====================

from services.learning_profile_service import learning_profile_service
from services.adaptive_explainer_service import adaptive_explainer_service

class UpdateProficiencyRequest(BaseModel):
    topic: str
    question_quality: float  # 0-1
    comprehension_score: float  # 0-1

class AdaptAnswerRequest(BaseModel):
    answer: str
    topic: str
    context: Optional[str] = ""

class FollowupQuestionsRequest(BaseModel):
    topic: str
    conversation_history: List[Dict[str, str]]
    max_questions: int = 3

@app.get("/learning-profile/{user_id}")
async def get_learning_profile(user_id: str):
    """Get or create user's learning profile"""
    try:
        profile = await learning_profile_service.get_or_create_profile(user_id)
        return {"profile": profile}
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/learning-profile/{user_id}")
async def update_learning_profile(user_id: str, updates: Dict[str, Any]):
    """Update user's learning profile"""
    try:
        updated_profile = await learning_profile_service.update_profile(user_id, updates)
        return {"profile": updated_profile, "message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/learning-profile/{user_id}/topic-proficiency")
async def update_topic_proficiency(user_id: str, request: UpdateProficiencyRequest):
    """Update proficiency for a specific topic after interaction"""
    try:
        result = await learning_profile_service.update_topic_proficiency(
            user_id=user_id,
            topic=request.topic,
            question_quality=request.question_quality,
            comprehension_score=request.comprehension_score
        )
        return result
    except Exception as e:
        logger.error(f"Error updating topic proficiency: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learning-profile/{user_id}/weak-areas")
async def get_weak_areas(user_id: str):
    """Get topics that need more attention"""
    try:
        weak_areas = await learning_profile_service.get_weak_areas(user_id)
        return {"weak_areas": weak_areas, "total": len(weak_areas)}
    except Exception as e:
        logger.error(f"Error getting weak areas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learning-profile/{user_id}/progress")
async def get_progress_summary(user_id: str):
    """Get comprehensive progress summary"""
    try:
        summary = await learning_profile_service.get_progress_summary(user_id)
        return summary
    except Exception as e:
        logger.error(f"Error getting progress summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/learning-profile/{user_id}/adapt-answer")
async def adapt_answer(user_id: str, request: AdaptAnswerRequest):
    """Adapt an answer to match user's learning profile"""
    try:
        # Get user profile
        profile = await learning_profile_service.get_or_create_profile(user_id)
        
        # Adapt answer
        adapted_answer = await adaptive_explainer_service.adapt_explanation(
            answer=request.answer,
            topic=request.topic,
            user_profile=profile,
            context=request.context
        )
        
        return {
            "adapted_answer": adapted_answer,
            "original_answer": request.answer,
            "education_level": profile.get('educationLevel'),
            "topic_proficiency": profile.get('currentLevel', {}).get(request.topic, 50)
        }
    except Exception as e:
        logger.error(f"Error adapting answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/learning-profile/{user_id}/followup-questions")
async def generate_followup_questions(user_id: str, request: FollowupQuestionsRequest):
    """Generate personalized follow-up questions"""
    try:
        # Get user profile
        profile = await learning_profile_service.get_or_create_profile(user_id)
        
        # Generate questions
        questions = await adaptive_explainer_service.generate_followup_questions(
            topic=request.topic,
            user_profile=profile,
            conversation_history=request.conversation_history,
            max_questions=request.max_questions
        )
        
        return {"questions": questions, "total": len(questions)}
    except Exception as e:
        logger.error(f"Error generating follow-up questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learning-profile/{user_id}/recommendations")
async def get_personalized_recommendations(user_id: str, video_ids: Optional[str] = None):
    """Get personalized learning recommendations"""
    try:
        # Get user profile and weak areas
        profile = await learning_profile_service.get_or_create_profile(user_id)
        weak_areas = await learning_profile_service.get_weak_areas(user_id)
        
        # Parse video IDs
        video_id_list = video_ids.split(',') if video_ids else []
        
        # Generate recommendations
        recommendations = await adaptive_explainer_service.generate_personalized_recommendations(
            user_profile=profile,
            weak_areas=weak_areas,
            video_ids=video_id_list
        )
        
        return {"recommendations": recommendations, "total": len(recommendations)}
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AUTO-SUMMARY ENDPOINTS (Feature 8) ====================

from services.auto_summary_service import auto_summary_service

class GenerateSummaryRequest(BaseModel):
    video_id: str
    transcript: str
    title: Optional[str] = ""
    levels: int = 3

class KeyMomentsRequest(BaseModel):
    video_id: str
    transcript: str
    title: Optional[str] = ""
    max_moments: int = 5

class ProactiveInsightsRequest(BaseModel):
    video_id: str
    transcript: str
    title: str
    user_id: Optional[str] = None

@app.post("/auto-summary/generate")
async def generate_video_summary(request: GenerateSummaryRequest):
    """Generate multi-level video summary automatically"""
    try:
        summary = await auto_summary_service.generate_video_summary(
            video_id=request.video_id,
            transcript=request.transcript,
            title=request.title,
            generate_levels=request.levels
        )
        return summary
    except Exception as e:
        logger.error(f"Error generating auto-summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auto-summary/key-moments")
async def identify_key_moments(request: KeyMomentsRequest):
    """Identify important timestamps in video"""
    try:
        moments = await auto_summary_service.identify_key_moments(
            video_id=request.video_id,
            transcript=request.transcript,
            title=request.title,
            max_moments=request.max_moments
        )
        return {"key_moments": moments, "total": len(moments)}
    except Exception as e:
        logger.error(f"Error identifying key moments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auto-summary/proactive-insights")
async def generate_proactive_insights(request: ProactiveInsightsRequest):
    """Generate all proactive insights for video load"""
    try:
        # Get user profile if user_id provided
        user_profile = None
        if request.user_id:
            user_profile = await learning_profile_service.get_or_create_profile(request.user_id)
        
        insights = await auto_summary_service.generate_proactive_insights(
            video_id=request.video_id,
            transcript=request.transcript,
            title=request.title,
            user_profile=user_profile
        )
        return insights
    except Exception as e:
        logger.error(f"Error generating proactive insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# Feature 7: Multi-Modal Understanding API Endpoints
# ========================================

from services.multi_modal_service import multi_modal_service
from fastapi import File, UploadFile, Form


class ScreenshotAnalysisRequest(BaseModel):
    """Request for screenshot analysis"""
    context: Optional[str] = ""
    analysis_type: str = "general"  # general, diagram, code, text, math


@app.post("/multi-modal/analyze-screenshot")
async def analyze_screenshot_endpoint(
    file: UploadFile = File(...),
    context: str = Form(""),
    analysis_type: str = Form("general")
):
    """
    Analyze a screenshot or image using GPT-4 Vision
    
    Args:
        file: Image file (JPEG, PNG)
        context: Optional context about the image
        analysis_type: Type of analysis (general/diagram/code/text/math)
    
    Returns:
        Analysis results with detected content
    """
    try:
        if not multi_modal_service:
            raise HTTPException(status_code=503, detail="Multi-modal service not available")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Validate size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(image_data) > max_size:
            raise HTTPException(status_code=400, detail=f"Image too large. Max size is 10MB")
        
        logger.info(f"Analyzing screenshot with type '{analysis_type}', size: {len(image_data)} bytes")
        
        # Analyze
        result = await multi_modal_service.analyze_screenshot(
            image_data=image_data,
            context=context,
            analysis_type=analysis_type
        )
        
        if not result.get('success', True):
            raise HTTPException(status_code=500, detail=result.get('error', 'Analysis failed'))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing screenshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/multi-modal/extract-code")
async def extract_code_endpoint(
    file: UploadFile = File(...),
    expected_language: str = Form(None)
):
    """
    Extract code from a screenshot with syntax validation
    
    Args:
        file: Image file containing code
        expected_language: Optional hint about programming language
    
    Returns:
        Extracted code with metadata
    """
    try:
        if not multi_modal_service:
            raise HTTPException(status_code=503, detail="Multi-modal service not available")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Validate size
        max_size = 10 * 1024 * 1024
        if len(image_data) > max_size:
            raise HTTPException(status_code=400, detail=f"Image too large. Max size is 10MB")
        
        logger.info(f"Extracting code from screenshot, expected language: {expected_language}")
        
        # Extract
        result = await multi_modal_service.extract_code_from_image(
            image_data=image_data,
            expected_language=expected_language if expected_language else None
        )
        
        if not result.get('success', False):
            raise HTTPException(status_code=500, detail=result.get('error', 'Code extraction failed'))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting code: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/multi-modal/extract-text")
async def extract_text_endpoint(
    file: UploadFile = File(...),
    preserve_formatting: bool = Form(True)
):
    """
    Extract text from an image (OCR alternative)
    
    Args:
        file: Image file containing text
        preserve_formatting: Whether to maintain original formatting
    
    Returns:
        Extracted text with metadata
    """
    try:
        if not multi_modal_service:
            raise HTTPException(status_code=503, detail="Multi-modal service not available")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Validate size
        max_size = 10 * 1024 * 1024
        if len(image_data) > max_size:
            raise HTTPException(status_code=400, detail=f"Image too large. Max size is 10MB")
        
        logger.info(f"Extracting text from screenshot, preserve_formatting: {preserve_formatting}")
        
        # Extract
        result = await multi_modal_service.extract_text_from_image(
            image_data=image_data,
            preserve_formatting=preserve_formatting
        )
        
        if not result.get('success', False):
            raise HTTPException(status_code=500, detail=result.get('error', 'Text extraction failed'))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting text: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/multi-modal/analyze-diagram")
async def analyze_diagram_endpoint(
    file: UploadFile = File(...),
    diagram_hint: str = Form(None)
):
    """
    Analyze a diagram or visual representation
    
    Args:
        file: Image file containing diagram
        diagram_hint: Optional hint about diagram type
    
    Returns:
        Diagram analysis with components and relationships
    """
    try:
        if not multi_modal_service:
            raise HTTPException(status_code=503, detail="Multi-modal service not available")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Validate size
        max_size = 10 * 1024 * 1024
        if len(image_data) > max_size:
            raise HTTPException(status_code=400, detail=f"Image too large. Max size is 10MB")
        
        logger.info(f"Analyzing diagram, hint: {diagram_hint}")
        
        # Analyze
        result = await multi_modal_service.analyze_diagram(
            image_data=image_data,
            diagram_hint=diagram_hint if diagram_hint else None
        )
        
        if not result.get('success', False):
            raise HTTPException(status_code=500, detail=result.get('error', 'Diagram analysis failed'))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing diagram: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# Feature 10: Advanced Search & Retrieval API Endpoints
# ========================================

from services.advanced_search_service import advanced_search_service


class SemanticSearchRequest(BaseModel):
    """Request for semantic search"""
    query: str
    user_id: Optional[str] = None
    limit: int = 20
    filters: Optional[Dict[str, Any]] = None


class AdvancedSearchRequest(BaseModel):
    """Request for advanced search"""
    query: str
    user_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    sort_by: str = "relevance"  # relevance, recency, popularity, duration
    limit: int = 20


class SaveSearchRequest(BaseModel):
    """Request to save a search"""
    user_id: str
    name: str
    query: str
    filters: Optional[Dict[str, Any]] = None


@app.post("/search/semantic")
async def semantic_search_endpoint(request: SemanticSearchRequest):
    """
    Perform semantic search across videos
    
    Args:
        query: Search query
        user_id: Optional user ID for personalization
        limit: Maximum results
        filters: Optional filters (topics, difficulty, date range)
    
    Returns:
        Search results with relevance scores
    """
    try:
        if not advanced_search_service:
            raise HTTPException(status_code=503, detail="Search service not available")
        
        logger.info(f"Semantic search: '{request.query}' (user: {request.user_id})")
        
        results = await advanced_search_service.semantic_search(
            query=request.query,
            user_id=request.user_id,
            limit=request.limit,
            filters=request.filters
        )
        
        if 'error' in results:
            raise HTTPException(status_code=500, detail=results['error'])
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in semantic search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/advanced")
async def advanced_search_endpoint(request: AdvancedSearchRequest):
    """
    Advanced search with filters and custom ranking
    
    Args:
        query: Search query
        user_id: Optional user ID
        filters: Dict with optional keys:
            - topics: List[str]
            - difficulty: str
            - date_range: Dict[str, str]
            - min_duration: int
            - max_duration: int
        sort_by: Sort criteria (relevance/recency/popularity/duration)
        limit: Maximum results
    
    Returns:
        Ranked search results
    """
    try:
        if not advanced_search_service:
            raise HTTPException(status_code=503, detail="Search service not available")
        
        logger.info(f"Advanced search: '{request.query}' (sort: {request.sort_by})")
        
        results = await advanced_search_service.advanced_search(
            query=request.query,
            user_id=request.user_id,
            filters=request.filters,
            sort_by=request.sort_by,
            limit=request.limit
        )
        
        if 'error' in results:
            raise HTTPException(status_code=500, detail=results['error'])
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in advanced search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search/history/{user_id}")
async def get_search_history_endpoint(user_id: str, limit: int = 20):
    """
    Get user's search history
    
    Args:
        user_id: User ID
        limit: Maximum history items
    
    Returns:
        List of recent searches
    """
    try:
        if not advanced_search_service:
            raise HTTPException(status_code=503, detail="Search service not available")
        
        history = await advanced_search_service.get_search_history(
            user_id=user_id,
            limit=limit
        )
        
        return {
            'user_id': user_id,
            'history': history,
            'count': len(history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting search history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/save")
async def save_search_endpoint(request: SaveSearchRequest):
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
        if not advanced_search_service:
            raise HTTPException(status_code=503, detail="Search service not available")
        
        result = await advanced_search_service.save_search(
            user_id=request.user_id,
            name=request.name,
            query=request.query,
            filters=request.filters
        )
        
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search/saved/{user_id}")
async def get_saved_searches_endpoint(user_id: str):
    """
    Get user's saved searches
    
    Args:
        user_id: User ID
    
    Returns:
        List of saved searches
    """
    try:
        if not advanced_search_service:
            raise HTTPException(status_code=503, detail="Search service not available")
        
        searches = await advanced_search_service.get_saved_searches(user_id=user_id)
        
        return {
            'user_id': user_id,
            'saved_searches': searches,
            'count': len(searches)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting saved searches: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/search/saved/{user_id}/{search_id}")
async def delete_saved_search_endpoint(user_id: str, search_id: str):
    """
    Delete a saved search
    
    Args:
        user_id: User ID
        search_id: Search ID to delete
    
    Returns:
        Success status
    """
    try:
        if not advanced_search_service:
            raise HTTPException(status_code=503, detail="Search service not available")
        
        success = await advanced_search_service.delete_saved_search(
            user_id=user_id,
            search_id=search_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Saved search not found")
        
        return {
            'success': True,
            'message': 'Saved search deleted'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting saved search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 