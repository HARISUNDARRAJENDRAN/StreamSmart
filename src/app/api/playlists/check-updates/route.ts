/**
 * Check for Playlist Updates Endpoint
 * Used for polling-based real-time sync
 * 
 * Returns whether playlist has been modified since last check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistById } from '@/lib/dynamodb-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
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
}

export async function GET(request: NextRequest): Promise<NextResponse<CheckUpdatesResponse>> {
  try {
    const playlistId = request.nextUrl.searchParams.get('playlistId');
    const lastChecked = request.nextUrl.searchParams.get('lastChecked');
    
    if (!playlistId) {
      return NextResponse.json(
        { hasUpdates: false },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`[Check Updates] Checking playlist ${playlistId}, last checked: ${lastChecked}`);
    
    // Fetch playlist from DynamoDB
    const playlist = await getPlaylistById(playlistId);
    
    if (!playlist) {
      console.log(`[Check Updates] Playlist not found: ${playlistId}`);
      return NextResponse.json(
        { hasUpdates: false },
        { status: 404, headers: corsHeaders }
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
      { hasUpdates: false },
      { status: 500, headers: corsHeaders }
    );
  }
}
