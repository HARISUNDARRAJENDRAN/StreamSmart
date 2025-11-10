# 🔥 Concept Momentum: Strike While the Neural Iron is Hot

> *"The secret to getting ahead is getting started. The secret to getting started is breaking your complex overwhelming tasks into small manageable tasks, and starting on the first one."* — Mark Twain

---

## The Insight

**Learning compounds. But only if you strike while the iron is hot.**

Your brain right now has certain concepts **active**:
- You just watched a video on React hooks
- You asked 3 questions about closures
- You're reading about async patterns

**These concepts are HOT in your neural network.**

The best time to learn related concepts? **RIGHT NOW.**

The worst time? Next week, when the activation has cooled.

---

## Core Philosophy

### 1. **Neural Activation Windows**

Neuroscience truth: Concepts that are simultaneously active form stronger connections.

If you're thinking about:
- Promises (activation: 90%)
- Async functions (activation: 85%)

The BEST time to learn about:
- Await syntax (perfect connection point)
- Error handling in async (natural next step)
- Promise.all (leverages active knowledge)

### 2. **Momentum is Perishable**

```
Today: "I'm so into React hooks!"
  → Perfect time to learn custom hooks, useEffect, etc.

Next week: "What was I learning again?"
  → Momentum lost, starting from scratch
```

**Concept Momentum captures fleeting windows of peak learning opportunity.**

### 3. **Visual Heatmap**

Show learners what's hot in their brain:

```
🔥🔥🔥 Async/Await (watching now, asked 3 questions)
🔥🔥   Promises (watched yesterday, still warm)
🔥     Closures (watched 3 days ago, cooling down)
       Event Loop (watched 2 weeks ago, cold)
```

---

## User Experience

### Real-Time Heatmap

**New widget on dashboard:**

```
┌────────────────────────────────────────────┐
│  🔥 Your Hot Concepts (Right Now)         │
├────────────────────────────────────────────┤
│                                            │
│  React Hooks          🔥🔥🔥🔥🔥 92%   │
│  JavaScript Closures  🔥🔥🔥    67%     │
│  Async Patterns       🔥🔥      52%     │
│  TypeScript Generics  🔥        34%     │
│  CSS Grid                       12%     │
│                                            │
│  💡 Strike while hot:                     │
│  → Custom React Hooks Tutorial            │
│  → Closures in Event Handlers             │
│  → Error Handling in Async Code           │
│                                            │
│  [View Full Heatmap]                       │
└────────────────────────────────────────────┘
```

### Momentum-Driven Recommendations

**Smart suggestions based on activation:**

```
┌────────────────────────────────────────────┐
│  🎯 Perfect Time to Learn                 │
├────────────────────────────────────────────┤
│  You're hot on React Hooks right now!     │
│                                            │
│  These concepts will click easily:         │
│                                            │
│  1. Custom Hooks                           │
│     ├─ Builds on: useState, useEffect     │
│     ├─ Difficulty: Medium                  │
│     └─ Momentum Match: 95% 🔥             │
│                                            │
│  2. useCallback & useMemo                  │
│     ├─ Builds on: React rendering         │
│     ├─ Difficulty: Medium-Hard            │
│     └─ Momentum Match: 88% 🔥             │
│                                            │
│  3. Context API                            │
│     ├─ Builds on: Component props         │
│     ├─ Difficulty: Medium                  │
│     └─ Momentum Match: 82% 🔥             │
│                                            │
│  ⚠️  Skip for now (too cold):             │
│  - Redux Toolkit (need warm-up on state)  │
│  - GraphQL (unrelated momentum)            │
│                                            │
│  [Start Learning] [Save for Later]        │
└────────────────────────────────────────────┘
```

### Concept Activation Timeline

**Visualize activation over time:**

