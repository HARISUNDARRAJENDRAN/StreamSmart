# Feature 15: Real-Time Concept Mastery Heatmap

## Overview
Dynamic visual representation of knowledge state across all concepts, showing strengths (green), learning areas (yellow), and gaps (red) in real-time. Inspired by skill trees in games but based on actual assessed mastery.

## Core Functionality

### 1. Visual Knowledge Map
- **Interactive Heatmap**: Color-coded concept grid
- **Hierarchical View**: Topics → Subtopics → Nano-concepts
- **Temporal Changes**: Animate mastery growth over time
- **Dependency Arrows**: Show prerequisite relationships

### 2. Real-Time Updates
- **Live Mastery Tracking**: Update after each quiz, video, review
- **Decay Modeling**: Show forgetting over time (Ebbinghaus curve)
- **Prediction Overlay**: Forecast future mastery with current trajectory
- **Gap Alerts**: Highlight critical missing prerequisites

### 3. Interactive Exploration
- **Click for Details**: Deep-dive into specific concept
- **Filter by Status**: Show only gaps, only mastered, etc.
- **Playlist Integration**: Map playlists to concept coverage
- **Recommendation Integration**: Suggest videos to fill gaps

## Technical Implementation

```python
# services/concept_heatmap_service.py

import numpy as np
from datetime import datetime, timedelta

class ConceptMasteryHeatmap:
    """Generate and maintain concept mastery visualization"""

    def __init__(self):
        self.mastery_threshold = 0.8  # 80% = mastered
        self.decay_rate = 0.1  # Per week without review

    async def generate_heatmap(
        self,
        user_id: str,
        subject: str
    ) -> Dict:
        """
        Generate current mastery heatmap
        """
        # Get all concepts in subject
        concepts = await self._get_subject_concepts(subject)

        # Get user's mastery levels
        mastery_data = await self._get_user_mastery(user_id, concepts)

        # Apply forgetting decay
        decayed_mastery = self._apply_forgetting_curve(mastery_data)

        # Organize into hierarchical structure
        heatmap = {
            'subject': subject,
            'timestamp': datetime.utcnow(),
            'concepts': []
        }

        for concept in concepts:
            mastery_level = decayed_mastery.get(concept['id'], 0.0)

            heatmap['concepts'].append({
                'id': concept['id'],
                'name': concept['name'],
                'mastery': mastery_level,
                'color': self._get_color(mastery_level),
                'status': self._get_status(mastery_level),
                'last_reviewed': mastery_data[concept['id']]['last_reviewed'],
                'next_review': self._calculate_next_review(mastery_data[concept['id']]),
                'prerequisites': concept['prerequisites']
            })

        return heatmap

    def _apply_forgetting_curve(
        self,
        mastery_data: Dict
    ) -> Dict:
        """
        Apply Ebbinghaus forgetting curve
        M(t) = M0 * e^(-t / S)
        where S is stability (from FSRS)
        """
        decayed = {}

        for concept_id, data in mastery_data.items():
            days_since_review = (
                datetime.utcnow() - data['last_reviewed']
            ).days

            # Exponential decay
            stability = data.get('stability', 7)  # Default 7 days
            decay_factor = np.exp(-days_since_review / stability)

            decayed_mastery = data['mastery'] * decay_factor
            decayed[concept_id] = decayed_mastery

        return decayed

    def _get_color(self, mastery: float) -> str:
        """Map mastery to color"""
        if mastery >= 0.8:
            return '#22c55e'  # Green (mastered)
        elif mastery >= 0.5:
            return '#eab308'  # Yellow (learning)
        elif mastery >= 0.2:
            return '#f97316'  # Orange (weak)
        else:
            return '#ef4444'  # Red (gap)

    def _get_status(self, mastery: float) -> str:
        """Categorize mastery level"""
        if mastery >= 0.8:
            return 'mastered'
        elif mastery >= 0.5:
            return 'learning'
        elif mastery >= 0.2:
            return 'weak'
        else:
            return 'gap'

    async def identify_critical_gaps(
        self,
        heatmap: Dict
    ) -> List[Dict]:
        """
        Find critical missing prerequisites blocking progress
        """
        gaps = [c for c in heatmap['concepts'] if c['status'] == 'gap']

        # Prioritize by impact (how many concepts depend on this)
        critical_gaps = []

        for gap in gaps:
            dependent_count = self._count_dependent_concepts(
                gap['id'],
                heatmap['concepts']
            )

            if dependent_count > 0:
                critical_gaps.append({
                    'concept': gap,
                    'blocking_count': dependent_count,
                    'priority': 'critical' if dependent_count > 5 else 'high'
                })

        # Sort by blocking count
        critical_gaps.sort(key=lambda x: x['blocking_count'], reverse=True)

        return critical_gaps
```

### Frontend (React + D3.js)

```typescript
// components/heatmap/ConceptMasteryHeatmap.tsx

import * as d3 from 'd3';

export function ConceptMasteryHeatmap({ userId, subject }: any) {
  const [heatmapData, setHeatmapData] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!heatmapData) return;

    // D3 visualization
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Create hierarchical layout
    const tree = d3.tree().size([width - 100, height - 100]);

    // ... D3 rendering logic
  }, [heatmapData]);

  return (
    <div>
      <h2>Your Knowledge Map</h2>
      <svg ref={svgRef} width={800} height={600} />

      {/* Legend */}
      <div className="legend">
        <span className="mastered">Mastered (80%+)</span>
        <span className="learning">Learning (50-80%)</span>
        <span className="weak">Weak (20-50%)</span>
        <span className="gap">Gap (&lt;20%)</span>
      </div>

      {/* Critical Gaps Alert */}
      <CriticalGapsPanel gaps={heatmapData?.critical_gaps} />
    </div>
  );
}
```

## Success Metrics
- **Visual Clarity**: 90%+ users understand their knowledge state at a glance
- **Action Rate**: 70%+ click gaps to learn
- **Coverage Improvement**: 35% increase in broad concept coverage
- **Engagement**: 5+ min avg time exploring heatmap

## References
- Knowledge space theory
- Ebbinghaus forgetting curve
- Skill tree visualization in gaming
- Information visualization best practices
