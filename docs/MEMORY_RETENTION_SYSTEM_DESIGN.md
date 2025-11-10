# StreamSmart Memory & Retention System - Production Architecture

## Executive Summary

This document outlines a production-ready memory and retention layer for StreamSmart that implements:
- **Spaced Repetition** using SuperMemo 2 (SM-2) algorithm
- **Forgetting Curve Tracking** with Ebbinghaus model
- **Active Recall** through daily review sessions
- **Interleaved Practice** mixing multiple topics
- **Cumulative Assessments** testing long-term retention

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Daily Review │  │  Memory Card │  │   Analytics  │      │
│  │  Dashboard   │  │    Browser   │  │   Dashboard  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓  API Calls
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Memory     │  │   Review     │  │  Performance │      │
│  │   Manager    │  │  Scheduler   │  │   Tracker    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SM-2 Engine  │  │  Forgetting  │  │  Interleaving│      │
│  │              │  │ Curve Module │  │    Engine    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓  Database Operations
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (DynamoDB)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │MemoryCards   │  │ReviewSessions│  │ Performance  │      │
│  │    Table     │  │    Table     │  │   Metrics    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ScheduleIndex │  │DueToday Index│                         │
│  │     (GSI)    │  │     (GSI)    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Data Models

### 2.1 MemoryCard Schema (DynamoDB)

```typescript
interface MemoryCard {
  // Primary Keys
  PK: string;                    // "USER#{userId}"
  SK: string;                    // "CARD#{cardId}"

  // Card Identity
  cardId: string;                // UUID
  userId: string;

  // Content
  contentType: 'quiz_question' | 'concept' | 'fact' | 'problem';
  sourceType: 'video' | 'playlist' | 'quiz' | 'manual';
  sourceId: string;              // videoId, playlistId, etc.

  // Question Data
  question: string;
  options?: Array<{
    id: string;
    text: string;
  }>;
  correctAnswer: string;
  explanation: string;

  // Metadata
  topic: string;
  subtopics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];

  // SM-2 Algorithm Parameters
  easeFactor: number;            // Default: 2.5, Range: 1.3 - 3.0
  interval: number;              // Days until next review
  repetitions: number;           // Consecutive correct answers

  // Review Tracking
  lastReviewedAt: string;        // ISO timestamp
  nextReviewAt: string;          // ISO timestamp (for scheduling)
  totalReviews: number;
  correctReviews: number;
  incorrectReviews: number;

  // Performance Metrics
  averageResponseTime: number;   // Milliseconds
  confidenceScore: number;       // 0-100
  retentionRate: number;         // Percentage

  // Forgetting Curve Data
  forgettingCurveSlope: number;  // Decay rate for this specific card
  lastForgettingRate: number;    // Recent decay measurement

  // State
  cardState: 'new' | 'learning' | 'review' | 'relearning' | 'suspended' | 'mastered';
  masteredAt?: string;           // ISO timestamp when mastered

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // GSI Attributes
  GSI1PK: string;                // "USER#{userId}#TOPIC#{topic}"
  GSI1SK: string;                // "DUE#{nextReviewAt}"
  GSI2PK: string;                // "USER#{userId}#STATE#{cardState}"
  GSI2SK: string;                // "INTERVAL#{interval}"
}
```

### 2.2 ReviewSession Schema

```typescript
interface ReviewSession {
  // Primary Keys
  PK: string;                    // "USER#{userId}"
  SK: string;                    // "SESSION#{sessionId}"

  // Session Identity
  sessionId: string;             // UUID
  userId: string;

  // Session Metadata
  sessionType: 'daily_review' | 'topic_review' | 'cumulative' | 'custom';
  startTime: string;
  endTime?: string;
  duration?: number;             // Milliseconds

  // Session Content
  totalCards: number;
  cardsReviewed: number;
  cardsRemaining: number;
  topics: string[];

  // Performance
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  averageResponseTime: number;
  accuracyRate: number;          // Percentage

  // Session Results
  cardResults: Array<{
    cardId: string;
    wasCorrect: boolean;
    responseTime: number;
    confidenceLevel: 1 | 2 | 3 | 4 | 5;  // User self-rating
    newEaseFactor: number;
    newInterval: number;
  }>;

  // Adaptive Data
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };

  // Interleaving Data
  topicSequence: string[];       // Order topics were presented
  interleaveScore: number;       // 0-100, higher = more mixed

  // State
  isCompleted: boolean;
  wasAbandoned: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // GSI Attributes
  GSI1PK: string;                // "USER#{userId}"
  GSI1SK: string;                // "DATE#{YYYY-MM-DD}"
}
```

### 2.3 PerformanceMetrics Schema

```typescript
interface PerformanceMetrics {
  // Primary Keys
  PK: string;                    // "USER#{userId}"
  SK: string;                    // "METRICS#{YYYY-MM-DD}"

  // Identity
  userId: string;
  date: string;                  // YYYY-MM-DD

  // Daily Metrics
  cardsReviewed: number;
  cardsAdded: number;
  cardsMastered: number;
  sessionsCompleted: number;
  studyTimeMinutes: number;

  // Performance
  overallAccuracy: number;       // Percentage
  averageEaseFactor: number;
  averageInterval: number;       // Days
  retentionRate: number;         // Percentage

  // Topic Breakdown
  topicPerformance: Array<{
    topic: string;
    cardsReviewed: number;
    accuracy: number;
    averageInterval: number;
  }>;

  // Streaks
  currentStreak: number;
  longestStreak: number;

  // Forgetting Curve Analysis
  predictedRetention: number;    // Next 7 days
  actualRetention: number;       // Last 7 days
  forgettingRate: number;        // Overall decay rate

  // Cumulative Stats
  totalLifetimeReviews: number;
  totalLifetimeCards: number;
  lifetimeAccuracy: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // GSI Attributes
  GSI1PK: string;                // "USER#{userId}"
  GSI1SK: string;                // "WEEK#{YYYY-WW}"
}
```

