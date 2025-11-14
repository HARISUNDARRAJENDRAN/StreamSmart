# Feature 10: Self-Determination Theory Gamification Engine

## Overview
Intrinsic motivation system based on Self-Determination Theory (SDT), focusing on autonomy, competence, and relatedness rather than extrinsic rewards. Research shows gamification increases motivation with large effect size (g=0.822) but leaderboards can demotivate some learners.

## Core Functionality

### 1. SDT Pillars Implementation
- **Autonomy**: Choice in learning paths, content formats, study timing
- **Competence**: Progressive mastery challenges, skill-appropriate difficulty
- **Relatedness**: Social connection through peer pods, shared achievements

### 2. Intrinsic Motivation Mechanics
- **Mastery Progression**: Skill trees showing concept dependencies
- **Meaningful Badges**: Achievement tied to real learning milestones
- **Progress Visualization**: Growth mindset reinforcement
- **Personal Challenges**: Self-selected goals vs competitive rankings

### 3. Avoiding Demotivation
- **Optional Leaderboards**: Opt-in only to prevent negative comparison
- **Cooperative Challenges**: Team-based rewards vs individual competition
- **Effort Recognition**: Reward persistence and improvement, not just performance
- **Intrinsic Framing**: Emphasize learning growth over points/badges

## Technical Implementation

```python
# services/sdt_gamification_service.py

class SDTGamificationEngine:
    """Self-Determination Theory-based gamification"""

    def __init__(self):
        self.achievement_types = {
            'mastery': 'Competence-based achievements',
            'exploration': 'Autonomy-based achievements',
            'collaboration': 'Relatedness-based achievements'
        }

    async def award_mastery_achievement(
        self,
        user_id: str,
        skill_id: str,
        mastery_level: float
    ):
        """
        Competence pillar: Recognize skill mastery
        """
        if mastery_level >= 0.9:
            achievement = {
                'type': 'mastery',
                'skill': skill_id,
                'level': 'expert',
                'unlocked_at': datetime.utcnow(),
                'intrinsic_message': f"You've truly mastered {skill_id}! Your understanding is deep and solid."
            }

            # Unlock next skill tree branch
            await self._unlock_skill_tree_branch(user_id, skill_id)

            return achievement

    async def create_personal_challenge(
        self,
        user_id: str,
        challenge_type: str,
        difficulty: str
    ):
        """
        Autonomy pillar: Self-selected challenges
        """
        challenge = {
            'user_id': user_id,
            'type': challenge_type,
            'difficulty': difficulty,  # User chooses
            'self_selected': True,
            'reward_type': 'intrinsic',  # Satisfaction of completion
            'progress': 0.0
        }

        return challenge

    async def calculate_intrinsic_motivation_score(
        self,
        user_id: str
    ) -> Dict:
        """
        Measure intrinsic motivation using SDT framework
        """
        # Autonomy score (do they make choices?)
        autonomy = await self._assess_autonomy(user_id)

        # Competence score (do they feel capable?)
        competence = await self._assess_competence(user_id)

        # Relatedness score (do they feel connected?)
        relatedness = await self._assess_relatedness(user_id)

        return {
            'autonomy': autonomy,
            'competence': competence,
            'relatedness': relatedness,
            'overall_intrinsic_motivation': (autonomy + competence + relatedness) / 3
        }
```

## Success Metrics
- **Intrinsic Motivation**: 70%+ users report learning "for its own sake"
- **Engagement**: 50% increase in voluntary learning time
- **Autonomy Satisfaction**: 4.5+/5.0 on autonomy perception scale
- **Competence Feeling**: 80%+ report feeling capable and improving

## References
- Deci & Ryan: Self-Determination Theory
- 2025 Gamification Meta-analysis (g=0.822 effect size)
- Avoiding leaderboard demotivation
