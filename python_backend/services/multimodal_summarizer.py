import os
import asyncio # Added for async operations in helpers
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
import torch
import logging
from typing import Dict, Any, List
import re
import json # Added for parsing Gemini's JSON output

logger = logging.getLogger(__name__)

def get_video_id(url_link: str) -> str:
    """Extracts the YouTube video ID from a URL."""
    if "watch?v=" in url_link:
        return url_link.split("watch?v=")[-1].split("&")[0]
    elif "youtu.be/" in url_link:
        return url_link.split("youtu.be/")[-1].split("?")[0]
    # Add more robust parsing if other URL formats are expected
    raise ValueError("Invalid YouTube URL format. Could not extract video ID.")

class TranscriptSummarizer:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"TranscriptSummarizer initialized. Device check: {self.device}.")
        self._ready = False
        self.gemini_model = None
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.error("GEMINI_API_KEY environment variable not found.")
                raise ValueError("GEMINI_API_KEY not set.")
            
            genai.configure(api_key=api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
            logger.info("Gemini API configured and model initialized successfully.")
            self._ready = True
        except ValueError as ve:
            logger.error(f"ValueError during Gemini initialization (e.g., API key missing or invalid): {ve}", exc_info=True)
        except Exception as e:
            logger.error(f"Error initializing Gemini API: {e}", exc_info=True)
    
    def is_ready(self) -> bool:
        """Check if the Gemini API is configured and ready."""
        return self._ready and self.gemini_model is not None
    
    def _add_basic_punctuation(self, text: str) -> str:
        """Adds very basic punctuation if missing. Can be improved."""
        # This is a simplistic approach. For robust punctuation, use a dedicated library.
        # Example: deepmultilingualpunctuation or spacy-based rules.
        processed_text = text.replace("  ", " ").strip()
        if not processed_text:
            return ""
        if not processed_text.endswith(('.', '?', '!')):
            processed_text += '.'
        return processed_text

    async def _summarize_text_with_gemini(self, text_to_summarize: str, max_summary_length: int = 700, min_summary_length: int = 150) -> str:
        """Internal method to summarize provided text using Gemini API."""
        if not self.is_ready():
            logger.error("Gemini model not ready for direct text summarization.")
            return "Error: Summarizer (Gemini) not ready."
        try:
            transcript_punctuated = self._add_basic_punctuation(text_to_summarize)
            logger.info(f"Starting Gemini summarization for text (first 300 chars): {transcript_punctuated[:300]}")
            
            # Updated prompt for clearer subtopic and pointwise structure
            prompt = f"""As an expert analyst, provide a structured outline summary of the following video transcript. 
Your summary MUST begin with a concise overview statement (1-2 sentences) that captures the essence of the video's message.

Following the overview, identify 2-3 key strategic themes. For each theme:
  - Present the theme as a BOLDED section header (e.g., **Key Strategic Theme 1: Defining Agentic AI**).
  - Underneath each theme header, provide 2-4 CONCISE bullet points. 
  - Each bullet point MUST start on a COMPLETELY NEW LINE.
  - Each bullet point MUST begin with a simple dash and a space (e.g., "- ").
  - These bullet points should cover the key arguments, components, or implications of the theme.

Maintain an analytical tone. Focus on implications and core arguments.

EXAMPLE OF DESIRED OUTPUT STRUCTURE:
This video explains the core concepts of X and its applications in Y.

**Key Strategic Theme 1: Understanding X**
- X is defined by its ability to A and B.
- A key component of X is its C module.
- The primary implication of X is D.

**Key Strategic Theme 2: Applications of X in Y**
- X can be applied to solve problem P in domain Y.
- An example is using X for Q, resulting in R.
- Challenges in applying X include S and T.

[And so on for other themes]

Transcript:
{transcript_punctuated}

Structured Outline Summary (approx {min_summary_length}-{max_summary_length} words):
"""
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.7 
            )

            response = await self.gemini_model.generate_content_async(prompt, generation_config=generation_config)
            
            summary = response.text.strip()
            if not summary:
                 logger.warning("Gemini summarization produced an empty summary.")
                 return "Error: Summarization (Gemini) resulted in empty content."

            # Post-processing to enforce newlines for bullet points
            # This attempts to split themes and then ensure points under themes start with a newline
            processed_summary_parts = []
            # We use a regex that captures the theme header itself to preserve it.
            themes = re.split(r'(\*\*Key Strategic Theme.*?\*\*)', summary) # Corrected regex for literal **
            
            for i, part in enumerate(themes):
                if i % 2 == 1: # This is a theme header (already captured with its **...**)
                    processed_summary_parts.append(part.strip()) 
                else: # This is content under a theme, or the initial overview
                    content_part = part.strip()
                    if not content_part:
                        continue
                    
                    # Split content_part by bullet markers (\n- followed by space(s))
                    # The pattern r'\n-\s+' identifies the start of a bullet point.
                    bullet_marker_pattern = r'\n-\s+' # This should remain a raw string with \n
                    split_by_bullets = re.split(bullet_marker_pattern, content_part)
                    
                    current_part_processed_text = ""

                    # The first element is the preamble (text before any bullets, or whole text if no bullets)
                    if split_by_bullets[0].strip():
                        preamble = re.sub(r'\s+', ' ', split_by_bullets[0].strip()) # This should remain a raw string with \s
                        current_part_processed_text = preamble
                    
                    # Subsequent elements are the actual bullet contents
                    if len(split_by_bullets) > 1:
                        processed_bullets = []
                        for bullet_text in split_by_bullets[1:]:
                            if bullet_text.strip():
                                normalized_bullet = re.sub(r'\s+', ' ', bullet_text.strip()) # This should remain a raw string with \s
                                processed_bullets.append("- " + normalized_bullet)
                        
                        if processed_bullets:
                            if current_part_processed_text: # If there was a preamble
                                current_part_processed_text += "\n" # Corrected to actual newline
                            current_part_processed_text += "\n".join(processed_bullets) # Corrected to actual newline
                    
                    if current_part_processed_text:
                         processed_summary_parts.append(current_part_processed_text)
            
            # Construct final summary ensuring a blank line before theme headers
            final_summary_structure = []
            for i, part_text in enumerate(processed_summary_parts):
                if not part_text: # Skip any potentially empty parts from earlier processing
                    continue

                # Add a blank line before a theme header if it's not the first element 
                # and the previous element added to final_summary_structure was not already a blank line.
                if part_text.startswith("**Key Strategic Theme") and final_summary_structure:
                    if final_summary_structure[-1]: # Check if the last added part was not an empty string
                        final_summary_structure.append("") # Insert a blank line
                
                final_summary_structure.append(part_text)

            summary = "\n".join(final_summary_structure).strip()

            logger.info("Successfully generated summary using Gemini and applied post-processing for newlines.")
            return summary
        except Exception as e:
            logger.error(f"Error during Gemini text summarization: {e}", exc_info=True)
            # Check for specific Gemini API errors if available in `e`
            # For example, if hasattr(e, 'reason') and e.reason == 'API_KEY_INVALID':
            #    return "Error: Gemini API Key is invalid."
            return f"Error: Could not summarize with Gemini. Details: {e}"

    async def summarize_video(self, video_url: str, max_summary_length: int = 700, min_summary_length: int = 150) -> str:
        """Fetches transcript for a YouTube video and summarizes it using Gemini."""
        if not self.is_ready():
            logger.error("Summarizer (Gemini) not ready. Cannot summarize video.")
            return "Error: Summarizer (Gemini) not ready."

        try:
            video_id = get_video_id(video_url)
            logger.info(f"Extracted video ID: {video_id} from URL: {video_url}")
        except ValueError as e:
            logger.error(f"{e}")
            return f"Error: {e}"
        except Exception as e:
            logger.error(f"Unexpected error extracting video ID from URL {video_url}: {e}", exc_info=True)
            return f"Error processing video URL: {e}"

        try:
            logger.info(f"Fetching transcript for video ID: {video_id} using YouTubeTranscriptApi")
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            logger.info(f"Successfully fetched transcript for video ID: {video_id}. Segments: {len(transcript_list)}")
        except Exception as e:
            logger.error(f"Could not fetch transcript for video ID {video_id} via YouTubeTranscriptApi: {e}", exc_info=True)
            # youtube_transcript_api.CouldNotRetrieveTranscript can be caught specifically
            return f"Error: Could not fetch transcript. Details: {e}"

        if not transcript_list:
            logger.warning(f"Transcript for video ID {video_id} is empty.")
            return "Error: Transcript is empty or unavailable."

        transcript_text = " ".join([line['text'] for line in transcript_list])
        if not transcript_text.strip():
             logger.warning(f"Joined transcript for video ID {video_id} is empty after joining segments.")
             return "Error: Transcript content is empty after processing."
        
        return await self._summarize_text_with_gemini(transcript_text, max_summary_length, min_summary_length)

    async def generate_multimodal_summary(self, transcript_data: Dict[str, Any], visual_data: Dict[str, Any], video_id: str) -> Dict[str, Any]:
        """Generates a structured summary using Gemini, prioritizing transcript from transcript_data."""
        
        provided_full_text = transcript_data.get("full_text", "").strip()
        min_meaningful_transcript_length = 50 # Characters

        is_valid_transcript = True
        if not provided_full_text or len(provided_full_text) < min_meaningful_transcript_length:
            is_valid_transcript = False
            logger.warning(f"Provided transcript for video_id '{video_id}' is too short or empty. Length: {len(provided_full_text)}.")
        elif "transcript extraction failed" in provided_full_text.lower() or \
             "unable to download video data" in provided_full_text.lower() or \
             "youtube restrictions" in provided_full_text.lower():
            is_valid_transcript = False
            logger.warning(f"Provided transcript for video_id '{video_id}' indicates a failure: '{provided_full_text[:150]}...'.")

        summary_text = ""
        if is_valid_transcript:
            logger.info(f"Using provided transcript (from VideoProcessor) for video_id '{video_id}' with Gemini.")
            summary_text = await self._summarize_text_with_gemini(provided_full_text)
        else:
            logger.warning(f"Invalid or error-indicating transcript from VideoProcessor for video_id '{video_id}'. Attempting fallback to summarize_video (Gemini with own transcript fetch) with URL if available.")
            video_url = transcript_data.get("url")
            if not video_url and video_id:
                video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            if video_url:
                summary_text = await self.summarize_video(video_url)
            else:
                logger.error(f"No valid transcript from VideoProcessor and no URL/video_id to attempt independent fetch for video_id '{video_id}'.")
                summary_text = "Error: No transcript source available for Gemini."

        if summary_text.startswith("Error:"):
            logger.warning(f"Core Gemini summarization failed for video_id '{video_id}'. Summary attempt result: '{summary_text}'. Returning fallback response.")
            return self._generate_fallback_response()
        
        try:
            # These helper methods will also be updated to use Gemini
            learning_objectives = await self._generate_learning_objectives_with_gemini(summary_text)
            key_concepts = await self._extract_key_concepts_with_gemini(summary_text)
            root_topic = await self._extract_root_topic_with_gemini(summary_text)
            
            # Generate timestamp highlights with fallback
            segments = transcript_data.get("segments", [])
            timestamp_highlights = await self._generate_timestamp_highlights_with_gemini(segments)
            if not timestamp_highlights:
                logger.info("Gemini highlights failed or empty, trying simple highlights.")
                timestamp_highlights = self._generate_timestamp_highlights_simple(segments)
            if not timestamp_highlights:
                logger.info("Simple highlights also failed or empty, using default highlights.")
                timestamp_highlights = self._get_default_highlights()
            
            result = {
                "SUMMARY": summary_text,
                "ROOT_TOPIC": root_topic,
                "LEARNING_OBJECTIVES": learning_objectives,
                "KEY_CONCEPTS": key_concepts,
                "TERMINOLOGIES": {},
                "MINDMAP_JSON": self._generate_mindmap_from_gemini_outputs(root_topic, key_concepts), # Updated to use Gemini outputs
                "REACT_FLOWCHART": self._generate_flowchart_from_gemini_outputs(root_topic), # Updated to use Gemini outputs
                "visual_insights": ["Visual analysis primarily based on transcript content summarized by Gemini"],
                "timestamp_highlights": timestamp_highlights
            }
            logger.info(f"Successfully generated structured summary using Gemini for video_id: {video_id}")
            return result
        except Exception as e:
            logger.error(f"Error structuring final Gemini summary for video_id {video_id}: {e}", exc_info=True)
            return self._generate_fallback_response()

    async def _generate_learning_objectives_with_gemini(self, summary_text: str) -> List[str]:
        if not self.is_ready() or not summary_text or summary_text.startswith("Error:"):
            return ["Understand key concepts from the video content"]
        try:
            prompt = f"Based on the following video summary, generate 3-4 specific learning objectives that start with action verbs (e.g., Learn, Understand, Apply). Video Summary: {summary_text[:1000]}"
            response = await self.gemini_model.generate_content_async(prompt)
            objectives_text = response.text.strip()
            objectives = []
            for line in objectives_text.split('\n'):
                clean_line = line.lstrip('-•').lstrip('0123456789.').strip()
                if len(clean_line) > 10:
                    objectives.append(clean_line)
            return objectives[:4] if objectives else ["Understand main concepts", "Apply knowledge"]
        except Exception as e:
            logger.error(f"Error generating learning objectives with Gemini: {e}")
            return ["Review video for learning objectives"]

    async def _extract_key_concepts_with_gemini(self, summary_text: str) -> List[str]:
        if not self.is_ready() or not summary_text or summary_text.startswith("Error:"):
            return ["Core video themes"]
        try:
            prompt = f"From the following video summary, extract 4-5 key concepts or main topics as concise phrases. Video Summary: {summary_text[:1000]}"
            response = await self.gemini_model.generate_content_async(prompt)
            concepts_text = response.text.strip()
            concepts = []
            for line in concepts_text.split('\n'):
                clean_line = line.lstrip('-•').lstrip('0123456789.').strip()
                if clean_line and len(clean_line) > 3:
                    concepts.append(clean_line)
            return concepts[:5] if concepts else ["Main ideas", "Key discussions"]
        except Exception as e:
            logger.error(f"Error extracting key concepts with Gemini: {e}")
            return ["Central video topics"]

    async def _extract_root_topic_with_gemini(self, summary_text: str) -> str:
        if not self.is_ready() or not summary_text or summary_text.startswith("Error:"):
            return "Video Content Analysis"
        try:
            prompt = f"Identify the main overarching topic of this video summary in 2-5 words. Video Summary: {summary_text[:500]}"
            response = await self.gemini_model.generate_content_async(prompt)
            topic = response.text.strip()
            return topic if topic and len(topic) < 70 else "Educational Video Overview"
        except Exception as e:
            logger.error(f"Error extracting root topic with Gemini: {e}")
            return "General Video Analysis"

    def _generate_mindmap_from_gemini_outputs(self, root_topic: str, key_concepts: List[str]) -> Dict[str, Any]:
            return {
            "title": root_topic,
                "children": [
                {"title": "Key Concepts", "children": [{"title": concept, "children": []} for concept in key_concepts[:3]]},
                {"title": "Further Exploration", "children": [{"title": "Implications", "children": []}, {"title": "Applications", "children": []}]}
            ]
        }

    def _generate_flowchart_from_gemini_outputs(self, root_topic: str) -> Dict[str, Any]:
            return {
            "title": f"{root_topic} - Conceptual Flow",
                "nodes": [
                {"id": "concept1", "label": root_topic or "Core Idea"},
                {"id": "theme1", "label": "Key Theme 1"},
                {"id": "theme2", "label": "Key Theme 2"},
                {"id": "conclusion", "label": "Overall Insight"}
                ],
                "edges": [
                {"from": "concept1", "to": "theme1"}, {"from": "concept1", "to": "theme2"}, 
                {"from": "theme1", "to": "conclusion"}, {"from": "theme2", "to": "conclusion"}
            ]
        }
            
    def _get_default_highlights(self) -> List[Dict[str, Any]]:
        """Provides a default set of highlights if all other methods fail."""
        return [
            {"timestamp": 30, "description": "Introduction and overview", "importance_score": 0.8, "segment_type": "generic_highlight"},
            {"timestamp": 120, "description": "Main content discussion", "importance_score": 0.9, "segment_type": "generic_highlight"},
            {"timestamp": 300, "description": "Key points and examples", "importance_score": 0.7, "segment_type": "generic_highlight"}
        ]

    def _generate_timestamp_highlights_simple(self, segments: List[Dict]) -> List[Dict[str, Any]]:
        """Generates simple timestamp highlights from the first few transcript segments."""
        highlights = []
        if not segments:
            return []
            
        for i, segment in enumerate(segments[:5]): 
            if segment.get("text") and len(segment["text"].strip()) > 10:
                highlights.append({
                    "timestamp": int(segment.get("start", 0)),
                    "description": segment["text"][:100] + "..." if len(segment["text"]) > 100 else segment["text"],
                    "importance_score": 0.9 - (i * 0.15), # Simple decaying importance
                    "segment_type": "transcript_segment"
                })
        return highlights

    async def _generate_timestamp_highlights_with_gemini(self, segments: List[Dict]) -> List[Dict[str, Any]]:
        """Generates timestamp highlights using Gemini by analyzing transcript segments."""
        if not self.is_ready() or not segments:
            logger.warning("Gemini not ready or no segments provided for highlight generation.")
            return []

        try:
            # Prepare transcript with timestamps for the prompt
            # Example format: "[0s] First sentence. [5s] Second sentence..."
            transcript_for_prompt = "".join(
                f"[{int(seg.get('start', 0))}s] {seg.get('text', '')} " for seg in segments if seg.get('text')
            ).strip()

            if not transcript_for_prompt:
                logger.warning("Transcript for prompt is empty after processing segments.")
                return []

            # Limit prompt length to avoid exceeding token limits (approx first 15000 chars)
            max_prompt_transcript_length = 15000
            if len(transcript_for_prompt) > max_prompt_transcript_length:
                transcript_for_prompt = transcript_for_prompt[:max_prompt_transcript_length] + "... (transcript truncated)"
            
            prompt = f"""Analyze the following video transcript, which includes timestamps in seconds (e.g., [123s]).
Identify 3 to 5 key learning moments or impactful statements.
For each moment, provide:
1. The exact timestamp in seconds (as an integer).
2. A concise description (10-20 words) summarizing that moment.

Return your answer ONLY as a valid JSON array of objects. Each object should have 'timestamp' and 'description' keys.
Example:
[
  {{"timestamp": 45, "description": "Explains the core concept of X."}},
  {{"timestamp": 122, "description": "Demonstrates how to apply Y method."}},
  {{"timestamp": 310, "description": "Highlights a critical warning about Z."}}
]

Transcript:
{transcript_for_prompt}

JSON Output:
"""
            logger.info(f"Attempting to generate timestamp highlights with Gemini. Transcript length for prompt: {len(transcript_for_prompt)}")
            response = await self.gemini_model.generate_content_async(prompt)
            
            generated_text = response.text.strip()
            
            # Clean potential markdown ```json ... ```
            if generated_text.startswith("```json"):
                generated_text = generated_text[7:]
            if generated_text.endswith("```"):
                generated_text = generated_text[:-3]
            generated_text = generated_text.strip()

            if not generated_text:
                logger.warning("Gemini returned empty text for timestamp highlights.")
                return []

            logger.debug(f"Raw Gemini output for highlights: {generated_text}")
            
            parsed_highlights = json.loads(generated_text)
            
            gemini_highlights = []
            if isinstance(parsed_highlights, list):
                for item in parsed_highlights:
                    if isinstance(item, dict) and 'timestamp' in item and 'description' in item:
                        try:
                            ts = int(item['timestamp'])
                            desc = str(item['description']).strip()
                            if desc: # Ensure description is not empty
                                gemini_highlights.append({
                                    "timestamp": ts,
                                    "description": desc,
                                    "importance_score": 0.85, # Default score for Gemini highlights
                                    "segment_type": "gemini_highlight"
                                })
                        except (ValueError, TypeError) as e:
                            logger.warning(f"Skipping invalid highlight item from Gemini: {item}. Error: {e}")
            
            if gemini_highlights:
                logger.info(f"Successfully generated {len(gemini_highlights)} highlights using Gemini.")
                return gemini_highlights[:5] # Limit to max 5 highlights
            else:
                logger.warning("Gemini highlights parsing resulted in an empty list or invalid format.")
                return []

        except json.JSONDecodeError as e:
            logger.error(f"JSONDecodeError parsing Gemini response for highlights: {e}. Response text: '{generated_text}'")
            return []
        except Exception as e:
            logger.error(f"Error generating timestamp highlights with Gemini: {e}", exc_info=True)
            return []

    def _generate_fallback_response(self) -> Dict[str, Any]:
        return {
            "SUMMARY": "Video content analysis completed. Unable to generate detailed summary due to processing limitations or API issues.",
            "ROOT_TOPIC": "Content Analysis Fallback",
            "LEARNING_OBJECTIVES": ["Review video content directly"],
            "KEY_CONCEPTS": ["Content unavailable for summarization"],
            "TERMINOLOGIES": {},
            "MINDMAP_JSON": {"title": "Analysis Fallback", "children": []},
            "REACT_FLOWCHART": {"title": "Processing Fallback", "nodes": [], "edges": []},
            "visual_insights": ["Processing completed with fallback due to limitations"],
            "timestamp_highlights": self._get_default_highlights() # Use default here
        }

    async def answer_from_transcript(self, transcript_text: str, user_question: str) -> str:
        """Answers a user's question based solely on the provided transcript text using Gemini."""
        if not self.is_ready():
            logger.error("Gemini model not ready for transcript-based QA.")
            return "Error: QA model (Gemini) not ready."
        
        if not transcript_text.strip():
            logger.warning("Cannot answer from transcript: Provided transcript text is empty.")
            return "Error: Transcript text is empty, cannot answer question."
        
        if not user_question.strip():
            logger.warning("Cannot answer from transcript: User question is empty.")
            return "Error: User question is empty."

        try:
            logger.info(f"Attempting to answer question: '{user_question}' using provided transcript (first 100 chars: '{transcript_text[:100]}...')")
            
            prompt = f"""You are an AI assistant. Your task is to answer the user's question based ONLY on the provided video transcript. 
Do not use any external knowledge or information outside of this transcript. 
If the answer cannot be found in the transcript, clearly state that the information is not available in the provided text.

Video Transcript:
--- BEGIN TRANSCRIPT ---
{transcript_text}
--- END TRANSCRIPT ---

User's Question: {user_question}

Answer (based ONLY on the transcript):
"""
            
            # Using a slightly different generation config for QA might be beneficial, but start with default/similar.
            generation_config = genai.types.GenerationConfig(
                temperature=0.5 # Slightly lower temperature for more factual QA
            )

            response = await self.gemini_model.generate_content_async(prompt, generation_config=generation_config)
            
            answer = response.text.strip()
            
            if not answer:
                 logger.warning("Gemini QA produced an empty answer.")
                 return "I could not generate an answer based on the transcript."
            
            logger.info(f"Generated QA answer: {answer[:150]}...")
            return answer
            
        except Exception as e:
            logger.error(f"Error during Gemini transcript-based QA: {e}", exc_info=True)
            return f"Error: Could not answer question from transcript. Details: {e}"

