# Feature 2: FSRS-Based Intelligent Spaced Repetition System

## Overview
A cutting-edge spaced repetition system implementing the Free Spaced Repetition Scheduler (FSRS) algorithm, the most advanced open-source spaced repetition algorithm as of 2025. This system optimizes long-term memory retention by scheduling review sessions at scientifically optimal intervals based on each student's individual forgetting curve.

## Core Functionality

### 1. FSRS Algorithm Implementation
- **Adaptive Scheduling**: Calculate optimal review intervals using the FSRS v4.5+ algorithm
- **Individual Forgetting Curves**: Model each user's retention rate per knowledge domain
- **Difficulty Calibration**: Automatically adjust card difficulty based on review performance
- **Stability Tracking**: Track memory stability (how long until 90% retention probability)

### 2. Smart Card Generation
- **Auto-Generated Flashcards**: Extract key concepts from video transcripts using LLM
- **Cloze Deletions**: Automatically create fill-in-the-blank cards
- **Image Occlusion**: Generate cards from video frames with visual elements
- **Audio Flashcards**: For auditory learners, create audio-based review cards

### 3. Review Session Optimization
- **Daily Review Queue**: Prioritize cards due today + learning cards
- **Study Load Balancing**: Distribute reviews to prevent overwhelming sessions
- **Cramming Mode**: High-intensity review before assessments
- **Leeches Detection**: Identify consistently difficult cards for targeted intervention

## Technical Implementation

### Backend Architecture (Python/FastAPI)

