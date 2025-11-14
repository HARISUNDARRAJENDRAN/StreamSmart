# Feature 18: Intelligent Prerequisite Knowledge Detector & Auto-Remediation

## Overview
AI system that automatically detects missing prerequisite knowledge when students struggle, then provides just-in-time micro-lessons to fill gaps. Prevents frustration from attempting content beyond current knowledge level.

## Core Functionality

### 1. Real-Time Gap Detection
- **Struggle Signals**: Wrong quiz answers, frequent rewinds, help requests
- **Knowledge Inference**: Determine which prerequisite is missing
- **Diagnostic Questions**: Quick assessment to confirm gap
- **Gap Severity**: Classify as critical, moderate, or minor

### 2. Just-In-Time Remediation
- **Micro-Lessons**: 3-5 minute targeted explanations
- **Prerequisite Content Retrieval**: Find videos covering missing concepts
- **Adaptive Scaffolding**: Gradual difficulty increase
- **Checkpoint Validation**: Verify gap filled before continuing

### 3. Prerequisite Mapping
- **Automatic Dependency Detection**: LLM-based prerequisite identification
- **Crowd-Sourced Validation**: Users confirm prerequisites
- **Dynamic Updating**: Refine prerequisite graph based on struggle patterns
- **Multiple Pathways**: Alternative prerequisite routes

## Technical Implementation

