# Feature 4: Cognitive Load Optimizer

## Overview
An intelligent system that monitors and optimizes cognitive load using the EMR (Effort Monitoring and Regulation) framework, integrating self-regulated learning with cognitive load theory. The system dynamically adjusts content complexity, pacing, and multimedia presentation to maintain optimal germane cognitive load while minimizing extraneous load.

## Core Functionality

### 1. Real-Time Cognitive Load Assessment
- **Intrinsic Load Measurement**: Assess content difficulty based on prerequisite knowledge
- **Extraneous Load Detection**: Identify unnecessary cognitive burden from poor design
- **Germane Load Optimization**: Maximize schema construction and automation
- **Working Memory Capacity Estimation**: Personalized WM capacity (typically 7±2 items)

### 2. Adaptive Content Presentation
- **Multimedia Balancing**: Optimize text/video/audio ratio per Mayer's principles
- **Segmentation Control**: Break complex concepts into manageable chunks
- **Modality Effect**: Use visual + auditory channels to increase effective WM capacity
- **Redundancy Elimination**: Remove duplicate information across channels

### 3. Effort Monitoring System
- **Mental Effort Tracking**: Subjective rating scales after each learning segment
- **Performance-Effort Correlation**: Identify inefficient learning (high effort, low performance)
- **Cognitive Efficiency Index**: CEI = Performance / Mental Effort
- **Adaptive Difficulty**: Adjust based on Zone of Proximal Development

## Technical Implementation

### Backend (Python/FastAPI)

```python
# services/cognitive_load_optimizer_service.py

from typing import Dict, List, Optional
from dataclasses import dataclass
import numpy as np

@dataclass
class CognitiveLoadState:
    intrinsic_load: float      # 0-1: Content difficulty
    extraneous_load: float     # 0-1: Unnecessary cognitive burden
    germane_load: float        # 0-1: Schema construction effort
    total_load: float          # 0-1: Overall cognitive load
    wm_capacity: int           # Working memory capacity (items)
    mental_effort: float       # 0-1: Self-reported effort
    performance_score: float   # 0-1: Task performance
    efficiency_index: float    # Performance / Effort

class CognitiveLoadOptimizer:
    """
    EMR Framework Implementation
    """

    def __init__(self):
        self.default_wm_capacity = 7  # Miller's law
        self.optimal_load_range = (0.5, 0.8)  # Sweet spot

    async def assess_cognitive_load(
        self,
        user_id: str,
        content_id: str,
        context: Dict
    ) -> CognitiveLoadState:
        """
        Assess current cognitive load from multiple signals
        """
        # 1. Intrinsic load: Content difficulty
        intrinsic = await self._calculate_intrinsic_load(
            user_id, content_id, context
        )

        # 2. Extraneous load: UI complexity, distractions
        extraneous = await self._calculate_extraneous_load(context)

        # 3. Germane load: Schema construction effort
        germane = await self._calculate_germane_load(
            user_id, content_id, context
        )

        # 4. Total cognitive load
        total = intrinsic + extraneous + germane

        # 5. Get user's working memory capacity
        wm_capacity = await self._get_wm_capacity(user_id)

        # 6. Get recent mental effort ratings
        mental_effort = context.get('self_reported_effort', 0.5)

        # 7. Calculate performance score
        performance = await self._get_recent_performance(user_id, content_id)

        # 8. Cognitive efficiency index
        efficiency = performance / mental_effort if mental_effort > 0 else 0

        return CognitiveLoadState(
            intrinsic_load=intrinsic,
            extraneous_load=extraneous,
            germane_load=germane,
            total_load=total,
            wm_capacity=wm_capacity,
            mental_effort=mental_effort,
            performance_score=performance,
            efficiency_index=efficiency
        )

    async def _calculate_intrinsic_load(
        self,
        user_id: str,
        content_id: str,
        context: Dict
    ) -> float:
        """
        Calculate intrinsic cognitive load
        Factors: element interactivity, prerequisite knowledge gap
        """
        # Get content metadata
        content = await self._get_content_metadata(content_id)

        # Element interactivity (how many concepts must be held simultaneously)
        element_count = content.get('concept_count', 5)
        element_interactivity = min(1.0, element_count / 10)

        # Knowledge gap (prerequisite mastery)
        prerequisites = content.get('prerequisites', [])
        mastery_levels = await self._get_mastery_levels(user_id, prerequisites)
        avg_mastery = np.mean(mastery_levels) if mastery_levels else 0.5

        # Intrinsic load inversely proportional to prior knowledge
        intrinsic = element_interactivity * (1 - avg_mastery)

        return min(1.0, intrinsic)

    async def _calculate_extraneous_load(self, context: Dict) -> float:
        """
        Calculate extraneous cognitive load
        Factors: poor UI design, distractions, redundancy
        """
        extraneous = 0.0

        # Split-attention effect (must integrate spatially separated info)
        if context.get('has_split_attention', False):
            extraneous += 0.3

        # Redundancy effect (same info in multiple modalities)
        if context.get('has_redundancy', False):
            extraneous += 0.2

        # Visual clutter
        ui_complexity = context.get('ui_element_count', 5)
        if ui_complexity > 10:
            extraneous += 0.2

        return min(1.0, extraneous)

    async def _calculate_germane_load(
        self,
        user_id: str,
        content_id: str,
        context: Dict
    ) -> float:
        """
        Calculate germane cognitive load (productive effort)
        """
        germane = 0.3  # Base level

        # Active learning increases germane load
        if context.get('active_learning', False):
            germane += 0.3

        # Elaboration strategies
        if context.get('uses_elaboration', False):
            germane += 0.2

        return min(1.0, germane)

    async def generate_optimization_recommendations(
        self,
        load_state: CognitiveLoadState
    ) -> List[Dict]:
        """
        Generate adaptive interventions to optimize cognitive load
        """
        recommendations = []

        # Total load too high - risk of cognitive overload
        if load_state.total_load > self.optimal_load_range[1]:
            if load_state.extraneous_load > 0.3:
                recommendations.append({
                    'type': 'reduce_extraneous',
                    'action': 'simplify_ui',
                    'description': 'Simplify visual presentation'
                })

            if load_state.intrinsic_load > 0.7:
                recommendations.append({
                    'type': 'reduce_intrinsic',
                    'action': 'segment_content',
                    'description': 'Break content into smaller chunks'
                })
                recommendations.append({
                    'type': 'reduce_intrinsic',
                    'action': 'add_worked_examples',
                    'description': 'Provide worked examples before practice'
                })

        # Total load too low - not challenging enough
        elif load_state.total_load < self.optimal_load_range[0]:
            recommendations.append({
                'type': 'increase_germane',
                'action': 'add_elaboration_prompts',
                'description': 'Add questions prompting deeper processing'
            })
            recommendations.append({
                'type': 'increase_intrinsic',
                'action': 'increase_difficulty',
                'description': 'Progress to more complex concepts'
            })

        # Low efficiency - high effort, low performance
        if load_state.efficiency_index < 0.5:
            recommendations.append({
                'type': 'efficiency_intervention',
                'action': 'prerequisite_review',
                'description': 'Review prerequisite concepts first'
            })

        return recommendations

    async def apply_multimedia_optimization(
        self,
        content: Dict,
        load_state: CognitiveLoadState
    ) -> Dict:
        """
        Apply Mayer's multimedia learning principles
        """
        optimized_content = content.copy()

        # Modality effect: Use visual + auditory channels
        if load_state.intrinsic_load > 0.6:
            optimized_content['presentation_mode'] = 'multimodal'  # Text + narration
        else:
            optimized_content['presentation_mode'] = 'visual_only'

        # Segmentation: Break into chunks
        if load_state.total_load > 0.7:
            chunk_size = max(2, load_state.wm_capacity - 2)  # Leave WM room
            optimized_content['segment_size'] = chunk_size

        # Coherence: Remove extraneous material
        if load_state.extraneous_load > 0.3:
            optimized_content['include_decorative_graphics'] = False
            optimized_content['minimize_background_music'] = True

        # Contiguity: Integrate text and graphics
        optimized_content['text_placement'] = 'integrated'  # Not separated

        return optimized_content
```