```
┌────────────────────────────────────────────┐
│  React Hooks - Activation Over Time        │
├────────────────────────────────────────────┤
│                                            │
│  100% │                    ●●●● (Now)     │
│       │                  ●●                │
│   75% │              ●●                    │
│       │           ●●                       │
│   50% │        ●●                          │
│       │     ●●                             │
│   25% │  ●●                                │
│       │●                                   │
│    0% └────────────────────────────────────│
│       3d    2d    1d    Now    +1d   +3d  │
│                                            │
│  Events:                                   │
│  3d ago: First watched intro video         │
│  2d ago: Asked 2 questions in chat        │
│  1d ago: Took quiz (85%)                  │
│  Now: Watching advanced patterns          │
│                                            │
│  ⚠️  Predicted cooldown in 2 days         │
│     Complete related content soon!         │
└────────────────────────────────────────────┘
```

### Momentum Alerts

**Notifications when momentum is optimal:**

```
┌────────────────────────────────────────────┐
│  🔔 Momentum Alert                         │
├────────────────────────────────────────────┤
│  Your understanding of "Promises" is at    │
│  peak activation (87%)!                    │
│                                            │
│  Perfect time to learn:                    │
│  • Async/Await syntax                      │
│  • Promise chaining patterns               │
│                                            │
│  This window closes in ~24 hours          │
│                                            │
│  [Learn Now] [Remind Me Tomorrow]         │
└────────────────────────────────────────────┘
```

---

## Technical Architecture

### Data Model

**DynamoDB Table**: `ConceptActivation`

```javascript
{
  activationId: string;        // userId#conceptId (composite key)
  userId: string;              // User
  conceptId: string;           // Concept (e.g., "react-hooks")
  conceptName: string;         // Display name

  // Activation Score (0-100)
  activationScore: number;     // Current "heat" level
  lastUpdated: string;         // When score was last calculated

  // Activation Signals (inputs to score)
  signals: {
    lastWatched: string;           // ISO timestamp of last related video
    timeSinceLastWatch: number;    // Hours
    questionsAsked: number;        // Questions about this concept
    videosWatched: number;         // Related videos watched
    quizzesTaken: number;          // Quizzes on this concept
    emotionalEngagement: number;   // 0-100, from emotional reactions
    timeSpentRecently: number;     // Minutes in last 7 days
  },

  // Decay Parameters
  decayRate: number;           // How fast activation decreases
  halfLife: number;            // Hours until activation drops to 50%

  // Predictions
  predictedPeakDate: string;   // When activation will be highest
  predictedCooldown: string;   // When activation drops below threshold

  // Related Concepts
  relatedHotConcepts: string[]; // Other concepts currently hot

  createdAt: string;
  expiresAt: number;           // TTL: delete after 90 days of inactivity
}
```

**Indexes:**
- GSI: `userId-activationScore-index` (get hottest concepts)
- GSI: `userId-lastUpdated-index` (recalculate stale scores)

---

## Activation Score Algorithm

```python
def calculate_activation_score(signals: Dict) -> float:
    """
    Calculate concept activation score (0-100).

    Factors:
    1. Recency (exponential decay)
    2. Frequency (multiple interactions boost)
    3. Emotional engagement (strong signal)
    4. Time investment (depth indicator)
    """

    # Base score from recency (exponential decay)
    hours_since_last = signals['timeSinceLastWatch']
    recency_score = 100 * math.exp(-hours_since_last / 24)  # 24-hour half-life

    # Frequency boost (multiple interactions)
    frequency_multiplier = 1 + math.log(1 + signals['videosWatched']) * 0.2
    frequency_multiplier += signals['questionsAsked'] * 0.1
    frequency_multiplier += signals['quizzesTaken'] * 0.15

    # Emotional engagement boost
    emotional_boost = signals['emotionalEngagement'] * 0.3

    # Time investment boost
    time_boost = min(signals['timeSpentRecently'] / 60, 1) * 20  # Cap at 20 points

    # Combine factors
    activation = recency_score * frequency_multiplier + emotional_boost + time_boost

    return min(activation, 100)  # Cap at 100
```

