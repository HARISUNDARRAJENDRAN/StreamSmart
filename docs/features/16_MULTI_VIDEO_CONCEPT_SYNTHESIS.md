# Feature 16: Multi-Video Concept Synthesis Engine

## Overview
AI system that connects concepts across multiple videos, creating comprehensive understanding by synthesizing information from diverse sources. Identifies complementary explanations, conflicting viewpoints, and knowledge gaps requiring additional sources.

## Core Functionality

### 1. Cross-Video Concept Linking
- **Concept Extraction**: Identify key concepts from each video using NLP
- **Semantic Similarity**: Find related concepts across videos using embeddings
- **Relationship Mapping**: Build knowledge graph connecting multi-video concepts
- **Contradiction Detection**: Flag conflicting explanations for critical analysis

### 2. Synthesis Generation
- **Integrated Summaries**: Combine best explanations from multiple sources
- **Perspective Comparison**: "Video A explains X as..., while Video B emphasizes..."
- **Comprehensive Coverage**: Identify what each video uniquely contributes
- **Gap Analysis**: Suggest additional videos to complete understanding

### 3. Learning Path Optimization
- **Optimal Video Sequence**: Order videos for maximum comprehension
- **Prerequisite Detection**: "Watch Video A before B for better understanding"
- **Redundancy Elimination**: Skip overlapping content
- **Complementary Pairing**: Combine videos with different strengths

## Technical Implementation

```python
# services/multi_video_synthesis_service.py

from typing import List, Dict
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class ConceptExtractor:
    """Extract concepts from video transcripts"""

    async def extract_concepts(
        self,
        video_id: str,
        transcript: str
    ) -> List[Dict]:
        """
        Use LLM to extract key concepts
        """
        prompt = f"""
        Extract all key concepts from this video transcript.
        For each concept, provide:
        1. Concept name
        2. Brief definition as explained in video
        3. Timestamp ranges where discussed
        4. Related concepts mentioned
        5. Depth of coverage (surface/moderate/deep)

        Transcript: {transcript}

        Return JSON array.
        """

        concepts = await self._call_llm_with_json(prompt)

        # Generate embeddings for each concept
        for concept in concepts:
            concept['embedding'] = await self._generate_embedding(
                concept['name'] + ' ' + concept['definition']
            )

        return concepts

class MultiVideoSynthesizer:
    """Synthesize knowledge across multiple videos"""

    async def create_synthesis(
        self,
        video_ids: List[str]
    ) -> Dict:
        """
        Create comprehensive synthesis across videos
        """
        # Extract concepts from all videos
        all_concepts = []

        for video_id in video_ids:
            transcript = await self._get_transcript(video_id)
            concepts = await self.concept_extractor.extract_concepts(
                video_id,
                transcript
            )

            for concept in concepts:
                concept['source_video'] = video_id
                all_concepts.append(concept)

        # Find related concepts across videos
        concept_clusters = self._cluster_related_concepts(all_concepts)

        # Generate synthesis for each cluster
        synthesized_knowledge = []

        for cluster in concept_clusters:
            synthesis = await self._synthesize_cluster(cluster)
            synthesized_knowledge.append(synthesis)

        return {
            'synthesized_concepts': synthesized_knowledge,
            'concept_graph': self._build_knowledge_graph(concept_clusters),
            'recommended_sequence': self._optimize_viewing_order(video_ids),
            'coverage_analysis': self._analyze_coverage(video_ids)
        }

    def _cluster_related_concepts(
        self,
        concepts: List[Dict]
    ) -> List[List[Dict]]:
        """
        Cluster concepts using embedding similarity
        """
        # Extract embeddings
        embeddings = np.array([c['embedding'] for c in concepts])

        # Calculate similarity matrix
        similarity_matrix = cosine_similarity(embeddings)

        # Cluster concepts with similarity > 0.7
        clusters = []
        visited = set()

        for i, concept in enumerate(concepts):
            if i in visited:
                continue

            cluster = [concept]
            visited.add(i)

            # Find similar concepts
            for j in range(len(concepts)):
                if j not in visited and similarity_matrix[i][j] > 0.7:
                    cluster.append(concepts[j])
                    visited.add(j)

            clusters.append(cluster)

        return clusters

    async def _synthesize_cluster(
        self,
        cluster: List[Dict]
    ) -> Dict:
        """
        Synthesize multiple explanations of same concept
        """
        concept_name = cluster[0]['name']

        # Collect all explanations
        explanations = [
            {
                'video_id': c['source_video'],
                'definition': c['definition'],
                'depth': c['depth'],
                'timestamp': c['timestamp_ranges']
            }
            for c in cluster
        ]

        # Use LLM to create comprehensive synthesis
        prompt = f"""
        Synthesize these multiple explanations of "{concept_name}":

        {explanations}

        Create:
        1. Comprehensive definition combining best aspects
        2. Comparison of perspectives (how do explanations differ?)
        3. Strengths of each source
        4. Recommended primary source (which video explains best?)
        5. Complementary sources (which video to watch for additional context?)

        Return JSON.
        """

        synthesis = await self._call_llm_with_json(prompt)

        return {
            'concept': concept_name,
            'synthesis': synthesis,
            'sources': explanations,
            'best_video': synthesis['recommended_primary_source']
        }

    async def detect_contradictions(
        self,
        video_ids: List[str]
    ) -> List[Dict]:
        """
        Identify conflicting explanations requiring critical analysis
        """
        # Extract claims from each video
        all_claims = []

        for video_id in video_ids:
            transcript = await self._get_transcript(video_id)
            claims = await self._extract_claims(transcript)

            for claim in claims:
                claim['source_video'] = video_id
                all_claims.append(claim)

        # Compare claims for contradictions
        contradictions = []

        for i, claim_a in enumerate(all_claims):
            for claim_b in all_claims[i+1:]:
                if await self._are_contradictory(claim_a, claim_b):
                    contradictions.append({
                        'claim_a': claim_a,
                        'claim_b': claim_b,
                        'conflict_type': await self._classify_conflict(claim_a, claim_b),
                        'resolution_needed': True
                    })

        return contradictions
```

### Frontend (React)

```typescript
// components/synthesis/MultiVideoSynthesis.tsx

export function MultiVideoSynthesis({
  playlistId,
}: {
  playlistId: string;
}) {
  const { data: synthesis } = useQuery(['synthesis', playlistId], () =>
    fetch(`/api/synthesis/playlist/${playlistId}`).then((r) => r.json())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Integrated Learning Map</h2>

      {/* Knowledge Graph Visualization */}
      <ConceptGraphVisualization graph={synthesis?.concept_graph} />

      {/* Synthesized Concepts */}
      <div className="space-y-4">
        {synthesis?.synthesized_concepts.map((concept) => (
          <SynthesisCard key={concept.concept} synthesis={concept} />
        ))}
      </div>

      {/* Contradictions Alert */}
      {synthesis?.contradictions?.length > 0 && (
        <ContradictionsPanel contradictions={synthesis.contradictions} />
      )}

      {/* Recommended Sequence */}
      <OptimalSequencePanel sequence={synthesis?.recommended_sequence} />
    </div>
  );
}
```

## Success Metrics
- **Comprehension**: 40% deeper understanding vs single-video learning
- **Efficiency**: 30% time savings by eliminating redundancy
- **Critical Thinking**: 50% more students identify contradictions
- **Coverage**: 95% of key concepts captured across multiple sources

## References
- Knowledge graph construction
- Semantic similarity using embeddings
- Multi-document summarization
- Contradiction detection in NLP
