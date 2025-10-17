"""
Simplified FastAPI backend for StreamSmart RAG functionality
Focuses on core features without heavy ML dependencies for easier deployment
"""

import os
import logging
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
    print("⚠️  AWS SDK libraries not available - RAG AWS features disabled")

# Optional imports with graceful fallbacks
try:
    import google.generativeai as genai
    HAS_GOOGLE_AI = True
except ImportError:
    HAS_GOOGLE_AI = False
    genai = None
    print("⚠️  Google AI not available - some features disabled")

try:
    from pymongo import MongoClient
    HAS_MONGO = True
except ImportError:
    HAS_MONGO = False
    MongoClient = None
    print("⚠️  MongoDB not available - using in-memory storage")

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    HAS_YOUTUBE_API = True
except ImportError:
    HAS_YOUTUBE_API = False
    YouTubeTranscriptApi = None
    print("⚠️  YouTube Transcript API not available")

try:
    import yt_dlp
    HAS_YT_DLP = True
except ImportError:
    HAS_YT_DLP = False
    yt_dlp = None
    print("⚠️  yt-dlp not available - video processing disabled")

try:
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    cosine_similarity = None
    print("⚠️  scikit-learn not available - similarity calculations disabled")

try:
    import nltk
    from nltk.tokenize import sent_tokenize
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False
    nltk = None
    sent_tokenize = None
    print("⚠️  NLTK not available - text processing may be limited")

# Lightweight BERT removed; keep placeholder for existing calls to no-op
    lightweight_bert = None

# Import remaining endpoints
from genre_endpoints import router as genre_router
# Import BERT router (embeddings-based) with error handling
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
    print("✅ BERT embeddings recommendation service enabled")
else:
    print("⚠️ BERT recommendation service disabled (dependencies not available)")
# Keep smart endpoints registered (not used by frontend)
app.include_router(smart_router)

# Note: AI content endpoints were removed as part of recommendation engine cleanup

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGODB_URI = os.getenv("MONGO_URI")
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



# MongoDB client initialization
mongodb_client = None
db = None
if MONGODB_URI and HAS_MONGO:
    try:
        mongodb_client = MongoClient(MONGODB_URI)
        db = mongodb_client.streamsmart
        logger.info("MongoDB connected successfully")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        mongodb_client = None
elif not HAS_MONGO:
    logger.warning("MongoDB not available. Database features will be disabled.")
else:
    logger.warning("MONGO_URI not provided. Database features will be disabled.")

# Initialize AWS RAG manager if configuration is present
aws_rag_manager: Optional["AWSRAGManager"] = None
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
            "AWS RAG manager enabled (bucket=%s, index=%s)",
            AWS_RAG_S3_BUCKET,
            AWS_RAG_OPENSEARCH_INDEX,
        )
    except Exception as aws_error:  # noqa: BLE001
        aws_rag_manager = None
        logger.error("Failed to initialize AWS RAG manager: %s", aws_error)
else:
    logger.info("AWS RAG manager disabled (missing configuration or libraries)")

# Initialize Gemini if available
if GEMINI_API_KEY and HAS_GOOGLE_AI:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini AI configured successfully")
    except Exception as e:
        logger.error(f"Gemini AI configuration failed: {e}")

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
        "bert_embeddings": bool(BERT_AVAILABLE),
        "aws_rag": bool(aws_rag_manager),
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

@app.post("/rag-answer")
async def rag_answer(request: RAGAnswerRequest):
    """Answer questions using RAG with stored transcripts"""
    if not mongodb_client:
        raise HTTPException(status_code=500, detail="Database not available")
    
    if not aws_rag_manager and not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not available")
    
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

## Lightweight BERT endpoints removed

@app.post("/generate-mindmap")
async def generate_mindmap(request: dict):
    """Generate mind map using Gemini API from video transcript"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI service not available")
    
    if not mongodb_client:
        raise HTTPException(status_code=500, detail="Database not available")
    
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
        model = genai.GenerativeModel('gemini-1.5-flash')
        
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



@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    # Initialize BERT embeddings engine on startup
    try:
        logger.info("🚀 StreamSmart Backend starting up...")
        logger.info(f"🤖 Gemini AI: {'✅ Available' if GEMINI_API_KEY else '❌ Not configured'}")
        logger.info(f"📊 MongoDB: {'✅ Connected' if mongodb_client else '❌ Not connected'}")
        logger.info(f"🧠 BERT Embeddings Service: {'✅ Available' if BERT_AVAILABLE else '❌ Disabled'}")

        if BERT_AVAILABLE:
            try:
                from services.bert_recommendation_engine import get_bert_recommendation_engine
                logger.info("🧠 Initializing BERT Embeddings recommendation system...")
                bert_engine = get_bert_recommendation_engine()
                bert_engine.initialize_system()
                logger.info("✅ BERT Embeddings recommendation system initialized!")
            except Exception as e:
                logger.error(f"❌ Failed to initialize BERT Embeddings system: {e}")
        
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