### 2.4 Extended User Model

Add to existing User model:

```typescript
interface UserMemoryPreferences {
  // Daily Review Settings
  dailyReviewTarget: number;         // Cards per day (default: 20)
  dailyReviewTime: string;           // "09:00" - preferred time
  enableDailyReminders: boolean;

  // Learning Preferences
  maxNewCardsPerDay: number;         // Default: 10
  maxReviewCardsPerDay: number;      // Default: 50
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';

  // Algorithm Tuning
  easeFactorModifier: number;        // Default: 1.0 (0.8-1.2 range)
  intervalModifier: number;          // Default: 1.0 (0.5-2.0 range)
  masteryThreshold: number;          // Interval days for mastery (default: 90)

  // Interleaving Settings
  enableInterleaving: boolean;       // Default: true
  interleavingIntensity: 'low' | 'medium' | 'high';

  // Notification Preferences
  dueCardReminders: boolean;
  streakReminders: boolean;
  weeklyProgressReport: boolean;
}
```

---

## 3. Core Algorithms

### 3.1 SuperMemo 2 (SM-2) Algorithm Implementation

The SM-2 algorithm is the gold standard for spaced repetition:

```python
class SM2Algorithm:
    """
    SuperMemo 2 algorithm implementation for optimal spaced repetition
    """

    @staticmethod
    def calculate_next_review(
        quality: int,           # 0-5 rating (0=total blackout, 5=perfect recall)
        ease_factor: float,     # Current ease factor (1.3 - 3.0)
        repetitions: int,       # Number of consecutive correct answers
        interval: int           # Current interval in days
    ) -> tuple[float, int, int]:
        """
        Returns: (new_ease_factor, new_interval, new_repetitions)
        """
        # Update ease factor
        new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

        # Ensure ease factor stays in valid range
        new_ease_factor = max(1.3, new_ease_factor)

        # Calculate new interval
        if quality < 3:  # Incorrect answer
            new_repetitions = 0
            new_interval = 1  # Review tomorrow
        else:  # Correct answer
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = int(interval * new_ease_factor)

            new_repetitions = repetitions + 1

        return (new_ease_factor, new_interval, new_repetitions)

    @staticmethod
    def quality_from_performance(
        was_correct: bool,
        confidence: int,        # 1-5 self-rating
        response_time: int      # Milliseconds
    ) -> int:
        """
        Convert user performance to SM-2 quality score (0-5)
        """
        if not was_correct:
            return 0 if confidence <= 2 else 1

        # Base score on confidence
        if confidence == 5:
            base_score = 5
        elif confidence == 4:
            base_score = 4
        else:
            base_score = 3

        # Adjust for response time (penalize slow responses)
        if response_time > 60000:  # > 1 minute
            base_score = max(3, base_score - 1)
        elif response_time > 120000:  # > 2 minutes
            base_score = max(3, base_score - 2)

        return base_score
```

### 3.2 Forgetting Curve Prediction

Based on Ebbinghaus forgetting curve: **R = e^(-t/S)**

```python
import math
from datetime import datetime, timedelta

class ForgettingCurve:
    """
    Predict knowledge retention using Ebbinghaus forgetting curve
    """

    @staticmethod
    def calculate_retention(
        days_since_review: int,
        stability: float = 1.0      # Higher = slower forgetting
    ) -> float:
        """
        Returns retention percentage (0-100)
        """
        if days_since_review == 0:
            return 100.0

        # R = e^(-t/S)
        retention = 100 * math.exp(-days_since_review / stability)
        return max(0.0, min(100.0, retention))

    @staticmethod
    def calculate_stability(
        ease_factor: float,
        repetitions: int,
        base_stability: float = 1.0
    ) -> float:
        """
        Calculate stability (S) based on card difficulty and history
        Higher stability = knowledge lasts longer
        """
        # Stability increases with repetitions and ease factor
        stability = base_stability * ease_factor * (1 + repetitions * 0.5)
        return stability

    @staticmethod
    def predict_retention_at_date(
        last_review: str,           # ISO timestamp
        next_review: str,           # ISO timestamp
        ease_factor: float,
        repetitions: int
    ) -> float:
        """
        Predict retention percentage at next review date
        """
        last = datetime.fromisoformat(last_review)
        next_date = datetime.fromisoformat(next_review)
        days = (next_date - last).days

        stability = ForgettingCurve.calculate_stability(ease_factor, repetitions)
        retention = ForgettingCurve.calculate_retention(days, stability)

        return retention

    @staticmethod
    def calculate_optimal_review_time(
        last_review: str,
        target_retention: float = 80.0,  # Review when retention hits 80%
        stability: float = 1.0
    ) -> str:
        """
        Calculate optimal review time to maintain target retention
        Returns ISO timestamp
        """
        # Solve for t when R = target_retention
        # t = -S * ln(R/100)
        t = -stability * math.log(target_retention / 100)
        days = max(1, int(t))

        last = datetime.fromisoformat(last_review)
        next_review = last + timedelta(days=days)

        return next_review.isoformat()
```