```python
# services/prerequisite_detector_service.py

from typing import List, Dict, Optional
import networkx as nx

class PrerequisiteKnowledgeGraph:
    """Build and maintain prerequisite dependency graph"""

    def __init__(self):
        self.graph = nx.DiGraph()

    async def build_prerequisite_graph(
        self,
        subject: str
    ) -> nx.DiGraph:
        """
        Automatically detect prerequisites using LLM
        """
        # Get all concepts in subject
        concepts = await self._get_all_concepts(subject)

        # For each concept, identify prerequisites
        for concept in concepts:
            prerequisites = await self._identify_prerequisites(concept)

            # Add to graph
            self.graph.add_node(concept['id'], **concept)

            for prereq in prerequisites:
                self.graph.add_edge(prereq['id'], concept['id'])

        return self.graph

    async def _identify_prerequisites(
        self,
        concept: Dict
    ) -> List[Dict]:
        """
        Use LLM to identify what knowledge is required
        """
        prompt = f"""
        What prerequisite knowledge is required to learn this concept?

        Concept: {concept['name']}
        Description: {concept['description']}

        List specific prerequisite concepts, not general categories.
        For each prerequisite:
        1. Concept name
        2. Why it's required
        3. Criticality (critical/important/helpful)

        Return JSON array.
        """

        prerequisites = await self._call_llm_with_json(prompt)
        return prerequisites

class StruggleDetector:
    """Detect when student is struggling due to missing prerequisites"""

    STRUGGLE_SIGNALS = {
        'multiple_wrong_answers': 0.3,
        'frequent_video_rewinds': 0.2,
        'slow_progress': 0.2,
        'help_requests': 0.2,
        'long_pauses': 0.1
    }

    async def detect_struggle(
        self,
        user_id: str,
        content_id: str,
        recent_events: List[Dict]
    ) -> Dict:
        """
        Analyze recent events to detect struggle
        """
        struggle_score = 0.0
        struggle_indicators = []

        # Check for wrong answers
        quiz_errors = [
            e for e in recent_events
            if e['type'] == 'quiz_wrong'
        ]
        if len(quiz_errors) >= 3:
            struggle_score += self.STRUGGLE_SIGNALS['multiple_wrong_answers']
            struggle_indicators.append('multiple_wrong_answers')

        # Check for rewinds
        rewinds = [
            e for e in recent_events
            if e['type'] == 'video_rewind'
        ]
        if len(rewinds) >= 5:
            struggle_score += self.STRUGGLE_SIGNALS['frequent_video_rewinds']
            struggle_indicators.append('frequent_rewinds')

        # Check help requests
        help_requests = [
            e for e in recent_events
            if e['type'] == 'help_request'
        ]
        if len(help_requests) >= 2:
            struggle_score += self.STRUGGLE_SIGNALS['help_requests']
            struggle_indicators.append('help_requests')

        is_struggling = struggle_score > 0.4

        return {
            'is_struggling': is_struggling,
            'struggle_score': struggle_score,
            'indicators': struggle_indicators,
            'confidence': min(1.0, struggle_score)
        }

class PrerequisiteRemediationService:
    """Provide just-in-time prerequisite remediation"""

    def __init__(self):
        self.prerequisite_graph = PrerequisiteKnowledgeGraph()
        self.struggle_detector = StruggleDetector()

    async def intervene_on_struggle(
        self,
        user_id: str,
        current_content_id: str,
        recent_events: List[Dict]
    ) -> Optional[Dict]:
        """
        Detect struggle and provide remediation
        """
        # Detect if struggling
        struggle_analysis = await self.struggle_detector.detect_struggle(
            user_id,
            current_content_id,
            recent_events
        )

        if not struggle_analysis['is_struggling']:
            return None

        # Identify missing prerequisite
        missing_prereq = await self._diagnose_missing_prerequisite(
            user_id,
            current_content_id,
            recent_events
        )

        if not missing_prereq:
            return None

        # Find remediation content
        micro_lesson = await self._create_micro_lesson(missing_prereq)

        # Create intervention
        intervention = {
            'type': 'prerequisite_gap',
            'missing_concept': missing_prereq,
            'micro_lesson': micro_lesson,
            'estimated_time': 5,  # minutes
            'message': f"It looks like you might need a quick refresher on {missing_prereq['name']}. Would you like a 5-minute review?"
        }

        return intervention

    async def _diagnose_missing_prerequisite(
        self,
        user_id: str,
        content_id: str,
        recent_events: List[Dict]
    ) -> Optional[Dict]:
        """
        Determine which specific prerequisite is missing
        """
        # Get content prerequisites
        content = await self._get_content(content_id)
        prerequisites = await self.prerequisite_graph.get_prerequisites(
            content['concept_id']
        )

        # Check user's mastery of each prerequisite
        mastery_levels = await self._get_mastery_levels(user_id, prerequisites)

        # Find weakest prerequisite
        weak_prerequisites = [
            prereq for prereq, mastery in mastery_levels.items()
            if mastery < 0.5
        ]

        if not weak_prerequisites:
            return None

        # Return most critical weak prerequisite
        critical_weak = sorted(
            weak_prerequisites,
            key=lambda p: p['criticality'],
            reverse=True
        )[0]

        return critical_weak

    async def _create_micro_lesson(
        self,
        concept: Dict
    ) -> Dict:
        """
        Create focused 5-minute lesson on missing concept
        """
        # Find best short video explaining concept
        videos = await self._search_videos(
            query=concept['name'],
            max_duration=300  # 5 minutes
        )

        # Or generate custom explanation
        if not videos:
            custom_explanation = await self._generate_explanation(concept)
            return {
                'type': 'generated',
                'content': custom_explanation,
                'duration': 3
            }

        return {
            'type': 'video',
            'video_id': videos[0]['id'],
            'start_time': 0,
            'end_time': videos[0]['duration'],
            'focus_concept': concept['name']
        }

    async def validate_gap_filled(
        self,
        user_id: str,
        concept_id: str
    ) -> bool:
        """
        Quick checkpoint to verify prerequisite learned
        """
        # Generate 2-3 quick questions
        questions = await self._generate_checkpoint_questions(concept_id)

        # Present to user (handled by frontend)
        # Return whether they passed (handled by separate endpoint)

        return True  # Placeholder
```

### Frontend (React)

```typescript
// components/remediation/PrerequisiteIntervention.tsx

export function PrerequisiteIntervention({
  intervention,
  onAccept,
  onDecline,
}: {
  intervention: any;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h3 className="text-xl font-bold mb-4">🎯 Quick Knowledge Gap Detected</h3>

        <p className="mb-4">{intervention.message}</p>

        <div className="bg-blue-50 p-3 rounded mb-4">
          <p className="text-sm">
            <strong>Missing concept:</strong> {intervention.missing_concept.name}
          </p>
          <p className="text-sm text-gray-600">
            Estimated time: {intervention.estimated_time} minutes
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Yes, review now
          </button>
          <button
            onClick={onDecline}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
- **Frustration Reduction**: 50% decrease in session abandonment
- **Efficiency**: 35% faster concept mastery with gap remediation
- **Accuracy**: 85%+ correct identification of missing prerequisites
- **Acceptance Rate**: 70%+ accept micro-lesson recommendations

## References
- Knowledge space theory
- Prerequisite learning research
- Just-in-time teaching
- Diagnostic assessment
