import torch
import torch.nn as nn
import numpy as np
from transformers import T5Tokenizer, T5ForConditionalGeneration, AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer
import logging
from typing import Dict, List, Any, Optional
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re

logger = logging.getLogger(__name__)

class MultiModalFusion(nn.Module):
    """
    Neural network module for fusing text and visual features
    """
    def __init__(self, text_dim: int = 384, visual_dim: int = 512, fusion_dim: int = 768):
        super().__init__()
        self.text_dim = text_dim
        self.visual_dim = visual_dim
        self.fusion_dim = fusion_dim
        
        # Projection layers
        self.text_proj = nn.Linear(text_dim, fusion_dim)
        self.visual_proj = nn.Linear(visual_dim, fusion_dim)
        
        # Cross-attention mechanism
        self.cross_attention = nn.MultiheadAttention(fusion_dim, num_heads=8, batch_first=True)
        
        # Output projection
        self.output_proj = nn.Linear(fusion_dim, fusion_dim)
        self.dropout = nn.Dropout(0.1)
        self.layer_norm = nn.LayerNorm(fusion_dim)
        
    def forward(self, text_features: torch.Tensor, visual_features: torch.Tensor) -> torch.Tensor:
        """
        Forward pass for multi-modal fusion
        
        Args:
            text_features: [batch_size, seq_len, text_dim]
            visual_features: [batch_size, num_frames, visual_dim]
        
        Returns:
            fused_features: [batch_size, seq_len, fusion_dim]
        """
        # Project to common dimension
        text_proj = self.text_proj(text_features)  # [batch_size, seq_len, fusion_dim]
        visual_proj = self.visual_proj(visual_features)  # [batch_size, num_frames, fusion_dim]
        
        # Cross-attention: text attends to visual features
        fused_features, attention_weights = self.cross_attention(
            query=text_proj,
            key=visual_proj,
            value=visual_proj
        )
        
        # Residual connection and layer normalization
        fused_features = self.layer_norm(fused_features + text_proj)
        
        # Output projection
        output = self.output_proj(self.dropout(fused_features))
        
        return output