### 3.3 Interleaved Practice Engine

```python
import random
from typing import List, Dict

class InterleavingEngine:
    """
    Creates interleaved practice sessions mixing multiple topics
    """

    @staticmethod
    def create_interleaved_session(
        cards_by_topic: Dict[str, List[dict]],
        intensity: str = 'medium',
        session_size: int = 20
    ) -> List[dict]:
        """
        Create a session with interleaved topics

        Args:
            cards_by_topic: Dict mapping topic -> list of cards
            intensity: 'low' | 'medium' | 'high' interleaving
            session_size: Total cards in session

        Returns:
            List of cards in optimal interleaved order
        """
        all_cards = []
        topics = list(cards_by_topic.keys())

        if intensity == 'low':
            # Block practice with some mixing
            block_size = 5
        elif intensity == 'medium':
            # Moderate interleaving
            block_size = 3
        else:  # high
            # Maximum interleaving
            block_size = 1

        # Build session
        current_topic_idx = 0
        cards_added = 0

        while cards_added < session_size and any(cards_by_topic.values()):
            topic = topics[current_topic_idx % len(topics)]

            if cards_by_topic[topic]:
                # Add block_size cards from current topic
                for _ in range(min(block_size, len(cards_by_topic[topic]))):
                    if cards_added >= session_size:
                        break
                    all_cards.append(cards_by_topic[topic].pop(0))
                    cards_added += 1

            current_topic_idx += 1

        return all_cards

    @staticmethod
    def calculate_interleaving_score(topic_sequence: List[str]) -> float:
        """
        Calculate how well-interleaved a session is (0-100)
        Higher score = more topic switching
        """
        if len(topic_sequence) <= 1:
            return 0.0

        switches = 0
        for i in range(len(topic_sequence) - 1):
            if topic_sequence[i] != topic_sequence[i + 1]:
                switches += 1

        max_switches = len(topic_sequence) - 1
        score = (switches / max_switches) * 100

        return round(score, 2)
```

### 3.4 Cumulative Assessment Builder

```python
from datetime import datetime, timedelta
from typing import List, Dict

class CumulativeAssessment:
    """
    Build assessments that test ALL previously learned material
    """

    @staticmethod
    def build_cumulative_quiz(
        user_cards: List[dict],
        quiz_size: int = 30,
        coverage_strategy: str = 'time_weighted'
    ) -> List[dict]:
        """
        Create quiz covering all historical content

        Args:
            user_cards: All cards user has learned
            quiz_size: Number of questions
            coverage_strategy: 'time_weighted' | 'performance_weighted' | 'random'

        Returns:
            List of cards for cumulative assessment
        """
        if coverage_strategy == 'time_weighted':
            # Include cards from different time periods
            return CumulativeAssessment._time_weighted_selection(
                user_cards, quiz_size
            )
        elif coverage_strategy == 'performance_weighted':
            # Focus on cards with lower performance
            return CumulativeAssessment._performance_weighted_selection(
                user_cards, quiz_size
            )
        else:
            # Pure random
            return random.sample(user_cards, min(quiz_size, len(user_cards)))

    @staticmethod
    def _time_weighted_selection(
        cards: List[dict],
        size: int
    ) -> List[dict]:
        """
        Select cards ensuring coverage across time periods
        """
        now = datetime.now()

        # Categorize by age
        time_buckets = {
            'today': [],
            'week': [],
            'month': [],
            'quarter': [],
            'older': []
        }

        for card in cards:
            created = datetime.fromisoformat(card['createdAt'])
            age_days = (now - created).days

            if age_days == 0:
                time_buckets['today'].append(card)
            elif age_days <= 7:
                time_buckets['week'].append(card)
            elif age_days <= 30:
                time_buckets['month'].append(card)
            elif age_days <= 90:
                time_buckets['quarter'].append(card)
            else:
                time_buckets['older'].append(card)

        # Distribute quiz questions across buckets
        bucket_weights = {
            'today': 0.1,
            'week': 0.2,
            'month': 0.3,
            'quarter': 0.25,
            'older': 0.15
        }

        selected = []
        for bucket, weight in bucket_weights.items():
            bucket_size = int(size * weight)
            bucket_cards = time_buckets[bucket]

            if bucket_cards:
                sample_size = min(bucket_size, len(bucket_cards))
                selected.extend(random.sample(bucket_cards, sample_size))

        # Fill remaining with random
        remaining = size - len(selected)
        if remaining > 0:
            available = [c for c in cards if c not in selected]
            if available:
                selected.extend(random.sample(
                    available,
                    min(remaining, len(available))
                ))

        random.shuffle(selected)
        return selected[:size]

    @staticmethod
    def _performance_weighted_selection(
        cards: List[dict],
        size: int
    ) -> List[dict]:
        """
        Select cards weighted by poor performance
        """
        # Calculate weights (lower performance = higher weight)
        weighted_cards = []

        for card in cards:
            accuracy = card.get('correctReviews', 0) / max(1, card.get('totalReviews', 1))
            # Invert accuracy so lower performance gets higher weight
            weight = 1 - accuracy
            weighted_cards.append((card, weight))

        # Weighted random selection
        selected = []
        weights = [w for _, w in weighted_cards]

        # Use weighted random choice
        for _ in range(min(size, len(weighted_cards))):
            if not weighted_cards:
                break

            # Simple weighted selection
            total_weight = sum(w for _, w in weighted_cards)
            r = random.uniform(0, total_weight)
            cumulative = 0

            for i, (card, weight) in enumerate(weighted_cards):
                cumulative += weight
                if r <= cumulative:
                    selected.append(card)
                    weighted_cards.pop(i)
                    break

        return selected
```