# Alias for backward compatibility - main.py uses MultiModalSummarizer
MultiModalSummarizer = TranscriptSummarizer

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
    logger.info("TranscriptSummarizer (Gemini Version) script started.")
    
    summarizer = TranscriptSummarizer()
    
    if summarizer.is_ready():
        default_test_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 

        try:
            user_url_input = input(f"Enter a YouTube video URL for QA & Summary (or press Enter to use default '{default_test_video_url}'): ")
            video_to_summarize_and_qa = user_url_input.strip() if user_url_input.strip() else default_test_video_url
        except KeyboardInterrupt:
            logger.info("User cancelled input. Exiting.")
            exit()

        logger.info(f"Processing video for QA & Summary: {video_to_summarize_and_qa}")
        
        async def main_test_flow():
            # 1. Simulate fetching transcript (as VideoProcessor or summarizer.summarize_video would do)
            transcript_text_for_qa = ""
            segments_for_qa = []
            video_id_for_qa = "test_video_id_qa"
            try:
                video_id_for_qa = get_video_id(video_to_summarize_and_qa)
                transcript_list_qa = YouTubeTranscriptApi.get_transcript(video_id_for_qa)
                transcript_text_for_qa = " ".join([entry['text'] for entry in transcript_list_qa])
                segments_for_qa = transcript_list_qa
                logger.info(f"Successfully fetched transcript for QA for video ID: {video_id_for_qa} ({len(transcript_text_for_qa)} chars)")
                if not transcript_text_for_qa.strip():
                    logger.error("Fetched transcript for QA is empty. QA test will likely fail or use limited context.")
                    transcript_text_for_qa = "No transcript could be fetched for this video."
            except Exception as e:
                logger.error(f"Failed to fetch transcript for QA for {video_to_summarize_and_qa}: {e}", exc_info=True)
                transcript_text_for_qa = f"Error fetching transcript: {e}. Cannot perform QA."

            # 2. Test QA functionality if transcript is usable
            if not transcript_text_for_qa.startswith("Error") and len(transcript_text_for_qa) > 50:
                user_questions = [
                    "What is the main topic of this video?",
                    "What are three key points mentioned?",
                    "Does this video talk about space travel?"
                ]
                for question in user_questions:
                    print(f"\n--- Answering Question: '{question}' --- (Based on fetched transcript)")
                    answer = await summarizer.answer_from_transcript(transcript_text_for_qa, question)
                    print(f"Q: {question}\nA: {answer}")
                    print("--------------------------------------------")
            else:
                print(f"\n--- QA SKIPPED due to transcript issue: {transcript_text_for_qa} ---")

            # 3. Test the generate_multimodal_summary flow (which also uses Gemini now)
            # This part is similar to the previous test, ensuring it still works
            mock_transcript_data = {"full_text": transcript_text_for_qa, "segments": segments_for_qa, "url": video_to_summarize_and_qa}
            mock_visual_data = {}

            structured_summary_result = await summarizer.generate_multimodal_summary(
                mock_transcript_data, 
                mock_visual_data, 
                video_id_for_qa
            )
            print("\n--- Structured Summary (using generate_multimodal_summary with Gemini) ---")
            print(f"Root Topic: {structured_summary_result.get('ROOT_TOPIC')}")
            print(f"Overall Summary: {structured_summary_result.get('SUMMARY')}")
            print("--- Learning Objectives ---")
            for obj in structured_summary_result.get("LEARNING_OBJECTIVES", []):
                print(f"- {obj}")
            print("--- Key Concepts ---")
            for concept in structured_summary_result.get("KEY_CONCEPTS", []):
                print(f"- {concept}")
            print("---------------------------------------------------------------------\n")

        asyncio.run(main_test_flow())
            
    else:
        logger.error("Summarizer (Gemini) could not be initialized. Check GEMINI_API_KEY and logs. Exiting.")
    logger.info("TranscriptSummarizer (Gemini Version) script finished.")