```python
# New Service: services/fsrs_spaced_repetition_service.py

import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from enum import Enum

class Rating(Enum):
    """FSRS review ratings"""
    AGAIN = 1      # Complete failure
    HARD = 2       # Difficult recall
    GOOD = 3       # Successful recall with effort
    EASY = 4       # Effortless recall

class FSRSCard:
    """FSRS Card state"""
    def __init__(self):
        self.stability: float = 0.0        # S: memory stability (days)
        self.difficulty: float = 0.0       # D: card difficulty (0-10)
        self.elapsed_days: int = 0         # Days since last review
        self.scheduled_days: int = 0       # Interval to next review
        self.reps: int = 0                 # Total review count
        self.lapses: int = 0               # Number of failures
        self.state: str = "new"            # new, learning, review, relearning
        self.last_review: datetime = None

class FSRSScheduler:
    """
    FSRS v4.5 Implementation
    Based on: https://github.com/open-spaced-repetition/fsrs4anki
    """

    # FSRS parameters (optimized via machine learning)
    def __init__(self, w: List[float] = None):
        """
        w: FSRS weight parameters (17 parameters total)
        Default to research-optimized values
        """
        self.w = w or [
            0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49,
            0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
        ]

    def calculate_stability(
        self,
        card: FSRSCard,
        rating: Rating
    ) -> float:
        """
        Calculate new memory stability after review
        """
        if card.state == "new":
            # Initial stability based on rating
            stability = self.w[rating.value - 1]
        else:
            # Update stability based on previous S, D, and rating
            s = card.stability
            d = card.difficulty
            r = rating.value

            if rating == Rating.AGAIN:
                # Lapse: stability decreases
                stability = (
                    self.w[11] * s * (1 - np.exp(-self.w[12] * card.elapsed_days))
                    * (self.w[13] + self.w[14] * d)
                )
            else:
                # Successful recall: stability increases
                stability = (
                    s * (1 + np.exp(self.w[8]) *
                         (11 - d) *
                         s ** -self.w[9] *
                         (np.exp(self.w[10] * (1 - card.stability)) - 1) *
                         (self.w[15] if rating == Rating.HARD else
                          self.w[16] if rating == Rating.EASY else 1))
                )

        return max(0.1, stability)  # Minimum 0.1 days

    def calculate_difficulty(
        self,
        card: FSRSCard,
        rating: Rating
    ) -> float:
        """
        Calculate new difficulty after review
        """
        if card.state == "new":
            # Initial difficulty based on first rating
            difficulty = self.w[4] - (rating.value - 3) * self.w[5]
        else:
            # Update difficulty
            d = card.difficulty
            delta_d = -(rating.value - 3) * self.w[6]
            difficulty = d + delta_d

        # Constrain difficulty to [1, 10]
        return np.clip(difficulty, 1.0, 10.0)

    def calculate_interval(
        self,
        stability: float,
        target_retention: float = 0.9
    ) -> int:
        """
        Calculate optimal review interval for target retention
        """
        # FSRS interval formula
        interval = stability * (
            np.log(target_retention) / np.log(0.9)
        )

        return max(1, int(interval))

    def schedule_card(
        self,
        card: FSRSCard,
        rating: Rating,
        target_retention: float = 0.9
    ) -> Dict:
        """
        Main scheduling function
        """
        now = datetime.utcnow()

        # Calculate new stability and difficulty
        new_stability = self.calculate_stability(card, rating)
        new_difficulty = self.calculate_difficulty(card, rating)

        # Calculate next review interval
        interval = self.calculate_interval(new_stability, target_retention)

        # Update card state
        card.stability = new_stability
        card.difficulty = new_difficulty
        card.reps += 1
        card.last_review = now
        card.elapsed_days = 0
        card.scheduled_days = interval

        if rating == Rating.AGAIN:
            card.lapses += 1
            card.state = "relearning"
        else:
            card.state = "review"

        # Calculate next review intervals for all ratings
        next_intervals = {
            "again": 1,  # Review again in 1 day
            "hard": self.calculate_interval(
                self.calculate_stability(card, Rating.HARD),
                target_retention
            ),
            "good": interval,
            "easy": self.calculate_interval(
                self.calculate_stability(card, Rating.EASY),
                target_retention
            )
        }

        return {
            "card": card,
            "next_due": now + timedelta(days=interval),
            "next_intervals": next_intervals
        }

class SpacedRepetitionService:
    """Service for managing spaced repetition sessions"""

    def __init__(self, db_service):
        self.db = db_service
        self.scheduler = FSRSScheduler()

    async def get_daily_review_queue(
        self,
        user_id: str,
        max_cards: int = 50
    ) -> List[Dict]:
        """
        Get cards due for review today
        """
        now = datetime.utcnow()

        # Query DynamoDB for due cards
        cards = await self.db.query(
            TableName="FlashCards",
            IndexName="userId-nextDue-index",
            KeyConditionExpression="userId = :uid AND nextDue <= :now",
            ExpressionAttributeValues={
                ":uid": user_id,
                ":now": now.isoformat()
            },
            Limit=max_cards,
            ScanIndexForward=True  # Oldest due first
        )

        return cards

    async def process_review(
        self,
        user_id: str,
        card_id: str,
        rating: Rating,
        review_time_ms: int
    ) -> Dict:
        """
        Process a card review and update scheduling
        """
        # Get card from database
        card_data = await self.db.get_item(
            TableName="FlashCards",
            Key={"PK": f"CARD#{card_id}", "SK": "metadata"}
        )

        # Reconstruct FSRSCard
        card = self._deserialize_card(card_data)

        # Schedule next review
        result = self.scheduler.schedule_card(card, rating)

        # Save updated card
        await self.db.update_item(
            TableName="FlashCards",
            Key={"PK": f"CARD#{card_id}", "SK": "metadata"},
            UpdateExpression="""
                SET stability = :s,
                    difficulty = :d,
                    reps = :r,
                    lapses = :l,
                    #state = :st,
                    lastReview = :lr,
                    nextDue = :nd,
                    reviewTimeMs = :rt
            """,
            ExpressionAttributeNames={"#state": "state"},
            ExpressionAttributeValues={
                ":s": result["card"].stability,
                ":d": result["card"].difficulty,
                ":r": result["card"].reps,
                ":l": result["card"].lapses,
                ":st": result["card"].state,
                ":lr": result["card"].last_review.isoformat(),
                ":nd": result["next_due"].isoformat(),
                ":rt": review_time_ms
            }
        )

        # Log review to history
        await self._log_review(user_id, card_id, rating, review_time_ms)

        return result

    async def auto_generate_flashcards(
        self,
        video_id: str,
        transcript: str
    ) -> List[Dict]:
        """
        Use LLM to generate flashcards from video transcript
        """
        # Call Gemini/GPT to extract key concepts
        prompt = f"""
        Analyze this video transcript and generate high-quality flashcards
        for spaced repetition learning. Create a mix of:

        1. Basic fact recall (What is X?)
        2. Concept understanding (Explain why X works)
        3. Application questions (How would you use X?)
        4. Cloze deletions (Fill in the blank)

        Transcript:
        {transcript}

        Return JSON format:
        [
          {{
            "front": "Question or prompt",
            "back": "Answer or explanation",
            "type": "basic|cloze|application",
            "difficulty": 1-10,
            "tags": ["tag1", "tag2"]
          }}
        ]
        """

        # Call LLM API (Gemini or GPT)
        flashcards = await self._call_llm(prompt)

        # Save to database
        for card in flashcards:
            await self._create_card(video_id, card)

        return flashcards
```

