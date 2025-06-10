#!/usr/bin/env python3
"""
Multi-User RAG Service
Handles user-scoped transcript storage, vector embeddings, and RAG chat sessions
"""

import os
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
import json

# Core libraries
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from pymongo import MongoClient
import numpy as np

# Pydantic models
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class UserTranscriptRequest(BaseModel):
    videoUrl: str
    videoTitle: Optional[str] = None
    tags: List[str] = []
    isPublic: bool = False

class UserRAGQuery(BaseModel):
    question: str
    transcriptIds: List[str] = []  # Specific transcripts to search
    includePublic: bool = False    # Include public transcripts
    topK: int = 5
    chatSessionId: Optional[str] = None

class UserRAGResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    chatSessionId: str
    messageId: str
    processingTime: float
    tokensUsed: int

class ChatSession(BaseModel):
    chatSessionId: str
    userId: str
    sessionName: str
    transcriptIds: List[str]
    messageCount: int
    createdAt: datetime
    lastActivity: datetime

# Custom embeddings wrapper
class LocalLangchainEmbeddings:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.model.encode(texts, convert_to_tensor=False).tolist()

    def embed_query(self, text: str) -> List[float]:
        return self.model.encode(text, convert_to_tensor=False).tolist()

class MultiUserRAGService:
    def __init__(self, mongodb_uri: str, gemini_api_key: str, db_name: str = "streamsmart"):
        """Initialize Multi-User RAG Service"""
        
        # Database connection
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.transcripts_collection = self.db.transcripts
        self.embeddings_collection = self.db.vector_embeddings
        self.chat_sessions_collection = self.db.chat_sessions
        self.summaries_collection = self.db.video_summaries
        
        # AI services
        genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        # Embeddings
        self.embeddings = LocalLangchainEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Storage paths
        self.base_storage_path = Path("user_data")
        self.base_storage_path.mkdir(exist_ok=True)
        
        # Create indexes
        self._create_indexes()
    
    def _create_indexes(self):
        """Create necessary database indexes"""
        try:
            # Transcripts collection
            self.transcripts_collection.create_index("transcriptId", unique=True)
            self.transcripts_collection.create_index([("userId", 1), ("videoId", 1)])
            self.transcripts_collection.create_index([("userId", 1), ("createdAt", -1)])
            self.transcripts_collection.create_index("privacy.isPublic")
            
            # Vector embeddings collection
            self.embeddings_collection.create_index("embeddingId", unique=True)
            self.embeddings_collection.create_index([("userId", 1), ("transcriptId", 1)])
            
            # Chat sessions collection
            self.chat_sessions_collection.create_index("chatSessionId", unique=True)
            self.chat_sessions_collection.create_index([("userId", 1), ("lastActivity", -1)])
            
            logger.info("RAG service indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating RAG indexes: {e}")
    
    def _generate_transcript_id(self) -> str:
        """Generate unique transcript ID"""
        return f"trans_{uuid.uuid4().hex[:12]}"
    
    def _generate_embedding_id(self) -> str:
        """Generate unique embedding ID"""
        return f"emb_{uuid.uuid4().hex[:12]}"
    
    def _generate_chat_session_id(self) -> str:
        """Generate unique chat session ID"""
        return f"chat_{uuid.uuid4().hex[:12]}"
    
    def _generate_message_id(self) -> str:
        """Generate unique message ID"""
        return f"msg_{uuid.uuid4().hex[:8]}"
    
    def _get_user_storage_path(self, user_id: str) -> Path:
        """Get storage path for user data"""
        user_path = self.base_storage_path / user_id
        user_path.mkdir(exist_ok=True)
        return user_path
    
    def _extract_video_id(self, video_url: str) -> str:
        """Extract video ID from YouTube URL"""
        import re
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/.*[?&]v=([a-zA-Z0-9_-]{11})',
            r'([a-zA-Z0-9_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, video_url)
            if match:
                return match.group(1)
        
        raise ValueError(f"Could not extract video ID from: {video_url}")
    
    async def store_user_transcript(self, user_id: str, request: UserTranscriptRequest) -> Dict[str, Any]:
        """Store transcript for a specific user"""
        try:
            video_id = self._extract_video_id(request.videoUrl)
            transcript_id = self._generate_transcript_id()
            
            # Check if user already has this video
            existing = self.transcripts_collection.find_one({
                "userId": user_id,
                "videoId": video_id
            })
            
            if existing:
                return {
                    "transcriptId": existing["transcriptId"],
                    "message": "Transcript already exists for this user",
                    "isNew": False
                }
            
            # Extract transcript using enhanced method
            from enhanced_transcript_service import EnhancedTranscriptService
            transcript_service = EnhancedTranscriptService()
            
            transcript_text = await transcript_service.get_transcript(request.videoUrl)
            
            if not transcript_text:
                raise ValueError("Failed to extract transcript")
            
            # Store transcript document
            transcript_doc = {
                "transcriptId": transcript_id,
                "userId": user_id,
                "videoId": video_id,
                "videoUrl": request.videoUrl,
                "videoTitle": request.videoTitle or f"Video {video_id}",
                "videoDescription": "",
                "videoDuration": 0,
                "transcript": {
                    "fullText": transcript_text,
                    "segments": [],
                    "language": "en",
                    "source": "enhanced_extraction"
                },
                "processing": {
                    "status": "completed",
                    "extractionMethod": "enhanced_multi_fallback",
                    "processingTime": 0,
                    "errorMessage": None
                },
                "embeddings": {
                    "isProcessed": False,
                    "chunkCount": 0,
                    "vectorStoreId": None,
                    "embeddingModel": "all-MiniLM-L6-v2"
                },
                "privacy": {
                    "isPublic": request.isPublic,
                    "shareableLink": None,
                    "allowedUsers": []
                },
                "metadata": {
                    "tags": request.tags,
                    "category": "general",
                    "customNotes": ""
                },
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
                "accessCount": 0
            }
            
            result = self.transcripts_collection.insert_one(transcript_doc)
            
            if result.inserted_id:
                # Process embeddings in background
                asyncio.create_task(self._process_transcript_embeddings(user_id, transcript_id))
                
                logger.info(f"Transcript stored for user {user_id}: {transcript_id}")
                
                return {
                    "transcriptId": transcript_id,
                    "videoId": video_id,
                    "message": "Transcript stored successfully",
                    "isNew": True,
                    "textLength": len(transcript_text)
                }
            else:
                raise Exception("Failed to store transcript")
                
        except Exception as e:
            logger.error(f"Error storing transcript for user {user_id}: {e}")
            raise Exception(f"Failed to store transcript: {str(e)}")
    
    async def _process_transcript_embeddings(self, user_id: str, transcript_id: str):
        """Process embeddings for a transcript (background task)"""
        try:
            # Get transcript
            transcript = self.transcripts_collection.find_one({
                "transcriptId": transcript_id,
                "userId": user_id
            })
            
            if not transcript:
                logger.error(f"Transcript {transcript_id} not found for user {user_id}")
                return
            
            transcript_text = transcript["transcript"]["fullText"]
            
            # Split text into chunks
            chunks = self.text_splitter.split_text(transcript_text)
            
            # Generate embeddings for chunks
            chunk_data = []
            for i, chunk in enumerate(chunks):
                chunk_embedding = self.embeddings.embed_query(chunk)
                chunk_data.append({
                    "chunkId": f"chunk_{i:04d}",
                    "text": chunk,
                    "startIndex": 0,  # Would need to calculate actual positions
                    "endIndex": len(chunk),
                    "embedding": chunk_embedding,
                    "metadata": {
                        "timestamp": 0,
                        "segment": f"chunk_{i}",
                        "importance": 1.0
                    }
                })
            
            # Store embeddings
            embedding_id = self._generate_embedding_id()
            embedding_doc = {
                "embeddingId": embedding_id,
                "userId": user_id,
                "transcriptId": transcript_id,
                "videoId": transcript["videoId"],
                "chunks": chunk_data,
                "embeddingModel": "all-MiniLM-L6-v2",
                "dimensions": len(chunk_data[0]["embedding"]) if chunk_data else 0,
                "createdAt": datetime.utcnow(),
                "lastAccessed": datetime.utcnow()
            }
            
            self.embeddings_collection.insert_one(embedding_doc)
            
            # Update transcript status
            self.transcripts_collection.update_one(
                {"transcriptId": transcript_id},
                {
                    "$set": {
                        "embeddings.isProcessed": True,
                        "embeddings.chunkCount": len(chunks),
                        "embeddings.vectorStoreId": embedding_id,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Embeddings processed for transcript {transcript_id}: {len(chunks)} chunks")
            
        except Exception as e:
            logger.error(f"Error processing embeddings for {transcript_id}: {e}")
            
            # Update transcript with error status
            self.transcripts_collection.update_one(
                {"transcriptId": transcript_id},
                {
                    "$set": {
                        "processing.status": "failed",
                        "processing.errorMessage": str(e),
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
    
    async def get_user_transcripts(self, user_id: str, include_public: bool = False) -> List[Dict[str, Any]]:
        """Get all transcripts for a user"""
        try:
            query = {"userId": user_id}
            
            if include_public:
                query = {
                    "$or": [
                        {"userId": user_id},
                        {"privacy.isPublic": True}
                    ]
                }
            
            transcripts = list(self.transcripts_collection.find(
                query,
                {"transcript.fullText": 0}  # Exclude full text for list view
            ).sort("createdAt", -1))
            
            # Convert ObjectId to string and clean up
            for transcript in transcripts:
                transcript["_id"] = str(transcript["_id"])
            
            return transcripts
            
        except Exception as e:
            logger.error(f"Error getting transcripts for user {user_id}: {e}")
            return []
    
    async def search_user_content(self, user_id: str, query: UserRAGQuery) -> UserRAGResponse:
        """Search user's content using RAG"""
        start_time = datetime.utcnow()
        
        try:
            # Determine which transcripts to search
            search_transcripts = []
            
            if query.transcriptIds:
                # Search specific transcripts
                search_query = {
                    "transcriptId": {"$in": query.transcriptIds},
                    "$or": [
                        {"userId": user_id},
                        {"privacy.isPublic": True} if query.includePublic else {"userId": user_id}
                    ]
                }
            else:
                # Search all user transcripts + public if requested
                search_query = {"userId": user_id}
                if query.includePublic:
                    search_query = {
                        "$or": [
                            {"userId": user_id},
                            {"privacy.isPublic": True}
                        ]
                    }
            
            search_transcripts = list(self.transcripts_collection.find(
                search_query,
                {"transcriptId": 1, "videoId": 1, "videoTitle": 1}
            ))
            
            if not search_transcripts:
                return UserRAGResponse(
                    answer="No transcripts found to search.",
                    sources=[],
                    chatSessionId=query.chatSessionId or "",
                    messageId=self._generate_message_id(),
                    processingTime=0.0,
                    tokensUsed=0
                )
            
            # Get embeddings for relevant transcripts
            transcript_ids = [t["transcriptId"] for t in search_transcripts]
            relevant_chunks = await self._search_embeddings(user_id, query.question, transcript_ids, query.topK)
            
            if not relevant_chunks:
                return UserRAGResponse(
                    answer="No relevant content found for your question.",
                    sources=[],
                    chatSessionId=query.chatSessionId or "",
                    messageId=self._generate_message_id(),
                    processingTime=0.0,
                    tokensUsed=0
                )
            
            # Generate response using Gemini
            response_text = await self._generate_rag_response(query.question, relevant_chunks)
            
            # Prepare sources
            sources = []
            for chunk in relevant_chunks:
                sources.append({
                    "transcriptId": chunk["transcriptId"],
                    "videoId": chunk.get("videoId", ""),
                    "videoTitle": chunk.get("videoTitle", ""),
                    "text": chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"],
                    "relevanceScore": chunk.get("relevanceScore", 0.0)
                })
            
            # Create/update chat session if provided
            message_id = self._generate_message_id()
            chat_session_id = query.chatSessionId
            
            if chat_session_id:
                await self._add_message_to_session(
                    chat_session_id, user_id, query.question, response_text, sources, message_id
                )
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return UserRAGResponse(
                answer=response_text,
                sources=sources,
                chatSessionId=chat_session_id or "",
                messageId=message_id,
                processingTime=processing_time,
                tokensUsed=100  # Estimate - would need actual tracking
            )
            
        except Exception as e:
            logger.error(f"Error in RAG search for user {user_id}: {e}")
            raise Exception(f"Failed to search content: {str(e)}")
    
    async def _search_embeddings(self, user_id: str, query: str, transcript_ids: List[str], top_k: int) -> List[Dict[str, Any]]:
        """Search embeddings for relevant chunks"""
        try:
            # Generate query embedding
            query_embedding = self.embeddings.embed_query(query)
            
            # Get embeddings for specified transcripts
            embeddings_cursor = self.embeddings_collection.find({
                "userId": user_id,
                "transcriptId": {"$in": transcript_ids}
            })
            
            all_chunks = []
            
            for embedding_doc in embeddings_cursor:
                transcript_id = embedding_doc["transcriptId"]
                video_id = embedding_doc["videoId"]
                
                # Get video title
                transcript = self.transcripts_collection.find_one(
                    {"transcriptId": transcript_id},
                    {"videoTitle": 1}
                )
                video_title = transcript.get("videoTitle", "") if transcript else ""
                
                for chunk in embedding_doc["chunks"]:
                    # Calculate similarity
                    chunk_embedding = chunk["embedding"]
                    similarity = np.dot(query_embedding, chunk_embedding) / (
                        np.linalg.norm(query_embedding) * np.linalg.norm(chunk_embedding)
                    )
                    
                    all_chunks.append({
                        "transcriptId": transcript_id,
                        "videoId": video_id,
                        "videoTitle": video_title,
                        "text": chunk["text"],
                        "relevanceScore": float(similarity),
                        "metadata": chunk["metadata"]
                    })
            
            # Sort by relevance and return top k
            all_chunks.sort(key=lambda x: x["relevanceScore"], reverse=True)
            return all_chunks[:top_k]
            
        except Exception as e:
            logger.error(f"Error searching embeddings: {e}")
            return []
    
    async def _generate_rag_response(self, question: str, relevant_chunks: List[Dict[str, Any]]) -> str:
        """Generate response using relevant chunks and Gemini"""
        try:
            # Prepare context from chunks
            context_parts = []
            for i, chunk in enumerate(relevant_chunks):
                video_title = chunk.get("videoTitle", "Unknown Video")
                context_parts.append(f"Source {i+1} (from '{video_title}'):\n{chunk['text']}\n")
            
            context = "\n".join(context_parts)
            
            # Create prompt
            prompt = f"""Based on the following video transcript excerpts, please answer the user's question accurately and comprehensively.

Context from video transcripts:
{context}

User's question: {question}

Please provide a helpful answer based on the provided context. If the context doesn't contain enough information to fully answer the question, please say so and provide what information you can from the available sources. Always cite which video sources you're drawing information from.

Answer:"""
            
            # Generate response
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Error generating RAG response: {e}")
            return "I apologize, but I encountered an error while generating a response. Please try again."
    
    async def create_chat_session(self, user_id: str, session_name: str, transcript_ids: List[str]) -> Dict[str, Any]:
        """Create a new chat session"""
        try:
            chat_session_id = self._generate_chat_session_id()
            
            session_doc = {
                "chatSessionId": chat_session_id,
                "userId": user_id,
                "transcriptIds": transcript_ids,
                "sessionName": session_name,
                "messages": [],
                "settings": {
                    "ragTopK": 5,
                    "temperature": 0.7,
                    "maxTokens": 1000,
                    "systemPrompt": "You are a helpful AI assistant that answers questions based on video transcript content."
                },
                "isActive": True,
                "createdAt": datetime.utcnow(),
                "lastActivity": datetime.utcnow(),
                "totalMessages": 0
            }
            
            result = self.chat_sessions_collection.insert_one(session_doc)
            
            if result.inserted_id:
                return {
                    "chatSessionId": chat_session_id,
                    "sessionName": session_name,
                    "transcriptIds": transcript_ids,
                    "createdAt": session_doc["createdAt"].isoformat()
                }
            else:
                raise Exception("Failed to create chat session")
                
        except Exception as e:
            logger.error(f"Error creating chat session for user {user_id}: {e}")
            raise Exception(f"Failed to create chat session: {str(e)}")
    
    async def _add_message_to_session(self, session_id: str, user_id: str, user_message: str, 
                                     assistant_response: str, sources: List[Dict[str, Any]], message_id: str):
        """Add messages to chat session"""
        try:
            # Prepare messages
            user_msg = {
                "messageId": self._generate_message_id(),
                "role": "user",
                "content": user_message,
                "timestamp": datetime.utcnow(),
                "sources": [],
                "processing": {}
            }
            
            assistant_msg = {
                "messageId": message_id,
                "role": "assistant", 
                "content": assistant_response,
                "timestamp": datetime.utcnow(),
                "sources": sources,
                "processing": {
                    "model": "gemini-1.5-flash-latest",
                    "responseTime": 0,
                    "tokensUsed": 100
                }
            }
            
            # Update session
            self.chat_sessions_collection.update_one(
                {"chatSessionId": session_id, "userId": user_id},
                {
                    "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
                    "$set": {"lastActivity": datetime.utcnow()},
                    "$inc": {"totalMessages": 2}
                }
            )
            
        except Exception as e:
            logger.error(f"Error adding message to session {session_id}: {e}")
    
    async def get_user_chat_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all chat sessions for a user"""
        try:
            sessions = list(self.chat_sessions_collection.find(
                {"userId": user_id, "isActive": True},
                {"messages": 0}  # Exclude messages for list view
            ).sort("lastActivity", -1))
            
            # Convert ObjectId to string
            for session in sessions:
                session["_id"] = str(session["_id"])
                session["createdAt"] = session["createdAt"].isoformat()
                session["lastActivity"] = session["lastActivity"].isoformat()
            
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting chat sessions for user {user_id}: {e}")
            return []
    
    async def get_chat_session(self, user_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific chat session with messages"""
        try:
            session = self.chat_sessions_collection.find_one({
                "chatSessionId": session_id,
                "userId": user_id,
                "isActive": True
            })
            
            if session:
                session["_id"] = str(session["_id"])
                session["createdAt"] = session["createdAt"].isoformat()
                session["lastActivity"] = session["lastActivity"].isoformat()
                
                # Convert message timestamps
                for message in session.get("messages", []):
                    message["timestamp"] = message["timestamp"].isoformat()
            
            return session
            
        except Exception as e:
            logger.error(f"Error getting chat session {session_id}: {e}")
            return None 