---

## 4. Backend Service Architecture

### 4.1 MemoryCardService

```python
# /python_backend/services/memory_card_service.py

import boto3
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from decimal import Decimal

logger = logging.getLogger(__name__)

class MemoryCardService:
    """
    Manages memory cards for spaced repetition learning
    """

    def __init__(self, table_name: str = "StreamSmart-MemoryCards", region: str = "ap-south-2"):
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table_name = table_name
        self.table = None
        self._ensure_table_exists()
        self.sm2 = SM2Algorithm()
        self.forgetting_curve = ForgettingCurve()
        logger.info(f"✅ MemoryCardService initialized")

    def _ensure_table_exists(self):
        """Create table with GSIs for efficient queries"""
        try:
            existing_tables = [t.name for t in self.dynamodb.tables.all()]

            if self.table_name not in existing_tables:
                logger.info(f"Creating table {self.table_name}...")

                table = self.dynamodb.create_table(
                    TableName=self.table_name,
                    KeySchema=[
                        {'AttributeName': 'PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'SK', 'KeyType': 'RANGE'}
                    ],
                    AttributeDefinitions=[
                        {'AttributeName': 'PK', 'AttributeType': 'S'},
                        {'AttributeName': 'SK', 'AttributeType': 'S'},
                        {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                        {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
                        {'AttributeName': 'GSI2PK', 'AttributeType': 'S'},
                        {'AttributeName': 'GSI2SK', 'AttributeType': 'S'},
                    ],
                    GlobalSecondaryIndexes=[
                        {
                            'IndexName': 'DueCardsIndex',
                            'KeySchema': [
                                {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                                {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                            ],
                            'Projection': {'ProjectionType': 'ALL'}
                        },
                        {
                            'IndexName': 'StateIndex',
                            'KeySchema': [
                                {'AttributeName': 'GSI2PK', 'KeyType': 'HASH'},
                                {'AttributeName': 'GSI2SK', 'KeyType': 'RANGE'}
                            ],
                            'Projection': {'ProjectionType': 'ALL'}
                        }
                    ],
                    BillingMode='PAY_PER_REQUEST'
                )

                table.wait_until_exists()
                logger.info(f"✅ Table {self.table_name} created")

            self.table = self.dynamodb.Table(self.table_name)

        except Exception as e:
            logger.error(f"Error ensuring table exists: {e}")
            self.table = self.dynamodb.Table(self.table_name)

    async def create_card_from_quiz_question(
        self,
        user_id: str,
        quiz_question: dict,
        video_id: str,
        topic: str
    ) -> dict:
        """
        Create a memory card from a quiz question
        """
        try:
            card_id = str(uuid.uuid4())
            now = datetime.now()

            card = {
                'PK': f'USER#{user_id}',
                'SK': f'CARD#{card_id}',
                'cardId': card_id,
                'userId': user_id,

                # Content
                'contentType': 'quiz_question',
                'sourceType': 'video',
                'sourceId': video_id,
                'question': quiz_question['questionText'],
                'options': quiz_question.get('options', []),
                'correctAnswer': quiz_question['correctOptionId'],
                'explanation': quiz_question.get('explanation', ''),

                # Metadata
                'topic': topic,
                'subtopics': [],
                'difficulty': 'medium',
                'tags': [],

                # SM-2 defaults
                'easeFactor': Decimal('2.5'),
                'interval': 0,
                'repetitions': 0,

                # Review tracking
                'lastReviewedAt': None,
                'nextReviewAt': now.isoformat(),
                'totalReviews': 0,
                'correctReviews': 0,
                'incorrectReviews': 0,

                # Performance
                'averageResponseTime': 0,
                'confidenceScore': 0,
                'retentionRate': 100,

                # Forgetting curve
                'forgettingCurveSlope': Decimal('0.05'),
                'lastForgettingRate': 0,

                # State
                'cardState': 'new',

                # Timestamps
                'createdAt': now.isoformat(),
                'updatedAt': now.isoformat(),

                # GSI attributes
                'GSI1PK': f'USER#{user_id}#TOPIC#{topic}',
                'GSI1SK': f'DUE#{now.isoformat()}',
                'GSI2PK': f'USER#{user_id}#STATE#new',
                'GSI2SK': f'INTERVAL#0'
            }

            self.table.put_item(Item=card)
            logger.info(f"✅ Created memory card {card_id} for user {user_id}")

            return self._decimal_to_float(card)

        except Exception as e:
            logger.error(f"Error creating memory card: {e}", exc_info=True)
            raise

    async def review_card(
        self,
        user_id: str,
        card_id: str,
        was_correct: bool,
        confidence: int,
        response_time: int
    ) -> dict:
        """
        Update card after review using SM-2 algorithm
        """
        try:
            # Get current card
            response = self.table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'CARD#{card_id}'
                }
            )

            if 'Item' not in response:
                raise ValueError(f"Card {card_id} not found")

            card = self._decimal_to_float(response['Item'])

            # Calculate quality score
            quality = self.sm2.quality_from_performance(
                was_correct, confidence, response_time
            )

            # Apply SM-2
            new_ease, new_interval, new_reps = self.sm2.calculate_next_review(
                quality,
                card['easeFactor'],
                card['repetitions'],
                card['interval']
            )

            # Calculate next review date
            now = datetime.now()
            next_review = now + timedelta(days=new_interval)

            # Update performance metrics
            total_reviews = card['totalReviews'] + 1
            correct_reviews = card['correctReviews'] + (1 if was_correct else 0)
            incorrect_reviews = card['incorrectReviews'] + (0 if was_correct else 1)

            # Update average response time
            avg_time = card['averageResponseTime']
            new_avg_time = ((avg_time * card['totalReviews']) + response_time) / total_reviews

            # Update retention rate
            retention_rate = (correct_reviews / total_reviews) * 100

            # Determine new state
            if new_reps >= 3 and new_interval >= 90:
                new_state = 'mastered'
                mastered_at = now.isoformat()
            elif new_reps > 0:
                new_state = 'review'
                mastered_at = card.get('masteredAt')
            else:
                new_state = 'relearning' if card['cardState'] == 'review' else 'learning'
                mastered_at = card.get('masteredAt')

            # Update card
            updates = {
                'easeFactor': new_ease,
                'interval': new_interval,
                'repetitions': new_reps,
                'lastReviewedAt': now.isoformat(),
                'nextReviewAt': next_review.isoformat(),
                'totalReviews': total_reviews,
                'correctReviews': correct_reviews,
                'incorrectReviews': incorrect_reviews,
                'averageResponseTime': new_avg_time,
                'confidenceScore': confidence * 20,  # Convert 1-5 to 20-100
                'retentionRate': retention_rate,
                'cardState': new_state,
                'masteredAt': mastered_at,
                'updatedAt': now.isoformat(),
                'GSI1SK': f'DUE#{next_review.isoformat()}',
                'GSI2PK': f'USER#{user_id}#STATE#{new_state}',
                'GSI2SK': f'INTERVAL#{new_interval}'
            }

            # Build update expression
            updates = self._float_to_decimal(updates)
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}

            for key, value in updates.items():
                safe_key = key.replace('.', '_')
                update_expr_parts.append(f'#{safe_key} = :{safe_key}')
                expr_attr_names[f'#{safe_key}'] = key
                expr_attr_values[f':{safe_key}'] = value

            update_expr = 'SET ' + ', '.join(update_expr_parts)

            response = self.table.update_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'CARD#{card_id}'
                },
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )

            updated_card = self._decimal_to_float(response['Attributes'])
            logger.info(
                f"✅ Reviewed card {card_id}: "
                f"correct={was_correct}, interval={new_interval}d, state={new_state}"
            )

            return {
                'card': updated_card,
                'wasCorrect': was_correct,
                'newInterval': new_interval,
                'nextReview': next_review.isoformat(),
                'cardState': new_state
            }

        except Exception as e:
            logger.error(f"Error reviewing card: {e}", exc_info=True)
            raise

    async def get_due_cards(
        self,
        user_id: str,
        limit: int = 20,
        topics: Optional[List[str]] = None
    ) -> List[dict]:
        """
        Get cards due for review today
        """
        try:
            now = datetime.now().isoformat()

            if topics:
                # Query specific topics
                all_cards = []
                for topic in topics:
                    response = self.table.query(
                        IndexName='DueCardsIndex',
                        KeyConditionExpression='GSI1PK = :pk AND GSI1SK <= :due',
                        ExpressionAttributeValues={
                            ':pk': f'USER#{user_id}#TOPIC#{topic}',
                            ':due': f'DUE#{now}'
                        },
                        Limit=limit
                    )
                    all_cards.extend(response.get('Items', []))
            else:
                # Get all due cards
                response = self.table.query(
                    KeyConditionExpression='PK = :pk',
                    FilterExpression='nextReviewAt <= :now',
                    ExpressionAttributeValues={
                        ':pk': f'USER#{user_id}',
                        ':now': now
                    },
                    Limit=limit
                )
                all_cards = response.get('Items', [])

            # Sort by due date (most overdue first)
            all_cards.sort(key=lambda x: x['nextReviewAt'])

            return [self._decimal_to_float(card) for card in all_cards[:limit]]

        except Exception as e:
            logger.error(f"Error getting due cards: {e}", exc_info=True)
            return []

    async def get_cards_by_state(
        self,
        user_id: str,
        state: str,
        limit: int = 100
    ) -> List[dict]:
        """
        Get cards by state (new, learning, review, mastered, etc.)
        """
        try:
            response = self.table.query(
                IndexName='StateIndex',
                KeyConditionExpression='GSI2PK = :pk',
                ExpressionAttributeValues={
                    ':pk': f'USER#{user_id}#STATE#{state}'
                },
                Limit=limit
            )

            cards = response.get('Items', [])
            return [self._decimal_to_float(card) for card in cards]

        except Exception as e:
            logger.error(f"Error getting cards by state: {e}", exc_info=True)
            return []

    def _decimal_to_float(self, obj: Any) -> Any:
        """Convert DynamoDB Decimal to float recursively"""
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._decimal_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._decimal_to_float(v) for v in obj]
        return obj

    def _float_to_decimal(self, obj: Any) -> Any:
        """Convert float to Decimal for DynamoDB"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._float_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._float_to_decimal(v) for v in obj]
        return obj


# Singleton instance
memory_card_service = MemoryCardService()
```