### DynamoDB Schema

```typescript
// Table: FlashCards
{
  PK: "CARD#{cardId}",
  SK: "metadata",
  cardId: string,
  userId: string,
  videoId: string,
  playlistId: string,

  // Card content
  front: string,              // Question/prompt
  back: string,               // Answer/explanation
  cardType: 'basic' | 'cloze' | 'image-occlusion' | 'audio',
  mediaUrl?: string,          // For image/audio cards
  tags: string[],

  // FSRS state
  stability: number,          // Memory stability (days)
  difficulty: number,         // 1-10 scale
  elapsedDays: number,
  scheduledDays: number,
  reps: number,               // Review count
  lapses: number,             // Failure count
  state: 'new' | 'learning' | 'review' | 'relearning',

  // Scheduling
  lastReview: timestamp,
  nextDue: timestamp,
  reviewTimeMs: number,       // Time taken for last review

  createdAt: timestamp,
  updatedAt: timestamp,

  // GSI: userId-nextDue-index
  // GSI: videoId-index
}

// Table: ReviewHistory
{
  PK: "USER#{userId}",
  SK: "REVIEW#{timestamp}#{cardId}",
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  reviewTimeMs: number,
  stability: number,
  difficulty: number,
  timestamp: timestamp
}
```

### Frontend Components (Next.js/React)

```typescript
// components/spaced-repetition/ReviewSession.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

interface FlashCard {
  id: string;
  front: string;
  back: string;
  stability: number;
  difficulty: number;
  nextIntervals: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

export function ReviewSession() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewStartTime, setReviewStartTime] = useState(Date.now());

  // Fetch daily review queue
  const { data: cards, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: async () => {
      const res = await fetch('/api/spaced-repetition/review-queue');
      return res.json();
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      cardId,
      rating,
    }: {
      cardId: string;
      rating: number;
    }) => {
      const reviewTime = Date.now() - reviewStartTime;

      return fetch('/api/spaced-repetition/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, rating, reviewTimeMs: reviewTime }),
      });
    },
    onSuccess: () => {
      // Move to next card
      setCurrentCardIndex((i) => i + 1);
      setShowAnswer(false);
      setReviewStartTime(Date.now());
    },
  });

  const currentCard = cards?.[currentCardIndex];

  if (isLoading) return <div>Loading review session...</div>;
  if (!cards || cards.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold">🎉 All caught up!</h2>
        <p>No cards due for review today. Great work!</p>
      </div>
    );
  }

  if (currentCardIndex >= cards.length) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold">✅ Review Complete!</h2>
        <p>You reviewed {cards.length} cards today.</p>
        <ReviewStats cards={cards} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Card {currentCardIndex + 1} of {cards.length}
          </span>
          <span>Difficulty: {currentCard.difficulty.toFixed(1)}/10</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${((currentCardIndex + 1) / cards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="bg-white rounded-lg shadow-lg p-8 min-h-[300px] flex items-center justify-center cursor-pointer"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {!showAnswer ? (
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4">
              {currentCard.front}
            </h3>
            <p className="text-gray-500">Click to reveal answer</p>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">
              {currentCard.front}
            </h3>
            <div className="border-t-2 border-gray-200 pt-4 mt-4">
              <p className="text-lg">{currentCard.back}</p>
            </div>
          </div>
        )}
      </div>

      {/* Rating Buttons */}
      {showAnswer && (
        <div className="grid grid-cols-4 gap-4 mt-6">
          <button
            onClick={() => reviewMutation.mutate({ cardId: currentCard.id, rating: 1 })}
            className="bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg"
          >
            <div className="font-semibold">Again</div>
            <div className="text-sm">&lt;{currentCard.nextIntervals.again}d</div>
          </button>
          <button
            onClick={() => reviewMutation.mutate({ cardId: currentCard.id, rating: 2 })}
            className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg"
          >
            <div className="font-semibold">Hard</div>
            <div className="text-sm">{currentCard.nextIntervals.hard}d</div>
          </button>
          <button
            onClick={() => reviewMutation.mutate({ cardId: currentCard.id, rating: 3 })}
            className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg"
          >
            <div className="font-semibold">Good</div>
            <div className="text-sm">{currentCard.nextIntervals.good}d</div>
          </button>
          <button
            onClick={() => reviewMutation.mutate({ cardId: currentCard.id, rating: 4 })}
            className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg"
          >
            <div className="font-semibold">Easy</div>
            <div className="text-sm">{currentCard.nextIntervals.easy}d</div>
          </button>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {showAnswer && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Keyboard: 1=Again, 2=Hard, 3=Good, 4=Easy
        </p>
      )}
    </div>
  );
}
```

