"""
Multi-Modal Understanding Service - Feature 7
Analyzes screenshots, images, code snippets, and visual content from videos
"""

import logging
import base64
from typing import Dict, Any, List, Optional
from openai import OpenAI
import os
import re
import json
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


class MultiModalService:
    """
    Handles multi-modal content understanding including images, screenshots, and visual analysis
    """
    
    def __init__(self):
        """
        Initialize with OpenAI client for GPT-4 Vision
        """
        self._openai_client = None
        logger.info("✅ MultiModalService initialized (lazy loading)")
    
    @property
    def openai_client(self):
        """Lazy load OpenAI client"""
        if self._openai_client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set in environment")
            self._openai_client = OpenAI(api_key=api_key)
        return self._openai_client
    
    async def analyze_screenshot(
        self,
        image_data: bytes,
        context: str = "",
        analysis_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Analyze screenshot or image using GPT-4 Vision
        
        Args:
            image_data: Raw image bytes
            context: Optional context about the image (e.g., video title, timestamp)
            analysis_type: Type of analysis - 'general', 'diagram', 'code', 'text', 'math'
        
        Returns:
            Dict with analysis results
        """
        try:
            # Convert image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Build analysis prompt based on type
            system_prompts = {
                'general': """You are an expert at analyzing educational content in images.

Analyze this image and provide:
1. Main topic/subject
2. Key concepts shown
3. Text content (if any)
4. Visual elements (diagrams, charts, etc.)
5. Educational value
6. Suggested questions a student might ask

Be thorough but concise.""",
                
                'diagram': """You are an expert at analyzing diagrams and visual representations.

Analyze this diagram and provide:
1. Type of diagram (flowchart, UML, system architecture, etc.)
2. Main components and their relationships
3. Flow or hierarchy shown
4. Key labels and annotations
5. Educational purpose
6. How to explain this to students

Focus on the structure and meaning.""",
                
                'code': """You are an expert at analyzing code shown in images.

Analyze this code snippet and provide:
1. Programming language
2. What the code does (purpose)
3. Key functions/methods
4. Important concepts demonstrated
5. Best practices shown or violated
6. Potential improvements
7. Complete code transcription (if readable)

Be precise with syntax.""",
                
                'text': """You are an expert at extracting and analyzing text from images.

Extract and analyze all text visible in this image:
1. Complete text transcription
2. Text structure (headings, bullets, paragraphs)
3. Key points or concepts
4. Any definitions or formulas
5. Context or subject matter

Preserve formatting as much as possible.""",
                
                'math': """You are an expert at analyzing mathematical content in images.

Analyze this mathematical content and provide:
1. All equations and formulas (in LaTeX format)
2. Mathematical concepts shown
3. Step-by-step solutions (if present)
4. Theorems or principles applied
5. Explanation of the mathematics
6. Common student mistakes to avoid

Use proper mathematical notation."""
            }
            
            system_prompt = system_prompts.get(analysis_type, system_prompts['general'])
            
            user_prompt = f"""Analyze this image.

{f'Context: {context}' if context else ''}

Provide a comprehensive analysis following the guidelines."""
            
            # Call GPT-4 Vision
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Using mini model for cost efficiency
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": user_prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            analysis_text = response.choices[0].message.content
            
            # Parse the analysis
            result = {
                'analysis_type': analysis_type,
                'content': analysis_text,
                'context': context,
                'has_text': self._detect_text_content(analysis_text),
                'has_code': self._detect_code_content(analysis_text),
                'has_math': self._detect_math_content(analysis_text),
                'has_diagram': self._detect_diagram_content(analysis_text),
                'confidence': 0.9,  # High confidence for GPT-4 Vision
                'timestamp': self._get_timestamp()
            }
            
            # Extract structured data if possible
            if analysis_type == 'code':
                result['code_snippet'] = self._extract_code_block(analysis_text)
                result['language'] = self._detect_language(analysis_text)
            
            if analysis_type == 'math':
                result['equations'] = self._extract_equations(analysis_text)
            
            if analysis_type == 'diagram':
                result['diagram_type'] = self._extract_diagram_type(analysis_text)
                result['components'] = self._extract_components(analysis_text)
            
            logger.info(f"✅ Analyzed {analysis_type} screenshot successfully")
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing screenshot: {e}", exc_info=True)
            return {
                'error': str(e),
                'analysis_type': analysis_type,
                'success': False
            }
    
    async def extract_code_from_image(
        self,
        image_data: bytes,
        expected_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Specialized code extraction from screenshots
        
        Args:
            image_data: Raw image bytes
            expected_language: Optional hint about programming language
        
        Returns:
            Dict with extracted code and metadata
        """
        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            language_hint = f"\nExpected language: {expected_language}" if expected_language else ""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert at extracting code from images with perfect accuracy.

Extract the code visible in this image with:
1. Exact transcription (preserve ALL indentation and formatting)
2. Language detection
3. Syntax validation
4. Brief explanation of what the code does

Return in this JSON format:
{{
  "code": "exact code here with \\n for newlines",
  "language": "detected language",
  "valid_syntax": true/false,
  "explanation": "brief explanation",
  "key_concepts": ["concept1", "concept2"],
  "line_count": number
}}

Be extremely accurate with indentation and syntax.{language_hint}"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract all code from this image:"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1500
            )
            
            response_text = response.choices[0].message.content
            
            # Parse JSON response
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            code_data = json.loads(response_text)
            
            code_data['timestamp'] = self._get_timestamp()
            code_data['success'] = True
            
            logger.info(f"✅ Extracted {code_data.get('line_count', 0)} lines of {code_data.get('language', 'unknown')} code")
            
            return code_data
            
        except Exception as e:
            logger.error(f"Error extracting code: {e}", exc_info=True)
            return {
                'error': str(e),
                'success': False
            }
    
    async def extract_text_from_image(
        self,
        image_data: bytes,
        preserve_formatting: bool = True
    ) -> Dict[str, Any]:
        """
        Extract text content from images (OCR alternative using GPT-4 Vision)
        
        Args:
            image_data: Raw image bytes
            preserve_formatting: Whether to maintain original formatting
        
        Returns:
            Dict with extracted text
        """
        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            formatting_instruction = (
                "Preserve all formatting including line breaks, indentation, and spacing."
                if preserve_formatting else
                "Extract text in a clean, readable format."
            )
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert at extracting text from images with perfect accuracy.