---

## API Endpoints

```python
@app.get("/api/momentum/heatmap/{user_id}")
async def get_concept_heatmap(user_id: str, limit: int = 10):
    """
    Get top N hottest concepts for user.
    Returns sorted by activation score.
    """
    pass


@app.get("/api/momentum/recommendations/{user_id}")
async def get_momentum_recommendations(
    user_id: str,
    concept_id: Optional[str] = None  # Recommendations based on specific hot concept
):
    """
    Recommend content based on current momentum.
    High activation concepts = high priority suggestions.
    """
    pass


@app.post("/api/momentum/update")
async def update_concept_activation(
    user_id: str,
    concept_id: str,
    event_type: str,  # 'video_watched', 'question_asked', 'quiz_taken'
    metadata: Dict
):
    """
    Update activation score when user interacts with concept.
    Called after every relevant event.
    """
    pass


@app.get("/api/momentum/timeline/{concept_id}")
async def get_activation_timeline(
    concept_id: str,
    user_id: str
):
    """
    Retrieve activation history for visualization.
    Shows how concept heated up and cooled down.
    """
    pass


@app.get("/api/momentum/alerts/{user_id}")
async def get_momentum_alerts(user_id: str):
    """
    Get concepts at peak activation (perfect learning window).
    Used for notifications.
    """
    pass


@app.post("/api/momentum/recalculate")
async def recalculate_all_activations(user_id: str):
    """
    Background job: recalculate all activation scores.
    Run every 6 hours via Lambda.
    """
    pass
```

---

## AI Service

**Service**: `python_backend/services/momentum_tracking_service.py`

