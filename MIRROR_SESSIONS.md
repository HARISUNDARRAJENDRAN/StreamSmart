# 🪞 Mirror Sessions: The Feynman Technique, Automated

> *"If you can't explain it simply, you don't understand it well enough."* — Often attributed to Einstein

> *"The best way to learn is to teach."* — Richard Feynman

---

## The Insight

**You think you understand... until you try to teach it.**

The **Feynman Technique** is legendary:
1. Learn a concept
2. **Teach it back** in simple terms
3. Identify gaps in your explanation
4. Go back and fill those gaps
5. Repeat until you can explain it to a child

**Mirror Sessions automate this process with AI analysis.**

---

## User Experience

### The Flow

**After watching a video:**

```
┌────────────────────────────────────────────┐
│  You just watched:                         │
│  "Understanding Async/Await in JavaScript" │
│                                            │
│  Ready to test your understanding?         │
│                                            │
│  [🎤 Record Mirror Session]               │
│  Explain what you learned in your own      │
│  words (2-5 minutes)                       │
└────────────────────────────────────────────┘
```

**Recording Interface:**

```
┌────────────────────────────────────────────┐
│  🔴 Recording... (2:34 / 5:00)            │
│  ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━        │
│                                            │
│  💬 Or type your explanation...           │
│  [Text input area]                         │
│                                            │
│  Tips:                                     │
│  • Explain like you're teaching a friend  │
│  • Use your own words, not the video's    │
│  • Mention examples if you can            │
│  • Don't worry about being perfect!       │
│                                            │
│  [Stop & Analyze]  [Cancel]               │
└────────────────────────────────────────────┘
```

**AI Analysis Result:**

```
┌────────────────────────────────────────────┐
│  Mirror Session Analysis                   │
│  "Understanding Async/Await"               │
├────────────────────────────────────────────┤
│                                            │
│  ✅ What You Got Right                    │
│  • Async/await is syntactic sugar          │
│  • Makes promises easier to read           │
│  • await pauses execution                  │
│  • Must use in async function              │
│                                            │
│  ⚠️  What You Missed                       │
│  • Error handling with try/catch           │
│  • Return values are automatically wrapped │
│     in promises                            │
│  • Parallel execution with Promise.all     │
│                                            │
│  💭 Misconceptions Detected                │
│  • You said "await stops the program"      │
│    → Actually: only pauses that function,  │
│       not the entire event loop            │
│                                            │
│  📊 Understanding Depth: 72/100           │
│                                            │
│  🎯 Recommended Next Steps                │
│  1. Rewatch section on error handling      │
│  2. Try coding example with try/catch      │
│  3. Take quiz to verify understanding      │
│                                            │
│  [Rewatch Key Sections] [Compare to       │
│   Original] [Save Analysis]                │
└────────────────────────────────────────────┘
```

### Compare Before/After

**Track progress over time:**

```
Understanding Async/Await

First Attempt (3 weeks ago)
  Depth: 45/100
  Missed: Error handling, return values, execution model

Second Attempt (1 week ago)
  Depth: 72/100
  Missed: Parallel execution, some edge cases

Today's Attempt
  Depth: 91/100
  ✅ Comprehensive understanding!

[View Full History] [Share Progress]
```

---

## Technical Architecture

### Data Model

**DynamoDB Table**: `MirrorSessions`

```javascript
{
  sessionId: string;           // UUID (Primary Key)
  userId: string;              // User (GSI)

  // Source Content
  videoId: string;
  videoTitle: string;
  playlistId: string;

  // Recording
  recordingType: 'voice' | 'text';
  recordingS3Key?: string;     // If voice, S3 location
  transcription?: string;      // Voice → text (Whisper API)
  textExplanation?: string;    // If text input

  // AI Analysis
  analysis: {
    conceptsCovered: string[];      // What they explained
    conceptsMissed: string[];       // What they didn't mention
    misconceptions: [
      {
        statement: string;          // What user said (wrong)
        correction: string;         // What's actually true
        severity: 'minor' | 'major';
      }
    ];

    accuracyScore: number;          // 0-100
    depthScore: number;             // 0-100
    clarityScore: number;           // 0-100
    overallScore: number;           // 0-100

    strengthAreas: string[];        // Topics explained well
    weakAreas: string[];            // Topics need review

    nextSteps: string[];            // Recommended actions
  };

  // Metadata
  duration: number;                 // Seconds
  attemptNumber: number;            // 1st, 2nd, 3rd attempt
  createdAt: string;
}
```