Extract ALL visible text from this image.

{formatting_instruction}

Return in this JSON format:
{{
  "text": "all extracted text",
  "has_headings": true/false,
  "has_lists": true/false,
  "has_code": true/false,
  "has_formulas": true/false,
  "structure": "description of text structure",
  "language": "detected language",
  "word_count": number
}}"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract all text from this image:"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1500
            )
            
            response_text = response.choices[0].message.content
            
            # Parse JSON response
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            text_data = json.loads(response_text)
            text_data['timestamp'] = self._get_timestamp()
            text_data['success'] = True
            
            logger.info(f"✅ Extracted {text_data.get('word_count', 0)} words of text")
            
            return text_data
            
        except Exception as e:
            logger.error(f"Error extracting text: {e}", exc_info=True)
            return {
                'error': str(e),
                'success': False
            }
    
    async def analyze_diagram(
        self,
        image_data: bytes,
        diagram_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Specialized diagram analysis
        
        Args:
            image_data: Raw image bytes
            diagram_hint: Optional hint about diagram type
        
        Returns:
            Dict with diagram analysis
        """
        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            hint_text = f"\nDiagram type hint: {diagram_hint}" if diagram_hint else ""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert at analyzing diagrams and visual representations.

Analyze this diagram in detail.{hint_text}

Return in this JSON format:
{{
  "diagram_type": "flowchart/UML/architecture/network/etc",
  "main_topic": "subject of diagram",
  "components": ["component1", "component2"],
  "relationships": ["relationship descriptions"],
  "flow_direction": "top-to-bottom/left-to-right/etc",
  "key_labels": ["important labels"],
  "explanation": "detailed explanation",
  "educational_value": "what students learn from this",
  "complexity": "simple/moderate/complex"
}}"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze this diagram:"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1200
            )
            
            response_text = response.choices[0].message.content
            
            # Parse JSON response
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            diagram_data = json.loads(response_text)
            diagram_data['timestamp'] = self._get_timestamp()
            diagram_data['success'] = True
            
            logger.info(f"✅ Analyzed {diagram_data.get('diagram_type', 'unknown')} diagram")
            
            return diagram_data
            
        except Exception as e:
            logger.error(f"Error analyzing diagram: {e}", exc_info=True)
            return {
                'error': str(e),
                'success': False
            }
    
    # Helper methods
    
    def _detect_text_content(self, text: str) -> bool:
        """Check if analysis indicates text content"""
        indicators = ['text', 'written', 'words', 'paragraph', 'sentence']
        return any(indicator in text.lower() for indicator in indicators)
    
    def _detect_code_content(self, text: str) -> bool:
        """Check if analysis indicates code"""
        indicators = ['code', 'function', 'variable', 'syntax', 'programming']
        return any(indicator in text.lower() for indicator in indicators)
    
    def _detect_math_content(self, text: str) -> bool:
        """Check if analysis indicates math"""
        indicators = ['equation', 'formula', 'theorem', 'mathematical', 'integral', 'derivative']
        return any(indicator in text.lower() for indicator in indicators)
    
    def _detect_diagram_content(self, text: str) -> bool:
        """Check if analysis indicates diagram"""
        indicators = ['diagram', 'flowchart', 'chart', 'graph', 'visualization', 'uml']
        return any(indicator in text.lower() for indicator in indicators)
    
    def _extract_code_block(self, text: str) -> Optional[str]:
        """Extract code block from markdown"""
        pattern = r'```[\w]*\n(.*?)```'
        matches = re.findall(pattern, text, re.DOTALL)
        return matches[0] if matches else None
    
    def _detect_language(self, text: str) -> Optional[str]:
        """Detect programming language from text"""
        languages = ['python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'typescript']
        text_lower = text.lower()
        for lang in languages:
            if lang in text_lower:
                return lang
        return None
    
    def _extract_equations(self, text: str) -> List[str]:
        """Extract LaTeX equations"""
        # Find content between $ or $$
        single_dollar = re.findall(r'\$([^\$]+)\$', text)
        double_dollar = re.findall(r'\$\$([^\$]+)\$\$', text)
        return single_dollar + double_dollar
    
    def _extract_diagram_type(self, text: str) -> Optional[str]:
        """Extract diagram type from analysis"""
        types = ['flowchart', 'uml', 'architecture', 'network', 'class diagram', 'sequence diagram']
        text_lower = text.lower()
        for dtype in types:
            if dtype in text_lower:
                return dtype
        return None
    
    def _extract_components(self, text: str) -> List[str]:
        """Extract diagram components"""
        # Simple extraction - look for bullet points or numbered lists
        lines = text.split('\n')
        components = []
        for line in lines:
            if line.strip().startswith(('-', '*', '•')) or re.match(r'^\d+\.', line.strip()):
                component = line.strip().lstrip('-*•0123456789. ')
                if component:
                    components.append(component)
        return components[:10]  # Limit to 10
    
    def _get_timestamp(self) -> str:
        """Get current ISO timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()


# Singleton instance
multi_modal_service = MultiModalService()
