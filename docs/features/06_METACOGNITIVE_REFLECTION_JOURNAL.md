# Feature 6: Metacognitive Reflection Journal with AI Feedback

## Overview
AI-powered digital journal that guides students through metacognitive reflection, helping them develop self-regulated learning skills. Based on 2025 research showing metacognitive support enhances self-regulated learning abilities in task strategy and self-evaluation.

## Core Functionality

### 1. Guided Reflection Prompts
- **Pre-Learning Planning**: "What do you already know about this topic? What do you want to learn?"
- **During-Learning Monitoring**: "Are you understanding this? What's confusing? Do you need to change strategy?"
- **Post-Learning Evaluation**: "What did you learn? How well did you learn it? What would you do differently?"
- **Strategy Assessment**: "Which learning techniques worked best? Why?"

### 2. AI-Powered Feedback
- **Reflection Quality Analysis**: Assess depth and quality of reflections using LLM
- **Personalized Insights**: Identify patterns in learning strategies and outcomes
- **Growth Tracking**: Show metacognitive skill development over time
- **Adaptive Prompts**: Customize reflection questions based on learning context

### 3. Self-Regulated Learning Support
- **Goal Setting**: SMART goal creation and tracking
- **Strategy Toolbox**: Suggest evidence-based learning strategies
- **Progress Monitoring**: Visual dashboard of self-regulation skills
- **Habit Formation**: Nudges to build consistent reflection practice

## Technical Implementation

### Backend (Python/FastAPI)

```python
# services/metacognitive_journal_service.py

from typing import Dict, List
from datetime import datetime
import openai

class ReflectionPromptGenerator:
    """Generate contextual reflection prompts"""

    PROMPT_TEMPLATES = {
        'pre_learning': [
            "What do you already know about {topic}?",
            "What specific questions do you want answered?",
            "How does this relate to what you've learned before?",
            "What's your learning goal for this session?"
        ],
        'during_learning': [
            "What's the main idea so far?",
            "What's confusing or unclear?",
            "Is your current approach working?",
            "Do you need to try a different strategy?"
        ],
        'post_learning': [
            "Summarize the key concepts in your own words",
            "What was most surprising or interesting?",
            "How confident are you in your understanding (1-10)?",
            "How would you explain this to someone else?"
        ],
        'strategy_reflection': [
            "Which learning techniques did you use today?",
            "What worked well? What didn't?",
            "How could you improve next time?",
            "What obstacles did you face? How did you overcome them?"
        ]
    }

    def generate_prompt(
        self,
        stage: str,
        context: Dict
    ) -> str:
        """Generate contextualized prompt"""
        templates = self.PROMPT_TEMPLATES.get(stage, [])
        selected = templates[0]  # Can be randomized

        # Contextualize with topic
        topic = context.get('topic', 'this topic')
        return selected.format(topic=topic)

class ReflectionAnalyzer:
    """Analyze reflection quality using LLM"""

    async def analyze_reflection(
        self,
        reflection_text: str,
        context: Dict
    ) -> Dict:
        """
        Assess reflection depth and provide feedback
        """
        prompt = f"""
        Analyze this student's learning reflection for metacognitive depth.

        Reflection: "{reflection_text}"

        Learning context: {context.get('topic', 'General')}

        Evaluate:
        1. Depth (1-5): Surface level vs deep thinking
        2. Specificity (1-5): Vague vs concrete examples
        3. Self-awareness (1-5): Recognition of own learning process
        4. Strategy use (1-5): Evidence of learning strategies

        Provide:
        - Overall quality score (1-10)
        - Specific strengths
        - Suggestions for deeper reflection
        - One follow-up question to deepen thinking

        Return JSON format.
        """

        # Call GPT-4
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a metacognition expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        analysis = json.loads(response.choices[0].message.content)
        return analysis

class MetacognitiveJournalService:
    """Main journal service"""

    def __init__(self, db_service):
        self.db = db_service
        self.prompt_generator = ReflectionPromptGenerator()
        self.analyzer = ReflectionAnalyzer()

    async def create_journal_entry(
        self,
        user_id: str,
        session_id: str,
        stage: str,
        reflection_text: str,
        context: Dict
    ) -> Dict:
        """
        Save reflection and generate AI feedback
        """
        # Analyze reflection quality
        analysis = await self.analyzer.analyze_reflection(
            reflection_text,
            context
        )

        # Save to database
        entry_id = await self._save_entry(
            user_id,
            session_id,
            stage,
            reflection_text,
            analysis
        )

        # Update metacognitive skill metrics
        await self._update_metacognitive_metrics(user_id, analysis)

        return {
            'entry_id': entry_id,
            'analysis': analysis,
            'next_prompt': self._generate_follow_up_prompt(analysis)
        }

    async def get_reflection_insights(
        self,
        user_id: str,
        time_period: str = 'week'
    ) -> Dict:
        """
        Generate personalized insights from reflection history
        """
        # Retrieve reflections
        entries = await self._get_user_reflections(user_id, time_period)

        # Analyze patterns using LLM
        prompt = f"""
        Analyze this student's reflection journal entries to identify:
        1. Common learning strategies
        2. Recurring challenges
        3. Growth in metacognitive awareness
        4. Recommendations for improvement

        Entries: {entries}

        Provide actionable, personalized insights.
        """

        insights = await self._call_llm(prompt)

        return insights
```

