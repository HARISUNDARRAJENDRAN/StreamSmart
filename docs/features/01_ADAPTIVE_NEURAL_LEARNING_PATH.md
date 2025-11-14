# Feature 1: Adaptive Neural Learning Path Engine

## Overview
An AI-powered learning path engine that uses advanced Bayesian Knowledge Tracing (BKT) and hierarchical modeling to create highly personalized, dynamically adapting learning sequences for each student. The system continuously monitors student performance across nano-level knowledge points and adjusts the learning path in real-time.

## Core Functionality

### 1. Hierarchical Bayesian Knowledge Tracing
- **Nano-Level Knowledge Breakdown**: Decompose each video concept into 50-100 micro-concepts (knowledge points)
- **Probabilistic Mastery Tracking**: Track P(mastery) for each knowledge point using hierarchical Bayesian models
- **Skill Dependency Mapping**: Create directed acyclic graphs (DAGs) of prerequisite relationships
- **Real-Time Adaptation**: Update mastery probabilities after each quiz, interaction, or video completion

### 2. Multi-Armed Bandit Optimization
- **Exploration vs Exploitation**: Balance between introducing new concepts and reinforcing weak areas
- **Thompson Sampling**: Use Bayesian inference to select optimal next learning activity
- **Contextual Bandits**: Incorporate student state (time of day, cognitive load, emotional state) into recommendations

### 3. Personalized Learning Velocity
- **Learning Rate Estimation**: Calculate individual learning velocity per knowledge domain
- **Difficulty Calibration**: Adjust content difficulty based on Zone of Proximal Development (ZPD)
- **Adaptive Pacing**: Recommend optimal study duration and break intervals

## Technical Implementation

### Backend Architecture (Python/FastAPI)

```python
# New Service: services/adaptive_learning_path_service.py

class AdaptiveLearningPathEngine:
    """
    Hierarchical Bayesian Knowledge Tracing with Thompson Sampling
    """

    def __init__(self):
        self.knowledge_graph = KnowledgeGraph()  # DAG of concepts
        self.bkt_model = HierarchicalBKT()
        self.bandit_optimizer = ThompsonSampling()

    async def get_next_learning_activity(
        self,
        user_id: str,
        current_context: LearningContext
    ) -> LearningActivity:
        """
        Select optimal next activity using Thompson Sampling
        """
        # 1. Get current mastery state
        mastery_state = await self.get_mastery_state(user_id)

        # 2. Generate candidate activities
        candidates = await self.generate_candidates(
            mastery_state,
            current_context
        )

        # 3. Use Thompson Sampling to select best activity
        selected_activity = self.bandit_optimizer.select(
            candidates,
            mastery_state,
            context=current_context
        )

        return selected_activity

    async def update_knowledge_state(
        self,
        user_id: str,
        activity_result: ActivityResult
    ):
        """
        Update Bayesian posterior after learning activity
        """
        # Extract performance evidence
        correctness = activity_result.score
        time_taken = activity_result.duration

        # Update BKT probabilities
        await self.bkt_model.update(
            user_id=user_id,
            knowledge_point=activity_result.knowledge_point,
            evidence={'correct': correctness, 'time': time_taken}
        )

        # Update learning velocity estimate
        await self.update_learning_velocity(user_id, activity_result)
```

### DynamoDB Schema

```typescript
// New Table: LearningPaths
{
  PK: "USER#{userId}",
  SK: "PATH#metadata",
  userId: string,
  currentNode: string,  // Current position in knowledge graph
  masteryLevels: Map<knowledgePointId, MasteryState>,
  learningVelocity: Map<domain, number>,  // Concepts per hour
  completionEstimate: timestamp,
  adaptiveSettings: {
    preferredDifficulty: number,  // 0-1 scale
    explorationRate: number,      // Exploration vs exploitation
    pacePreference: 'slow' | 'medium' | 'fast'
  },
  createdAt: timestamp,
  updatedAt: timestamp
}

// MasteryState Structure
{
  knowledgePointId: string,
  p_mastery: number,        // Probability of mastery (0-1)
  p_learned: number,        // P(L) in BKT
  p_guess: number,          // P(G) in BKT
  p_slip: number,           // P(S) in BKT
  lastAttempt: timestamp,
  attemptCount: number,
  evidenceHistory: Evidence[]
}

// New Table: KnowledgeGraph
{
  PK: "GRAPH#main",
  SK: "NODE#{nodeId}",
  nodeId: string,
  conceptName: string,
  videoId: string,
  timestamp: number,        // Position in video
  prerequisites: string[],  // Array of nodeIds
  difficulty: number,       // 0-1 scale
  estimatedDuration: number, // Minutes
  contentType: 'video' | 'quiz' | 'exercise' | 'reading'
}
```