**Indexes:**
- GSI: `userId-createdAt-index`
- GSI: `videoId-userId-index` (get all attempts for a video)

---

## API Endpoints

```python
@app.post("/api/mirror/record")
async def create_mirror_session(
    user_id: str,
    video_id: str,
    playlist_id: str,
    recording_type: str,
    audio_file: Optional[UploadFile] = None,
    text_explanation: Optional[str] = None
):
    """
    Upload voice recording or text explanation.
    If voice: transcribe with Whisper API.
    """
    pass


@app.post("/api/mirror/analyze")
async def analyze_mirror_session(
    session_id: str
):
    """
    AI analyzes the explanation and identifies:
    - What user got right
    - What they missed
    - Misconceptions
    - Understanding depth score
    """
    pass


@app.get("/api/mirror/history/{user_id}")
async def get_mirror_history(
    user_id: str,
    video_id: Optional[str] = None  # Filter by specific video
):
    """Get all mirror sessions with progress over time."""
    pass


@app.get("/api/mirror/compare/{video_id}/{user_id}")
async def compare_mirror_sessions(
    video_id: str,
    user_id: str
):
    """
    Compare multiple attempts at explaining same concept.
    Show improvement over time.
    """
    pass


@app.get("/api/mirror/leaderboard")
async def get_mirror_leaderboard():
    """
    Community leaderboard: who has best explanations?
    (Optional social feature)
    """
    pass
```

---

## AI Service

**Service**: `python_backend/services/mirror_analysis_service.py`

```python
"""
Mirror Analysis Service
Analyzes teach-back explanations and identifies gaps.
"""

import openai
from typing import Dict, List

class MirrorAnalysisService:

    def __init__(self):
        self.client = openai.OpenAI()

    async def transcribe_audio(self, audio_file_path: str) -> str:
        """Use OpenAI Whisper to transcribe voice recording."""
        with open(audio_file_path, 'rb') as audio:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="en"
            )
        return transcript.text


    async def analyze_explanation(
        self,
        user_explanation: str,
        video_content: Dict  # Transcript, title, key concepts
    ) -> Dict:
        """
        Analyze user's explanation against actual video content.
        Identify gaps, misconceptions, strengths.
        """

        system_prompt = """
        You are analyzing a learner's explanation of a concept.
        Your goal: identify what they understood, what they missed,
        and any misconceptions.

        Be encouraging but honest. Point out gaps clearly but kindly.
        """

        user_prompt = f"""
        Original Video: "{video_content['title']}"

        Key Concepts from Video:
        {self._format_key_concepts(video_content['keyConcepts'])}

        Learner's Explanation:
        {user_explanation}

        Analyze their understanding:

        1. What concepts did they explain correctly?
        2. What important concepts did they miss?
        3. Did they have any misconceptions? (stated something incorrectly)
        4. How deep is their understanding? (0-100 score)
        5. How clearly did they explain? (0-100 score)
        6. What should they review or study next?

        Return JSON:
        {{
            "conceptsCovered": ["..."],
            "conceptsMissed": ["..."],
            "misconceptions": [
                {{"statement": "...", "correction": "...", "severity": "major|minor"}}
            ],
            "accuracyScore": 0-100,
            "depthScore": 0-100,
            "clarityScore": 0-100,
            "strengthAreas": ["..."],
            "weakAreas": ["..."],
            "nextSteps": ["..."]
        }}
        """

        response = self.client.chat.completions.create(
            model="gpt-4o",  # Need GPT-4 for nuanced analysis
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )

        analysis = json.loads(response.choices[0].message.content)

        # Calculate overall score
        analysis['overallScore'] = (
            analysis['accuracyScore'] * 0.4 +
            analysis['depthScore'] * 0.4 +
            analysis['clarityScore'] * 0.2
        )

        return analysis


    async def compare_attempts(
        self,
        attempts: List[Dict]
    ) -> Dict:
        """
        Compare multiple mirror sessions for same content.
        Show improvement trajectory.
        """
        if len(attempts) < 2:
            return {"message": "Need at least 2 attempts to compare"}

        first = attempts[0]
        latest = attempts[-1]

        improvement = {
            'accuracyImprovement': latest['analysis']['accuracyScore'] - first['analysis']['accuracyScore'],
            'depthImprovement': latest['analysis']['depthScore'] - first['analysis']['depthScore'],
            'clarityImprovement': latest['analysis']['clarityScore'] - first['analysis']['clarityScore'],
            'conceptsMastered': [
                c for c in latest['analysis']['conceptsCovered']
                if c not in first['analysis']['conceptsCovered']
            ],
            'stillMissing': latest['analysis']['conceptsMissed'],
            'trajectory': 'improving' if latest['analysis']['overallScore'] > first['analysis']['overallScore'] else 'declining',
            'totalAttempts': len(attempts),
            'firstScore': first['analysis']['overallScore'],
            'latestScore': latest['analysis']['overallScore']
        }

        return improvement


    def _format_key_concepts(self, concepts: List[str]) -> str:
        """Format key concepts for prompt."""
        return "\n".join(f"- {c}" for c in concepts)


# Export
mirror_analysis_service = MirrorAnalysisService()
```

