# Feature 14: Circadian-Aware Study Session Orchestrator

## Overview
Optimize learning timing based on circadian rhythms, chronotype (morning lark vs night owl), and cognitive state. Research shows cognitive performance varies 20-30% throughout the day based on circadian phase.

## Core Functionality

### 1. Chronotype Detection
- **Morning Lark**: Peak performance 8am-12pm
- **Night Owl**: Peak performance 8pm-12am
- **Intermediate**: Peak performance 2pm-6pm
- **Assessment Quiz**: MEQ (Morningness-Eveningness Questionnaire)
- **Behavioral Inference**: Track when users naturally study

### 2. Optimal Timing Recommendations
- **Peak Performance Windows**: Schedule difficult concepts
- **Consolidation Periods**: Review before sleep
- **Circadian Dips**: Avoid new learning during low points (2-4pm for most)
- **Ultradian Rhythms**: 90-minute cycles with breaks

### 3. Adaptive Scheduling
- **Difficulty Matching**: Hard content during peak hours
- **Review Timing**: Easy reviews during off-peak
- **Break Recommendations**: Rest during cognitive dips
- **Sleep Reminders**: Protect sleep for memory consolidation

## Technical Implementation

```python
# services/circadian_orchestrator_service.py

from datetime import datetime, time
import pytz

class ChronotypeDetector:
    """Detect user's chronotype"""

    MEQ_QUESTIONS = [
        "What time would you prefer to wake up if completely free?",
        "When do you feel most alert?",
        # ... 19 total questions
    ]

    def calculate_chronotype(self, mq_scores: List[int]) -> str:
        """Calculate chronotype from MEQ scores"""
        total_score = sum(mq_scores)

        if total_score >= 70:
            return 'definite_morning'
        elif total_score >= 59:
            return 'moderate_morning'
        elif total_score >= 42:
            return 'intermediate'
        elif total_score >= 31:
            return 'moderate_evening'
        else:
            return 'definite_evening'

class CircadianOrchestrator:
    """Optimize study timing based on circadian rhythms"""

    PEAK_WINDOWS = {
        'definite_morning': [(6, 11)],
        'moderate_morning': [(7, 12)],
        'intermediate': [(10, 13), (15, 18)],
        'moderate_evening': [(16, 21)],
        'definite_evening': [(18, 23)]
    }

    async def get_optimal_study_time(
        self,
        user_id: str,
        content_difficulty: float,
        duration_minutes: int
    ) -> datetime:
        """
        Recommend optimal time for study session
        """
        # Get user chronotype
        chronotype = await self._get_chronotype(user_id)

        # Get user timezone
        user_tz = await self._get_user_timezone(user_id)
        now = datetime.now(pytz.timezone(user_tz))

        # Find next peak window
        peak_windows = self.PEAK_WINDOWS[chronotype]

        # For difficult content, must be in peak window
        if content_difficulty > 0.7:
            next_peak = self._find_next_peak_window(now, peak_windows)
            return next_peak
        else:
            # Easy content can be anytime, but prefer off-peak
            return self._find_next_available_slot(now, duration_minutes)

    async def schedule_optimal_session_plan(
        self,
        user_id: str,
        learning_objectives: List[Dict],
        available_time_per_day: int
    ) -> Dict:
        """
        Create day-long schedule optimized for circadian rhythms
        """
        chronotype = await self._get_chronotype(user_id)
        schedule = []

        # Sort objectives by difficulty
        sorted_objectives = sorted(
            learning_objectives,
            key=lambda x: x['difficulty'],
            reverse=True
        )

        # Assign hardest content to peak windows
        peak_windows = self.PEAK_WINDOWS[chronotype]

        for objective in sorted_objectives:
            if objective['difficulty'] > 0.7:
                # Schedule in peak window
                time_slot = self._allocate_in_window(peak_windows[0], objective)
            else:
                # Schedule in off-peak
                time_slot = self._allocate_in_off_peak(objective)

            schedule.append({
                'objective': objective,
                'scheduled_time': time_slot,
                'rationale': f"Optimal for {chronotype} chronotype"
            })

        return {
            'schedule': schedule,
            'sleep_reminder': self._calculate_sleep_time(chronotype),
            'break_intervals': self._generate_break_schedule(available_time_per_day)
        }

    def _generate_break_schedule(self, total_minutes: int) -> List[int]:
        """
        Generate break schedule based on ultradian rhythms
        90-minute work cycles
        """
        breaks = []
        elapsed = 0

        while elapsed < total_minutes:
            elapsed += 90  # 90-minute ultradian cycle
            if elapsed < total_minutes:
                breaks.append(elapsed)

        return breaks
```

## Success Metrics
- **Performance Variance**: 25% improvement in difficult content mastery when scheduled optimally
- **Adherence**: 60%+ follow timing recommendations
- **Sleep Protection**: 15% increase in healthy sleep duration
- **Efficiency**: Same learning in 20% less time with optimal scheduling

## References
- Circadian rhythm research
- MEQ (Morningness-Eveningness Questionnaire)
- Ultradian rhythms (90-minute cycles)
- Sleep and memory consolidation