### Frontend Components (Next.js/React)

```typescript
// components/learning-path/AdaptiveLearningPath.tsx

export function AdaptiveLearningPath() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<LearningNode[]>([]);
  const [masteryMap, setMasteryMap] = useState<Map<string, number>>();

  // Fetch personalized learning path
  const { data: pathData } = useQuery({
    queryKey: ['learning-path', user?.id],
    queryFn: () => fetch(`/api/learning-path/${user?.id}`).then(r => r.json())
  });

  // Real-time mastery visualization
  return (
    <div className="learning-path-container">
      <PathVisualization
        nodes={currentPath}
        masteryLevels={masteryMap}
        onNodeSelect={(node) => handleNodeSelect(node)}
      />

      <MasteryHeatmap
        knowledgeGraph={pathData?.graph}
        masteryLevels={masteryMap}
      />

      <NextActivityCard
        activity={pathData?.nextActivity}
        reasoning={pathData?.selectionReasoning}
      />
    </div>
  );
}
```

### API Endpoints

```typescript
// app/api/learning-path/[userId]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;

  // Call Python backend
  const response = await fetch(
    `${process.env.PYTHON_BACKEND_URL}/adaptive-learning-path/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
    }
  );

  const learningPath = await response.json();

  return NextResponse.json(learningPath);
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  const activityResult = await request.json();

  // Update knowledge state
  await fetch(
    `${process.env.PYTHON_BACKEND_URL}/adaptive-learning-path/${userId}/update`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(activityResult),
    }
  );

  return NextResponse.json({ success: true });
}
```

## User Experience Considerations

### 1. Visual Learning Path
- **Interactive Knowledge Map**: ReactFlow-based visualization of knowledge graph
- **Mastery Indicators**: Color-coded nodes (red=weak, yellow=learning, green=mastered)
- **Recommended Path Highlighting**: Visual guidance showing optimal next steps
- **Progress Metrics**: Real-time completion percentage and estimated time remaining

### 2. Transparent AI Reasoning
- **Explanation Panel**: Show why each activity was recommended
- **Alternative Paths**: Allow users to see and choose alternative learning sequences
- **Manual Override**: Users can skip or revisit any concept at will

### 3. Motivation & Engagement
- **Skill Tree Unlocking**: Gamified progression with locked advanced concepts
- **Mastery Celebrations**: Animations and badges when achieving concept mastery
- **Progress Streaks**: Track consecutive days of following the adaptive path

### 4. Mobile-First Design
- **Swipe Navigation**: Swipe to accept/skip recommended activities
- **Offline Path Caching**: Pre-download next 5 recommended activities
- **Quick Actions**: One-tap to start next recommended video

## Integration Requirements

### 1. Existing Systems Integration
- **Video Player**: Track watch time, rewinds, pauses at nano-level timestamps
- **Quiz System**: Integrate quiz results as BKT evidence
- **RAG Chatbot**: Use chat questions as signals of confusion/mastery
- **Transcript Service**: Extract knowledge points from video transcripts using LLM

### 2. Data Dependencies
- **User Profile**: Learning preferences, historical performance
- **Playlist Data**: Video metadata, difficulty ratings
- **Activity Log**: All historical learning interactions
- **Quiz Bank**: Questions tagged with knowledge point IDs

### 3. External Service Integration
- **OpenAI/Gemini**: Generate knowledge point breakdowns from transcripts
- **Amazon Bedrock**: Embedding generation for concept similarity
- **DynamoDB Streams**: Real-time updates to learning path on activity completion

## Success Metrics & Validation

### Primary Metrics
1. **Learning Efficiency**: Reduction in time to reach mastery (target: 30% improvement)
2. **Retention Rate**: Long-term retention measured via spaced testing (target: 80%+ after 30 days)
3. **Engagement**: Daily active users following adaptive path (target: 70%+ of active users)
4. **Path Completion**: % of users completing generated learning paths (target: 60%+)

### Secondary Metrics
1. **Prediction Accuracy**: BKT model accuracy vs actual quiz performance (target: AUC > 0.85)
2. **User Satisfaction**: NPS score for adaptive path feature (target: 50+)
3. **Manual Override Rate**: % of time users skip recommendations (target: <20%)
4. **Knowledge Graph Coverage**: % of video content mapped to knowledge points (target: 90%+)

### A/B Testing Strategy
- **Control Group**: Traditional linear playlist progression
- **Test Group A**: Full adaptive path with Thompson Sampling
- **Test Group B**: Simplified adaptive path with fixed difficulty progression
- **Duration**: 8 weeks minimum
- **Sample Size**: 1000+ users per group

### Validation Criteria
1. ✅ BKT model achieves AUC > 0.80 on held-out test set
2. ✅ Adaptive path users show 20%+ faster concept mastery
3. ✅ User satisfaction score > 4.0/5.0
4. ✅ System latency < 500ms for path generation
5. ✅ Knowledge graph coverage > 80% of popular videos

## Implementation Phases

### Phase 1: Knowledge Graph Foundation (Weeks 1-3)
- Build knowledge point extraction pipeline (LLM-based)
- Create DynamoDB schema and migrations
- Implement basic knowledge graph API
- Manual tagging of top 100 videos

### Phase 2: BKT Model Implementation (Weeks 4-6)
- Implement hierarchical Bayesian knowledge tracing
- Build mastery state tracking system
- Create learning velocity estimation
- Unit tests with synthetic data

### Phase 3: Path Generation Engine (Weeks 7-9)
- Implement Thompson Sampling optimizer
- Build candidate activity generation
- Create path visualization components
- Integration with existing quiz system

### Phase 4: Frontend & UX (Weeks 10-12)
- Build ReactFlow-based knowledge map
- Implement mastery heatmap visualization
- Create adaptive path dashboard
- Mobile responsive design

### Phase 5: Testing & Optimization (Weeks 13-16)
- A/B testing setup
- Performance optimization (caching, indexing)
- User feedback collection
- Model fine-tuning based on real data

## Dependencies & Prerequisites

### Technical Dependencies
- Python packages: `pymc3`, `scipy`, `networkx`, `numpy`
- DynamoDB table creation permissions
- OpenAI/Gemini API access for knowledge extraction
- Frontend: `reactflow`, `d3.js` for visualizations

### Data Prerequisites
- Minimum 1000 quiz attempts per user for accurate BKT
- Video transcripts for all content
- Initial knowledge graph seed (can be auto-generated)
- Historical user performance data

### Team Requirements
- Backend Engineer (Python): 0.8 FTE
- Frontend Engineer (React): 0.6 FTE
- ML Engineer (BKT implementation): 0.5 FTE
- UX Designer: 0.3 FTE
- Total: ~2.5 months team effort

## Risk Mitigation

### Technical Risks
1. **Risk**: BKT model overfitting to noisy quiz data
   - **Mitigation**: Use hierarchical priors, cross-validation, synthetic data augmentation

2. **Risk**: Knowledge graph generation quality varies
   - **Mitigation**: Human-in-the-loop validation, confidence scoring, fallback to manual tagging

3. **Risk**: High latency for path computation
   - **Mitigation**: Pre-compute paths, caching layer, async processing

### UX Risks
1. **Risk**: Users find adaptive path confusing or restrictive
   - **Mitigation**: Always allow manual override, clear explanations, gradual rollout

2. **Risk**: Over-optimization leads to boring/repetitive content
   - **Mitigation**: Balance exploitation with exploration, inject novelty factor

## Future Enhancements

1. **Multi-Objective Optimization**: Balance mastery, engagement, and time constraints
2. **Social Learning Paths**: Incorporate peer comparisons and collaborative goals
3. **Cross-Video Synthesis**: Automatically create learning paths spanning multiple videos
4. **Adaptive Content Generation**: Generate custom quizzes/exercises for weak knowledge points
5. **Transfer Learning**: Apply mastery in one domain to accelerate learning in related domains

## References & Research

- Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*.
- Piech, C., et al. (2015). Deep Knowledge Tracing. *NeurIPS*.
- Thompson, W. R. (1933). On the likelihood that one unknown probability exceeds another. *Biometrika*.
- Vygotsky, L. S. (1978). *Mind in Society: Development of Higher Psychological Processes*.
- Recent 2025 research: Hierarchical Bayesian Knowledge Tracing achieving AUC 0.831 vs 0.760 baseline
