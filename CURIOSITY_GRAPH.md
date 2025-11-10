# 🕸️ Curiosity Graph: Network-Based Learning Visualization

> *"I have no special talents. I am only passionately curious."* — Albert Einstein

---

## The Insight

**Traditional learning platforms show this:**
```
Video 1 → Video 2 → Video 3 → Video 4
[========= 60% Complete =========]
```

**But real learning looks like this:**
```
          "What is async?"
               ↓
        "How do promises work?"
         ↙          ↘
"What's the        "What happens
event loop?"       if I chain them?"
     ↓                    ↓
"Why single-       "Can I cancel
threaded?"         a promise?"
     ↓                    ↓
[More questions...]  [More questions...]
```

**The Curiosity Graph visualizes learning as it actually happens: a living network of questions that spawn more questions.**

---

## Core Philosophy

### Learning is Recursive
- Every answer births new questions
- Curiosity branches like a tree
- Deep learning follows rabbit holes
- Mastery is high graph density, not linear completion

### Questions > Answers
- Questions reveal what you truly care about
- The map of your questions IS your learning journey
- AI should track curiosity, not just consumption

### Visual Thinking
- Humans think spatially
- Seeing connections creates connections
- The graph externalizes your inner learning network

---

## User Experience

### The Vision

When you open the Curiosity Graph, you see:

1. **Your Learning Universe**
   - A beautiful, interactive network
   - Each node is a question or concept
   - Edges show relationships (spawned from, related to, contradicts)
   - Size indicates importance (how much time spent)
   - Color indicates status (exploring, understood, confused)

2. **Living Visualization**
   - Real-time: as you watch videos, nodes appear
   - As you ask chat questions, they join the graph
   - As you take quizzes, connections strengthen
   - The graph *breathes* with your learning

3. **Navigation**
   - Click a node → see related videos, notes, chat history
   - Hover → see quick preview
   - Zoom out → see clusters (your "knowledge islands")
   - Zoom in → see granular questions
   - Time-slider → watch your graph evolve over weeks/months

4. **AI Insights**
   - "This cluster seems dense—you're becoming an expert in React Hooks"
   - "You asked about promises 3 times—want a curated path?"
   - "These two questions are related but you haven't connected them yet"
   - "You tend to go deep on theory before practice—want more hands-on content?"

---

## Technical Architecture

### Data Model

**DynamoDB Tables**

#### CuriosityNodes

```javascript
{
  nodeId: string;              // UUID (Primary Key)
  userId: string;              // User who owns this node (GSI)

  // Content
  nodeType: 'question' | 'concept' | 'insight' | 'confusion';
  content: string;             // The actual question/concept text
  context: string;             // Where it came from (video title, chat, etc.)

  // Metadata
  sourceType: 'video' | 'chat' | 'quiz' | 'manual' | 'ai_suggested';
  sourceId: string;            // videoId, conversationId, etc.
  timestamp: number;           // When created (GSI for time-travel)

  // Learning State
  status: 'exploring' | 'understood' | 'confused' | 'mastered' | 'abandoned';
  confidenceScore: number;     // 0-100, how well user understands
  timeSpent: number;           // Minutes spent on this concept
  revisitCount: number;        // How many times user returned to this

  // Visual Properties (for graph rendering)
  position: { x: number; y: number }; // User can manually arrange
  clusterId?: string;          // Auto-detected concept cluster
  importance: number;          // 0-1, affects node size

  // Related Resources
  relatedVideos: string[];     // videoIds
  relatedNotes: string[];      // noteIds
  relatedConversations: string[]; // conversationIds

  createdAt: string;           // ISO timestamp
  updatedAt: string;
}
```

**Indexes:**
- GSI: `userId-timestamp-index` (for time-travel queries)
- GSI: `userId-status-index` (filter by learning state)
- GSI: `userId-clusterId-index` (group by concept clusters)

#### CuriosityEdges

