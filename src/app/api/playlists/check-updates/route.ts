/**
 * Check for Playlist Updates Endpoint
 * Used for polling-based real-time sync
 * 
 * SECURITY: Requires authentication to prevent unauthorized access
 * Returns whether playlist has been modified since last check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistById } from '@/lib/dynamodb-service';
import { getAuthenticatedUser } from '@/lib/auth-utils';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://main.de7gjtsqdtkvr.amplifyapp.com',
  'https://streamsmart.vercel.app',
  'https://www.youtube.com',
];

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  const isAllowed = isExtension || 
    ALLOWED_ORIGINS.includes(origin) || 
    process.env.NODE_ENV === 'development';
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

interface CheckUpdatesResponse {
  hasUpdates: boolean;
  lastModified?: string;
  videoCount?: number;
  latestVideo?: {
    id: string;
    title: string;
    addedAt: string;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<CheckUpdatesResponse>> {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { hasUpdates: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const playlistId = request.nextUrl.searchParams.get('playlistId');
    const lastChecked = request.nextUrl.searchParams.get('lastChecked');
    
    if (!playlistId) {
      return NextResponse.json(
        { hasUpdates: false, error: 'Playlist ID required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`[Check Updates] Checking playlist ${playlistId}, last checked: ${lastChecked}`);
    
    // Fetch playlist from DynamoDB
    const playlist = await getPlaylistById(playlistId);
    
    if (!playlist) {
      console.log(`[Check Updates] Playlist not found: ${playlistId}`);
      return NextResponse.json(
        { hasUpdates: false, error: 'Playlist not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // IDOR Protection: Verify user owns the playlist
    if (playlist.userId !== authResult.user.userId) {
      return NextResponse.json(
        { hasUpdates: false, error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Get last modified timestamp (it's a number in DynamoDB)
    const lastModified = playlist.updatedAt || playlist.createdAt;
    const lastModifiedISOString = new Date(lastModified).toISOString();
    
    // Check if playlist was modified after last check
    let hasUpdates = false;
    if (lastChecked) {
      try {
        const lastCheckedTime = parseInt(lastChecked);
        hasUpdates = lastModified > lastCheckedTime;
      } catch (e) {
        console.error('[Check Updates] Invalid lastChecked format:', e);
        hasUpdates = true; // Default to true if we can't parse
      }
    } else {
      hasUpdates = true; // No last check time, assume updates
    }
    
    // Get latest video for preview
    let latestVideo;
    if (playlist.videos && playlist.videos.length > 0) {
      const sortedVideos = [...playlist.videos].sort((a, b) => {
        const aTime = new Date(a.addedAt || 0).getTime();
        const bTime = new Date(b.addedAt || 0).getTime();
        return bTime - aTime;
      });
      
      const latest = sortedVideos[0];
      latestVideo = {
        id: latest.id,
        title: latest.title,
        addedAt: latest.addedAt || new Date().toISOString(),
      };
    }
    
    console.log(`[Check Updates] Has updates: ${hasUpdates}, Video count: ${playlist.videos?.length || 0}`);
    
    const response: CheckUpdatesResponse = {
      hasUpdates,
      lastModified: lastModifiedISOString,
      videoCount: playlist.videos?.length || 0,
      ...(latestVideo && { latestVideo }),
    };
    
    return NextResponse.json(response, { headers: corsHeaders });
    
  } catch (error) {
    console.error('[Check Updates] Error:', error);
    return NextResponse.json(
      { hasUpdates: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
