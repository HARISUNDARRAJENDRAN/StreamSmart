# Feature 3: Real-Time Affective State Monitor

## Overview
An emotion-aware AI system that uses computer vision, voice analysis, and behavioral signals to detect student emotional states in real-time and dynamically adapt learning content, difficulty, and pacing. Based on 2025 affective computing research achieving 70-79% emotion recognition accuracy.

## Core Functionality

### 1. Multi-Modal Emotion Detection
- **Facial Expression Analysis**: CNN-based emotion recognition (happy, sad, frustrated, confused, engaged, bored)
- **Voice Tone Analysis**: Prosody and sentiment analysis from voice interactions
- **Behavioral Signals**: Mouse movement patterns, typing speed, pause duration, video rewind frequency
- **Physiological Data** (optional): Heart rate via webcam photoplethysmography or wearable integration

### 2. Adaptive Content Delivery
- **Frustration Detection**: Automatically provide hints or alternative explanations when frustration detected
- **Boredom Response**: Skip repetitive content or introduce gamification elements
- **Confusion Intervention**: Trigger contextual help, simplified explanations, or prerequisite content
- **Engagement Optimization**: Adjust video playback speed, insert interactive elements

### 3. Emotional Learning Analytics
- **Emotion Timeline**: Track emotional states throughout learning sessions
- **Trigger Identification**: Identify content that consistently causes confusion or frustration
- **Optimal State Tracking**: Measure time spent in "flow state" (optimal engagement)
- **Emotional Learning Profiles**: Build personalized emotional response patterns

## Technical Implementation

### Backend Architecture (Python/FastAPI)

