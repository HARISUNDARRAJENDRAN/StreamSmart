# 🤔 Socratic Mode: The AI That Asks, Not Answers

> *"I cannot teach anybody anything. I can only make them think."* — Socrates

---

## The Insight

**Traditional AI Chat:**
```
User: "What is a closure in JavaScript?"
AI: "A closure is a function that has access to variables in its outer scope..."
[5 paragraphs of explanation]
```

**Result**: Passive consumption. Low retention. No thinking.

---

**Socratic Mode:**
```
User: "What is a closure in JavaScript?"
AI: "Great question! Before I explain, let me ask you—
     have you ever needed a function to 'remember' something?
     Like a counter that keeps track of how many times it was called?"

User: "Yeah, I guess..."

AI: "Perfect. What if I told you JavaScript functions can
     'remember' variables from where they were created?
     Can you think of why that might be useful?"

User: "Oh... so the function can keep its own private data?"

AI: "Exactly! You just described a closure. Now, try writing
     a function that returns another function. What happens
     to the variables in the outer function?"
```

**Result**: Active thinking. Deep understanding. Lasting memory.

---

## Core Philosophy

### 1. **Questions > Answers**

The Socratic Method, 2,500 years old, still undefeated:
- Don't tell—ask
- Don't explain—guide discovery
- Don't give fish—teach fishing

### 2. **Struggle is Learning**

Neuroscience: Desirable difficulty enhances retention.
- Easy answers → forgotten tomorrow
- Hard-earned insights → permanent memories

### 3. **Build on Prior Knowledge**

Socratic dialogue starts where YOU are:
- "What do you already know about X?"
- "Have you experienced something similar?"
- Connect new to known

### 4. **Metacognition**

Make learners aware of their own thinking:
- "Why do you think that?"
- "How would you test that hypothesis?"
- "What assumptions are you making?"

---

## User Experience

### Toggle Modes

Users can switch between Answer Mode and Socratic Mode:

```
┌────────────────────────────────────────────────┐
│  Chat with AI                                  │
│  Mode: [Answer Mode ▼] [Socratic Mode]        │
├────────────────────────────────────────────────┤
│  User: What is async/await?                    │
│                                                │
│  [ANSWER MODE]                                 │
│  AI: Async/await is syntactic sugar for...    │
│                                                │
│  [SOCRATIC MODE]                               │
│  AI: Good question! Have you used promises     │
│      before? What do you find confusing        │
│      about them?                               │
└────────────────────────────────────────────────┘
```

### Adaptive Questioning

Socratic Mode uses context to ask better questions:

**Beginner (no prior context):**
```
AI: "Let's start simple. Have you heard of callbacks?"
```

**Intermediate (watched related videos):**
```
AI: "I see you've watched videos on promises. How do you
     think async/await relates to what you already know?"
```

**Advanced (struggling with specific concept):**
```
AI: "You seem confused about error handling in async functions.
     What happens if you throw an error inside an async function?"
```

### Question Chains

Socratic mode builds chains of questions:

```
User: "Why is React using hooks now?"

AI: "Great question. First, let's think about class
     components. What was hard about managing state
     and lifecycle methods?"

User: "They got complicated with lots of methods..."

AI: "Exactly. So if you were redesigning React, how
     would you simplify state management?"

User: "Maybe... just use a function?"

AI: "You're onto something! What if useState() is just
     that—a function that manages state? Try it:
     What do you think useState() returns?"

User: "The state value... and a function to update it?"

AI: "Perfect! You just derived the hook API yourself.
     See how that's simpler than this.state?"
```

### Visual Question Trees

Show the chain of Socratic questioning:

```
"Why use hooks?"
    ↓
"What was hard about classes?"
    ↓
"How would you simplify state?"
    ↓
"What does useState() return?"
    ↓
[User understanding achieved]
```

---

## Technical Architecture

### Data Model

**DynamoDB Table**: `SocraticConversations`