### DynamoDB Schema

```typescript
{
  PK: "USER#{userId}",
  SK: "JOURNAL#{timestamp}#{entryId}",
  entryId: string,
  userId: string,
  sessionId: string,
  stage: 'pre_learning' | 'during_learning' | 'post_learning' | 'strategy_reflection',

  reflectionText: string,
  wordCount: number,

  // AI analysis
  qualityScore: number,  // 1-10
  depth: number,         // 1-5
  specificity: number,   // 1-5
  selfAwareness: number, // 1-5
  strategyUse: number,   // 1-5

  aiFeedback: {
    strengths: string[],
    suggestions: string[],
    followUpQuestion: string
  },

  context: {
    topic: string,
    videoId?: string,
    playlistId?: string
  },

  timestamp: timestamp
}

// Metacognitive Skills Progress
{
  PK: "USER#{userId}",
  SK: "METACOG#metrics",
  avgQualityScore: number,
  avgDepth: number,
  avgSpecificity: number,
  avgSelfAwareness: number,
  avgStrategyUse: number,
  totalEntries: number,
  reflectionStreak: number,
  lastReflection: timestamp
}
```

### Frontend (React)

```typescript
// components/metacognitive/ReflectionJournal.tsx

export function ReflectionJournal({
  stage,
  context,
}: {
  stage: 'pre' | 'during' | 'post' | 'strategy';
  context: any;
}) {
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const submitReflection = async () => {
    setIsAnalyzing(true);

    const res = await fetch('/api/metacognitive-journal/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        reflectionText: reflection,
        context,
      }),
    });

    const result = await res.json();
    setFeedback(result.analysis);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Learning Reflection</h2>

      {/* Reflection Prompt */}
      <div className="bg-blue-50 p-4 rounded mb-4">
        <p className="text-blue-900">{getPromptForStage(stage, context)}</p>
      </div>

      {/* Text Area */}
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        className="w-full h-40 p-3 border rounded"
        placeholder="Take a moment to reflect on your learning..."
      />

      <button
        onClick={submitReflection}
        disabled={reflection.length < 20 || isAnalyzing}
        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
      >
        {isAnalyzing ? 'Analyzing...' : 'Submit Reflection'}
      </button>

      {/* AI Feedback */}
      {feedback && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold mb-2">AI Feedback</h3>

          <div className="mb-3">
            <span className="text-sm text-gray-600">Quality Score: </span>
            <span className="text-lg font-bold text-green-700">
              {feedback.qualityScore}/10
            </span>
          </div>

          <div className="mb-2">
            <strong>Strengths:</strong>
            <ul className="list-disc list-inside">
              {feedback.aiFeedback.strengths.map((s, i) => (
                <li key={i} className="text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-2">
            <strong>Suggestions:</strong>
            <ul className="list-disc list-inside">
              {feedback.aiFeedback.suggestions.map((s, i) => (
                <li key={i} className="text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 p-3 bg-white rounded">
            <strong>Follow-up:</strong>
            <p className="text-sm mt-1">{feedback.aiFeedback.followUpQuestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Success Metrics
- **Reflection Consistency**: 60%+ of users reflecting weekly
- **Metacognitive Skill Growth**: 30% improvement in quality scores over 8 weeks
- **Learning Outcomes**: 25% better retention for students using journal
- **Engagement**: Average 150+ words per reflection

## Implementation Timeline
- Weeks 1-3: Prompt system and database
- Weeks 4-6: AI analysis engine
- Weeks 7-9: Frontend and UX
- Weeks 10-12: Insights dashboard

## References
- Zimmerman, B. J. (2002). Self-regulated learning
- Schraw, G. (1998). Promoting metacognitive awareness
- 2025 Research: Metacognitive support in GenAI environments
