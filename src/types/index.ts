
export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  // playlists: string[]; // Array of playlist IDs
  // chatbot_sessions: string[]; // Array of session IDs
  // progress: any; // Define progress structure later
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: Date;
  videos: Video[];
  aiRecommended: boolean;
  tags: string[];
  // mindmap: MindMapData; // Define MindMapData structure later
};

export type Video = {
  id: string;
  title: string;
  youtubeURL: string;
  transcript?: string;
  thumbnail: string;
  duration: string; // e.g., "10:30"
  addedBy: string; // userId
  summary?: string;
  completionStatus: number; // Percentage
  understandingScore?: number; // Optional
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
};

export type ChatSession = {
  id: string;
  userId: string;
  playlistId: string;
  messages: ChatMessage[];
  createdAt: Date;
};

export type MindMapNode = {
  id: string;
  type?: string; // e.g., 'input', 'output', 'default'
  data: { label: string };
  position: { x: number; y: number };
};

export type MindMapEdge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
};

export type MindMapData = {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
};