```python
"""
Momentum Tracking Service
Tracks concept activation in real-time, predicts optimal learning windows.
"""

import math
from datetime import datetime, timedelta
from typing import Dict, List

class MomentumTrackingService:

    DECAY_HALF_LIFE = 24  # Hours

    def update_activation(
        self,
        user_id: str,
        concept_id: str,
        event_type: str,
        metadata: Dict
    ):
        """
        Update concept activation when user interacts.
        """

        # Get current activation
        current = self._get_activation(user_id, concept_id)

        # Update signals based on event
        if event_type == 'video_watched':
            current['signals']['videosWatched'] += 1
            current['signals']['lastWatched'] = datetime.utcnow().isoformat()
            current['signals']['timeSpentRecently'] += metadata.get('duration', 0)

        elif event_type == 'question_asked':
            current['signals']['questionsAsked'] += 1

        elif event_type == 'quiz_taken':
            current['signals']['quizzesTaken'] += 1

        elif event_type == 'emotional_reaction':
            # Boost from emotional engagement
            emotion = metadata.get('emotion')
            if emotion in ['aha', 'mind_blown', 'love', 'excited']:
                current['signals']['emotionalEngagement'] += 10

        # Recalculate activation score
        current['activationScore'] = self.calculate_activation_score(current['signals'])
        current['lastUpdated'] = datetime.utcnow().isoformat()

        # Predict cooldown
        current['predictedCooldown'] = self._predict_cooldown(current)

        # Save
        self._save_activation(user_id, concept_id, current)


    def calculate_activation_score(self, signals: Dict) -> float:
        """Calculate activation score (0-100)."""

        # Time since last interaction
        last_watched = datetime.fromisoformat(signals.get('lastWatched', datetime.utcnow().isoformat()))
        hours_since = (datetime.utcnow() - last_watched).total_seconds() / 3600

        # Exponential decay based on recency
        recency_score = 100 * math.exp(-hours_since / self.DECAY_HALF_LIFE)

        # Frequency multiplier
        frequency = 1 + math.log(1 + signals.get('videosWatched', 0)) * 0.2
        frequency += signals.get('questionsAsked', 0) * 0.1
        frequency += signals.get('quizzesTaken', 0) * 0.15

        # Emotional boost
        emotional = signals.get('emotionalEngagement', 0) * 0.3

        # Time investment
        time_boost = min(signals.get('timeSpentRecently', 0) / 60, 1) * 20

        # Combine
        activation = recency_score * frequency + emotional + time_boost

        return min(round(activation, 1), 100)


    def get_hot_concepts(
        self,
        user_id: str,
        threshold: float = 50.0,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get concepts above activation threshold.
        Sorted by score descending.
        """

        # Query DynamoDB GSI: userId-activationScore-index
        activations = self._query_user_activations(user_id)

        # Filter and sort
        hot = [
            a for a in activations
            if a['activationScore'] >= threshold
        ]

        hot.sort(key=lambda x: x['activationScore'], reverse=True)

        return hot[:limit]


    def recommend_based_on_momentum(
        self,
        user_id: str,
        available_content: List[Dict]
    ) -> List[Dict]:
        """
        Score and rank content based on momentum match.
        Content that builds on hot concepts = high score.
        """

        hot_concepts = self.get_hot_concepts(user_id)
        hot_concept_ids = set(c['conceptId'] for c in hot_concepts)

        scored_content = []

        for content in available_content:
            content_concepts = content.get('concepts', [])

            # Momentum match score
            match_score = 0
            for concept in content_concepts:
                if concept in hot_concept_ids:
                    # Find activation level
                    activation = next(
                        (c['activationScore'] for c in hot_concepts if c['conceptId'] == concept),
                        0
                    )
                    match_score += activation

            # Average match score
            if content_concepts:
                match_score /= len(content_concepts)

            scored_content.append({
                'content': content,
                'momentumMatch': match_score,
                'reason': self._generate_recommendation_reason(content, hot_concepts)
            })

        # Sort by momentum match
        scored_content.sort(key=lambda x: x['momentumMatch'], reverse=True)

        return scored_content


    def predict_optimal_learning_window(
        self,
        concept_id: str,
        user_id: str
    ) -> Dict:
        """
        Predict when concept will be at peak activation.
        """

        activation = self._get_activation(user_id, concept_id)

        current_score = activation['activationScore']
        hours_since_last = (
            datetime.utcnow() -
            datetime.fromisoformat(activation['signals']['lastWatched'])
        ).total_seconds() / 3600

        # If recently interacted, peak is now
        if hours_since_last < 2:
            peak_time = datetime.utcnow()
            window_duration = 24  # Hours

        # Otherwise, predict based on decay
        else:
            # Peak was at last interaction
            peak_time = datetime.fromisoformat(activation['signals']['lastWatched'])
            window_duration = self.DECAY_HALF_LIFE

        window_end = peak_time + timedelta(hours=window_duration)

        return {
            'peakTime': peak_time.isoformat(),
            'windowCloses': window_end.isoformat(),
            'hoursRemaining': (window_end - datetime.utcnow()).total_seconds() / 3600,
            'isOptimalNow': current_score > 70
        }


    def _predict_cooldown(self, activation: Dict) -> str:
        """Predict when activation will drop below threshold."""
        current_score = activation['activationScore']
        threshold = 30  # Below this = "cold"

        if current_score <= threshold:
            return datetime.utcnow().isoformat()

        # Calculate hours until cooldown
        decay_rate = math.log(2) / self.DECAY_HALF_LIFE
        hours_until_threshold = math.log(threshold / current_score) / -decay_rate

        cooldown_time = datetime.utcnow() + timedelta(hours=hours_until_threshold)
        return cooldown_time.isoformat()


    def _generate_recommendation_reason(
        self,
        content: Dict,
        hot_concepts: List[Dict]
    ) -> str:
        """Generate explanation for recommendation."""

        matching_concepts = [
            c['conceptName'] for c in hot_concepts
            if c['conceptId'] in content.get('concepts', [])
        ]

        if not matching_concepts:
            return "Builds on concepts you've been exploring"

        if len(matching_concepts) == 1:
            return f"Perfect timing! Builds on {matching_concepts[0]} which is hot right now 🔥"

        return f"Great momentum match! Builds on {', '.join(matching_concepts[:2])} 🔥"


    def _get_activation(self, user_id: str, concept_id: str) -> Dict:
        """Fetch activation record from DynamoDB."""
        # Implementation: DynamoDB get_item
        return {}  # Placeholder


    def _save_activation(self, user_id: str, concept_id: str, data: Dict):
        """Save activation record to DynamoDB."""
        # Implementation: DynamoDB put_item
        pass


    def _query_user_activations(self, user_id: str) -> List[Dict]:
        """Query all activations for user."""
        # Implementation: DynamoDB query
        return []  # Placeholder


# Export
momentum_tracking_service = MomentumTrackingService()
```

