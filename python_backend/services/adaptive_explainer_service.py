"""
Adaptive Explanation Service - Personalized Learning Path (Feature 6)
Adapts AI responses based on user's learning profile and proficiency level
"""

import logging
from typing import Dict, Any, List, Optional
from openai import OpenAI
import os

logger = logging.getLogger(__name__)


class AdaptiveExplainerService:
    """
    Adapts explanations based on user's learning profile
    """
    
    def __init__(self):
        """
        Initialize with OpenAI client
        """
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logger.info("✅ AdaptiveExplainerService initialized")
    
    def get_style_instructions(
        self,
        education_level: str,
        learning_style: str,
        explanation_depth: str,
        use_analogies: bool,
        show_math: bool,
        topic_proficiency: float = 50
    ) -> str:
        """
        Generate instruction prompt based on user preferences
        
        Args:
            education_level: beginner/intermediate/advanced/expert
            learning_style: visual/auditory/reading/kinesthetic
            explanation_depth: concise/detailed/comprehensive
            use_analogies: Whether to include analogies
            show_math: Whether to include mathematical notation
            topic_proficiency: User's proficiency in this topic (0-100)
        
        Returns:
            Instruction string for GPT
        """
        # Base instructions by education level
        level_instructions = {
            'beginner': """
                - Use simple, everyday language (8th grade reading level)
                - Define ALL technical terms when first used
                - Break concepts into very small, digestible steps
                - Include plenty of concrete, real-world examples
                - Use encouraging, patient tone
                - Avoid jargon and complex terminology
                - Explain WHY things work, not just HOW
            """,
            'intermediate': """
                - Use clear language with some technical terms
                - Define technical terms briefly when first used
                - Balance conceptual understanding with practical application
                - Include both simple and moderately complex examples
                - Use professional but accessible tone
                - Connect concepts to previously learned material
            """,
            'advanced': """
                - Use precise technical terminology
                - Assume strong foundational knowledge
                - Focus on deeper principles and edge cases
                - Include sophisticated examples and applications
                - Discuss nuances, trade-offs, and alternatives
                - Reference advanced concepts without explaining basics
            """,
            'expert': """
                - Use advanced terminology and notation freely
                - Assume expert-level background knowledge
                - Focus on cutting-edge insights and subtle distinctions
                - Include research-level examples and theoretical frameworks
                - Discuss open problems, controversies, and future directions
                - Skip elementary explanations entirely
            """
        }
        
        # Adjust based on topic proficiency
        if topic_proficiency < 30:
            # Even if user is advanced overall, treat as beginner for this topic
            effective_level = 'beginner'
        elif topic_proficiency < 60:
            effective_level = 'intermediate'
        elif topic_proficiency < 85:
            effective_level = 'advanced'
        else:
            effective_level = education_level  # Use their overall level
        
        instructions = level_instructions.get(effective_level, level_instructions['intermediate'])
        
        # Add learning style adaptations
        style_additions = {
            'visual': """
                - Use visual descriptions and spatial metaphors
                - Describe diagrams, charts, and visual relationships
                - Mention colors, shapes, and visual patterns
                - Suggest "imagine seeing..." scenarios
            """,
            'auditory': """
                - Use sound metaphors and rhythmic explanations
                - Include mnemonic devices and word associations
                - Structure with clear verbal signposts
                - Use storytelling and narrative flow
            """,
            'reading': """
                - Provide detailed text-based explanations
                - Include bullet points and structured lists
                - Reference related reading materials
                - Use precise written descriptions
            """,
            'kinesthetic': """
                - Use physical action metaphors
                - Describe hands-on experiments and activities
                - Include "try this yourself" suggestions
                - Connect to physical movement and touch
            """
        }
        
        instructions += "\n" + style_additions.get(learning_style, style_additions['visual'])
        
        # Add depth preferences
        depth_additions = {
            'concise': """
                - Keep explanations brief and to-the-point
                - Use bullet points for clarity
                - Limit to 2-3 paragraphs maximum
                - Focus on key takeaways only
            """,
            'detailed': """
                - Provide thorough explanations with examples
                - Include context and background
                - Use 3-5 paragraphs with good structure
                - Balance depth with readability
            """,
            'comprehensive': """
                - Provide extensive, in-depth explanations
                - Include multiple examples and edge cases
                - Discuss history, applications, and implications
                - Use as much space as needed for complete understanding
            """
        }
        
        instructions += "\n" + depth_additions.get(explanation_depth, depth_additions['detailed'])
        
        # Add analogy preference
        if use_analogies:
            instructions += """
                - Include at least one clear, relatable analogy
                - Choose analogies from everyday life
                - Explain both similarities AND limitations of analogies
            """
        else:
            instructions += """
                - Avoid analogies and metaphors
                - Use direct, literal explanations
                - Focus on precise technical descriptions
            """
        
        # Add math preference
        if show_math:
            instructions += """
                - Include relevant mathematical notation and formulas
                - Show step-by-step mathematical derivations
                - Use LaTeX for equations (wrap in $ or $$)
            """
        else:
            instructions += """
                - Minimize or avoid mathematical notation
                - Explain concepts verbally without heavy math
                - If math is essential, explain it in words
            """
        
        return instructions.strip()
    
    async def adapt_explanation(
        self,
        answer: str,
        topic: str,
        user_profile: Dict[str, Any],
        context: str = ""
    ) -> str:
        """
        Adapt an existing answer to match user's learning profile
        
        Args:
            answer: Original answer from RAG system
            topic: Topic being discussed
            user_profile: User's learning profile
            context: Additional context about the question
        
        Returns:
            Adapted answer tailored to user
        """
        try:
            # Get user's proficiency for this topic
            topic_proficiency = user_profile.get('currentLevel', {}).get(topic, 50)
            
            # Generate style instructions
            style_instructions = self.get_style_instructions(
                education_level=user_profile.get('educationLevel', 'intermediate'),
                learning_style=user_profile.get('learningStyle', 'visual'),
                explanation_depth=user_profile.get('explanationDepth', 'detailed'),
                use_analogies=user_profile.get('useAnalogies', True),
                show_math=user_profile.get('showMath', True),
                topic_proficiency=topic_proficiency
            )
            
            # Create adaptation prompt
            system_prompt = f"""You are an adaptive AI tutor that personalizes explanations.
            
Your task: Rewrite the following answer to match the user's learning profile.

USER'S LEARNING PROFILE:
- Education Level: {user_profile.get('educationLevel', 'intermediate')}
- Learning Style: {user_profile.get('learningStyle', 'visual')}
- Topic Proficiency ({topic}): {topic_proficiency}/100
- Preferred Depth: {user_profile.get('explanationDepth', 'detailed')}

ADAPTATION INSTRUCTIONS:
{style_instructions}

IMPORTANT RULES:
1. Preserve all factual content - don't change facts
2. Keep all source attributions and timestamps
3. Maintain accuracy while changing style
4. If original answer is already perfect, return it unchanged
5. Add helpful examples relevant to user's level

Original Answer:
{answer}
"""
            
            user_prompt = f"""Adapt this answer for a {user_profile.get('educationLevel', 'intermediate')} learner who prefers {user_profile.get('learningStyle', 'visual')} learning.

Topic: {topic}
User's proficiency in this topic: {topic_proficiency}/100

{f'Additional context: {context}' if context else ''}

Return the adapted answer that matches their learning preferences."""
            
            # Call GPT for adaptation
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            adapted_answer = response.choices[0].message.content.strip()
            
            logger.info(f"✅ Adapted answer for topic '{topic}' (proficiency: {topic_proficiency})")
            
            return adapted_answer
            
        except Exception as e:
            logger.error(f"Error adapting explanation: {e}", exc_info=True)
            # Return original answer if adaptation fails
            return answer
    
    async def generate_followup_questions(
        self,
        topic: str,
        user_profile: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        max_questions: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized follow-up questions to deepen understanding
        
        Args:
            topic: Current topic being discussed
            user_profile: User's learning profile
            conversation_history: Recent conversation messages
            max_questions: Maximum number of questions to generate
        
        Returns:
            List of follow-up questions with metadata
        """
        try:
            topic_proficiency = user_profile.get('currentLevel', {}).get(topic, 50)
            education_level = user_profile.get('educationLevel', 'intermediate')
            
            # Determine question difficulty based on proficiency
            if topic_proficiency < 40:
                difficulty_focus = "basic understanding and fundamentals"
                question_types = "definitional and conceptual"
            elif topic_proficiency < 70:
                difficulty_focus = "application and connections"
                question_types = "practical and analytical"
            else:
                difficulty_focus = "advanced insights and edge cases"
                question_types = "evaluative and synthesis"
            
            # Extract what's been discussed
            recent_discussion = "\n".join([
                f"{msg.get('role', 'user')}: {msg.get('content', '')[:200]}"
                for msg in conversation_history[-5:]  # Last 5 messages
            ])
            
            system_prompt = f"""You are an AI tutor generating personalized follow-up questions.

TOPIC: {topic}
USER'S PROFICIENCY: {topic_proficiency}/100
EDUCATION LEVEL: {education_level}

Generate {max_questions} follow-up questions that:
1. Focus on {difficulty_focus}
2. Are {question_types} questions
3. Build on what was just discussed
4. Help fill knowledge gaps
5. Are appropriate for a {education_level} learner

Return ONLY a JSON array in this format:
[
  {{
    "question": "The follow-up question text",
    "type": "conceptual|application|evaluation",
    "difficulty": "easy|medium|hard",
    "reason": "Why this question helps learning"
  }}
]
"""
            
            user_prompt = f"""Recent conversation:
{recent_discussion}

Generate {max_questions} personalized follow-up questions to deepen understanding of {topic}."""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.8,
                max_tokens=400
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Parse JSON response
            import json
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            questions = json.loads(response_text)
            
            logger.info(f"✅ Generated {len(questions)} follow-up questions for topic '{topic}'")
            
            return questions[:max_questions]
            
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}", exc_info=True)
            # Return generic fallbacks
            return [
                {
                    "question": f"Can you explain more about {topic}?",
                    "type": "conceptual",
                    "difficulty": "medium",
                    "reason": "Deepens understanding"
                },
                {
                    "question": f"What are some practical applications of {topic}?",
                    "type": "application",
                    "difficulty": "medium",
                    "reason": "Connects theory to practice"
                }
            ]
    
    async def generate_personalized_recommendations(
        self,
        user_profile: Dict[str, Any],
        weak_areas: List[Dict[str, Any]],
        video_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized learning recommendations
        
        Args:
            user_profile: User's learning profile
            weak_areas: Detected weak areas from profile service
            video_ids: Available video IDs in playlist
        
        Returns:
            List of recommendations with actions
        """
        try:
            recommendations = []
            
            # 1. Weak area recommendations
            for weak_area in weak_areas[:3]:  # Top 3 weak areas
                topic = weak_area['topic']
                proficiency = weak_area['proficiency']
                
                if weak_area['severity'] == 'critical':
                    recommendations.append({
                        'type': 'review',
                        'priority': 'high',
                        'title': f"Review {topic}",
                        'description': f"Your proficiency in {topic} has declined to {proficiency:.1f}%. Time to revisit!",
                        'action': 'review',
                        'topic': topic,
                        'icon': '🔴'
                    })
                else:
                    recommendations.append({
                        'type': 'practice',
                        'priority': 'medium',
                        'title': f"Practice {topic}",
                        'description': f"Strengthen your understanding with focused practice",
                        'action': 'practice',
                        'topic': topic,
                        'icon': '⚠️'
                    })
            
            # 2. Streak maintenance
            streak = user_profile.get('streak', 0)
            if streak > 0:
                recommendations.append({
                    'type': 'streak',
                    'priority': 'low',
                    'title': f"Maintain your {streak}-day streak!",
                    'description': "Keep your learning momentum going",
                    'action': 'continue',
                    'icon': '🔥'
                })
            
            # 3. Next topic recommendations
            mastered_topics = user_profile.get('masteredTopics', [])
            if len(mastered_topics) > 0:
                recommendations.append({
                    'type': 'advance',
                    'priority': 'medium',
                    'title': "Ready for advanced topics",
                    'description': f"You've mastered {len(mastered_topics)} topics. Let's explore more!",
                    'action': 'explore',
                    'icon': '🚀'
                })
            
            # Sort by priority
            priority_order = {'high': 0, 'medium': 1, 'low': 2}
            recommendations.sort(key=lambda x: priority_order[x['priority']])
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}", exc_info=True)
            return []


# Singleton instance
adaptive_explainer_service = AdaptiveExplainerService()