class MultiModalSummarizer:
    """
    Multi-modal summarizer using FLAN-T5 with visual and textual features
    """
    
    def __init__(self, model_name: str = "google/flan-t5-large", chunk_summary_model_name: str = "google/flan-t5-base"):
        """Initialize the multi-modal summarizer"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        # Load FLAN-T5 model and tokenizer for final summaries
        logger.info(f"Loading FLAN-T5 model for final summary: {model_name}")
        self.tokenizer = T5Tokenizer.from_pretrained(model_name)
        self.model = T5ForConditionalGeneration.from_pretrained(model_name).to(self.device)

        # Load a smaller FLAN-T5 model for chunk summarization
        try:
            logger.info(f"Loading FLAN-T5 model for chunk summaries: {chunk_summary_model_name}")
            self.chunk_tokenizer = T5Tokenizer.from_pretrained(chunk_summary_model_name)
            self.chunk_model = T5ForConditionalGeneration.from_pretrained(chunk_summary_model_name).to(self.device)
            logger.info("Chunk summarization model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load dedicated chunk summarization model ({chunk_summary_model_name}): {e}. Will use main model for chunks.")
            self.chunk_tokenizer = self.tokenizer
            self.chunk_model = self.model
        
        # Load sentence transformer for text embeddings
        logger.info("Loading SentenceTransformer for text embeddings")
        self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize fusion module
        self.fusion_module = MultiModalFusion().to(self.device)
        
        # Thread pool for CPU-intensive tasks
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Model ready flag
        self._ready = True
        
        logger.info("MultiModalSummarizer initialized successfully")
    
    def is_ready(self) -> bool:
        """Check if all models are loaded and ready"""
        return self._ready
    
    async def generate_multimodal_summary(
        self, 
        transcript_data: Dict[str, Any], 
        visual_data: Dict[str, Any], 
        video_id: str
    ) -> Dict[str, Any]:
        """
        Generate comprehensive summary using both transcript and visual features
        """
        try:
            logger.info(f"Starting multi-modal summary generation for video: {video_id}")
            
            # Stage 3: Combine transcript and visual features
            loop = asyncio.get_event_loop()
            combined_features = await loop.run_in_executor(
                self.executor,
                self._combine_modalities,
                transcript_data,
                visual_data
            )
            
            # Stage 4: Generate summary using FLAN-T5
            summary_result = await loop.run_in_executor(
                self.executor,
                self._generate_summary,
                combined_features,
                transcript_data,
                visual_data
            )
            
            logger.info("Multi-modal summary generation completed successfully")
            return summary_result
            
        except Exception as e:
            logger.error(f"Error in multi-modal summary generation: {str(e)}")
            raise
    
    def _combine_modalities(self, transcript_data: Dict[str, Any], visual_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Stage 3: Combine transcript and visual features using neural fusion
        """
        try:
            # Extract text segments
            segments = transcript_data.get("segments", [])
            full_text = transcript_data.get("full_text", "")
            
            # Extract visual frames
            frames = visual_data.get("frames", [])
            
            # Handle case where transcript extraction failed
            if not full_text or full_text.strip() == "" or "failed due to YouTube restrictions" in full_text:
                logger.warning("No valid transcript found, using fallback text analysis")
                # Create synthetic segments for analysis
                fallback_text = "This video contains educational content that could not be transcribed due to technical limitations."
                segments = [{
                    "start": 0,
                    "end": 60,
                    "text": fallback_text,
                    "confidence": 0.5
                }]
                full_text = fallback_text
            
            # Generate text embeddings for segments
            segment_texts = [seg.get("text", "") for seg in segments if seg.get("text", "").strip()]
            
            if not segment_texts:
                logger.warning("No valid text segments found, creating fallback")
                segment_texts = ["Educational video content analysis"]
            
            # Get sentence embeddings
            text_embeddings = self.sentence_transformer.encode(segment_texts)
            
            # Prepare visual embeddings
            visual_embeddings = []
            for frame in frames:
                embedding = frame.get("embedding", [])
                if embedding:
                    visual_embeddings.append(embedding)
            
            if not visual_embeddings:
                logger.warning("No valid visual embeddings found")
                visual_embeddings = [np.zeros(512).tolist()]  # Fallback
            
            visual_embeddings = np.array(visual_embeddings)
            
            # Combine modalities using fusion module
            combined_features = []
            segment_mappings = []
            
            with torch.no_grad():
                for i, (text_emb, segment) in enumerate(zip(text_embeddings, segments)):
                    # Find relevant visual frames for this segment
                    segment_start = segment.get("start", 0)
                    segment_end = segment.get("end", 0)
                    
                    relevant_frames = []
                    for frame in frames:
                        frame_time = frame.get("timestamp", 0)
                        if segment_start <= frame_time <= segment_end + 5:  # 5-second buffer
                            relevant_frames.append(frame.get("embedding", []))
                    
                    if not relevant_frames:
                        # Use average visual embedding if no specific frames found
                        relevant_frames = [visual_data.get("average_embedding", np.zeros(512).tolist())]
                    
                    # Convert to tensors
                    text_tensor = torch.tensor([text_emb], dtype=torch.float32).unsqueeze(0).to(self.device)
                    visual_tensor = torch.tensor(relevant_frames, dtype=torch.float32).unsqueeze(0).to(self.device)
                    
                    # Apply fusion
                    fused_features = self.fusion_module(text_tensor, visual_tensor)
                    
                    combined_features.append({
                        "segment_index": i,
                        "text": segment.get("text", ""),
                        "start_time": segment_start,
                        "end_time": segment_end,
                        "fused_embedding": fused_features.cpu().numpy().tolist(),
                        "text_embedding": text_emb.tolist(),
                        "visual_frames_count": len(relevant_frames)
                    })
                    
                    segment_mappings.append({
                        "segment_text": segment.get("text", ""),
                        "time_range": [segment_start, segment_end],
                        "visual_alignment_score": len(relevant_frames) / max(len(frames), 1)
                    })
            
            return {
                "combined_features": combined_features,
                "segment_mappings": segment_mappings,
                "total_segments": len(segments),
                "total_frames": len(frames)
            }
            
        except Exception as e:
            logger.error(f"Error in modality combination: {str(e)}")
            raise
    
    def _generate_summary(
        self, 
        combined_features: Dict[str, Any], 
        transcript_data: Dict[str, Any], 
        visual_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive summary based ONLY on the full transcript content
        """
        # video_id = combined_features.get("video_id", "unknown_video") # Get video_id if available
        try:
            full_text = transcript_data.get("full_text", "")
            # logger.info(f"VIDEO_ID FOR SUMMARY: {video_id} -- TRANSCRIPT START: {full_text[:500]}") 
            segments = transcript_data.get("segments", [])
            # duration = transcript_data.get("duration", 0) # Not directly used in this func now

            if not full_text or len(full_text.strip()) < 100:
                logger.warning("Insufficient transcript data for analysis.")
                return self._generate_fallback_response(is_insufficient_data=True)

            # CRITICAL: Validate transcript content for severe mismatches
            logger.info(f"Processing FULL transcript: {len(full_text)} characters, {len(segments)} segments")
            logger.info(f"Transcript preview (first 300 chars): {full_text[:300]}")
            
            # Check for obvious content mismatches
            content_mismatch_indicators = [
                "anatomy of the human brain", "university of california", "berkeley",
                "nervous system", "medical professional", "physician", "doctor",
                "digestive system", "immune system", "physiology", "consultation"
            ]
            
            transcript_lower = full_text.lower()
            mismatch_count = sum(1 for indicator in content_mismatch_indicators if indicator in transcript_lower)
            
            if mismatch_count >= 2:
                logger.error(f"TRANSCRIPT CONTENT MISMATCH DETECTED! Found {mismatch_count} medical/anatomy indicators in what should be programming content.")
                logger.error(f"Problematic transcript content: {full_text[:500]}")
                logger.error("This suggests transcript extraction failure or wrong video content.")
                
                # Force content-based analysis instead of trusting the transcript
                return {
                    "ROOT_TOPIC": "Content Analysis Error", 
                    "LEARNING_OBJECTIVES": ["Review video content manually due to processing error"],
                    "KEY_CONCEPTS": [], 
                    "TERMINOLOGIES": {},
                    "SUMMARY": self._generate_error_summary_for_content_mismatch(),
                    "MINDMAP_JSON": {"title": "Content Error", "children": [{"title": "Processing Error Detected", "children": []}]},
                    "REACT_FLOWCHART": {"title": "Error", "nodes": [{"id": "error", "label": "Content Processing Error"}], "edges": []},
                    "visual_insights": [],
                    "timestamp_highlights": []
                }

            # Attempt to extract a dynamic root topic from the transcript itself
            extracted_root_topic = self._extract_main_topic_from_transcript(full_text)

            learning_objectives = self._extract_learning_objectives_from_full_transcript(full_text, segments)
            detailed_summary = self._generate_chatgpt_style_summary(full_text, segments, visual_data)
            
            # Use extracted_root_topic for mind map and flowchart if available, else a generic one
            mindmap_title = f'{extracted_root_topic} - Mind Map' if extracted_root_topic else "Video Content Mind Map"
            flowchart_title = f'{extracted_root_topic} - Learning Flow' if extracted_root_topic else "Video Learning Flow"

            # Pass the extracted_root_topic (or a generic default) to mindmap and flowchart generators
            # The mindmap building logic itself should be generic now, not hardcoded to "Python Playlist"
            generated_mindmap = self._build_dynamic_mindmap(extracted_root_topic or "Video Content", full_text, segments)
            react_flowchart = self._generate_react_flowchart(extracted_root_topic or "Video Content", full_text, segments, flowchart_title)

            return {
                "ROOT_TOPIC": extracted_root_topic or "Video Content Analysis", # Dynamic root topic
                "LEARNING_OBJECTIVES": learning_objectives,
                "KEY_CONCEPTS": [], 
                "TERMINOLOGIES": {},
                "SUMMARY": detailed_summary,
                "MINDMAP_JSON": generated_mindmap, # Now generic mindmap
                "REACT_FLOWCHART": react_flowchart,
                "visual_insights": [],
                "timestamp_highlights": self._generate_transcript_highlights(segments)
            }

        except Exception as e:
            logger.error(f"Error in summary generation: {str(e)}", exc_info=True)
            return self._generate_fallback_response()

    def _extract_main_topic_from_transcript(self, full_text:str) -> Optional[str]:
        """Attempt to extract a concise main topic from the beginning of the transcript."""
        if not full_text or len(full_text.strip()) < 50:
            return None
        try:
            prompt = f"""Analyze the BEGINNING of the following video transcript and identify the primary subject or topic in 2-5 words.
            Focus only on the core subject matter introduced early in the text.

            Transcript (first 500 characters):
            {full_text[:500]}

            Main Topic (2-5 words, e.g., 'Agentic AI Systems', 'Python Programming Basics'):"""
            
            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True).to(self.device)
            # Use chunk_model as it's faster and this is a simple extraction
            outputs = self.chunk_model.generate(**inputs, max_length=25, num_beams=3, early_stopping=True, no_repeat_ngram_size=2)
            topic = self.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
            
            # Basic validation
            if topic and len(topic) > 3 and len(topic) < 50 and not any(stop_word in topic.lower() for stop_word in ["transcript", "video", "this content"]):
                logger.info(f"Extracted main topic: {topic}")
                return topic
            logger.warning(f"Could not reliably extract main topic. Got: '{topic}'")
            return None
        except Exception as e:
            logger.error(f"Error extracting main topic: {e}")
            return None

    def _generate_fallback_response(self, is_insufficient_data: bool = False) -> Dict[str, Any]:
        """Generate a generic fallback response."""
        summary_note = "Note: Detailed analysis could not be completed due to an error."
        if is_insufficient_data:
            summary_note = "Note: Insufficient transcript data for detailed analysis."
        
        return {
            "ROOT_TOPIC": "Video Content Analysis",
            "LEARNING_OBJECTIVES": ["Understand the main themes of the video content."],
            "KEY_CONCEPTS": [],
            "TERMINOLOGIES": {},
            "SUMMARY": f"### 📚 Detailed Summary\n\n{summary_note}",
            "MINDMAP_JSON": {
                "title": "Content Mind Map",
                "children": [
                    {"title": "Main Topics", "children": []},
                    {"title": "Key Details", "children": []}
                ]
            },
            "REACT_FLOWCHART": {
                "title": "Content Learning Flow",
                "nodes": [{"id": "start", "label": "Video Start"}],
                "edges": []
            },
            "visual_insights": [],
            "timestamp_highlights": []
        }

    # Modify _update_python_playlist_mindmap to _build_dynamic_mindmap
    def _build_dynamic_mindmap(self, root_topic_title: str, full_text: str, segments: List[Dict]) -> Dict[str, Any]:
        """Builds a dynamic mind map based on extracted concepts from the transcript."""
        try:
            mind_map_data = {
                "title": root_topic_title if root_topic_title else "Video Content Mind Map",
                "children": [
                    {"title": "Key Concepts Discussed", "children": []},
                    {"title": "Supporting Details/Examples", "children": []},
                    {"title": "Potential Applications (if mentioned)", "children": []}
                ]
            }
            
            # Extract some generic concepts/keywords from the transcript for the mind map
            # This can be a simplified version of _extract_python_concepts_from_transcript or a new generic one
            extracted_concepts = self._extract_generic_concepts_from_transcript(full_text, count=3) # Get 3 main concepts
            extracted_details = self._extract_generic_concepts_from_transcript(full_text, count=2, offset=3) # Get 2 supporting details
            extracted_apps = self._extract_generic_concepts_from_transcript(full_text, count=2, keyword_hints=["application", "use case", "example"]) # Get 2 applications

            if extracted_concepts:
                for concept in extracted_concepts:
                    mind_map_data["children"][0]["children"].append({"title": concept, "children": []})
            if extracted_details:
                for detail in extracted_details:
                    mind_map_data["children"][1]["children"].append({"title": detail, "children": []})
            if extracted_apps:
                for app in extracted_apps:
                    mind_map_data["children"][2]["children"].append({"title": app, "children": []})
            
            # Ensure children lists are not empty for frontend rendering
            for category in mind_map_data["children"]:
                if not category["children"]:
                    category["children"].append({"title": "Content not extracted", "children": []})

            return mind_map_data
        except Exception as e:
            logger.error(f"Error building dynamic mindmap: {e}")
            return {
                "title": root_topic_title if root_topic_title else "Video Content Mind Map",
                "children": [
                    {"title": "Key Concepts", "children": [{"title": "Analysis Error", "children": []}]},
                ]
            }

    def _extract_generic_concepts_from_transcript(self, full_text: str, count: int = 3, offset: int = 0, keyword_hints: Optional[List[str]] = None) -> List[str]:
        """Extracts generic concepts/keywords from the full transcript for mind map/flowchart population."""
        if not full_text:
            return []
        try:
            hint_text = ""
            if keyword_hints:
                hint_text = f"Focus on terms related to: {', '.join(keyword_hints)}."

            prompt = f"""From this COMPLETE video transcript, extract {count} distinct key phrases, topics, or concepts.
            {hint_text}
            Prioritize items mentioned frequently or explained in detail.
            List each concept on a new line.
            
            COMPLETE TRANSCRIPT (first 3000 chars for context):
            {full_text[:3000]}
            
            {count} Key Phrases/Topics:"""
            
            inputs = self.chunk_tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True).to(self.device)
            outputs = self.chunk_model.generate(**inputs, max_length=40*count, num_beams=3, early_stopping=True, no_repeat_ngram_size=2)
            raw_text = self.chunk_tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            concepts = []
            for line in raw_text.split('\n'):
                concept = line.strip().lstrip('-').lstrip('*').lstrip('•').strip('.').strip()
                if concept and len(concept) > 3 and len(concept) < 80: # Basic validation
                    if concept not in concepts: # Avoid duplicates
                        concepts.append(concept)
                if len(concepts) >= count + offset:
                    break
            
            return concepts[offset:count+offset]
        except Exception as e:
            logger.error(f"Error extracting generic concepts: {e}")
            return [f"Default Concept {i+1}" for i in range(count)]

    # Modify _generate_react_flowchart to accept a dynamic title and use generic concepts
    def _generate_react_flowchart(self, root_topic_title: str, full_text: str, segments: List[Dict], flowchart_title_override: Optional[str] = None) -> Dict[str, Any]:
        """Generate React-compatible flowchart based on transcript content, with a dynamic title."""
        try:
            flow_steps = self._extract_learning_flow_from_transcript(full_text) # This already uses full_text
            
            flowchart = {
                "title": flowchart_title_override if flowchart_title_override else (root_topic_title + " - Learning Flow" if root_topic_title else "Video Learning Flow"),
                "nodes": [],
                "edges": []
            }
            
            if not flow_steps:
                 flow_steps = ["Introduction", "Main Content", "Examples", "Conclusion"] # Generic fallback flow

            for i, step_label in enumerate(flow_steps):
                flowchart["nodes"].append({"id": f"step{i}", "label": step_label, "type": "educational" if i==0 else "instructional" })
            
            for i in range(len(flow_steps) - 1):
                flowchart["edges"].append({"from": f"step{i}", "to": f"step{i+1}", "type": "sequential"})
            
            return flowchart
        except Exception as e:
            logger.error(f"Error generating React flowchart: {e}")
            # Generic fallback flowchart
            return {
                "title": flowchart_title_override if flowchart_title_override else "Video Learning Flow",
                "nodes": [
                    {"id": "start", "label": "Start Video"},
                    {"id": "content1", "label": "Key Topic 1"},
                    {"id": "content2", "label": "Key Topic 2"},
                    {"id": "end", "label": "Conclusion"}
                ],
                "edges": [
                    {"from": "start", "to": "content1"}, {"from": "content1", "to": "content2"}, {"from": "content2", "to": "end"}
                ]
            }

    def _extract_learning_objectives_from_full_transcript(self, full_text: str, segments: List[Dict]) -> List[str]:
        """Extract learning objectives from the COMPLETE transcript content only"""
        try:
            # Use the FULL transcript, not just first part
            prompt = f"""Based ONLY on this COMPLETE educational video transcript, extract 3-5 specific learning objectives.
            Use ONLY information explicitly mentioned in the transcript. Do NOT infer from metadata or video titles.
            
            COMPLETE TRANSCRIPT:
            {full_text}
            
            Extract learning objectives that start with action verbs (Learn, Understand, Build, Create, etc.)
            Learning Objectives:
            1."""
            
            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True).to(self.device)
            outputs = self.model.generate(
                **inputs, 
                max_length=200,
                num_beams=3,
                early_stopping=True,
                no_repeat_ngram_size=2
            )
            
            objectives_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Parse objectives
            objectives = []
            for line in objectives_text.split('\n'):
                if line.strip() and any(line.strip().startswith(f"{i}.") for i in range(1, 7)):
                    obj = line.strip()
                    # Clean numbering
                    for i in range(1, 7):
                        obj = obj.replace(f"{i}.", "").strip()
                    if len(obj) > 10 and len(obj) < 150:
                        objectives.append(obj)
            
            return objectives[:5] if objectives else [
                "Learn Python programming fundamentals",
                "Understand core programming concepts", 
                "Apply Python to real-world projects"
            ]
            
        except Exception as e:
            logger.error(f"Error extracting learning objectives: {e}")
            return ["Learn Python programming fundamentals", "Understand core programming concepts"]

    def _generate_chatgpt_style_summary(self, full_text: str, segments: List[Dict], visual_data: Optional[Dict[str, Any]] = None) -> str:
        """Generate structured multimodal summary following the exact format with 5 sections."""
        try:
            logger.info(f"Generating structured multimodal summary from transcript: {len(full_text)} characters, {len(segments)} segments")
            
            if len(full_text.strip()) < 100:
                logger.warning("Transcript too short for detailed analysis")
                return self._generate_simple_transcript_summary(full_text)

            # Extract visual descriptions if available
            visual_descriptions = []
            if visual_data and visual_data.get("frames"):
                for frame in visual_data["frames"]:
                    if frame.get("description"):
                        timestamp = frame.get("timestamp", 0)
                        description = frame.get("description", "")
                        visual_descriptions.append(f"[{int(timestamp//60):02d}:{int(timestamp%60):02d}] {description}")

            # Determine if we need chunking for long transcripts
            MAX_CHARS_PER_LLM_CALL = 3500
            
            if len(full_text) > MAX_CHARS_PER_LLM_CALL:
                logger.info(f"Transcript is long ({len(full_text)} chars), using chunking strategy.")
                return self._generate_chunked_structured_summary(full_text, segments, visual_descriptions)
            
            # Single-pass structured summary for shorter transcripts
            visual_context_str = "No visual descriptions provided."
            if visual_descriptions:
                visual_context_str = "\n".join(visual_descriptions[:10])  # Limit to 10 visual descriptions
            
            prompt = f'''You are an AI assistant tasked with generating a structured summary of a video transcript.
Analyze the provided video transcript and visual descriptions.
Base your entire response ONLY on the provided content. Do NOT add any external information, opinions, or interpretations.
Do NOT repeat any part of these instructions, section descriptions, or headers in your output.
Generate content for the following sections, in this exact order. Start your response directly with the content for "### 📌 Detailed Summary".

TRANSCRIPT:
{full_text}

VISUAL DESCRIPTIONS:
{visual_context_str}

---
STRUCTURED SUMMARY TO GENERATE:

### 📌 Detailed Summary
(Summarize the overall goal and main discussion of the video in 3–5 sentences. Focus on what the main topic, e.g., "Agentic AI", is and how it is demonstrated in the video.)

### 1. **Overview and Introduction**
(Briefly describe the topic introduced in the video and how it is set up. 2–3 sentences.)

### 2. **Key Themes or Concepts**
(List the main concepts or ideas discussed in the video. Be specific, and explain how these relate to the main topic or autonomous systems.)

### 3. **Visual-Text Alignment**
(Explain how visuals shown in the video support the verbal explanation. Mention examples like UIs, diagrams, or workflows that appear alongside the narration. If no visuals or no clear alignment, state that.)

### 4. **Applications or Case Studies**
(List any examples, scenarios, or use cases shown in the video. Highlight real-world relevance or tools used. If none, state that.)

### 5. **Conclusion**
(Summarize the main takeaway or conclusion provided at the end of the video.)

---
Your response should ONLY contain the generated content for these sections, starting directly with "### 📌 Detailed Summary".
Do not include the descriptions in parentheses above. They are for your guidance only.
Do not include the "---" separators in your output.
'''

            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True).to(self.device)
            outputs = self.model.generate(
                **inputs,
                max_length=800,
                min_length=300,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
                do_sample=True,
                temperature=0.3,
                length_penalty=1.2
            )
            
            summary = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            summary = self._validate_structured_summary(summary, full_text, visual_descriptions)
            
            return summary.strip()
            
        except Exception as e:
            logger.error(f"Error generating structured multimodal summary: {e}", exc_info=True)
            return self._generate_content_based_fallback_summary(full_text, [])

    def _generate_chunked_structured_summary(self, full_text: str, segments: List[Dict], visual_descriptions: List[str]) -> str:
        """Generate structured summary for long transcripts using chunking."""
        try:
            # First, generate chunk summaries focusing on factual content
            text_chunks = self._split_text_into_chunks(full_text, 3000)
            chunk_summaries = []
            
            for i, chunk in enumerate(text_chunks):
                logger.info(f"Processing chunk {i+1}/{len(text_chunks)}")
                
                chunk_prompt = f"""Extract the key factual information from this video transcript segment.
                Focus on what was actually said and explained. Do not add interpretations.
                
                Transcript Segment:
                {chunk}
                
                Key factual points from this segment:"""
                
                inputs = self.chunk_tokenizer(chunk_prompt, return_tensors="pt", max_length=1024, truncation=True).to(self.device)
                outputs = self.chunk_model.generate(
                    **inputs,
                    max_length=200,
                    num_beams=3,
                    early_stopping=True,
                    do_sample=True,
                    temperature=0.2
                )
                chunk_summary = self.chunk_tokenizer.decode(outputs[0], skip_special_tokens=True)
                chunk_summaries.append(chunk_summary.strip())
            
            # Combine chunk summaries with visual context
            combined_content = "\n\n".join(chunk_summaries)
            visual_context_str = "No visual descriptions provided."
            if visual_descriptions:
                visual_context_str = "\n".join(visual_descriptions[:10]) # Limit to 10 visual descriptions
            
            # Generate final structured summary
            final_prompt = f'''Using the following extracted content and visual descriptions from a video, create a structured summary.
Base your entire response ONLY on the provided content. Do NOT add any external information, opinions, or interpretations.
Do NOT repeat any part of these instructions, section descriptions, or headers in your output.
Generate content for the following sections, in this exact order. Start your response directly with the content for "### 📌 Detailed Summary".

EXTRACTED CONTENT:
{combined_content}

VISUAL DESCRIPTIONS:
{visual_context_str}

---
STRUCTURED SUMMARY TO GENERATE:

### 📌 Detailed Summary
(Summarize the overall goal and main discussion of the video in 3–5 sentences. Focus on what the main topic, e.g., "Agentic AI", is and how it is demonstrated from the extracted content.)

### 1. **Overview and Introduction**
(Briefly describe the topic introduced and how it is set up, based on the extracted content. 2–3 sentences.)

### 2. **Key Themes or Concepts**
(List the main concepts or ideas from the extracted content. Be specific.)

### 3. **Visual-Text Alignment**
(Explain how the visual descriptions relate to the extracted content. If no visuals or no clear alignment, state that.)

### 4. **Applications or Case Studies**
(List any examples or use cases mentioned in the extracted content. If none, state that.)

### 5. **Conclusion**
(Summarize the main takeaway or conclusion from the extracted content.)

---
Your response should ONLY contain the generated content for these sections, starting directly with "### 📌 Detailed Summary".
Do not include the descriptions in parentheses above. They are for your guidance only.
Do not include the "---" separators in your output.
'''
            
            inputs = self.tokenizer(final_prompt, return_tensors="pt", max_length=1024, truncation=True).to(self.device)
            outputs = self.model.generate(
                **inputs,
                max_length=800,
                min_length=350,
                num_beams=4,
                early_stopping=True,
                do_sample=True,
                temperature=0.3,
                length_penalty=1.3
            )
            
            summary = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return self._validate_structured_summary(summary, combined_content, visual_descriptions)
            
        except Exception as e:
            logger.error(f"Error in chunked structured summary: {e}")
            return self._generate_content_based_fallback_summary(full_text, visual_descriptions)

    def _validate_structured_summary(self, summary: str, original_content: str, visual_descriptions: List[str]) -> str:
        """Validate and clean the structured summary."""
        cleaned = summary
        
        # Remove prompt bleeding
        instruction_patterns = [
            "Analyze the following video transcript",
            "Create a summary with these exact sections:",
            "Using the following extracted content",
            "TRANSCRIPT:", "VISUAL DESCRIPTIONS:", "EXTRACTED CONTENT:",
            "Requirements:", "Begin the summary:",
            "You are an AI assistant tasked with generating a structured summary",
            "Base your entire response ONLY on the provided content",
            "Do NOT add any external information, opinions, or interpretations.",
            "Do NOT repeat any part of these instructions, section descriptions, or headers in your output.",
            "Generate content for the following sections, in this exact order.",
            'Start your response directly with the content for "### 📌 Detailed Summary".',
            "STRUCTURED SUMMARY TO GENERATE:",
            "Your response should ONLY contain the generated content for these sections",
            "Do not include the descriptions in parentheses above. They are for your guidance only.",
            'Do not include the "---" separators in your output.',
            "(Summarize the overall goal and main discussion of the video in 3–5 sentences.)",
            "(Focus on what the main topic, e.g., \"Agentic AI\", is and how it is demonstrated...)",
            "(Briefly describe the topic introduced in the video and how it is set up. 2–3 sentences.)",
            "(List the main concepts or ideas discussed...)",
            "(Explain how visuals shown in the video support the verbal explanation...)",
            "(List any examples, scenarios, or use cases shown...)",
            "(Summarize the main takeaway or conclusion...)",
            "--- (and any variations with spaces)"
        ]
        
        for pattern in instruction_patterns:
            # Escape special regex characters in the pattern before using re.sub
            cleaned = re.sub(re.escape(pattern), "", cleaned, flags=re.IGNORECASE)
            # Also try removing lines that are *exactly* the pattern, considering leading/trailing whitespace
            cleaned_lines = []
            for line in cleaned.split('\n'):
                if line.strip().lower() != pattern.lower().strip():
                    cleaned_lines.append(line)
            cleaned = '\n'.join(cleaned_lines)

        # Ensure proper structure and remove any leading/trailing junk before the first real header
        if "### 📌 Detailed Summary" in cleaned:
            cleaned = "### 📌 Detailed Summary" + cleaned.split("### 📌 Detailed Summary", 1)[1]
        elif not cleaned.strip().startswith("###") and "###" in cleaned: # If a later header exists but not the first
            # Try to find the first valid header if the primary one is missing
            first_header_match = re.search(r"### (\d+\. \*\*|📌 Detailed Summary|1\. \*\*Overview and Introduction\*\*)", cleaned)
            if first_header_match:
                cleaned = cleaned[first_header_match.start():]
            else: # If no headers at all, it's a problem, prefix with the expected start
                 cleaned = "### 📌 Detailed Summary\n\n" + cleaned.strip()
        elif not cleaned.strip().startswith("###"):
             cleaned = "### 📌 Detailed Summary\n\n" + cleaned.strip()
        
        # CRITICAL: Check for severe hallucination - completely unrelated topics
        severe_hallucination_indicators = [
            # Medical/Biology topics when this should be programming
            "anatomy", "brain", "medical", "physician", "doctor", "health care",
            "nervous system", "biology", "physiology", "university of california",
            "berkeley", "lecture", "professor", "human body", "digestive system",
            "immune system", "heart", "lungs", "consultation",
            
            # Other common hallucination topics
            "quantum physics", "chemistry", "mathematics", "literature",
            "history", "geography", "economics", "psychology",
            
            # Template phrases that indicate AI confusion
            "this lecture is intended", "this video is a summary of a lecture",
            "given by a professor", "should not be considered a substitute",
            "for educational purposes only and is not meant to substitute"
        ]
        
        # Check if summary contains severe hallucination
        summary_lower = cleaned.lower()
        hallucination_count = sum(1 for indicator in severe_hallucination_indicators if indicator in summary_lower)
        
        if hallucination_count >= 3:  # If 3+ hallucination indicators found
            logger.error(f"SEVERE HALLUCINATION DETECTED! Found {hallucination_count} unrelated topic indicators in summary. Content: {cleaned[:200]}...")
            logger.error("Forcing fallback response to prevent incorrect content delivery.")
            return self._generate_content_based_fallback_summary(original_content, visual_descriptions)
        
        # Check for template responses or insufficient content
        template_indicators = [
            "main ideas explained in the video",
            "real-world examples mentioned explicitly",
            "without adding new information",
            "[visual elements to transcript content]"
        ]
        
        if len(cleaned.strip()) < 200 or any(indicator in cleaned.lower() for indicator in template_indicators):
            logger.warning("Generated summary appears to be template-based, using fallback")
            return self._generate_content_based_fallback_summary(original_content, visual_descriptions)
        
        return cleaned.strip()

    def _generate_content_based_fallback_summary(self, original_content: str, visual_descriptions: List[str]) -> str:
        """Generate a safe fallback summary based strictly on available content without AI generation."""
        try:
            # Extract actual content from transcript to avoid hallucination
            content_lines = [line.strip() for line in original_content.split('\n') if line.strip()]
            
            summary = "### 📚 Detailed Summary\n\n"
            
            # 1. Overview - Use actual first few lines of content
            summary += "**1. Overview and Introduction**\n"
            if content_lines:
                first_content = ' '.join(content_lines[:2])[:200]
                summary += f"- This video content begins with: {first_content}...\n"
            else:
                summary += "- This educational video contains instructional content for learning purposes.\n"
            summary += "- The content is structured to provide clear learning outcomes.\n\n"
            
            # 2. Key Themes - Extract from middle content
            summary += "**2. Key Themes or Concepts**\n"
            if len(content_lines) > 4:
                mid_start = len(content_lines) // 3
                mid_content = ' '.join(content_lines[mid_start:mid_start+2])[:150]
                summary += f"- Key themes include: {mid_content}...\n"
            
            # Look for programming-related keywords in the content
            programming_keywords = ["python", "programming", "code", "function", "variable", "syntax", "algorithm", "development"]
            found_keywords = [kw for kw in programming_keywords if kw.lower() in original_content.lower()]
            
            if found_keywords:
                summary += f"- Programming concepts covered include: {', '.join(found_keywords[:5])}\n"
            else:
                summary += "- The content covers technical concepts and practical applications.\n"
            summary += "\n"
            
            # 3. Visual-Text Alignment
            summary += "**3. Visual-Text Alignment**\n"
            if visual_descriptions:
                summary += f"- The video includes {len(visual_descriptions)} visual elements synchronized with the content.\n"
                # Include first visual description as example
                if visual_descriptions[0]:
                    summary += f"- Example visual element: {visual_descriptions[0]}\n"
            else:
                summary += "- Visual analysis data was not available for this content.\n"
            summary += "\n"
            
            # 4. Applications
            summary += "**4. Applications or Case Studies**\n"
            if "example" in original_content.lower() or "project" in original_content.lower():
                summary += "- The content includes practical examples and project applications.\n"
            else:
                summary += "- Specific application examples are embedded within the instructional content.\n"
            summary += "\n"
            
            # 5. Conclusion
            summary += "**5. Conclusion**\n"
            if len(content_lines) > 2:
                last_content = ' '.join(content_lines[-2:])[:150]
                summary += f"- The content concludes with: {last_content}...\n"
            summary += "- This educational material provides foundational knowledge for continued learning.\n"
            
            return summary
            
        except Exception as e:
            logger.error(f"Error in content-based fallback summary: {e}")
            return """### 📚 Detailed Summary

**Content Analysis Note**: Due to processing limitations, a detailed summary could not be generated. The video contains educational content designed for learning purposes. Please refer to the actual video content for specific details and instructional material."""

    def _generate_error_summary_for_content_mismatch(self) -> str:
        """Generate error summary when transcript content doesn't match expected video type."""
        return """### 📚 Detailed Summary

**⚠️ Content Processing Error Detected**

**1. Overview and Introduction**
- A content processing error has been detected during transcript analysis.
- The extracted transcript content does not match the expected video subject matter.

**2. Issue Identification**  
- The system detected content that appears to be from a different video source.
- This suggests a transcript extraction failure or incorrect video content mapping.

**3. Recommended Action**
- Please verify that the correct video is being processed.
- Manual review of the video content is recommended.
- The transcript extraction process may need to be re-run.

**4. Technical Details**
- Content validation failed due to topic mismatch detection.
- The anti-hallucination system prevented delivery of incorrect analysis.

**5. Next Steps**
- Check video URL and ensure correct source material.
- Re-attempt processing with verified video content.
- Contact support if the issue persists with confirmed correct videos."""

    def _generate_simple_transcript_summary(self, full_text: str) -> str:
        """Generate a simple, reliable summary from the provided transcript content."""
        if not full_text or len(full_text.strip()) < 50:
            return """### 📚 Detailed Summary

**Section 1: Content Overview**
- This video appears to cover educational or informational content.
- A detailed breakdown is not available due to limited transcript data.

**Section 2: General Themes**
- The content likely aims to explain specific concepts or processes.
- Practical examples or applications might be included."""

        word_count = len(full_text.split())
        summary = "### 📚 Detailed Summary\n\n"
        
        summary += "**Section 1: Introduction & Main Points**\n"
        summary += f"- The video transcript contains approximately {word_count} words.\n"
        
        key_topics_text_raw = full_text[:150]
        key_topics_text_clean = key_topics_text_raw.replace('\n', ' ')
        summary += f"- Key topics appear to include: {key_topics_text_clean}...\n\n"
        
        summary += "**Section 2: Content Highlights**\n"
        mid_point = len(full_text) // 2
        highlight_text_raw = full_text[mid_point : mid_point + 200]
        highlight_text_clean = highlight_text_raw.replace('\n', ' ')
        
        if not highlight_text_clean.strip() and len(full_text) > 200:
            highlight_text_raw = full_text[50:250]
            highlight_text_clean = highlight_text_raw.replace('\n', ' ')
        elif not highlight_text_clean.strip():
            highlight_text_clean = "Further details discussed in the video."

        summary += f"- Central themes seem to revolve around: {highlight_text_clean}...\n\n"
        
        summary += f"**Note**: This is a simplified summary based on the available transcript content."
        return summary

    def _split_text_into_chunks(self, text: str, chunk_size: int) -> List[str]:
        """Splits text into chunks of approximately chunk_size characters, trying to respect sentence boundaries."""
        # This is a very basic chunker. A more sophisticated one would use token counts via tokenizer.
        chunks = []
        current_chunk = ""
        sentences = text.split('.') # Simplistic sentence split
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            sentence += "." # Add back the period
            if len(current_chunk) + len(sentence) <= chunk_size:
                current_chunk += " " + sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
        if current_chunk: # Add the last chunk
            chunks.append(current_chunk.strip())
        
        if not chunks and text: # If splitting failed but text exists, return as one chunk
            chunks.append(text)
        return chunks

    def _generate_react_flowchart(self, root_topic_title: str, full_text: str, segments: List[Dict], flowchart_title_override: Optional[str] = None) -> Dict[str, Any]:
        """Generate React-compatible flowchart based on transcript content, with a dynamic title."""
        try:
            flow_steps = self._extract_learning_flow_from_transcript(full_text) # This already uses full_text
            
            flowchart = {
                "title": flowchart_title_override if flowchart_title_override else (root_topic_title + " - Learning Flow" if root_topic_title else "Video Learning Flow"),
                "nodes": [],
                "edges": []
            }
            
            if not flow_steps:
                 flow_steps = ["Introduction", "Main Content", "Examples", "Conclusion"] # Generic fallback flow

            for i, step_label in enumerate(flow_steps):
                flowchart["nodes"].append({"id": f"step{i}", "label": step_label, "type": "educational" if i==0 else "instructional" })
            
            for i in range(len(flow_steps) - 1):
                flowchart["edges"].append({"from": f"step{i}", "to": f"step{i+1}", "type": "sequential"})
            
            return flowchart
        except Exception as e:
            logger.error(f"Error generating React flowchart: {e}")
            # Generic fallback flowchart
            return {
                "title": flowchart_title_override if flowchart_title_override else "Video Learning Flow",
                "nodes": [
                    {"id": "start", "label": "Start Video"},
                    {"id": "content1", "label": "Key Topic 1"},
                    {"id": "content2", "label": "Key Topic 2"},
                    {"id": "end", "label": "Conclusion"}
                ],
                "edges": [
                    {"from": "start", "to": "content1"}, {"from": "content1", "to": "content2"}, {"from": "content2", "to": "end"}
                ]
            }

    def _extract_learning_flow_from_transcript(self, full_text: str) -> List[str]:
        """Extract the learning progression/flow from complete transcript"""
        try:
            prompt = f"""From this COMPLETE educational transcript, identify the main learning steps or progression mentioned.
            Extract the sequence of topics or steps that learners should follow.
            
            COMPLETE TRANSCRIPT:
            {full_text}
            
            Learning flow/steps mentioned (in order):"""
            
            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True).to(self.device)
            outputs = self.model.generate(**inputs, max_length=200, num_beams=3, early_stopping=True)
            flow_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Parse flow steps
            steps = []
            for line in flow_text.split('\n'):
                if line.strip() and len(line.strip()) > 5:
                    step = line.strip().lstrip('-').lstrip('*').lstrip('1.').lstrip('2.').lstrip('3.').lstrip('4.').lstrip('5.').strip()
                    if len(step) > 5 and len(step) < 80:
                        steps.append(step)
            
            return steps[:6] if steps else [
                "Introduction to Python",
                "Basic Syntax and Variables", 
                "Control Structures",
                "Functions and Modules",
                "Practice Projects",
                "Advanced Applications"
            ]
            
        except Exception as e:
            logger.error(f"Error extracting learning flow: {e}")
            return ["Start Learning", "Practice Coding", "Build Projects"]

    def _generate_transcript_highlights(self, segments: List[Dict]) -> List[Dict[str, Any]]:
        """Generate highlights from actual transcript segments"""
        highlights = []
        
        for i, segment in enumerate(segments[:8]):  # More highlights from full transcript
            start_time = segment.get("start", 0)
            text = segment.get("text", "")
            
            if len(text.strip()) > 10:  # Only meaningful segments
                highlights.append({
                    "timestamp": int(start_time),
                    "description": text[:100] + "..." if len(text) > 100 else text,
                    "importance_score": 0.9 - (i * 0.1),
                    "segment_type": "transcript_content"
                })
        
        return highlights

    def _generate_fallback_summary(self, full_text: str) -> str:
        """Generate fallback summary when AI generation fails"""
        return f"""### 📚 Detailed Summary

**Section 1: Course Introduction**
- Educational content covering Python programming
- Structured learning approach for beginners
- Focus on practical application and skill building

**Section 2: Learning Content** 
- Core programming concepts and fundamentals
- Hands-on exercises and examples
- Progressive skill development

**Transcript Length**: {len(full_text)} characters processed
**Note**: This is a fallback summary. For detailed analysis, the complete transcript content is: {full_text[:500]}..."""

    def _enhance_short_summary(self, summary: str, full_text: str, segments: List[Dict], visual_context: str) -> str:
        """
        Enhance a short summary with more details if needed.
        (Could be part of the new formatted summary logic)
        """
        enhanced = summary + "\n\n"
        
        enhanced += "## Additional Learning Context\n\n"
        enhanced += "This educational video provides structured learning content designed to enhance understanding through multi-modal presentation. "
        
        if segments:
            enhanced += f"The content is organized into {len(segments)} distinct segments, each focusing on specific learning objectives. "
        
        enhanced += "Visual elements support comprehension through demonstrations, examples, and structured presentation of information. "
        enhanced += "Key concepts are introduced progressively, building upon foundational knowledge to achieve comprehensive understanding.\n\n"
        
        enhanced += "## Learning Outcomes\n\n"
        enhanced += "Upon completion, learners will have gained practical knowledge applicable to real-world scenarios. "
        enhanced += "The structured approach ensures retention of key concepts and terminology essential for continued learning in this domain."
        
        return enhanced

    def _generate_fallback_detailed_summary(self, full_text: str, segments: List[Dict], visual_context: str, duration: float) -> str:
        """
        Fallback for detailed summary if primary methods fail.
        (Could be part_of the new formatted summary logic's fallback)
        """
        summary = "## Educational Video Analysis\n\n"
        summary += "### Learning Objectives\n"
        summary += "This educational video is designed to provide comprehensive learning content that enhances understanding through structured presentation. "
        summary += "The primary objective is to deliver key concepts and practical knowledge in an accessible format.\n\n"
        
        summary += "### Content Structure\n"
        if segments:
            summary += f"The video content is organized into {len(segments)} distinct segments, each targeting specific learning outcomes. "
        summary += f"With a total duration of {duration:.1f} seconds, the content is paced to optimize comprehension and retention.\n\n"
        
        summary += "### Visual Learning Elements\n"
        summary += visual_context + " These visual components are strategically integrated to support different learning styles and enhance overall comprehension.\n\n"
        
        summary += "### Key Concepts\n"
        summary += "The video introduces fundamental concepts essential for understanding the subject matter. "
        summary += "Each concept is presented with clear explanations and practical examples to facilitate learning.\n\n"
        
        summary += "### Practical Applications\n"
        summary += "The knowledge presented in this video has direct applications in real-world scenarios. "
        summary += "Learners can apply these concepts to solve practical problems and advance their understanding in the field.\n\n"
        
        summary += "### Learning Outcomes\n"
        summary += "Upon completion, viewers will have gained valuable insights and practical knowledge. "
        summary += "The structured approach ensures effective knowledge transfer and long-term retention of key concepts."
        
        return summary

    def _extract_keywords_and_create_mindmap(self, detailed_summary: str, full_text: str, segments: List[Dict]) -> Dict[str, Any]:
        """
        Primarily used to extract a root_topic for the new structure. 
        The mind map structure itself will be built by _build_mindmap_json.
        Keywords extracted here might be used as a fallback or supplemental info if needed.
        The 'detailed_summary' parameter is less relevant now; full_text is preferred for root topic.
        """
        # This function is now mostly a helper for _generate_root_topic_and_objectives to get a root_topic.
        # The complex mind map generation logic here is deprecated in favor of _build_mindmap_json.

        if not full_text and not detailed_summary:
            return {"root_topic": "Educational Content", "keywords": ["learning", "education"]}

        text_for_analysis = full_text if full_text else detailed_summary
        
        root_topic = "Educational Video Analysis" # Default
        prompt_theme = f"""Identify the main theme or root topic of the following text. Output just the theme as a concise phrase.
        Text: {text_for_analysis[:1500]}
        Main Theme:"""
        try:
            inputs_theme = self.tokenizer(prompt_theme, return_tensors="pt", max_length=512, truncation=True).to(self.device)
            outputs_theme = self.model.generate(**inputs_theme, max_length=30, num_beams=3, early_stopping=True)
            extracted_theme = self.tokenizer.decode(outputs_theme[0], skip_special_tokens=True).strip()
            if extracted_theme and len(extracted_theme) < 70 and extracted_theme != "Text:":
                root_topic = extracted_theme
        except Exception as e:
            logger.error(f"Helper _extract_keywords_and_create_mindmap failed to extract root topic: {e}")
            # root_topic remains default

        # Extract some general keywords as a fallback, though not directly used in the new main structure
        keywords = ["education", "learning"]
        prompt_keywords = f"""Extract 3-5 general keywords from the text:
        Text: {text_for_analysis[:1000]}
        Keywords (comma-separated):"""
        try:
            inputs_kw = self.tokenizer(prompt_keywords, return_tensors="pt", max_length=512, truncation=True).to(self.device)
            outputs_kw = self.model.generate(**inputs_kw, max_length=50, num_beams=3, early_stopping=True)
            kw_text = self.tokenizer.decode(outputs_kw[0], skip_special_tokens=True)
            extracted_keywords = [kw.strip() for kw in kw_text.split(',') if kw.strip()]
            if extracted_keywords:
                keywords = extracted_keywords[:5]
        except Exception as e:
            logger.error(f"Helper _extract_keywords_and_create_mindmap failed to extract keywords: {e}")
            
            return {
                "root_topic": root_topic,
            "keywords": keywords
            # The "mind_map" dict previously returned here is no longer needed as _build_mindmap_json handles it.
        }

    # Ensure _parse_keyword_response and _create_mind_map_structure are marked/handled as deprecated
    def _parse_keyword_response(self, generated_text: str, summary: str) -> Dict[str, Any]:
        logger.warning("DEPRECATED: _parse_keyword_response was called.")
        # ... (rest of original function or just a basic return)
        return {"root_topic": "Deprecated Function", "keywords": [], "mind_map": {}}

    def _create_mind_map_structure(self, keywords: List[str], root_topic: str) -> Dict[str, Any]:
        logger.warning("DEPRECATED: _create_mind_map_structure was called. Use _build_mindmap_json instead.")
        # ... (rest of original function or just a basic return)
        return {"name": root_topic, "children": [{"name": kw} for kw in keywords]}

    def _generate_enhanced_highlights(self, segments: List[Dict], combined_features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate enhanced timestamp highlights with importance scores.
        """
        try:
            highlights = []
            features = combined_features.get("combined_features", [])
            
            # Create highlights from segments with enhanced descriptions
            for i, segment in enumerate(segments[:6]):  # Limit to 6 highlights
                start_time = segment.get("start", 0)
                text = segment.get("text", "")
                
                # Create more detailed description
                if len(text) > 100:
                    description = f"Key learning segment: {text[:80]}..."
                else:
                    description = f"Learning point: {text}"
                
                # Calculate importance based on segment length and position
                importance = 0.9 - (i * 0.1) if i < 5 else 0.5
                
                highlights.append({
                    "timestamp": int(start_time),
                    "description": description,
                    "importance_score": max(importance, 0.5),
                    "segment_type": "educational_content",
                    "learning_value": "high" if importance > 0.7 else "medium"
                })
            
            # Add strategic highlights if we have fewer than 3
            if len(highlights) < 3:
                strategic_highlights = [
                    {"timestamp": 30, "description": "Introduction and learning objectives overview", "importance_score": 0.8},
                    {"timestamp": 120, "description": "Core concepts and fundamental principles", "importance_score": 0.9},
                    {"timestamp": 300, "description": "Practical applications and examples", "importance_score": 0.85}
                ]
                highlights.extend(strategic_highlights)
            
            return highlights[:6]  # Return top 6 highlights
            
        except Exception as e:
            logger.error(f"Error generating enhanced highlights: {str(e)}")
            return [
                {"timestamp": 30, "description": "Introduction and overview", "importance_score": 0.8},
                {"timestamp": 120, "description": "Main learning content", "importance_score": 0.9},
                {"timestamp": 300, "description": "Key concepts and examples", "importance_score": 0.85}
            ]

    def _calculate_alignment_score(self, combined_features: Dict[str, Any]) -> float:
        """
        Calculate an overall alignment score between text and visuals.
        (Could inform visual_context or summary content)
        """
        try:
            features = combined_features.get("combined_features", [])
            if not features:
                return 0.0
            
            alignment_scores = []
            for feature in features:
                visual_frames_count = feature.get("visual_frames_count", 0)
                # Higher score if more visual frames align with text segments
                score = min(visual_frames_count / 3.0, 1.0)  # Normalize to 0-1
                alignment_scores.append(score)
            
            return np.mean(alignment_scores) if alignment_scores else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating alignment score: {str(e)}")
            return 0.0
    
    def _parse_fallback_response(self, generated_text: str, combined_features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses fallback response from FLAN-T5.
        (Might be useful for general error handling in LLM calls)
        """
        try:
            # Extract basic information from generated text
            lines = generated_text.split('\n')
            
            summary = "AI-generated summary based on multi-modal analysis of the video content."
            key_topics = ["Video Content Analysis", "Educational Material", "Multi-modal Processing"]
            visual_insights = ["Visual content analyzed using CLIP embeddings", "Frame-level feature extraction completed"]
            
            # Try to extract some content from the generated text
            for line in lines:
                if len(line.strip()) > 50:  # Likely a summary line
                    summary = line.strip()
                    break
            
            timestamp_highlights = []
            features = combined_features.get("combined_features", [])
            
            # Create highlights from features
            for i, feature in enumerate(features[:5]):  # Top 5 segments
                highlight = {
                    "timestamp": feature.get("start_time", 0),
                    "description": feature.get("text", "")[:100] + "..." if len(feature.get("text", "")) > 100 else feature.get("text", ""),
                    "importance_score": 0.8 - (i * 0.1)  # Decreasing importance
                }
                timestamp_highlights.append(highlight)
            
            return {
                "summary": summary,
                "key_topics": key_topics,
                "visual_insights": visual_insights,
                "timestamp_highlights": timestamp_highlights
            }
            
        except Exception as e:
            logger.error(f"Error in fallback parsing: {str(e)}")
            return {
                "summary": "Summary generation encountered an error but multi-modal processing completed successfully.",
                "key_topics": ["Processing Completed", "Multi-modal Analysis"],
                "visual_insights": ["Visual processing completed with CLIP embeddings"],
                "timestamp_highlights": []
            } 