import os
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
from datetime import datetime

# Core libraries
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
import re

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from langchain_core.embeddings import Embeddings

# Pydantic models
from pydantic import BaseModel

class VideoTranscript(BaseModel):
    video_id: str
    title: str
    transcript: str
    chunks: List[str] = []
    timestamp: datetime

class RAGQuery(BaseModel):
    question: str
    video_ids: List[str] = []
    top_k: int = 5

class RAGResponse(BaseModel):
    answer: str
    source_chunks: List[str]
    video_sources: List[str]

# Modified wrapper for sentence-transformers
class LocalLangchainEmbeddings(Embeddings):
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        super().__init__()
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents."""
        return self.model.encode(texts, convert_to_tensor=False).tolist()

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query text."""
        return self.model.encode(text, convert_to_tensor=False).tolist()

class RAGChatbot:
    def __init__(self, api_key: str):
        """Initialize the RAG chatbot with Gemini API key."""
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        # Initialize local embeddings
        self.embeddings = LocalLangchainEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Storage paths
        self.transcript_dir = Path("transcripts")
        self.vector_db_dir = Path("vector_db")
        
        # Create directories
        self.transcript_dir.mkdir(exist_ok=True)
        self.vector_db_dir.mkdir(exist_ok=True)
        
        # Vector store
        self.vector_store = None
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def get_video_id(self, url: str) -> str:
        """Extract video ID from YouTube URL."""
        if not url:
            raise ValueError("Empty URL provided")
            
        # If it's already just a video ID (11 characters, alphanumeric)
        if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
            self.logger.info(f"URL is already a video ID: {url}")
            return url
            
        # Common patterns for YouTube URLs
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/.*[?&]v=([a-zA-Z0-9_-]{11})',
            r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
            r'([a-zA-Z0-9_-]{11})' # Last resort: try to find an 11-character ID anywhere
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                self.logger.info(f"Extracted video ID {video_id} from URL: {url}")
                return video_id
            
        self.logger.error(f"Could not extract video ID from: {url}")
        raise ValueError(f"Could not extract video ID from: {url}")

    async def fetch_and_store_transcript(self, video_url: str, video_title: str = None) -> str:
        """Fetch transcript from YouTube and store it in a text file."""
        try:
            video_id = self.get_video_id(video_url)
            
            # Check if transcript already exists
            transcript_file = self.transcript_dir / f"{video_id}.txt"
            metadata_file = self.transcript_dir / f"{video_id}_metadata.json"
            
            if transcript_file.exists():
                self.logger.info(f"Loading existing transcript for video {video_id}")
                with open(transcript_file, 'r', encoding='utf-8') as f:
                    return f.read()
            
            # Fetch transcript from YouTube
            self.logger.info(f"Fetching transcript for video {video_id}")
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Combine transcript text
            full_transcript = ""
            for entry in transcript_list:
                text = entry['text']
                # Clean up the text
                text = re.sub(r'\[.*?\]', '', text)  # Remove [Music], [Applause], etc.
                text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
                if text:
                    full_transcript += text + " "
            
            # Add punctuation for better readability
            full_transcript = re.sub(r'([.!?])\s*', r'\1 ', full_transcript)
            full_transcript = re.sub(r'([^.!?])\s*$', r'\1.', full_transcript)
            
            # Store transcript in text file
            with open(transcript_file, 'w', encoding='utf-8') as f:
                f.write(full_transcript)
            
            # Store metadata
            metadata = {
                'video_id': video_id,
                'title': video_title or f"Video {video_id}",
                'transcript_length': len(full_transcript),
                'timestamp': datetime.now().isoformat(),
                'url': video_url
            }
            
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            self.logger.info(f"Transcript saved for video {video_id} ({len(full_transcript)} characters)")
            return full_transcript
            
        except Exception as e:
            self.logger.error(f"Error fetching transcript for {video_url}: {str(e)}")
            raise

    async def chunk_and_embed_transcript(self, video_id: str) -> None:
        """Chunk the transcript and create embeddings using LangChain and FAISS."""
        try:
            transcript_file = self.transcript_dir / f"{video_id}.txt"
            
            if not transcript_file.exists():
                raise FileNotFoundError(f"Transcript file not found for video {video_id}")
            
            # Read transcript
            with open(transcript_file, 'r', encoding='utf-8') as f:
                transcript = f.read()
            
            # Create chunks using LangChain text splitter
            chunks = self.text_splitter.split_text(transcript)
            self.logger.info(f"Created {len(chunks)} chunks for video {video_id}")
            
            # Create documents with metadata
            documents = []
            for i, chunk in enumerate(chunks):
                doc = Document(
                    page_content=chunk,
                    metadata={
                        'video_id': video_id,
                        'chunk_id': i,
                        'source': f"video_{video_id}_chunk_{i}"
                    }
                )
                documents.append(doc)
            
            # Create or update FAISS vector store
            vector_store_path = self.vector_db_dir / f"faiss_store_{video_id}"
            
            if vector_store_path.exists():
                # Load existing vector store and add new documents
                self.logger.info(f"Loading existing vector store for video {video_id}")
                vector_store = FAISS.load_local(
                    str(vector_store_path), 
                    self.embeddings
                )
                vector_store.add_documents(documents)
            else:
                # Create new vector store
                self.logger.info(f"Creating new vector store for video {video_id}")
                vector_store = FAISS.from_documents(documents, self.embeddings)
            
            # Save vector store
            vector_store.save_local(str(vector_store_path))
            
            self.logger.info(f"Vector store saved for video {video_id}")
            
        except Exception as e:
            self.logger.error(f"Error chunking and embedding transcript for {video_id}: {str(e)}")
            raise

    async def load_combined_vector_store(self, video_ids: List[str]) -> FAISS:
        """Load and combine vector stores for multiple videos."""
        try:
            combined_store = None
            
            for video_id in video_ids:
                vector_store_path = self.vector_db_dir / f"faiss_store_{video_id}"
                
                if not vector_store_path.exists():
                    self.logger.warning(f"Vector store not found for video {video_id}, skipping...")
                    continue
                
                # Load vector store
                vector_store = FAISS.load_local(
                    str(vector_store_path), 
                    self.embeddings
                )
                
                if combined_store is None:
                    combined_store = vector_store
                else:
                    # Merge vector stores
                    combined_store.merge_from(vector_store)
                
                self.logger.info(f"Loaded vector store for video {video_id}")
            
            if combined_store is None:
                raise ValueError("No vector stores found for the provided video IDs")
            
            return combined_store
            
        except Exception as e:
            self.logger.error(f"Error loading combined vector store: {str(e)}")
            raise

    async def retrieve_relevant_chunks(self, query: str, video_ids: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks from FAISS vector database using similarity search."""
        try:
            # Load combined vector store
            vector_store = await self.load_combined_vector_store(video_ids)
            
            # Perform similarity search
            results = vector_store.similarity_search_with_score(query, k=top_k)
            
            relevant_chunks = []
            for doc, score in results:
                chunk_info = {
                    'content': doc.page_content,
                    'score': float(score),
                    'video_id': doc.metadata.get('video_id'),
                    'chunk_id': doc.metadata.get('chunk_id'),
                    'source': doc.metadata.get('source')
                }
                relevant_chunks.append(chunk_info)
            
            self.logger.info(f"Retrieved {len(relevant_chunks)} relevant chunks for query: {query[:50]}...")
            return relevant_chunks
            
        except Exception as e:
            self.logger.error(f"Error retrieving relevant chunks: {str(e)}")
            raise

    async def generate_augmented_response(self, query: str, relevant_chunks: List[Dict[str, Any]]) -> str:
        """Generate response using Gemini with retrieved context."""
        try:
            # Prepare context from relevant chunks
            context_parts = []
            for i, chunk in enumerate(relevant_chunks, 1):
                context_parts.append(f"Context {i} (Video {chunk['video_id']}):\n{chunk['content']}")
            
            context = "\n\n".join(context_parts)
            
            # Create prompt for Gemini
            prompt = f"""You are an AI assistant that answers questions based on YouTube video transcripts. 
Use the provided context from video transcripts to answer the user's question accurately and comprehensively.

CONTEXT FROM VIDEO TRANSCRIPTS:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. Answer the question based ONLY on the information provided in the context
2. If the context doesn't contain enough information, say so clearly
3. Provide specific quotes or references when possible
4. Structure your response with clear sections and bullet points when appropriate
5. If multiple videos are referenced, mention which video each point comes from
6. Be conversational but informative

RESPONSE:"""

            # Generate response using Gemini
            response = await self.model.generate_content_async(prompt)
            
            if response.text:
                return response.text
            else:
                return "I apologize, but I couldn't generate a response based on the provided context."
                
        except Exception as e:
            self.logger.error(f"Error generating augmented response: {str(e)}")
            return f"I encountered an error while generating the response: {str(e)}"

    async def process_videos_and_create_embeddings(self, video_urls: List[str], video_titles: List[str] = None) -> List[str]:
        """Process multiple videos: fetch transcripts and create embeddings."""
        video_ids = []
        
        self.logger.info(f"Processing {len(video_urls)} videos: {video_urls}")
        
        for i, url in enumerate(video_urls):
            try:
                video_id = self.get_video_id(url)
                self.logger.info(f"Extracted video ID: {video_id} from URL: {url}")
                
                title = video_titles[i] if video_titles and i < len(video_titles) else None
                
                # Fetch and store transcript
                self.logger.info(f"Fetching transcript for {url} (ID: {video_id})")
                transcript_result = await self.fetch_and_store_transcript(url, title)
                self.logger.info(f"Transcript fetch result for {video_id}: {len(transcript_result) if transcript_result else 'None'} characters")
                
                # Create embeddings
                self.logger.info(f"Creating embeddings for {video_id}")
                await self.chunk_and_embed_transcript(video_id)
                
                # Verify vector store was created
                vector_store_path = self.vector_db_dir / f"faiss_store_{video_id}"
                if vector_store_path.exists():
                    self.logger.info(f"Vector store created successfully at {vector_store_path}")
                    video_ids.append(video_id)
                    self.logger.info(f"Successfully processed video {video_id}")
                else:
                    self.logger.error(f"Vector store wasn't created for {video_id}")
                
            except Exception as e:
                self.logger.error(f"Failed to process video {url}: {str(e)}")
                self.logger.exception("Detailed error:")
                continue
        
        self.logger.info(f"Processed {len(video_ids)} videos successfully: {video_ids}")
        return video_ids

    async def answer_question(self, query: str, video_ids: List[str], top_k: int = 5) -> RAGResponse:
        """Main method to answer questions using RAG pipeline."""
        try:
            # Validate video_ids
            if not video_ids or len(video_ids) == 0:
                self.logger.warning("No video IDs provided for RAG question answering")
                return RAGResponse(
                    answer="I don't have any videos to search through. Please process some videos first.",
                    source_chunks=[],
                    video_sources=[]
                )
                
            # Check if vector stores exist for the provided video IDs
            available_video_ids = []
            for video_id in video_ids:
                vector_store_path = self.vector_db_dir / f"faiss_store_{video_id}"
                if vector_store_path.exists():
                    available_video_ids.append(video_id)
                else:
                    self.logger.warning(f"Vector store not found for video ID: {video_id}")
                    
            if not available_video_ids:
                self.logger.warning(f"No vector stores found for any of the provided video IDs: {video_ids}")
                return RAGResponse(
                    answer="I couldn't find any processed video transcripts to search through. Please process the videos first by clicking the 'Process Videos First' button.",
                    source_chunks=[],
                    video_sources=[]
                )
                
            self.logger.info(f"Found vector stores for {len(available_video_ids)} videos: {available_video_ids}")
                
            # Step 1: Retrieve relevant chunks
            relevant_chunks = await self.retrieve_relevant_chunks(query, available_video_ids, top_k)
            
            if not relevant_chunks:
                return RAGResponse(
                    answer="I couldn't find relevant information in the video transcripts to answer your question.",
                    source_chunks=[],
                    video_sources=available_video_ids
                )
            
            # Step 2: Generate augmented response
            answer = await self.generate_augmented_response(query, relevant_chunks)
            
            # Step 3: Prepare response
            source_chunks = [chunk['content'] for chunk in relevant_chunks]
            video_sources = list(set([chunk['video_id'] for chunk in relevant_chunks]))
            
            return RAGResponse(
                answer=answer,
                source_chunks=source_chunks,
                video_sources=video_sources
            )
        except Exception as e:
            self.logger.error(f"Error in RAG answer pipeline: {str(e)}")
            self.logger.exception("Detailed error:")
            return RAGResponse(
                answer=f"I encountered an error while processing your question: {str(e)}",
                source_chunks=[],
                video_sources=[]
            )

# Initialize the chatbot (to be used in other modules)
def create_rag_chatbot(api_key: str = None) -> RAGChatbot:
    """Factory function to create RAG chatbot instance."""
    if api_key is None:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
    
    return RAGChatbot(api_key)