```javascript
{
  edgeId: string;              // UUID (Primary Key)
  userId: string;              // User who owns this edge (GSI)

  // Graph Structure
  sourceNodeId: string;        // Where edge comes from
  targetNodeId: string;        // Where edge goes to

  // Relationship Type
  relationType:
    | 'spawned_from'          // Answer to question sparked new question
    | 'prerequisite'          // Need to know source before target
    | 'related'               // Concepts are similar
    | 'contradicts'           // Concepts seem to conflict (needs resolution)
    | 'applies_to'            // Theory → practical application
    | 'example_of';           // Specific instance of general concept

  // Metadata
  createdBy: 'user' | 'ai';   // User explicitly connected or AI suggested
  confidence: number;          // 0-1, how strong the relationship is
  weight: number;              // Visual edge thickness (based on strength)

  // Annotations
  note?: string;               // User can annotate relationships

  createdAt: string;
  updatedAt: string;
}
```

**Indexes:**
- GSI: `userId-sourceNodeId-index` (find all edges from a node)
- GSI: `userId-targetNodeId-index` (find all edges to a node)

---

### API Endpoints

**FastAPI Backend** (`python_backend/main.py`)

```python
# ===========================
# Curiosity Graph Endpoints
# ===========================

@app.post("/api/curiosity/nodes")
async def create_curiosity_node(
    user_id: str,
    node_type: str,
    content: str,
    context: str,
    source_type: str,
    source_id: str,
    status: str = "exploring"
):
    """
    Create a new node in the curiosity graph.
    Called when user asks a question, watches a video, or manually adds a concept.
    """
    pass


@app.get("/api/curiosity/graph/{user_id}")
async def get_curiosity_graph(
    user_id: str,
    time_range: Optional[str] = None,  # 'day', 'week', 'month', 'all'
    cluster_id: Optional[str] = None,   # Filter to specific cluster
    status_filter: Optional[List[str]] = None  # Filter by status
):
    """
    Retrieve full graph for visualization.
    Returns nodes and edges with metadata.
    """
    pass


@app.post("/api/curiosity/edges")
async def create_curiosity_edge(
    user_id: str,
    source_node_id: str,
    target_node_id: str,
    relation_type: str,
    created_by: str = "user",
    note: Optional[str] = None
):
    """
    Create a connection between two nodes.
    User can manually connect or AI can suggest.
    """
    pass


@app.post("/api/curiosity/analyze")
async def analyze_curiosity_graph(
    user_id: str,
    analysis_type: str  # 'clusters', 'gaps', 'paths', 'insights'
):
    """
    Run AI analysis on the graph:
    - Detect concept clusters (graph algorithms)
    - Find knowledge gaps (disconnected subgraphs)
    - Suggest learning paths (shortest path algorithms)
    - Generate natural language insights
    """
    pass


@app.put("/api/curiosity/nodes/{node_id}")
async def update_curiosity_node(
    node_id: str,
    status: Optional[str] = None,
    confidence_score: Optional[int] = None,
    position: Optional[dict] = None,
    note: Optional[str] = None
):
    """
    Update node properties (user marks as understood, drags to new position, etc.)
    """
    pass


@app.delete("/api/curiosity/nodes/{node_id}")
async def delete_curiosity_node(node_id: str):
    """
    Remove a node (and its edges) from the graph.
    """
    pass


@app.post("/api/curiosity/extract-from-video")
async def extract_concepts_from_video(
    video_id: str,
    user_id: str
):
    """
    AI analyzes video transcript and generates initial nodes.
    Called when user adds a video to playlist.
    """
    pass


@app.post("/api/curiosity/extract-from-chat")
async def extract_questions_from_chat(
    conversation_id: str,
    user_id: str
):
    """
    Extract questions from chat history and add as nodes.
    """
    pass


@app.get("/api/curiosity/suggestions/{user_id}")
async def get_learning_suggestions(
    user_id: str,
    node_id: Optional[str] = None  # Suggest based on specific node
):
    """
    AI suggests next videos/concepts based on current graph state.
    "You seem curious about X, here are related concepts to explore."
    """
    pass


@app.get("/api/curiosity/time-travel/{user_id}")
async def get_graph_history(
    user_id: str,
    date: str  # ISO date string
):
    """
    Retrieve graph state at a specific point in time.
    "Show me my curiosity graph from 3 months ago."
    """
    pass
```

