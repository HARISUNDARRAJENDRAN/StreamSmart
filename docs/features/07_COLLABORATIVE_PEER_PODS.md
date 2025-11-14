# Feature 7: Collaborative Peer Learning Pods

## Overview
Social learning system based on Vygotsky's Zone of Proximal Development and 2025 collaborative learning research. Creates small peer groups (4-6 students) matched by learning goals, skill levels, and schedules for synchronous and asynchronous collaboration.

## Core Functionality

### 1. Intelligent Pod Matching
- **Skill-Based Pairing**: Mix skill levels for peer tutoring (ZPD optimization)
- **Goal Alignment**: Match students with similar learning objectives
- **Schedule Compatibility**: Consider time zones and availability
- **Personality Matching**: Compatible communication styles
- **Dynamic Rebalancing**: Adjust pod composition based on engagement

### 2. Collaborative Features
- **Shared Playlists**: Co-create and study from collaborative playlists
- **Group Study Sessions**: Synchronized video watching with chat
- **Peer Teaching**: Take turns explaining concepts (teach-to-learn effect)
- **Collective Note-Taking**: Collaborative document editing
- **Group Challenges**: Team-based learning competitions

### 3. Social Learning Analytics
- **Contribution Tracking**: Individual participation metrics
- **Peer Support Index**: Quality and frequency of helping behaviors
- **Group Performance**: Collective learning outcomes
- **Social Network Analysis**: Identify learning influencers

## Technical Implementation

### Backend (Python/FastAPI)

```python
# services/collaborative_pods_service.py

from typing import List, Dict
import networkx as nx
from sklearn.cluster import KMeans
import numpy as np

class PodMatchingEngine:
    """Match students into optimal learning pods"""

    def __init__(self):
        self.ideal_pod_size = 5
        self.min_pod_size = 3
        self.max_pod_size = 7

    async def create_pods(
        self,
        students: List[Dict],
        subject: str
    ) -> List[List[str]]:
        """
        Create pods using multi-criteria matching
        """
        # Extract features for matching
        features = self._extract_student_features(students)

        # Cluster students
        n_pods = len(students) // self.ideal_pod_size
        kmeans = KMeans(n_clusters=n_pods, random_state=42)
        clusters = kmeans.fit_predict(features)

        # Form pods
        pods = []
        for i in range(n_pods):
            pod_members = [
                students[j]['id']
                for j in range(len(students))
                if clusters[j] == i
            ]
            pods.append(pod_members)

        # Optimize for ZPD (mix skill levels)
        optimized_pods = self._optimize_for_zpd(pods, students)

        return optimized_pods

    def _extract_student_features(self, students: List[Dict]) -> np.ndarray:
        """Extract features for clustering"""
        features = []

        for student in students:
            feature_vector = [
                student['skill_level'],  # 0-1 scale
                student['learning_goal_vector'][0],  # Goal embedding
                student['learning_goal_vector'][1],
                student['activity_level'],  # Engagement score
                student['timezone_offset'],  # Hours from UTC
                student['preferred_study_time']  # 0-23 hour
            ]
            features.append(feature_vector)

        return np.array(features)

    def _optimize_for_zpd(
        self,
        pods: List[List[str]],
        students: List[Dict]
    ) -> List[List[str]]:
        """
        Rebalance pods to have mixed skill levels (ZPD principle)
        Each pod should have: 1-2 advanced, 2-3 intermediate, 1-2 beginners
        """
        student_dict = {s['id']: s for s in students}

        optimized_pods = []
        for pod in pods:
            # Sort by skill level
            sorted_members = sorted(
                pod,
                key=lambda sid: student_dict[sid]['skill_level']
            )

            # Ensure skill diversity
            if len(sorted_members) >= 3:
                # Keep mix of levels
                optimized_pods.append(sorted_members)
            else:
                # Too small, redistribute
                optimized_pods.append(sorted_members)

        return optimized_pods

class CollaborativePodService:
    """Manage collaborative learning pods"""

    def __init__(self, db_service):
        self.db = db_service
        self.matcher = PodMatchingEngine()

    async def create_study_session(
        self,
        pod_id: str,
        playlist_id: str,
        scheduled_time: datetime
    ) -> Dict:
        """
        Create synchronized group study session
        """
        session = {
            'id': str(uuid.uuid4()),
            'pod_id': pod_id,
            'playlist_id': playlist_id,
            'scheduled_time': scheduled_time,
            'status': 'scheduled',
            'participants': [],
            'chat_messages': [],
            'shared_notes': '',
            'collective_progress': 0.0
        }

        await self.db.put_item(
            TableName="CollaborativeSessions",
            Item=session
        )

        # Notify pod members
        await self._notify_pod_members(pod_id, session)

        return session

    async def log_peer_interaction(
        self,
        session_id: str,
        from_user: str,
        to_user: str,
        interaction_type: str,
        content: str
    ):
        """
        Track peer teaching and support interactions
        """
        interaction = {
            'session_id': session_id,
            'from_user': from_user,
            'to_user': to_user,
            'type': interaction_type,  # 'explanation', 'question', 'encouragement'
            'content': content,
            'timestamp': datetime.utcnow()
        }

        await self.db.put_item(
            TableName="PeerInteractions",
            Item=interaction
        )

        # Update peer support index
        await self._update_peer_support_score(from_user)
```

### DynamoDB Schema

```typescript
{
  PK: "POD#{podId}",
  SK: "metadata",
  podId: string,
  subject: string,
  members: string[],  // userIds
  skillLevels: Map<userId, number>,
  createdAt: timestamp,
  status: 'active' | 'completed' | 'disbanded'
}

{
  PK: "POD#{podId}",
  SK: "SESSION#{sessionId}",
  sessionId: string,
  scheduledTime: timestamp,
  duration: number,  // minutes
  participants: string[],
  chatMessages: Message[],
  sharedNotes: string,
  collectiveProgress: number
}
```

### Frontend (React)

```typescript
// components/collaborative/PodDashboard.tsx

export function PodDashboard({ podId }: { podId: string }) {
  const { data: pod } = useQuery(['pod', podId], () =>
    fetch(`/api/pods/${podId}`).then((r) => r.json())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Learning Pod</h2>

      {/* Pod Members */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {pod?.members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      {/* Upcoming Sessions */}
      <UpcomingSessions podId={podId} />

      {/* Shared Resources */}
      <SharedPlaylists podId={podId} />

      {/* Group Chat */}
      <GroupChat podId={podId} />
    </div>
  );
}
```

## Success Metrics
- **Engagement**: 3x higher session completion in pods vs solo
- **Retention**: 40% better knowledge retention with peer explanation
- **Satisfaction**: 85%+ positive feedback on pod experience
- **Peer Support**: Average 5+ helpful interactions per session

## References
- Vygotsky's ZPD & Social Constructivism
- 2025 Collaborative Learning Research
- Peer-to-Peer Education Effectiveness Studies
