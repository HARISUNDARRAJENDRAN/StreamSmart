# Feature 13: Teach-Back Mirror Sessions

## Overview
"Teaching is the best way to learn." Students record themselves explaining concepts (video/audio), then receive AI analysis of their explanation quality, identifying gaps in understanding and misconceptions.

## Core Functionality

### 1. Teaching Session Recording
- **Video Recording**: Webcam capture of student teaching
- **Audio Recording**: Voice-only explanations
- **Screen Recording**: Explain with visual aids
- **Written Explanations**: Text-based teaching

### 2. AI Analysis
- **Content Accuracy**: Verify correctness of explanation
- **Completeness**: Identify missing key concepts
- **Clarity**: Assess explanation quality
- **Misconception Detection**: Flag incorrect understanding
- **Confidence Analysis**: Detect uncertainty markers

### 3. Feedback & Improvement
- **Gap Identification**: "You missed explaining X"
- **Comparison**: Student vs expert explanation
- **Improvement Suggestions**: How to explain better
- **Iteration**: Re-record after learning gaps

## Technical Implementation

```python
# services/teach_back_analysis_service.py

class TeachBackAnalyzer:
    """Analyze student teaching recordings"""

    async def analyze_explanation(
        self,
        recording_transcript: str,
        concept_id: str,
        expert_explanation: str
    ) -> Dict:
        """
        Comprehensive analysis of student's teaching
        """
        prompt = f"""
        Analyze this student's explanation of a concept.

        Concept: {concept_id}
        Student explanation: "{recording_transcript}"
        Expert explanation: "{expert_explanation}"

        Assess:
        1. Accuracy (0-100%): How correct is the explanation?
        2. Completeness (0-100%): What % of key points covered?
        3. Clarity (1-5): How clear and organized?
        4. Misconceptions: List any incorrect statements
        5. Missing concepts: What key points were omitted?
        6. Confidence markers: Does student seem uncertain?
        7. Improvement suggestions: Specific advice

        Return detailed JSON analysis.
        """

        analysis = await self._call_llm_with_json(prompt)

        # Detect confidence through speech patterns
        confidence = self._analyze_linguistic_confidence(recording_transcript)
        analysis['confidence_score'] = confidence

        return analysis

    def _analyze_linguistic_confidence(self, text: str) -> float:
        """
        Detect uncertainty through linguistic markers
        """
        uncertainty_markers = [
            'I think', 'maybe', 'probably', 'not sure',
            'I guess', 'kind of', 'sort of', 'possibly'
        ]

        hedging_count = sum(
            text.lower().count(marker)
            for marker in uncertainty_markers
        )

        # More hedging = lower confidence
        confidence = max(0, 1 - (hedging_count / 10))
        return confidence

    async def generate_comparison_visualization(
        self,
        student_explanation: str,
        expert_explanation: str
    ) -> Dict:
        """
        Create side-by-side comparison
        """
        # Extract key concepts from both
        student_concepts = await self._extract_concepts(student_explanation)
        expert_concepts = await self._extract_concepts(expert_explanation)

        # Find gaps
        missing_concepts = set(expert_concepts) - set(student_concepts)
        extra_concepts = set(student_concepts) - set(expert_concepts)

        return {
            'student_concepts': student_concepts,
            'expert_concepts': expert_concepts,
            'missing': list(missing_concepts),
            'extra': list(extra_concepts),
            'coverage_percentage': len(student_concepts) / len(expert_concepts) * 100
        }
```

## Success Metrics
- **Learning Gains**: 65% improvement in retention vs passive review
- **Misconception Correction**: 80% of gaps addressed after feedback
- **Confidence Improvement**: Students become better explainers
- **Adoption**: 50%+ try teach-back at least once

## References
- Protégé Effect: Teaching improves learning
- Retrieval practice research
- Feynman Technique