```python
# New Service: services/affective_state_monitor_service.py

import cv2
import numpy as np
from deepface import DeepFace
from transformers import pipeline
import asyncio
from datetime import datetime
from typing import Dict, List, Optional

class EmotionState:
    """Detected emotional state"""
    def __init__(
        self,
        dominant_emotion: str,
        emotion_scores: Dict[str, float],
        valence: float,  # -1 (negative) to +1 (positive)
        arousal: float,  # 0 (calm) to 1 (excited)
        confidence: float,
        timestamp: datetime
    ):
        self.dominant_emotion = dominant_emotion
        self.emotion_scores = emotion_scores
        self.valence = valence
        self.arousal = arousal
        self.confidence = confidence
        self.timestamp = timestamp

class FacialEmotionDetector:
    """
    Facial emotion recognition using DeepFace
    Emotions: happy, sad, angry, surprise, fear, disgust, neutral
    """

    def __init__(self):
        # Pre-load model for faster inference
        self.model = None
        self.emotion_mapping = {
            'happy': {'valence': 0.8, 'arousal': 0.6},
            'sad': {'valence': -0.6, 'arousal': 0.3},
            'angry': {'valence': -0.7, 'arousal': 0.8},
            'surprise': {'valence': 0.2, 'arousal': 0.9},
            'fear': {'valence': -0.8, 'arousal': 0.7},
            'disgust': {'valence': -0.6, 'arousal': 0.5},
            'neutral': {'valence': 0.0, 'arousal': 0.3}
        }

    async def detect_emotion(self, image_base64: str) -> EmotionState:
        """
        Detect emotion from base64 encoded image
        """
        # Decode image
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run DeepFace analysis
        try:
            result = DeepFace.analyze(
                img,
                actions=['emotion'],
                enforce_detection=False,
                detector_backend='opencv'
            )

            emotions = result[0]['emotion']
            dominant = result[0]['dominant_emotion']

            # Map to valence-arousal space
            va = self.emotion_mapping.get(dominant, {'valence': 0, 'arousal': 0.5})

            return EmotionState(
                dominant_emotion=dominant,
                emotion_scores=emotions,
                valence=va['valence'],
                arousal=va['arousal'],
                confidence=emotions[dominant] / 100.0,
                timestamp=datetime.utcnow()
            )

        except Exception as e:
            # Return neutral if detection fails
            return EmotionState(
                dominant_emotion='neutral',
                emotion_scores={'neutral': 100},
                valence=0.0,
                arousal=0.3,
                confidence=0.0,
                timestamp=datetime.utcnow()
            )

class BehavioralSignalAnalyzer:
    """
    Analyze behavioral signals for emotional state inference
    """

    def __init__(self):
        self.frustration_indicators = [
            'rapid_rewinding',      # Watching same section repeatedly
            'fast_clicking',        # Rapid UI interactions
            'long_pauses',          # Extended inactivity
            'quiz_failures'         # Multiple incorrect attempts
        ]

    async def analyze_behavior(
        self,
        user_id: str,
        session_events: List[Dict]
    ) -> Dict[str, float]:
        """
        Calculate frustration/confusion scores from behavior
        """
        scores = {
            'frustration': 0.0,
            'confusion': 0.0,
            'engagement': 0.5,  # Default neutral
            'flow_state': 0.0
        }

        # Analyze video interactions
        rewind_count = sum(1 for e in session_events if e['type'] == 'rewind')
        if rewind_count > 3:
            scores['confusion'] = min(1.0, rewind_count / 10)

        # Analyze quiz performance
        quiz_failures = sum(1 for e in session_events if e['type'] == 'quiz_wrong')
        if quiz_failures > 2:
            scores['frustration'] = min(1.0, quiz_failures / 5)

        # Detect flow state (consistent engagement without interruptions)
        if self._is_flow_state(session_events):
            scores['flow_state'] = 0.8
            scores['engagement'] = 0.9

        return scores

    def _is_flow_state(self, events: List[Dict]) -> bool:
        """
        Detect if user is in flow state
        Criteria: 10+ minutes of continuous engagement without pauses
        """
        if len(events) < 10:
            return False

        # Check for continuous play without long pauses
        continuous_time = 0
        for i in range(1, len(events)):
            time_diff = (
                events[i]['timestamp'] - events[i-1]['timestamp']
            ).total_seconds()

            if time_diff < 5:  # Less than 5 second gap
                continuous_time += time_diff
            else:
                continuous_time = 0

            if continuous_time > 600:  # 10 minutes continuous
                return True

        return False

class AffectiveStateMonitor:
    """
    Main service for emotion monitoring and adaptive responses
    """

    def __init__(self, db_service):
        self.db = db_service
        self.facial_detector = FacialEmotionDetector()
        self.behavioral_analyzer = BehavioralSignalAnalyzer()

    async def process_emotion_snapshot(
        self,
        user_id: str,
        session_id: str,
        image_base64: Optional[str] = None,
        audio_features: Optional[Dict] = None
    ) -> Dict:
        """
        Process emotion detection from multiple modalities
        """
        emotion_data = {
            'timestamp': datetime.utcnow(),
            'user_id': user_id,
            'session_id': session_id
        }

        # Facial emotion detection
        if image_base64:
            facial_emotion = await self.facial_detector.detect_emotion(image_base64)
            emotion_data['facial'] = {
                'emotion': facial_emotion.dominant_emotion,
                'valence': facial_emotion.valence,
                'arousal': facial_emotion.arousal,
                'confidence': facial_emotion.confidence
            }

        # Behavioral analysis
        recent_events = await self._get_recent_events(user_id, session_id)
        behavioral_scores = await self.behavioral_analyzer.analyze_behavior(
            user_id,
            recent_events
        )
        emotion_data['behavioral'] = behavioral_scores

        # Fuse modalities
        fused_state = self._fuse_emotional_states(
            emotion_data.get('facial'),
            emotion_data.get('behavioral')
        )

        # Determine adaptive intervention
        intervention = await self._determine_intervention(fused_state)

        # Save to database
        await self._save_emotion_state(user_id, session_id, emotion_data, fused_state)

        return {
            'emotional_state': fused_state,
            'intervention': intervention,
            'raw_data': emotion_data
        }

    def _fuse_emotional_states(
        self,
        facial: Optional[Dict],
        behavioral: Dict
    ) -> Dict:
        """
        Fuse multiple emotion signals into unified state
        """
        fused = {
            'valence': 0.0,
            'arousal': 0.5,
            'frustration': behavioral.get('frustration', 0.0),
            'confusion': behavioral.get('confusion', 0.0),
            'engagement': behavioral.get('engagement', 0.5),
            'flow_state': behavioral.get('flow_state', 0.0)
        }

        # Weight facial emotion if available
        if facial and facial['confidence'] > 0.5:
            fused['valence'] = 0.6 * facial['valence'] + 0.4 * fused['valence']
            fused['arousal'] = 0.6 * facial['arousal'] + 0.4 * fused['arousal']

        return fused

    async def _determine_intervention(self, emotional_state: Dict) -> Dict:
        """
        Determine appropriate adaptive intervention
        """
        intervention = {
            'type': 'none',
            'action': None,
            'message': None
        }

        # High frustration
        if emotional_state['frustration'] > 0.7:
            intervention = {
                'type': 'frustration_support',
                'action': 'offer_hint',
                'message': "This concept can be tricky. Would you like a hint or a different explanation?"
            }

        # High confusion
        elif emotional_state['confusion'] > 0.7:
            intervention = {
                'type': 'confusion_intervention',
                'action': 'simplify_content',
                'message': "Let me show you a simpler explanation of this concept."
            }

        # Low engagement (boredom)
        elif emotional_state['engagement'] < 0.3:
            intervention = {
                'type': 'engagement_boost',
                'action': 'introduce_gamification',
                'message': "Ready for a quick challenge? Test your understanding!"
            }

        # Flow state - don't interrupt!
        elif emotional_state['flow_state'] > 0.7:
            intervention = {
                'type': 'flow_maintenance',
                'action': 'minimize_interruptions',
                'message': None
            }

        return intervention

    async def _save_emotion_state(
        self,
        user_id: str,
        session_id: str,
        raw_data: Dict,
        fused_state: Dict
    ):
        """
        Save emotion state to DynamoDB
        """
        await self.db.put_item(
            TableName="EmotionalStates",
            Item={
                "PK": f"USER#{user_id}",
                "SK": f"SESSION#{session_id}#{raw_data['timestamp'].isoformat()}",
                "userId": user_id,
                "sessionId": session_id,
                "timestamp": raw_data['timestamp'].isoformat(),
                "facialEmotion": raw_data.get('facial'),
                "behavioralScores": raw_data.get('behavioral'),
                "fusedState": fused_state,
                "ttl": int((datetime.utcnow() + timedelta(days=90)).timestamp())
            }
        )
```