### 4.2 ReviewSchedulerService

```python
# /python_backend/services/review_scheduler_service.py

import boto3
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from decimal import Decimal

logger = logging.getLogger(__name__)

class ReviewSchedulerService:
    """
    Manages review sessions and scheduling
    """

    def __init__(self, table_name: str = "StreamSmart-ReviewSessions", region: str = "ap-south-2"):
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table_name = table_name
        self.table = None
        self._ensure_table_exists()
        self.interleaving_engine = InterleavingEngine()
        logger.info(f"✅ ReviewSchedulerService initialized")

    async def create_daily_review_session(
        self,
        user_id: str,
        target_cards: int = 20,
        interleaving_intensity: str = 'medium'
    ) -> dict:
        """
        Create an optimized daily review session
        """
        try:
            session_id = str(uuid.uuid4())
            now = datetime.now()

            # Get due cards from MemoryCardService
            from services.memory_card_service import memory_card_service

            due_cards = await memory_card_service.get_due_cards(
                user_id, limit=target_cards * 2
            )

            # Group cards by topic
            cards_by_topic = {}
            for card in due_cards:
                topic = card['topic']
                if topic not in cards_by_topic:
                    cards_by_topic[topic] = []
                cards_by_topic[topic].append(card)

            # Create interleaved session
            session_cards = self.interleaving_engine.create_interleaved_session(
                cards_by_topic,
                intensity=interleaving_intensity,
                session_size=target_cards
            )

            # Calculate topic sequence for interleaving score
            topic_sequence = [card['topic'] for card in session_cards]
            interleave_score = self.interleaving_engine.calculate_interleaving_score(
                topic_sequence
            )

            # Create session
            session = {
                'PK': f'USER#{user_id}',
                'SK': f'SESSION#{session_id}',
                'sessionId': session_id,
                'userId': user_id,
                'sessionType': 'daily_review',
                'startTime': now.isoformat(),
                'endTime': None,
                'duration': None,
                'totalCards': len(session_cards),
                'cardsReviewed': 0,
                'cardsRemaining': len(session_cards),
                'topics': list(cards_by_topic.keys()),
                'correctCount': 0,
                'incorrectCount': 0,
                'skippedCount': 0,
                'averageResponseTime': 0,
                'accuracyRate': 0,
                'cardResults': [],
                'difficultyDistribution': {
                    'easy': sum(1 for c in session_cards if c.get('difficulty') == 'easy'),
                    'medium': sum(1 for c in session_cards if c.get('difficulty') == 'medium'),
                    'hard': sum(1 for c in session_cards if c.get('difficulty') == 'hard'),
                },
                'topicSequence': topic_sequence,
                'interleaveScore': interleave_score,
                'isCompleted': False,
                'wasAbandoned': False,
                'createdAt': now.isoformat(),
                'updatedAt': now.isoformat(),
                'GSI1PK': f'USER#{user_id}',
                'GSI1SK': f'DATE#{now.strftime("%Y-%m-%d")}'
            }

            # Store session
            session = self._float_to_decimal(session)
            self.table.put_item(Item=session)

            logger.info(
                f"✅ Created daily review session {session_id}: "
                f"{len(session_cards)} cards, {len(cards_by_topic)} topics, "
                f"interleave_score={interleave_score}"
            )

            return {
                'session': self._decimal_to_float(session),
                'cards': session_cards
            }

        except Exception as e:
            logger.error(f"Error creating daily review session: {e}", exc_info=True)
            raise

    async def complete_session(
        self,
        user_id: str,
        session_id: str,
        card_results: List[dict]
    ) -> dict:
        """
        Mark session as complete and update statistics
        """
        try:
            # Calculate session stats
            now = datetime.now()
            correct_count = sum(1 for r in card_results if r['wasCorrect'])
            incorrect_count = sum(1 for r in card_results if not r['wasCorrect'])
            accuracy_rate = (correct_count / len(card_results) * 100) if card_results else 0
            avg_response_time = (
                sum(r['responseTime'] for r in card_results) / len(card_results)
            ) if card_results else 0

            # Get session start time
            response = self.table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'SESSION#{session_id}'
                }
            )

            if 'Item' not in response:
                raise ValueError(f"Session {session_id} not found")

            session = self._decimal_to_float(response['Item'])
            start_time = datetime.fromisoformat(session['startTime'])
            duration = int((now - start_time).total_seconds() * 1000)  # Milliseconds

            # Update session
            updates = {
                'endTime': now.isoformat(),
                'duration': duration,
                'cardsReviewed': len(card_results),
                'cardsRemaining': 0,
                'correctCount': correct_count,
                'incorrectCount': incorrect_count,
                'accuracyRate': accuracy_rate,
                'averageResponseTime': avg_response_time,
                'cardResults': card_results,
                'isCompleted': True,
                'updatedAt': now.isoformat()
            }

            # Build update expression
            updates = self._float_to_decimal(updates)
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}

            for key, value in updates.items():
                safe_key = key.replace('.', '_')
                update_expr_parts.append(f'#{safe_key} = :{safe_key}')
                expr_attr_names[f'#{safe_key}'] = key
                expr_attr_values[f':{safe_key}'] = value

            update_expr = 'SET ' + ', '.join(update_expr_parts)

            response = self.table.update_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'SESSION#{session_id}'
                },
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )

            completed_session = self._decimal_to_float(response['Attributes'])
            logger.info(
                f"✅ Completed session {session_id}: "
                f"accuracy={accuracy_rate:.1f}%, duration={duration/1000:.1f}s"
            )

            return completed_session

        except Exception as e:
            logger.error(f"Error completing session: {e}", exc_info=True)
            raise

    def _decimal_to_float(self, obj):
        """Convert DynamoDB Decimal to float recursively"""
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._decimal_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._decimal_to_float(v) for v in obj]
        return obj

    def _float_to_decimal(self, obj):
        """Convert float to Decimal for DynamoDB"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._float_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._float_to_decimal(v) for v in obj]
        return obj


# Singleton instance
review_scheduler_service = ReviewSchedulerService()
```