# Notes:
# 1. GEMINI_API_KEY must be set as an environment variable.
# 2. Ensure `pip install google-generativeai` has been run.
# 3. The prompts for sub-tasks (objectives, concepts) are basic; they can be further refined.
# 4. Error handling for Gemini API calls can be more granular (e.g., specific error codes).
# 5. Consider API rate limits if processing many videos rapidly.
#
# Notes on potential improvements:
# 1. Advanced Punctuation: For better transcript quality before summarization,
#    consider using a library like `deepmultilingualpunctuation`:
#    `# from deepmultilingualpunctuation import PunctuationModel`
#    `# punc_model = PunctuationModel()`
#    `# transcript_punctuated = punc_model.restore_punctuation(transcript_text)`
#    This requires installing the library: `pip install deepmultilingualpunctuation torch`
#
# 2. Chunking for Very Long Transcripts: FLAN-T5 has a token limit (e.g., 512 or 1024 for the prompt).
#    For very long videos, the transcript might exceed this. A strategy would be to:
#    a. Split the transcript into manageable chunks.
#    b. Summarize each chunk.
#    c. Combine the chunk summaries and then summarize them again (recursive summarization) or use a map-reduce style approach.
#
# 3. More Sophisticated Summarization Prompt: Experiment with the prompt for better results,
#    e.g., asking for a summary of a certain length, or focusing on key takeaways.
#    `prompt = f"Provide a concise summary of the key points in the following video transcript: {transcript_punctuated}"`
#
# 4. Asynchronous Operations: For use in a web server or application, consider making
#    the `summarize_video` method asynchronous (`async def`) and running the blocking
#    operations (API calls, model inference) in an executor (e.g., `asyncio.to_thread` in Python 3.9+).
#
# 5. Batching (if summarizing multiple videos): The tokenizer and model can handle batches
#    which is more efficient than one-by-one processing if you have many URLs. 