---

## Frontend Implementation

**Component**: `src/components/mirror/MirrorRecorder.tsx`

```tsx
'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export function MirrorRecorder({ videoId, videoTitle, onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'voice' | 'text'>('voice');
  const [textExplanation, setTextExplanation] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      await submitRecording(audioBlob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const submitRecording = async (audioBlob?: Blob) => {
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('videoId', videoId);
      formData.append('recordingType', recordingType);

      if (recordingType === 'voice' && audioBlob) {
        formData.append('audio', audioBlob);
      } else {
        formData.append('textExplanation', textExplanation);
      }

      // Create session
      const createRes = await fetch('/api/mirror/record', {
        method: 'POST',
        body: formData
      });

      const { sessionId } = await createRes.json();

      // Analyze
      const analyzeRes = await fetch('/api/mirror/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const analysis = await analyzeRes.json();
      onComplete(analysis);
    } catch (error) {
      console.error('Mirror session failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">
        Mirror Session: {videoTitle}
      </h2>

      {/* Type Selection */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setRecordingType('voice')}
          className={`flex-1 p-4 rounded-lg border-2 ${
            recordingType === 'voice' ? 'border-primary' : 'border-border'
          }`}
        >
          <Mic className="mx-auto mb-2" />
          Voice Recording
        </button>

        <button
          onClick={() => setRecordingType('text')}
          className={`flex-1 p-4 rounded-lg border-2 ${
            recordingType === 'text' ? 'border-primary' : 'border-border'
          }`}
        >
          💬 Text Explanation
        </button>
      </div>

      {/* Voice Recording */}
      {recordingType === 'voice' && (
        <div className="text-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-full"
            >
              <Mic className="inline mr-2" />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white px-8 py-4 rounded-full animate-pulse"
            >
              <Square className="inline mr-2" />
              Stop Recording
            </button>
          )}
        </div>
      )}

      {/* Text Input */}
      {recordingType === 'text' && (
        <div>
          <textarea
            value={textExplanation}
            onChange={(e) => setTextExplanation(e.target.value)}
            placeholder="Explain what you learned in your own words..."
            className="w-full h-48 p-4 border rounded-lg resize-none"
          />

          <button
            onClick={() => submitRecording()}
            disabled={textExplanation.length < 50}
            className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg"
          >
            Analyze My Explanation
          </button>
        </div>
      )}

      {/* Analyzing */}
      {analyzing && (
        <div className="text-center mt-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">
            Analyzing your explanation...
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create MirrorSessions DynamoDB table
- [ ] Integrate OpenAI Whisper for transcription
- [ ] Build MirrorRecorder component
- [ ] Implement mirror_analysis_service.py
- [ ] Create analysis visualization
- [ ] Build comparison/progress view
- [ ] Test with real user explanations
- [ ] Measure retention improvement

---

## Success Metrics

- **Adoption**: 25%+ of users try mirror sessions
- **Effectiveness**: 60% higher quiz scores after mirror session
- **Retention**: Concepts explained in mirror sessions have 3x better long-term retention
- **Iteration**: 40% of users do multiple attempts for same concept

---

## Conclusion

You don't understand it until you can teach it. Mirror Sessions make the Feynman Technique effortless, automatic, and insightful.

**The result?** True mastery, not superficial knowledge.