```javascript
{
  conversationId: string;
  userId: string;
  playlistId: string;

  // Conversation State
  mode: 'answer' | 'socratic';
  currentDepth: number;         // How deep in question chain
  maxDepth: number;             // When to give answer (5-7 questions)

  // Question Chain
  questionChain: [
    {
      questionId: string;
      questionText: string;
      intent: 'assess_knowledge' | 'guide_discovery' | 'challenge_assumption' | 'metacognitive';
      userResponse: string;
      understanding: number;      // 0-100, how well user understood
      timestamp: string;
    }
  ];

  // Learning Context
  userKnowledge: {
    conceptsKnown: string[];
    conceptsUnclear: string[];
    priorVideos: string[];
  };

  // Outcome
  finalAnswer: string;            // The direct answer (given at end)
  learningQuality: number;        // 0-100, how deep the learning was
  userSatisfaction: number;       // User rating

  createdAt: string;
  completedAt: string;
}
```

---

## API Endpoints

```python
@app.post("/api/chat/socratic")
async def socratic_chat(
    user_id: str,
    conversation_id: str,
    user_message: str,
    mode: str = 'socratic'
):
    """
    Socratic chat endpoint.
    Instead of answering directly, asks guiding questions.
    """
    pass


@app.post("/api/chat/switch-mode")
async def switch_chat_mode(
    conversation_id: str,
    new_mode: str  # 'answer' or 'socratic'
):
    """
    Switch between answer and Socratic mode mid-conversation.
    """
    pass


@app.get("/api/chat/question-chain/{conversation_id}")
async def get_question_chain(conversation_id: str):
    """
    Retrieve the full chain of Socratic questions.
    Used for visualization.
    """
    pass


@app.post("/api/chat/assess-understanding")
async def assess_user_understanding(
    conversation_id: str,
    user_response: str
):
    """
    Analyze user response to determine understanding level.
    Decides whether to ask another question or give answer.
    """
    pass
```

---

## AI Service

**New Service**: `python_backend/services/socratic_question_service.py`

```python
"""
Socratic Question Service
Generates guiding questions instead of direct answers.
"""

from typing import Dict, List
import anthropic  # Claude 3.5 Sonnet best for reasoning

class SocraticQuestionService:

    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    async def generate_socratic_question(
        self,
        user_question: str,
        context: Dict,
        question_number: int,
        max_questions: int = 5
    ) -> Dict:
        """
        Generate a Socratic question to guide learning.
        """

        system_prompt = f"""
        You are a Socratic tutor. Your goal is NOT to answer directly,
        but to guide the learner to discover the answer themselves.

        Principles:
        1. Ask questions, don't explain
        2. Build on what they already know
        3. Use analogies and examples
        4. Challenge assumptions gently
        5. Make them think actively

        Current question depth: {question_number}/{max_questions}

        If question_number == max_questions, give a gentle direct answer.
        Otherwise, ask a guiding question.
        """

        user_context = f"""
        Learner asked: "{user_question}"

        Context about learner:
        - Videos watched: {context.get('priorVideos', [])}
        - Concepts they know: {context.get('conceptsKnown', [])}
        - Concepts unclear: {context.get('conceptsUnclear', [])}

        Previous questions in this chain:
        {self._format_question_history(context.get('questionChain', []))}
        """

        if question_number < max_questions:
            user_context += f"""

            Your task: Generate ONE guiding question that helps them
            discover the answer. Don't explain—just ask.

            Make the question:
            - Concrete (use examples)
            - Building on their prior knowledge
            - Encouraging (not condescending)
            """
        else:
            user_context += """

            You've asked enough questions. Now give a clear, direct
            answer with a summary of what they discovered through
            your questions.
            """

        response = self.client.messages.create(
            model=self.model,
            max_tokens=500,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_context}
            ]
        )

        question_text = response.content[0].text

        return {
            'questionText': question_text,
            'intent': self._classify_intent(question_text),
            'isFinalAnswer': question_number >= max_questions
        }


    async def assess_understanding(
        self,
        user_response: str,
        question_asked: str,
        target_concept: str
    ) -> Dict:
        """
        Assess how well user understood the concept from their response.
        Returns understanding score (0-100) and next step.
        """

        prompt = f"""
        You asked learner: "{question_asked}"

        They responded: "{user_response}"

        Target concept: {target_concept}

        Assess their understanding:
        1. Score 0-100 (how well they understood)
        2. What they got right
        3. What they're still missing
        4. Should you ask another question or give the answer?

        Return JSON:
        {{
            "understanding": 0-100,
            "gotRight": ["..."],
            "stillMissing": ["..."],
            "nextAction": "ask_another" | "give_answer"
        }}
        """

        response = self.client.messages.create(
            model=self.model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse JSON response
        import json
        result = json.loads(response.content[0].text)
        return result


    def _classify_intent(self, question_text: str) -> str:
        """
        Classify the intent of a Socratic question.
        """
        lower = question_text.lower()

        if 'have you' in lower or 'do you know' in lower:
            return 'assess_knowledge'
        elif 'why do you think' in lower or 'how would you' in lower:
            return 'guide_discovery'
        elif 'what if' in lower or 'imagine' in lower:
            return 'challenge_assumption'
        elif 'what is your thought process' in lower:
            return 'metacognitive'
        else:
            return 'guide_discovery'


    def _format_question_history(self, chain: List[Dict]) -> str:
        """Format question history for prompt context."""
        if not chain:
            return "No previous questions."

        formatted = []
        for i, q in enumerate(chain, 1):
            formatted.append(
                f"Q{i}: {q['questionText']}\n"
                f"User: {q.get('userResponse', '(no response yet)')}"
            )

        return "\n\n".join(formatted)


# Export
socratic_question_service = SocraticQuestionService()
```