### DynamoDB Schema

```typescript
{
  PK: "USER#{userId}",
  SK: "COGLOAD#{sessionId}#{timestamp}",
  userId: string,
  sessionId: string,
  contentId: string,
  timestamp: timestamp,

  cognitiveLoadState: {
    intrinsic: number,
    extraneous: number,
    germane: number,
    total: number,
    wmCapacity: number,
    mentalEffort: number,
    performanceScore: number,
    efficiencyIndex: number
  },

  appliedOptimizations: string[],
  userResponse?: 'improved' | 'same' | 'worse'
}
```

### Frontend (React)

```typescript
// components/cognitive-load/MentalEffortRating.tsx

export function MentalEffortRating({ onRate }: { onRate: (effort: number) => void }) {
  return (
    <div className="p-4 bg-gray-50 rounded">
      <p className="text-sm mb-2">How mentally demanding was that section?</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onRate(level / 5)}
            className="px-4 py-2 border rounded hover:bg-blue-100"
          >
            {level}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">1 = Very easy, 5 = Very hard</p>
    </div>
  );
}
```

## Success Metrics
- **Learning Efficiency**: 25% improvement in performance/time ratio
- **Cognitive Overload Reduction**: 40% decrease in session abandonment
- **Optimal Load Time**: 70%+ of learning time in optimal zone (0.5-0.8)

## Implementation Timeline
- Weeks 1-3: Core CLT assessment engine
- Weeks 4-6: Multimedia optimization
- Weeks 7-9: Adaptive interventions
- Weeks 10-12: Testing and validation

## References
- Sweller, J. (2011). Cognitive Load Theory
- Paas, F. & Van Merriënboer, J. (1994). Instructional control of cognitive load
- Mayer, R. E. (2009). Multimedia Learning Principles
- EMR Framework (2025): Effort Monitoring and Regulation