---

### AI Services

**New Service**: `python_backend/services/curiosity_graph_service.py`

```python
"""
Curiosity Graph AI Service
Analyzes learning patterns, extracts concepts, suggests connections.
"""

import networkx as nx
from typing import List, Dict, Tuple
from google import generativeai as genai
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity

class CuriosityGraphService:

    def __init__(self):
        """Initialize Gemini for concept extraction and analysis."""
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')


    # ===========================
    # Concept Extraction
    # ===========================

    async def extract_concepts_from_transcript(
        self,
        transcript: str,
        video_metadata: dict
    ) -> List[Dict]:
        """
        Extract key concepts and questions from video transcript.
        Returns list of potential nodes.
        """
        prompt = f"""
        Analyze this educational video transcript and extract:
        1. Key concepts (core ideas explained)
        2. Questions the video answers
        3. Questions the video raises but doesn't fully answer

        Video Title: {video_metadata['title']}
        Transcript: {transcript}

        Return a JSON array of concepts with:
        - content (the concept/question text)
        - node_type ('concept' or 'question')
        - importance (0-1 score)
        - related_concepts (list of other concepts from this video)

        Focus on concepts that would spark curiosity.
        """

        response = await self.model.generate_content_async(prompt)
        # Parse JSON response
        concepts = self._parse_concepts(response.text)
        return concepts


    async def extract_questions_from_chat(
        self,
        chat_history: List[dict]
    ) -> List[Dict]:
        """
        Extract explicit and implicit questions from chat conversation.
        """
        prompt = f"""
        Analyze this chat conversation between a learner and AI tutor.
        Extract both:
        1. Explicit questions the learner asked
        2. Implicit questions revealed by confusion or curiosity

        Chat History:
        {self._format_chat_history(chat_history)}

        Return JSON array with:
        - content (question text)
        - confidence (0-1, how confident they are about this topic)
        - context (which message revealed this question)
        """

        response = await self.model.generate_content_async(prompt)
        questions = self._parse_questions(response.text)
        return questions


    # ===========================
    # Graph Analysis
    # ===========================

    def detect_clusters(
        self,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> Dict[str, List[str]]:
        """
        Use graph algorithms to detect concept clusters.
        Returns cluster_id -> [node_ids] mapping.
        """
        # Build NetworkX graph
        G = nx.Graph()

        for node in nodes:
            G.add_node(node['nodeId'], **node)

        for edge in edges:
            G.add_edge(
                edge['sourceNodeId'],
                edge['targetNodeId'],
                weight=edge['weight']
            )

        # Detect communities using Louvain method
        communities = nx.community.louvain_communities(G, weight='weight')

        # Convert to cluster mapping
        clusters = {}
        for idx, community in enumerate(communities):
            cluster_id = f"cluster_{idx}"
            clusters[cluster_id] = list(community)

        return clusters


    def find_knowledge_gaps(
        self,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> List[Dict]:
        """
        Identify disconnected subgraphs or weak connections.
        Suggests concepts that would bridge gaps.
        """
        G = nx.Graph()
        for node in nodes:
            G.add_node(node['nodeId'], **node)
        for edge in edges:
            G.add_edge(edge['sourceNodeId'], edge['targetNodeId'])

        # Find connected components
        components = list(nx.connected_components(G))

        gaps = []
        if len(components) > 1:
            # Multiple disconnected islands
            for i, comp1 in enumerate(components):
                for comp2 in components[i+1:]:
                    # Find concepts that could bridge these components
                    bridge_suggestion = self._suggest_bridge(
                        list(comp1),
                        list(comp2),
                        nodes
                    )
                    gaps.append(bridge_suggestion)

        return gaps


    async def suggest_connections(
        self,
        nodes: List[Dict]
    ) -> List[Dict]:
        """
        AI suggests relationships between concepts that user hasn't connected.
        """
        # Use embeddings to find semantically similar concepts
        embeddings = await self._embed_concepts([n['content'] for n in nodes])

        # Compute similarity matrix
        similarity = cosine_similarity(embeddings)

        suggestions = []
        threshold = 0.7  # High similarity threshold

        for i in range(len(nodes)):
            for j in range(i+1, len(nodes)):
                if similarity[i][j] > threshold:
                    # These concepts are similar but not connected
                    suggestions.append({
                        'sourceNodeId': nodes[i]['nodeId'],
                        'targetNodeId': nodes[j]['nodeId'],
                        'relationType': 'related',
                        'confidence': float(similarity[i][j]),
                        'reasoning': await self._explain_connection(
                            nodes[i]['content'],
                            nodes[j]['content']
                        )
                    })

        return suggestions


    def find_learning_paths(
        self,
        start_node_id: str,
        target_node_id: str,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> List[List[str]]:
        """
        Find shortest paths between two concepts.
        "How do I get from understanding X to understanding Y?"
        """
        G = nx.DiGraph()

        for node in nodes:
            G.add_node(node['nodeId'])

        for edge in edges:
            # Weight edges by confidence (inverse, so high confidence = short path)
            weight = 1 / (edge['confidence'] + 0.1)
            G.add_edge(edge['sourceNodeId'], edge['targetNodeId'], weight=weight)

        try:
            # Find all simple paths (not just shortest)
            paths = list(nx.all_simple_paths(
                G,
                start_node_id,
                target_node_id,
                cutoff=5  # Max 5 hops
            ))

            # Sort by path length
            paths.sort(key=len)

            return paths[:3]  # Return top 3 paths

        except nx.NetworkXNoPath:
            return []  # No path exists


    # ===========================
    # Insights Generation
    # ===========================

    async def generate_insights(
        self,
        nodes: List[Dict],
        edges: List[Dict],
        user_profile: dict
    ) -> List[str]:
        """
        Generate natural language insights about user's learning journey.
        """
        # Compute graph statistics
        G = nx.DiGraph()
        for node in nodes:
            G.add_node(node['nodeId'], **node)
        for edge in edges:
            G.add_edge(edge['sourceNodeId'], edge['targetNodeId'])

        stats = {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'clusters': len(self.detect_clusters(nodes, edges)),
            'avg_degree': sum(dict(G.degree()).values()) / len(nodes) if nodes else 0,
            'density': nx.density(G),
            'most_connected': max(G.degree(), key=lambda x: x[1])[0] if nodes else None
        }

        # Get node with most connections
        most_connected_node = None
        if stats['most_connected']:
            most_connected_node = next(
                n for n in nodes if n['nodeId'] == stats['most_connected']
            )

        # Generate insights with AI
        prompt = f"""
        You are analyzing a learner's curiosity graph—a network of concepts and questions.

        Graph Statistics:
        - Total concepts/questions: {stats['total_nodes']}
        - Total connections: {stats['total_edges']}
        - Concept clusters: {stats['clusters']}
        - Average connections per concept: {stats['avg_degree']:.1f}
        - Graph density: {stats['density']:.2f}

        Most connected concept: "{most_connected_node['content'] if most_connected_node else 'N/A'}"

        Recent nodes (last 5):
        {self._format_recent_nodes(nodes[-5:])}

        Generate 3-5 insightful observations about their learning journey:
        1. What are they becoming expert in? (high-density clusters)
        2. What patterns do you see? (depth vs breadth, theory vs practice)
        3. What gaps exist? (disconnected concepts)
        4. What should they explore next?
        5. How has their curiosity evolved?

        Write in encouraging, conversational tone. Focus on THEIR unique journey.
        """

        response = await self.model.generate_content_async(prompt)
        insights = self._parse_insights(response.text)

        return insights


    # ===========================
    # Helper Methods
    # ===========================

    async def _embed_concepts(self, concepts: List[str]):
        """Use Amazon Titan or OpenAI embeddings."""
        # Use existing embedding service from RAG chat
        from services.conversation_service import get_embeddings
        return await get_embeddings(concepts)


    async def _explain_connection(self, concept1: str, concept2: str) -> str:
        """Generate natural language explanation of why two concepts are related."""
        prompt = f"""
        Explain in one sentence how these two concepts are related:

        Concept 1: {concept1}
        Concept 2: {concept2}

        Keep it simple and clear.
        """
        response = await self.model.generate_content_async(prompt)
        return response.text.strip()


    def _suggest_bridge(
        self,
        cluster1_nodes: List[str],
        cluster2_nodes: List[str],
        all_nodes: List[Dict]
    ) -> Dict:
        """Suggest a concept that would bridge two disconnected clusters."""
        # Get node contents for both clusters
        cluster1_contents = [
            n['content'] for n in all_nodes if n['nodeId'] in cluster1_nodes
        ]
        cluster2_contents = [
            n['content'] for n in all_nodes if n['nodeId'] in cluster2_nodes
        ]

        return {
            'cluster1_preview': cluster1_contents[:3],
            'cluster2_preview': cluster2_contents[:3],
            'suggestion': 'Find a concept that relates these two areas',
            'gap_type': 'disconnected_islands'
        }


    def _parse_concepts(self, response_text: str) -> List[Dict]:
        """Parse AI response into structured concept list."""
        # Implementation: JSON parsing with error handling
        import json
        try:
            # Remove markdown code blocks if present
            text = response_text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]

            concepts = json.loads(text)
            return concepts
        except:
            return []


    def _parse_questions(self, response_text: str) -> List[Dict]:
        """Parse questions from AI response."""
        return self._parse_concepts(response_text)  # Same structure


    def _parse_insights(self, response_text: str) -> List[str]:
        """Parse insights into list of strings."""
        # Split by numbered list items
        import re
        insights = re.findall(r'\d+\.\s*(.+?)(?=\n\d+\.|\n\n|$)', response_text, re.DOTALL)
        return [i.strip() for i in insights]


    def _format_chat_history(self, messages: List[dict]) -> str:
        """Format chat messages for AI prompt."""
        formatted = []
        for msg in messages:
            role = "Learner" if msg['role'] == 'user' else "AI"
            formatted.append(f"{role}: {msg['content']}")
        return '\n'.join(formatted)


    def _format_recent_nodes(self, nodes: List[Dict]) -> str:
        """Format recent nodes for AI prompt."""
        formatted = []
        for node in nodes:
            formatted.append(
                f"- {node['nodeType'].upper()}: {node['content']} "
                f"(status: {node['status']})"
            )
        return '\n'.join(formatted)


# Export service instance
curiosity_graph_service = CuriosityGraphService()
```