### DynamoDB Schema

```typescript
// Table: EmotionalStates
{
  PK: "USER#{userId}",
  SK: "SESSION#{sessionId}#{timestamp}",
  userId: string,
  sessionId: string,
  timestamp: timestamp,

  // Facial emotion data
  facialEmotion?: {
    emotion: 'happy' | 'sad' | 'angry' | 'surprise' | 'fear' | 'disgust' | 'neutral',
    valence: number,        // -1 to +1
    arousal: number,        // 0 to 1
    confidence: number      // 0 to 1
  },

  // Behavioral scores
  behavioralScores: {
    frustration: number,    // 0 to 1
    confusion: number,      // 0 to 1
    engagement: number,     // 0 to 1
    flow_state: number      // 0 to 1
  },

  // Fused emotional state
  fusedState: {
    valence: number,
    arousal: number,
    frustration: number,
    confusion: number,
    engagement: number,
    flow_state: number
  },

  ttl: number,  // Auto-delete after 90 days

  // GSI: sessionId-timestamp-index
}

// Table: EmotionalInterventions
{
  PK: "USER#{userId}",
  SK: "INTERVENTION#{timestamp}",
  userId: string,
  sessionId: string,
  emotionalState: object,
  interventionType: string,
  interventionAction: string,
  userResponse?: 'accepted' | 'dismissed' | 'ignored',
  effectiveness?: number,  // 0-1 scale based on subsequent engagement
  timestamp: timestamp
}
```

### Frontend Components (Next.js/React)