---

## Frontend Implementation

**Component**: `src/components/chat/SocraticChat.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { QuestionChain } from './QuestionChain';

export function SocraticChat({ conversationId, playlistId }) {
  const [mode, setMode] = useState<'answer' | 'socratic'>('socratic');
  const [messages, setMessages] = useState([]);
  const [questionChain, setQuestionChain] = useState([]);

  const sendMessage = async (content: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content }]);

    // Send to API
    const response = await fetch('/api/chat/socratic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        userMessage: content,
        mode
      })
    });

    const data = await response.json();

    // Add AI response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.questionText,
      intent: data.intent,
      isFinalAnswer: data.isFinalAnswer
    }]);

    // Update question chain visualization
    if (mode === 'socratic') {
      setQuestionChain(prev => [...prev, {
        question: data.questionText,
        userResponse: content
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-medium">Chat Mode</h3>
          <p className="text-sm text-muted-foreground">
            {mode === 'socratic'
              ? 'I\'ll guide you with questions'
              : 'I\'ll answer directly'}
          </p>
        </div>

        <Toggle
          pressed={mode === 'socratic'}
          onPressedChange={(pressed) => setMode(pressed ? 'socratic' : 'answer')}
        >
          Socratic Mode
        </Toggle>
      </div>

      {/* Question Chain Visualization */}
      {mode === 'socratic' && questionChain.length > 0 && (
        <QuestionChain chain={questionChain} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.isFinalAnswer
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'bg-muted'
              }`}
            >
              {msg.content}

              {msg.intent && (
                <div className="text-xs mt-1 opacity-70">
                  {msg.intent === 'assess_knowledge' && '🤔 Assessing knowledge'}
                  {msg.intent === 'guide_discovery' && '🧭 Guiding discovery'}
                  {msg.intent === 'challenge_assumption' && '💡 Challenging assumption'}
                  {msg.intent === 'metacognitive' && '🧠 Metacognitive prompt'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <input
          type="text"
          placeholder={
            mode === 'socratic'
              ? 'Think through the question...'
              : 'Ask anything...'
          }
          className="w-full p-3 border rounded-lg"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create `SocraticConversations` table
- [ ] Implement `socratic_question_service.py`
- [ ] Create API endpoints for Socratic chat
- [ ] Build mode toggle UI
- [ ] Implement question chain visualization
- [ ] Add understanding assessment
- [ ] Test with real learners
- [ ] A/B test: Socratic vs. Answer mode retention

---

## Success Metrics

- **Adoption**: 30%+ of chats use Socratic mode
- **Engagement**: 2x longer chat sessions in Socratic mode
- **Retention**: 50% better quiz performance after Socratic chat vs. answer mode
- **Satisfaction**: 70%+ say Socratic mode helped them understand better

---

## Conclusion

Socratic Mode transforms the AI from a search engine into a thinking partner. It doesn't give you fish—it teaches you to fish.

**The result?** Deeper understanding, better retention, and learners who can think independently.

---

**Next**: `LEARNING_PERSONALITY.md` - Your cognitive fingerprint.