---

## 5. API Endpoints

### 5.1 Memory Card Endpoints

```python
# Add to /python_backend/main.py

from services.memory_card_service import memory_card_service
from services.review_scheduler_service import review_scheduler_service

@app.post("/api/memory/create-card")
async def create_memory_card(request: Request):
    """
    Create a memory card from quiz question
    """
    data = await request.json()
    user_id = data.get('userId')
    quiz_question = data.get('quizQuestion')
    video_id = data.get('videoId')
    topic = data.get('topic')

    card = await memory_card_service.create_card_from_quiz_question(
        user_id, quiz_question, video_id, topic
    )

    return {'success': True, 'card': card}


@app.get("/api/memory/due-cards/{user_id}")
async def get_due_cards(user_id: str, limit: int = 20):
    """
    Get cards due for review
    """
    cards = await memory_card_service.get_due_cards(user_id, limit=limit)
    return {'success': True, 'cards': cards, 'count': len(cards)}


@app.post("/api/memory/review-card")
async def review_card(request: Request):
    """
    Submit card review and update using SM-2
    """
    data = await request.json()
    user_id = data.get('userId')
    card_id = data.get('cardId')
    was_correct = data.get('wasCorrect')
    confidence = data.get('confidence')  # 1-5
    response_time = data.get('responseTime')  # milliseconds

    result = await memory_card_service.review_card(
        user_id, card_id, was_correct, confidence, response_time
    )

    return {'success': True, 'result': result}


@app.get("/api/memory/stats/{user_id}")
async def get_memory_stats(user_id: str):
    """
    Get memory card statistics
    """
    new_cards = await memory_card_service.get_cards_by_state(user_id, 'new')
    learning_cards = await memory_card_service.get_cards_by_state(user_id, 'learning')
    review_cards = await memory_card_service.get_cards_by_state(user_id, 'review')
    mastered_cards = await memory_card_service.get_cards_by_state(user_id, 'mastered')

    return {
        'success': True,
        'stats': {
            'new': len(new_cards),
            'learning': len(learning_cards),
            'review': len(review_cards),
            'mastered': len(mastered_cards),
            'total': len(new_cards) + len(learning_cards) + len(review_cards) + len(mastered_cards)
        }
    }


@app.post("/api/review/create-session")
async def create_review_session(request: Request):
    """
    Create a daily review session
    """
    data = await request.json()
    user_id = data.get('userId')
    target_cards = data.get('targetCards', 20)
    intensity = data.get('interleavingIntensity', 'medium')

    result = await review_scheduler_service.create_daily_review_session(
        user_id, target_cards, intensity
    )

    return {'success': True, 'session': result['session'], 'cards': result['cards']}


@app.post("/api/review/complete-session")
async def complete_review_session(request: Request):
    """
    Complete a review session
    """
    data = await request.json()
    user_id = data.get('userId')
    session_id = data.get('sessionId')
    card_results = data.get('cardResults')

    session = await review_scheduler_service.complete_session(
        user_id, session_id, card_results
    )

    return {'success': True, 'session': session}
```