```typescript
// components/affective-monitoring/EmotionMonitor.tsx

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/CognitoAuthContext';

export function EmotionMonitor({
  sessionId,
  onIntervention,
}: {
  sessionId: string;
  onIntervention: (intervention: any) => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    if (!consentGiven || !user) return;

    // Capture emotion snapshot every 30 seconds
    const interval = setInterval(async () => {
      await captureEmotionSnapshot();
    }, 30000);

    return () => clearInterval(interval);
  }, [consentGiven, user]);

  const captureEmotionSnapshot = async () => {
    if (!videoRef.current) return;

    // Capture frame from webcam
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);

    const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

    // Send to backend
    const response = await fetch('/api/affective-state/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        imageBase64,
      }),
    });

    const result = await response.json();

    // Handle intervention
    if (result.intervention?.type !== 'none') {
      onIntervention(result.intervention);
    }
  };

  const requestWebcamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsMonitoring(true);
      setConsentGiven(true);
    } catch (err) {
      console.error('Webcam access denied:', err);
    }
  };

  if (!consentGiven) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2">Enable Emotion-Aware Learning?</h3>
        <p className="text-sm text-gray-700 mb-4">
          StreamSmart can adapt to your emotional state to provide a more
          personalized learning experience. This requires camera access.
        </p>
        <button
          onClick={requestWebcamAccess}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Enable Adaptive Learning
        </button>
      </div>
    );
  }

  return (
    <div className="hidden">
      <video ref={videoRef} autoPlay muted />
    </div>
  );
}

// components/affective-monitoring/InterventionModal.tsx

export function InterventionModal({
  intervention,
  onAccept,
  onDismiss,
}: {
  intervention: any;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-sm border-l-4 border-blue-500 animate-slide-in">
      <p className="text-sm mb-3">{intervention.message}</p>

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Yes, please
        </button>
        <button
          onClick={onDismiss}
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
        >
          No, thanks
        </button>
      </div>
    </div>
  );
}
```

## User Experience Considerations

### 1. Privacy & Consent
- **Explicit Consent**: Clear opt-in with explanation of data usage
- **Privacy Controls**: Allow users to disable emotion monitoring anytime
- **Data Transparency**: Show what emotion data is collected and when
- **Local Processing Option**: Offer on-device emotion detection (no server upload)

### 2. Non-Intrusive Interventions
- **Subtle Suggestions**: Use gentle nudges rather than disruptive interruptions
- **Timing Sensitivity**: Avoid interrupting during flow state
- **User Control**: Always allow dismissal of suggestions
- **Learning from Responses**: Adapt intervention frequency based on user preferences

### 3. Emotion Analytics Dashboard
- **Emotion Timeline**: Visualize emotional journey through learning session
- **Trigger Analysis**: Identify concepts that cause frustration/confusion
- **Optimal Learning Times**: Recommend study times based on historical emotional patterns
- **Progress Correlation**: Show relationship between emotional state and learning outcomes

## Integration Requirements

### 1. Existing Systems
- **Video Player**: Integrate emotion monitoring during video playback
- **Quiz System**: Detect frustration from repeated wrong answers
- **Activity Tracking**: Log emotion states alongside other learning activities
- **Adaptive Learning Path**: Use emotional state to adjust difficulty

### 2. External Dependencies
- **DeepFace Library**: Facial emotion recognition
- **OpenCV**: Image processing
- **Webcam Access**: Browser getUserMedia API
- **Optional: Wearables**: Integration with Apple Watch, Fitbit for heart rate

## Success Metrics

### Primary Metrics
1. **Intervention Effectiveness**: Improvement in engagement after intervention (target: +30%)
2. **Emotion Detection Accuracy**: Validation against self-reported emotions (target: >70%)
3. **User Adoption**: % of users enabling emotion monitoring (target: 40%+)

### Secondary Metrics
1. **Flow State Time**: Increase in time spent in optimal engagement (target: +25%)
2. **Frustration Reduction**: Decrease in frustration-triggered session abandonment (target: -40%)
3. **Privacy Comfort**: User satisfaction with privacy controls (target: 4.5+/5.0)

## Implementation Timeline

- **Week 1-2**: Facial emotion detection setup (DeepFace integration)
- **Week 3-4**: Behavioral signal analyzer
- **Week 5-6**: Intervention logic and API
- **Week 7-8**: Frontend components and webcam integration
- **Week 9-10**: Privacy controls and analytics dashboard

## Privacy & Ethical Considerations

1. **No Face Storage**: Process images in real-time, discard immediately
2. **Aggregated Analytics Only**: Store emotion scores, not raw images
3. **GDPR/CCPA Compliance**: Right to deletion, data portability
4. **Bias Mitigation**: Test across diverse demographics, ethnicities
5. **Transparency Report**: Publish accuracy metrics and limitations

## References

- DeepFace: Deep Learning Face Recognition Library
- 2025 Research: Emotion recognition achieving 70-79% accuracy
- Affective Computing: AI techniques for emotion detection
- Educational Psychology: Emotion's role in learning