---

### Frontend Implementation

**New Route**: `src/app/(app)/curiosity/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { CuriosityGraph } from '@/components/curiosity/CuriosityGraph';
import { GraphControls } from '@/components/curiosity/GraphControls';
import { InsightsPanel } from '@/components/curiosity/InsightsPanel';
import { TimeSlider } from '@/components/curiosity/TimeSlider';
import { Loader2 } from 'lucide-react';

export default function CuriosityGraphPage() {
  const { user } = useUser();
  const [graphData, setGraphData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState([]);

  useEffect(() => {
    if (user) {
      loadGraph();
    }
  }, [user, timeRange, statusFilter]);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/curiosity/graph/${user.id}?time_range=${timeRange}&status_filter=${statusFilter.join(',')}`
      );
      const data = await response.json();
      setGraphData(data);

      // Load insights
      const insightsResponse = await fetch(
        `/api/curiosity/analyze?user_id=${user.id}&analysis_type=insights`
      );
      const insightsData = await insightsResponse.json();
      setInsights(insightsData.insights);
    } catch (error) {
      console.error('Failed to load curiosity graph:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-3xl font-bold">Your Curiosity Graph</h1>
        <p className="text-muted-foreground mt-2">
          A living network of your learning journey. Every question, every concept, connected.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Visualization (main area) */}
        <div className="flex-1 relative">
          <CuriosityGraph
            nodes={graphData?.nodes || []}
            edges={graphData?.edges || []}
            onNodeClick={(node) => console.log('Node clicked:', node)}
            onNodeUpdate={async (nodeId, updates) => {
              await fetch(`/api/curiosity/nodes/${nodeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              loadGraph();
            }}
          />

          {/* Floating Controls */}
          <div className="absolute top-4 right-4">
            <GraphControls
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          </div>

          {/* Time Slider */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-96">
            <TimeSlider
              userId={user.id}
              onDateChange={(date) => console.log('Time travel to:', date)}
            />
          </div>
        </div>

        {/* Insights Sidebar */}
        <div className="w-96 border-l overflow-y-auto">
          <InsightsPanel
            insights={insights}
            graphStats={{
              totalNodes: graphData?.nodes?.length || 0,
              totalEdges: graphData?.edges?.length || 0,
              clusters: graphData?.clusters?.length || 0
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

**New Component**: `src/components/curiosity/CuriosityGraph.tsx`

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { QuestionNode } from './QuestionNode';
import { ConceptNode } from './ConceptNode';

const nodeTypes: NodeTypes = {
  question: QuestionNode,
  concept: ConceptNode
};

interface CuriosityGraphProps {
  nodes: any[];
  edges: any[];
  onNodeClick: (node: any) => void;
  onNodeUpdate: (nodeId: string, updates: any) => Promise<void>;
}

export function CuriosityGraph({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
  onNodeUpdate
}: CuriosityGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Transform backend data to ReactFlow format
  useEffect(() => {
    const flowNodes: Node[] = initialNodes.map(node => ({
      id: node.nodeId,
      type: node.nodeType,
      position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label: node.content,
        status: node.status,
        importance: node.importance,
        confidenceScore: node.confidenceScore,
        timeSpent: node.timeSpent,
        onUpdate: (updates: any) => onNodeUpdate(node.nodeId, updates)
      }
    }));

    const flowEdges: Edge[] = initialEdges.map(edge => ({
      id: edge.edgeId,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.relationType.replace(/_/g, ' '),
      type: 'smoothstep',
      animated: edge.relationType === 'spawned_from',
      markerEnd: {
        type: MarkerType.ArrowClosed
      },
      style: {
        strokeWidth: edge.weight * 3,
        opacity: edge.confidence
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [initialNodes, initialEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onNodeClick(node);
    },
    [onNodeClick]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      className="bg-background"
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

**Node Components**: `src/components/curiosity/QuestionNode.tsx`

```tsx
'use client';

import { Handle, Position } from 'reactflow';
import { HelpCircle, CheckCircle2, AlertCircle, Star } from 'lucide-react';

interface QuestionNodeProps {
  data: {
    label: string;
    status: string;
    importance: number;
    confidenceScore: number;
    timeSpent: number;
    onUpdate: (updates: any) => Promise<void>;
  };
  isConnectable: boolean;
}

export function QuestionNode({ data, isConnectable }: QuestionNodeProps) {
  const statusIcons = {
    exploring: <HelpCircle className="w-4 h-4" />,
    understood: <CheckCircle2 className="w-4 h-4" />,
    confused: <AlertCircle className="w-4 h-4" />,
    mastered: <Star className="w-4 h-4" />
  };

  const statusColors = {
    exploring: 'bg-blue-500',
    understood: 'bg-green-500',
    confused: 'bg-yellow-500',
    mastered: 'bg-purple-500',
    abandoned: 'bg-gray-500'
  };

  const nodeSize = 80 + (data.importance * 100); // 80-180px based on importance

  return (
    <div
      className={`${statusColors[data.status]} rounded-full p-4 shadow-lg text-white flex items-center justify-center text-center transition-all hover:scale-110 cursor-pointer`}
      style={{
        width: nodeSize,
        height: nodeSize,
        opacity: 0.5 + (data.confidenceScore / 200) // 0.5-1.0 opacity
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2"
      />

      <div className="flex flex-col items-center gap-1">
        {statusIcons[data.status]}
        <p className="text-xs font-medium line-clamp-3">
          {data.label}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2"
      />
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] Create DynamoDB tables (`CuriosityNodes`, `CuriosityEdges`)
- [ ] Create GSIs for time-travel and filtering
- [ ] Implement basic API endpoints (CRUD operations)
- [ ] Create React route `/curiosity`
- [ ] Setup ReactFlow and render empty graph
- [ ] Create basic node components (QuestionNode, ConceptNode)

### Phase 2: Data Integration (Week 2)

- [ ] Hook into existing video watch flow (create nodes when video added)
- [ ] Hook into RAG chat (create nodes from questions)
- [ ] Hook into quiz system (update node status based on performance)
- [ ] Implement manual node creation UI
- [ ] Implement manual edge creation (drag-and-drop connections)

### Phase 3: AI Intelligence (Week 3)

- [ ] Implement `CuriosityGraphService`
- [ ] Concept extraction from transcripts (Gemini)
- [ ] Question extraction from chat (Gemini)
- [ ] Cluster detection (NetworkX)
- [ ] Connection suggestions (embeddings + cosine similarity)
- [ ] Insights generation (LLM-based analysis)

### Phase 4: Visualization & UX (Week 4)

- [ ] Auto-layout algorithms (force-directed, hierarchical)
- [ ] Animated transitions when nodes appear
- [ ] Zoom/pan controls
- [ ] Time slider for time-travel
- [ ] Cluster highlighting
- [ ] Search/filter nodes
- [ ] Node details sidebar
- [ ] Status update UI (mark as understood, confused, etc.)

### Phase 5: Advanced Features (Week 5)

- [ ] Learning paths (shortest path between concepts)
- [ ] Knowledge gap detection and visualization
- [ ] Export graph as image/PDF
- [ ] Share graph publicly
- [ ] Collaborative graphs (study groups)
- [ ] Mobile-responsive graph (simplified view)

---

## Design Mockups

### Desktop View

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Curiosity Graph                            [Controls ▼]   │
│  A living network of your learning journey                      │
├─────────────────────────────────────────────────────────────────┤
│                                                       ┌──────────┐
│                 ●────────●                            │ Insights │
│                ╱          ╲                           ├──────────┤
│               ●     ●      ●                          │ • You're │
│              ╱ ╲   ╱ ╲    ╱                           │   deep   │
│             ●   ● ●   ●  ●          [Graph Vis]       │   diving │
│                  X                                    │   on     │
│             ●   ● ●   ●  ●                            │   async  │
│              ╲ ╱   ╲ ╱    ╲                           │          │
│               ●     ●      ●                          │ • 3      │
│                ╲          ╱                           │   concept│
│                 ●────────●                            │   islands│
│                                                       │          │
│  [────────────── Time Slider ──────────────]        │ • Connect│
│  Jan 2025          Today          →                  │   React  │
│                                                       │   & APIs │
└─────────────────────────────────────────────────────┴──────────┘
```

---

## Success Metrics

- **Adoption**: 60%+ of active users view their curiosity graph
- **Engagement**: Average 5+ minutes per graph session
- **Depth**: Average 15+ nodes per user after 1 month
- **Density**: Average 2+ edges per node (shows connection-making)
- **AI Value**: 40%+ of users act on AI-suggested connections

---

## Future Enhancements

1. **3D Graph Visualization** - Use Three.js for spatial navigation
2. **Collaborative Graphs** - Study groups share a collective curiosity network
3. **Gamification** - "Explorer" badges for deep rabbit holes
4. **Export to Notion/Obsidian** - Integrate with other PKM tools
5. **Voice Interaction** - "Show me my React cluster" voice commands
6. **AR Visualization** - View your graph in physical space (Meta Quest, Vision Pro)

---

## Conclusion

The Curiosity Graph transforms learning from a linear checklist into a **living, breathing network of questions**. It honors how humans actually learn: through curiosity, connection, and exploration.

When users see their graph, they should feel:
- **Pride** - "Look how much I've explored"
- **Clarity** - "Oh, that's how these connect"
- **Curiosity** - "I wonder what's over there"
- **Direction** - "I should learn this next"

This is not just a feature. It's a new way of seeing learning itself.

---

**Next**: Implement `EMOTIONAL_LEARNING.md` to track the *feelings* behind each node.
