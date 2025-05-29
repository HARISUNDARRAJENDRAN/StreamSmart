import os
import cv2
import numpy as np
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    YOUTUBE_TRANSCRIPT_API = True
except ImportError:
    print("YouTube Transcript API not found. Install with: pip install youtube-transcript-api")
    YOUTUBE_TRANSCRIPT_API = False

try:
    import whisper_timestamped as whisper
    WHISPER_TIMESTAMPED = True
except ImportError:
    try:
        import whisper
        WHISPER_TIMESTAMPED = False
        print("Using regular OpenAI Whisper (no timestamps). Install whisper-timestamped for better functionality.")
    except ImportError:
        print("Whisper not found. Please install with: pip install openai-whisper")
        raise
import yt_dlp
import torch
try:
    import clip
except ImportError:
    print("CLIP not found. Please install with: pip install git+https://github.com/openai/CLIP.git")
    raise
from PIL import Image
import tempfile
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoProcessor:
    def __init__(self):
        """Initialize the video processor with Whisper and CLIP models"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        # Load Whisper model for transcription
        logger.info("Loading Whisper model...")
        self.whisper_model = whisper.load_model("base", device=self.device)
        
        # Load CLIP model for visual understanding
        logger.info("Loading CLIP model...")
        self.clip_model, self.clip_preprocess = clip.load("ViT-B/32", device=self.device)
        
        # Thread pool for CPU-intensive tasks
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        logger.info("VideoProcessor initialized successfully")

    async def extract_transcript(self, youtube_url: str) -> Dict[str, Any]:
        """
        Stage 1: Extract transcript from YouTube video
        Priority: 1) YouTube captions 2) Whisper audio transcription
        """
        try:
            logger.info(f"Starting transcript extraction for: {youtube_url}")
            
            # Extract video ID from YouTube URL
            video_id = self._extract_video_id(youtube_url)
            if not video_id:
                raise ValueError("Could not extract video ID from URL")
            
            # Try YouTube captions first (faster and more accurate)
            if YOUTUBE_TRANSCRIPT_API:
                try:
                    logger.info("Attempting to extract YouTube captions...")
                    transcript_result = await self._extract_youtube_captions(video_id)
                    if transcript_result:
                        # Check if transcript is complete enough
                        word_count = len(transcript_result.get("full_text", "").split())
                        duration = transcript_result.get("duration", 0)
                        
                        # If transcript seems complete (more than 100 words AND more than 2 minutes)
                        if word_count >= 100 and duration >= 120:
                            logger.info(f"YouTube captions appear complete: {word_count} words, {duration:.1f}s")
                            return transcript_result
                        else:
                            logger.warning(f"YouTube captions incomplete: {word_count} words, {duration:.1f}s. Trying Whisper...")
                            # Continue to Whisper fallback
                except Exception as e:
                    logger.warning(f"YouTube captions extraction failed: {e}")
            
            # Fallback to Whisper audio transcription for complete transcript
            logger.info("Using Whisper audio transcription for complete transcript...")
            return await self._extract_whisper_transcript(youtube_url)
                
        except Exception as e:
            logger.error(f"Error in transcript extraction: {str(e)}")
            raise

    def _extract_video_id(self, youtube_url: str) -> str:
        """Extract video ID from various YouTube URL formats"""
        import re
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
            r'youtube\.com/v/([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, youtube_url)
            if match:
                return match.group(1)
        return None

    async def _extract_youtube_captions(self, video_id: str) -> Dict[str, Any]:
        """Extract captions using YouTube Transcript API"""
        try:
            # Try to get transcript in preferred languages
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Try to find English transcript first
            transcript = None
            try:
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
                logger.info("Found English transcript")
            except:
                # If no English, try auto-generated
                try:
                    transcript = transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])
                    logger.info("Found auto-generated English transcript")
                except:
                    # If still no English, get any available transcript
                    available_transcripts = list(transcript_list)
                    if available_transcripts:
                        transcript = available_transcripts[0]
                        logger.info(f"Using first available transcript: {transcript.language}")
            
            if not transcript:
                raise Exception("No transcripts available")
            
            # Fetch the transcript - THIS IS THE KEY PART
            logger.info("Fetching complete transcript data...")
            transcript_data = transcript.fetch()
            logger.info(f"Retrieved {len(transcript_data)} transcript entries")
            
            # Convert to our format
            segments = []
            full_text = ""
            total_duration = 0
            
            for i, entry in enumerate(transcript_data):
                segment = {
                    "start": entry.get('start', 0),
                    "end": entry.get('start', 0) + entry.get('duration', 0),
                    "text": entry.get('text', '').strip(),
                    "confidence": 1.0,  # YouTube captions are generally reliable
                    "words": []  # YouTube API doesn't provide word-level timestamps
                }
                
                # Skip empty segments
                if not segment["text"]:
                    continue
                
                # Create word-level data (approximate)
                words = segment["text"].split()
                if words:
                    word_duration = entry.get('duration', 0) / len(words)
                    for i, word in enumerate(words):
                        word_data = {
                            "word": word,
                            "start": segment["start"] + (i * word_duration),
                            "end": segment["start"] + ((i + 1) * word_duration),
                            "confidence": 1.0
                        }
                        segment["words"].append(word_data)
                
                segments.append(segment)
                full_text += segment["text"] + " "
                total_duration = max(total_duration, segment["end"])
            
            # Validate transcript completeness
            word_count = len(full_text.split())
            logger.info(f"Extracted transcript: {word_count} words, {total_duration:.1f} seconds duration")
            
            # If transcript seems too short (less than 100 words or less than 2 minutes), it might be incomplete
            if word_count < 100 or total_duration < 120:
                logger.warning(f"Transcript appears short: {word_count} words, {total_duration:.1f}s. May be incomplete.")
                # Still return it, but with a warning flag
                result = {
                    "full_text": full_text.strip(),
                    "segments": segments,
                    "language": transcript.language_code if hasattr(transcript, 'language_code') else "en",
                    "duration": total_duration,
                    "source": "youtube_captions",
                    "warning": "transcript_possibly_incomplete"
                }
            else:
                result = {
                    "full_text": full_text.strip(),
                    "segments": segments,
                    "language": transcript.language_code if hasattr(transcript, 'language_code') else "en",
                    "duration": total_duration,
                    "source": "youtube_captions"
                }
            
            logger.info(f"Successfully extracted YouTube captions: {len(segments)} segments, {len(full_text)} chars")
            return result
            
        except Exception as e:
            logger.error(f"YouTube captions extraction failed: {e}")
            return None

    async def _extract_whisper_transcript(self, youtube_url: str) -> Dict[str, Any]:
        """
        Fallback: Extract audio and transcribe with Whisper
        """
        try:
            # Download audio using yt-dlp
            with tempfile.TemporaryDirectory() as temp_dir:
                audio_path = os.path.join(temp_dir, "audio.wav")
                
                # Configure yt-dlp options for audio extraction with better error handling
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': audio_path.replace('.wav', '.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'wav',
                        'preferredquality': '192',
                    }],
                    'quiet': False,
                    'no_warnings': False,
                    'extractaudio': True,
                    'audioformat': 'wav',
                    'ignoreerrors': False,
                    'retries': 3,
                    'fragment_retries': 3,
                    'extractor_retries': 3,
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
                
                # Download audio
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([youtube_url])
                
                # Run Whisper transcription in thread pool
                loop = asyncio.get_event_loop()
                transcript_result = await loop.run_in_executor(
                    self.executor, 
                    self._transcribe_audio, 
                    audio_path
                )
                
                transcript_result["source"] = "whisper_audio"
                logger.info("Whisper transcript extraction completed successfully")
                return transcript_result
                
        except Exception as e:
            logger.error(f"Error in Whisper transcript extraction: {str(e)}")
            raise

    def _transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Transcribe audio using Whisper with timestamps
        """
        try:
            if WHISPER_TIMESTAMPED:
                # Use whisper-timestamped for detailed timestamp information
                result = whisper.transcribe(
                    self.whisper_model, 
                    audio_path,
                    language="en",  # Can be made configurable
                    detect_disfluencies=True,
                    vad=True  # Voice activity detection
                )
            else:
                # Use regular OpenAI Whisper
                result = self.whisper_model.transcribe(
                    audio_path,
                    language="en"
                )
            
            # Extract segments with timestamps
            segments = []
            full_text = ""
            
            for segment in result.get("segments", []):
                segment_data = {
                    "start": segment.get("start", 0),
                    "end": segment.get("end", 0),
                    "text": segment.get("text", "").strip(),
                    "confidence": segment.get("confidence", 0),
                    "words": []
                }
                
                # Extract word-level timestamps if available (whisper-timestamped only)
                if WHISPER_TIMESTAMPED:
                    for word in segment.get("words", []):
                        word_data = {
                            "word": word.get("word", "").strip(),
                            "start": word.get("start", 0),
                            "end": word.get("end", 0),
                            "confidence": word.get("confidence", 0)
                        }
                        segment_data["words"].append(word_data)
                else:
                    # For regular whisper, create basic word entries
                    words = segment_data["text"].split()
                    segment_duration = segment_data["end"] - segment_data["start"]
                    word_duration = segment_duration / len(words) if words else 0
                    
                    for i, word in enumerate(words):
                        word_start = segment_data["start"] + (i * word_duration)
                        word_end = word_start + word_duration
                        word_data = {
                            "word": word,
                            "start": word_start,
                            "end": word_end,
                            "confidence": segment_data["confidence"]
                        }
                        segment_data["words"].append(word_data)
                
                segments.append(segment_data)
                full_text += segment_data["text"] + " "
            
            return {
                "full_text": full_text.strip(),
                "segments": segments,
                "language": result.get("language", "en"),
                "duration": result.get("duration", 0)
            }
            
        except Exception as e:
            logger.error(f"Error in audio transcription: {str(e)}")
            raise

    async def extract_visual_features(self, youtube_url: str, frame_interval: int = 30) -> Dict[str, Any]:
        """
        Stage 2: Extract key frames from YouTube video and generate CLIP embeddings
        """
        try:
            logger.info(f"Starting visual feature extraction for: {youtube_url}")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                video_path = os.path.join(temp_dir, "video.mp4")
                
                # Download video using yt-dlp with better error handling
                ydl_opts = {
                    'format': 'best[height<=720]/best',  # Limit resolution to save bandwidth
                    'outtmpl': video_path,
                    'quiet': False,
                    'no_warnings': False,
                    'ignoreerrors': False,
                    'retries': 3,
                    'fragment_retries': 3,
                    'extractor_retries': 3,
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([youtube_url])
                
                # Extract frames and generate CLIP embeddings
                loop = asyncio.get_event_loop()
                visual_result = await loop.run_in_executor(
                    self.executor,
                    self._extract_frames_and_embeddings,
                    video_path,
                    frame_interval
                )
                
                logger.info("Visual feature extraction completed successfully")
                return visual_result
                
        except Exception as e:
            logger.error(f"Error in visual feature extraction: {str(e)}")
            raise

    def _extract_frames_and_embeddings(self, video_path: str, frame_interval: int) -> Dict[str, Any]:
        """
        Extract key frames and generate CLIP embeddings
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps
            
            frames_data = []
            frame_embeddings = []
            frame_count = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Extract frame at specified intervals
                if frame_count % frame_interval == 0:
                    timestamp = frame_count / fps
                    
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)
                    
                    # Preprocess for CLIP
                    image_input = self.clip_preprocess(pil_image).unsqueeze(0).to(self.device)
                    
                    # Generate CLIP embedding
                    with torch.no_grad():
                        image_features = self.clip_model.encode_image(image_input)
                        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                    
                    # Store frame data
                    frame_data = {
                        "timestamp": timestamp,
                        "frame_number": frame_count,
                        "embedding": image_features.cpu().numpy().tolist()
                    }
                    
                    frames_data.append(frame_data)
                    frame_embeddings.append(image_features.cpu().numpy())
                
                frame_count += 1
            
            cap.release()
            
            # Calculate average embedding for overall video representation
            if frame_embeddings:
                avg_embedding = np.mean(frame_embeddings, axis=0)
            else:
                avg_embedding = np.zeros((512,))  # CLIP ViT-B/32 feature dimension
            
            return {
                "frames": frames_data,
                "average_embedding": avg_embedding.tolist(),
                "total_frames": len(frames_data),
                "video_duration": duration,
                "fps": fps
            }
            
        except Exception as e:
            logger.error(f"Error in frame extraction and embedding: {str(e)}")
            raise

    def extract_text_features(self, text: str) -> np.ndarray:
        """
        Extract CLIP text features for text-image alignment
        """
        try:
            text_input = clip.tokenize([text]).to(self.device)
            with torch.no_grad():
                text_features = self.clip_model.encode_text(text_input)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            return text_features.cpu().numpy()
        except Exception as e:
            logger.error(f"Error in text feature extraction: {str(e)}")
            raise

    def find_relevant_frames(self, transcript_segments: List[Dict], frames_data: List[Dict], similarity_threshold: float = 0.3) -> List[Dict]:
        """
        Find frames that are most relevant to transcript segments using CLIP
        """
        try:
            relevant_frames = []
            
            for segment in transcript_segments:
                segment_text = segment.get("text", "")
                if not segment_text.strip():
                    continue
                
                # Get text features for the segment
                text_features = self.extract_text_features(segment_text)
                
                # Find the most similar frame within the time window
                segment_start = segment.get("start", 0)
                segment_end = segment.get("end", 0)
                
                best_similarity = -1
                best_frame = None
                
                for frame in frames_data:
                    frame_timestamp = frame.get("timestamp", 0)
                    
                    # Check if frame is within segment time window (with some buffer)
                    if segment_start - 5 <= frame_timestamp <= segment_end + 5:
                        frame_embedding = np.array(frame.get("embedding", []))
                        
                        if frame_embedding.size > 0:
                            # Calculate cosine similarity
                            similarity = np.dot(text_features.flatten(), frame_embedding.flatten())
                            
                            if similarity > best_similarity and similarity > similarity_threshold:
                                best_similarity = similarity
                                best_frame = {
                                    **frame,
                                    "segment_text": segment_text,
                                    "similarity_score": float(similarity)
                                }
                
                if best_frame:
                    relevant_frames.append(best_frame)
            
            return relevant_frames
            
        except Exception as e:
            logger.error(f"Error in finding relevant frames: {str(e)}")
            raise 