## User Experience Considerations

### 1. Seamless Card Creation
- **One-Click Generation**: Auto-generate cards from any video with one click
- **Batch Creation**: Create cards for entire playlists
- **Manual Card Editor**: Rich text editor for custom cards
- **Import/Export**: Support Anki deck format for existing card libraries

### 2. Intelligent Review Sessions
- **Study Time Prediction**: Show estimated review time before starting
- **Break Reminders**: Suggest breaks after 25 minutes (Pomodoro technique)
- **Review Scheduling**: Choose preferred review time of day
- **Undo Support**: Allow undo of last rating if user makes mistake

### 3. Progress Visualization
- **Retention Heatmap**: Calendar view showing review consistency
- **Forecast Graph**: Predict future review workload
- **Concept Mastery**: Show mastery level per topic/video
- **Learning Velocity**: Track cards learned per day/week

### 4. Mobile Optimization
- **Swipe Gestures**: Swipe left (Again), swipe right (Good)
- **Offline Mode**: Download review queue for offline study
- **Voice Input**: Speak answers for hands-free review
- **Widget**: iOS/Android widget showing daily review count

## Integration Requirements

### 1. Existing Systems
- **Video Transcripts**: Source material for card generation
- **Quiz System**: Convert quiz questions to flashcards
- **Activity Tracking**: Log review sessions as learning activities
- **Achievement System**: Badges for review streaks, cards mastered

### 2. External APIs
- **LLM Services**: Gemini/GPT for card generation
- **TTS Services**: Text-to-speech for audio cards
- **Image Processing**: OCR for image occlusion cards

## Success Metrics

### Primary Metrics
1. **Retention Rate**: % of information retained after 30/60/90 days (target: 90%+)
2. **Review Consistency**: Daily active reviewers (target: 60%+ of users)
3. **Card Completion**: Average cards reviewed per session (target: 20+)

### Secondary Metrics
1. **Card Generation Quality**: User satisfaction with auto-generated cards (target: 4.0+/5.0)
2. **FSRS Accuracy**: Predicted vs actual recall correlation (target: r > 0.7)
3. **Review Load**: Average daily review time (target: <15 minutes)

## Implementation Timeline

### Week 1-2: FSRS Core Engine
- Implement FSRS algorithm in Python
- Create card scheduling logic
- Build review queue generator

### Week 3-4: Database & API
- Design DynamoDB schema
- Implement CRUD operations
- Build FastAPI endpoints

### Week 5-6: Card Generation
- Integrate LLM for auto-generation
- Build card creation UI
- Implement import/export

### Week 7-8: Review Interface
- Build review session UI
- Implement rating buttons
- Add keyboard shortcuts

### Week 9-10: Analytics & Polish
- Create progress dashboards
- Add retention heatmap
- Performance optimization

## References

- FSRS Official Repository: https://github.com/open-spaced-repetition/fsrs4anki
- Anki 23.10+ FSRS Implementation
- Cognitive Science: Spacing Effect & Testing Effect
- Ebbinghaus Forgetting Curve Research
