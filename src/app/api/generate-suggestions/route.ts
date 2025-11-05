import { NextRequest, NextResponse } from 'next/server';
import { SuggestedQuestion } from '@/components/playlists/suggested-questions';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

interface GenerateSuggestionsRequest {
  videoIds: string[];
  userId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  maxSuggestions?: number;
}

interface BackendSuggestion {
  text: string;
  category: 'summary' | 'concept' | 'navigation' | 'study' | 'practice';
  priority: number;
  confidence: number;
}

/**
 * POST /api/generate-suggestions
 * Generate smart question suggestions based on video context
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateSuggestionsRequest = await request.json();
    const { videoIds, userId, conversationHistory, maxSuggestions = 4 } = body;

    // Validate input
    if (!videoIds || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'videoIds is required' },
        { status: 400 }
      );
    }

    // Filter to valid YouTube IDs (11 characters)
    const validVideoIds = videoIds.filter(id => id && id.length === 11);
    
    if (validVideoIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid video IDs provided' },
        { status: 400 }
      );
    }

    // Call Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/generate-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_ids: validVideoIds,
        user_id: userId,
        conversation_history: conversationHistory || [],
        max_suggestions: maxSuggestions,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      // If backend fails, return fallback suggestions
      console.error('Backend suggestion generation failed:', response.statusText);
      return NextResponse.json({
        suggestions: getFallbackSuggestions(validVideoIds.length),
        confidence: 0.5,
        fallback: true,
      });
    }

    const data = await response.json();
    
    // Transform backend response to frontend format
    const suggestions: SuggestedQuestion[] = data.suggestions.map(
      (s: BackendSuggestion, index: number) => ({
        id: `${Date.now()}-${index}`,
        text: s.text,
        category: s.category,
        priority: s.priority,
      })
    );

    return NextResponse.json({
      suggestions,
      confidence: data.confidence || 0.8,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    
    // Return fallback suggestions on error
    return NextResponse.json({
      suggestions: getFallbackSuggestions(1),
      confidence: 0.5,
      fallback: true,
    });
  }
}

/**
 * Fallback suggestions when backend is unavailable
 */
function getFallbackSuggestions(videoCount: number): SuggestedQuestion[] {
  const single = [
    {
      id: 'fallback-1',
      text: 'Summarize this video',
      category: 'summary' as const,
      priority: 1,
    },
    {
      id: 'fallback-2',
      text: 'What are the main concepts?',
      category: 'concept' as const,
      priority: 2,
    },
    {
      id: 'fallback-3',
      text: 'Can you explain this in simple terms?',
      category: 'study' as const,
      priority: 3,
    },
    {
      id: 'fallback-4',
      text: 'Give me practice questions',
      category: 'practice' as const,
      priority: 4,
    },
  ];

  const multiple = [
    {
      id: 'fallback-multi-1',
      text: 'Compare the concepts across these videos',
      category: 'concept' as const,
      priority: 1,
    },
    {
      id: 'fallback-multi-2',
      text: 'Summarize all videos together',
      category: 'summary' as const,
      priority: 2,
    },
    {
      id: 'fallback-multi-3',
      text: 'What order should I watch these?',
      category: 'navigation' as const,
      priority: 3,
    },
    {
      id: 'fallback-multi-4',
      text: 'Create a study plan from all videos',
      category: 'study' as const,
      priority: 4,
    },
  ];

  return videoCount > 1 ? multiple : single;
}

/**
 * GET /api/generate-suggestions (for caching/prefetch)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoIds = searchParams.get('videoIds')?.split(',') || [];

  if (videoIds.length === 0) {
    return NextResponse.json(
      { error: 'videoIds parameter is required' },
      { status: 400 }
    );
  }

  // Reuse POST logic
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ videoIds }),
    })
  );
}
