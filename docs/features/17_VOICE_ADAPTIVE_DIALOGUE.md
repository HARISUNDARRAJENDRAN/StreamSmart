# Feature 17: Voice-Enabled Adaptive Dialogue System

## Overview
Hands-free, emotion-aware conversational AI that allows students to learn through natural dialogue. Integrates with existing Amazon Lex infrastructure but adds emotion detection from voice prosody, adaptive dialogue management, and Socratic questioning.

## Core Functionality

### 1. Voice Emotion Detection
- **Prosody Analysis**: Pitch, tempo, energy for emotion detection
- **Sentiment Analysis**: Positive/negative/neutral tone
- **Frustration Detection**: Voice strain, hesitation, sighs
- **Confidence Assessment**: Voice certainty vs uncertainty markers

### 2. Adaptive Dialogue Management
- **Context Awareness**: Maintain conversation state across sessions
- **Dynamic Response**: Adjust based on emotional state and comprehension
- **Clarification Requests**: "Did I explain that clearly?"
- **Paraphrasing**: Rephrase complex explanations if confusion detected

### 3. Hands-Free Learning
- **During Exercise**: Learn while running, walking, exercising
- **Driving Mode**: Safe learning during commute
- **Accessibility**: Support for visually impaired learners
- **Multitasking**: Study while doing chores, cooking

## Technical Implementation

```python
# services/voice_adaptive_dialogue_service.py

import librosa
import numpy as np
from amazon_lex import LexRuntime

class VoiceEmotionDetector:
    """Detect emotion from voice prosody"""

    def analyze_voice_emotion(
        self,
        audio_data: bytes
    ) -> Dict:
        """
        Extract emotional features from voice
        """
        # Load audio
        y, sr = librosa.load(io.BytesIO(audio_data), sr=16000)

        # Extract prosodic features
        pitch = librosa.yin(y, fmin=75, fmax=600)
        energy = librosa.feature.rms(y=y)[0]
        tempo = librosa.beat.tempo(y=y, sr=sr)[0]
        zcr = librosa.feature.zero_crossing_rate(y)[0]

        # Calculate emotion indicators
        pitch_mean = np.mean(pitch[~np.isnan(pitch)])
        pitch_variance = np.var(pitch[~np.isnan(pitch)])
        energy_mean = np.mean(energy)

        # Map to emotions
        # High pitch variance + high energy = excited/frustrated
        # Low pitch + low energy = sad/bored
        # Moderate + steady = calm/neutral

        emotion = {
            'valence': self._calculate_valence(pitch_mean, energy_mean),
            'arousal': self._calculate_arousal(pitch_variance, energy_mean),
            'dominant_emotion': self._classify_emotion(pitch_mean, energy_mean, pitch_variance),
            'confidence': 0.75
        }

        return emotion

    def _classify_emotion(
        self,
        pitch: float,
        energy: float,
        variance: float
    ) -> str:
        """Classify into discrete emotion"""
        if energy > 0.5 and variance > 0.3:
            return 'excited' if pitch > 200 else 'frustrated'
        elif energy < 0.2:
            return 'bored' if pitch < 150 else 'calm'
        else:
            return 'engaged'

class AdaptiveDialogueManager:
    """Manage adaptive voice conversations"""

    def __init__(self):
        self.lex_client = LexRuntime()
        self.emotion_detector = VoiceEmotionDetector()

    async def process_voice_input(
        self,
        user_id: str,
        audio_data: bytes,
        session_id: str
    ) -> Dict:
        """
        Process voice input with emotion awareness
        """
        # Detect emotion from voice
        emotion = self.emotion_detector.analyze_voice_emotion(audio_data)

        # Transcribe audio
        transcript = await self._transcribe_audio(audio_data)

        # Get Lex response
        lex_response = await self._get_lex_response(
            user_id,
            transcript,
            session_id
        )

        # Adapt response based on emotion
        if emotion['dominant_emotion'] == 'frustrated':
            # Simplify explanation
            adapted_response = await self._simplify_explanation(
                lex_response['message']
            )
            adapted_response = "I sense this is tricky. Let me explain it more simply: " + adapted_response
        elif emotion['dominant_emotion'] == 'bored':
            # Make more engaging
            adapted_response = await self._make_engaging(
                lex_response['message']
            )
        else:
            adapted_response = lex_response['message']

        # Generate audio response
        audio_response = await self._text_to_speech(adapted_response)

        return {
            'transcript': transcript,
            'emotion': emotion,
            'response_text': adapted_response,
            'response_audio': audio_response,
            'session_state': lex_response['sessionState']
        }

    async def _simplify_explanation(self, text: str) -> str:
        """Simplify complex explanation"""
        prompt = f"""
        Simplify this explanation for someone who's struggling:

        Original: {text}

        Make it:
        - Shorter and clearer
        - Use simpler words
        - Add a concrete example
        - Encouraging tone

        Return simplified version.
        """

        simplified = await self._call_llm(prompt)
        return simplified

    async def conduct_socratic_voice_dialogue(
        self,
        user_id: str,
        topic: str,
        session_id: str
    ) -> Dict:
        """
        Voice-based Socratic questioning
        """
        # Initialize dialogue
        dialogue_state = {
            'topic': topic,
            'question_count': 0,
            'student_understanding': 0.0,
            'conversation_history': []
        }

        initial_question = await self._generate_socratic_question(
            topic,
            dialogue_state
        )

        # Convert to speech
        audio_question = await self._text_to_speech(initial_question)

        return {
            'question_text': initial_question,
            'question_audio': audio_question,
            'session_id': session_id,
            'awaiting_response': True
        }

class HandsFreeLearningOrchestrator:
    """Optimize for hands-free learning scenarios"""

    async def start_exercise_learning_session(
        self,
        user_id: str,
        topic: str,
        exercise_type: str  # running, walking, etc.
    ) -> Dict:
        """
        Start voice-only learning during exercise
        """
        # Select appropriate content format
        if exercise_type == 'running':
            # Higher tempo, shorter segments
            content = await self._format_for_running(topic)
        elif exercise_type == 'walking':
            # Moderate pace, reflection prompts
            content = await self._format_for_walking(topic)

        # Generate audio lesson
        audio_lesson = await self._create_audio_lesson(content)

        return {
            'audio_url': audio_lesson,
            'duration_minutes': content['duration'],
            'pause_points': content['pause_points'],  # For reflection
            'summary': content['summary']
        }
```

## Success Metrics
- **Emotion Detection Accuracy**: 75%+ accuracy from voice alone
- **Engagement**: 3x longer learning sessions with voice interaction
- **Accessibility**: 90%+ satisfaction from visually impaired users
- **Hands-Free Usage**: 40%+ use during exercise or commute

## References
- Amazon Lex integration (existing infrastructure)
- Prosody analysis for emotion detection
- Voice user interface (VUI) best practices
- Conversational AI design