---

## 6. Frontend Components

### 6.1 Daily Review Dashboard

```typescript
// /src/components/memory/DailyReviewDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Calendar, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MemoryStats {
  new: number;
  learning: number;
  review: number;
  mastered: number;
  total: number;
}

export function DailyReviewDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMemoryStats();
      loadDueCards();
    }
  }, [user]);

  const loadMemoryStats = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/memory/stats/${user.id}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDueCards = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(
        `${backendUrl}/api/memory/due-cards/${user.id}?limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setDueCards(data.cards);
      }
    } catch (error) {
      console.error('Failed to load due cards:', error);
    }
  };

  const startReview = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/review/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          targetCards: 20,
          interleavingIntensity: 'medium'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to review session
        window.location.href = `/review/${data.session.sessionId}`;
      }
    } catch (error) {
      console.error('Failed to start review:', error);
    }
  };

  if (loading) {
    return <div>Loading memory dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Review</h1>
          <p className="text-muted-foreground">
            Strengthen your memory with spaced repetition
          </p>
        </div>
        <Button
          onClick={startReview}
          disabled={dueCards.length === 0}
          size="lg"
          className="gap-2"
        >
          <Brain className="h-5 w-5" />
          Start Review ({dueCards.length} cards due)
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.new || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {stats?.learning || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.review || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mastered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.mastered || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Due Cards Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dueCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No cards due for review today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dueCards.slice(0, 5).map((card) => (
                <div
                  key={card.cardId}
                  className="p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{card.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Topic: {card.topic}
                      </p>
                    </div>
                    <span className="text-xs bg-accent px-2 py-1 rounded">
                      {card.cardState}
                    </span>
                  </div>
                </div>
              ))}

              {dueCards.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  + {dueCards.length - 5} more cards
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.2 Review Session Component

```typescript
// /src/components/memory/ReviewSession.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Brain } from 'lucide-react';

interface ReviewSessionProps {
  sessionId: string;
  userId: string;
}

export function ReviewSession({ sessionId, userId }: ReviewSessionProps) {
  const [session, setSession] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [confidence, setConfidence] = useState<number>(3);
  const [results, setResults] = useState<any[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const currentCard = cards[currentCardIndex];
  const progress = (currentCardIndex / cards.length) * 100;

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentCard) return;

    const responseTime = Date.now() - startTime;
    const wasCorrect = selectedAnswer === currentCard.correctAnswer;

    // Submit to backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/memory/review-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cardId: currentCard.cardId,
          wasCorrect,
          confidence,
          responseTime
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save result
        const result = {
          cardId: currentCard.cardId,
          wasCorrect,
          responseTime,
          confidenceLevel: confidence,
          newEaseFactor: data.result.card.easeFactor,
          newInterval: data.result.newInterval
        };

        setResults([...results, result]);
        setShowAnswer(true);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setConfidence(3);
      setStartTime(Date.now());
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/review/complete-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          cardResults: results
        })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to results page
        window.location.href = `/review/${sessionId}/results`;
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  if (!currentCard) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Card {currentCardIndex + 1} of {cards.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Question */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {currentCard.topic}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {currentCard.question}
              </h3>
            </div>

            {/* Options */}
            {!showAnswer && (
              <RadioGroup
                value={selectedAnswer || undefined}
                onValueChange={setSelectedAnswer}
              >
                {currentCard.options?.map((option: any) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 hover:bg-accent/50 transition-colors"
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Answer Feedback */}
            {showAnswer && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  selectedAnswer === currentCard.correctAnswer
                    ? 'bg-green-50 border-2 border-green-500'
                    : 'bg-red-50 border-2 border-red-500'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedAnswer === currentCard.correctAnswer ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">Incorrect</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm">{currentCard.explanation}</p>
                </div>

                {/* Confidence Rating */}
                <div className="p-4 bg-accent/20 rounded-lg">
                  <p className="text-sm font-medium mb-3">
                    How confident are you in this answer?
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Button
                        key={level}
                        variant={confidence === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfidence(level)}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    1 = Guessed, 5 = Very confident
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!showAnswer ? (
          <Button
            onClick={submitAnswer}
            disabled={!selectedAnswer}
            size="lg"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={nextCard} size="lg">
            {currentCardIndex < cards.length - 1 ? 'Next Card' : 'Finish Review'}
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 7. Production Considerations

### 7.1 Performance Optimizations

**DynamoDB Design:**
- Use GSIs for efficient due card queries
- Batch write operations for bulk updates
- Use DynamoDB Streams for real-time analytics
- Implement conditional writes to prevent race conditions

**Caching Strategy:**
- Redis cache for frequently accessed cards
- Client-side caching of session data
- Pre-fetch next cards during review

**API Optimizations:**
- Paginate large card lists
- Compress responses with gzip
- Use WebSockets for real-time session updates

### 7.2 Scalability

**Horizontal Scaling:**
- Stateless backend services
- DynamoDB auto-scaling
- CloudFront CDN for static assets

**Data Partitioning:**
- Partition by userId for even distribution
- Use composite keys for efficient queries
- Archive old sessions to S3

### 7.3 Monitoring & Analytics

**Metrics to Track:**
- Daily active reviewers
- Average session completion rate
- Card retention rates by topic
- Forgetting curve accuracy
- SM-2 algorithm effectiveness

**Alerts:**
- High error rates on card review
- Session abandonment > 30%
- Database query latency > 500ms
- Failed card updates

### 7.4 Data Backup & Recovery

**Backup Strategy:**
- Daily DynamoDB backups
- Point-in-time recovery enabled
- Export historical sessions to S3
- Weekly data validation checks

---

## 8. Implementation Roadmap

### Phase 1: Core Memory System (Weeks 1-3)
- ✅ DynamoDB schema design
- ✅ SM-2 algorithm implementation
- ✅ MemoryCardService
- ✅ Basic API endpoints
- ✅ Daily review dashboard UI

### Phase 2: Advanced Features (Weeks 4-6)
- ⬜ Forgetting curve predictions
- ⬜ Interleaved practice engine
- ⬜ ReviewSchedulerService
- ⬜ Performance analytics
- ⬜ Cumulative assessments

### Phase 3: Polish & Optimization (Weeks 7-8)
- ⬜ Mobile responsive UI
- ⬜ Push notifications
- ⬜ Performance optimizations
- ⬜ A/B testing framework
- ⬜ User preferences management

### Phase 4: Production Launch (Week 9)
- ⬜ Load testing
- ⬜ Security audit
- ⬜ Documentation
- ⬜ User onboarding flow
- ⬜ Beta launch

---

## 9. Success Metrics

**User Engagement:**
- Daily review completion rate > 70%
- Average retention rate > 85%
- Session abandonment rate < 20%
- Daily active users growth

**Learning Outcomes:**
- Average card mastery time
- Long-term retention (30/60/90 days)
- Improvement in quiz scores
- Topic mastery progression

**System Performance:**
- API response time < 200ms (p95)
- Card review latency < 100ms
- Session creation success rate > 99.5%
- Database query efficiency

---

## Conclusion

This production-level memory and retention system transforms StreamSmart from a passive learning platform into an active, scientifically-backed tutoring application. The SM-2 algorithm ensures optimal spacing, the forgetting curve predicts knowledge decay, and interleaved practice maximizes retention.

Key differentiators:
1. **Scientifically proven** spaced repetition
2. **Adaptive learning** that adjusts to individual performance
3. **Predictive analytics** for retention forecasting
4. **Production-ready** with scalability and monitoring
5. **Seamless integration** with existing quiz/video features

This system will significantly improve long-term knowledge retention and user engagement, positioning StreamSmart as a leader in AI-powered educational technology.