---

## Frontend Implementation

**Component**: `src/components/momentum/MomentumHeatmap.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

export function MomentumHeatmap({ userId }) {
  const [hotConcepts, setHotConcepts] = useState([]);

  useEffect(() => {
    loadHeatmap();
    // Refresh every 5 minutes
    const interval = setInterval(loadHeatmap, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadHeatmap = async () => {
    const res = await fetch(`/api/momentum/heatmap/${userId}`);
    const data = await res.json();
    setHotConcepts(data);
  };

  const getFlameCount = (score: number) => {
    if (score >= 80) return 5;
    if (score >= 60) return 4;
    if (score >= 40) return 3;
    if (score >= 20) return 2;
    return 1;
  };

  return (
    <div className="bg-card p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">
        🔥 Your Hot Concepts (Right Now)
      </h2>

      <div className="space-y-3">
        {hotConcepts.map((concept) => (
          <div
            key={concept.conceptId}
            className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
          >
            <div className="flex-1">
              <p className="font-medium">{concept.conceptName}</p>
              <p className="text-xs text-muted-foreground">
                Last activity: {formatRelativeTime(concept.signals.lastWatched)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: getFlameCount(concept.activationScore) }).map((_, i) => (
                  <Flame
                    key={i}
                    className="w-4 h-4 text-orange-500"
                    fill="currentColor"
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {concept.activationScore}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {hotConcepts.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Start watching videos to heat up your concepts! 🔥
        </p>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create ConceptActivation DynamoDB table
- [ ] Implement activation score algorithm
- [ ] Hook into video watch events
- [ ] Hook into chat question events
- [ ] Hook into quiz events
- [ ] Build real-time heatmap widget
- [ ] Implement momentum-based recommendations
- [ ] Create activation timeline visualization
- [ ] Build momentum alert system
- [ ] Lambda job: recalculate activations every 6 hours
- [ ] Test with real user behavior patterns

---

## Success Metrics

- **Recommendation CTR**: 3x higher click-through on momentum-based recommendations
- **Completion Rate**: 40% higher course completion when following momentum
- **Learning Velocity**: 25% more concepts learned per week with momentum guidance
- **User Feedback**: 75%+ say momentum alerts are helpful

---

## Conclusion

Learning compounds, but only when you strike while the iron is hot. Concept Momentum visualizes the invisible—what's active in your brain right now—and guides you to leverage fleeting windows of peak learning opportunity.

**The result?** Faster learning, stronger retention, and the feeling that everything is clicking into place.

---

## The Complete Vision

These eight features together transform StreamSmart into the world's most intelligent, empathetic, and effective learning companion:

1. **Curiosity Graph** - Your questions as a living network
2. **Emotional Learning** - Track how it feels, not just what you learned
3. **Socratic Mode** - AI that asks, not answers
4. **Learning Personality** - Your cognitive fingerprint
5. **Mirror Sessions** - Teach it back, automated Feynman technique
6. **Time-Travel Learning** - Your journey, revisited and celebrated
7. **Concept Momentum** - Strike while the neural iron is hot
8. **[All integrated]** - One coherent, adaptive, inevitable learning experience

**This is the future of education. Let's build it.**
