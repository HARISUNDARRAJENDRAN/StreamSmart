import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistsByUserId } from '@/lib/dynamodb-service';

/**
 * GET /api/playlists/check-video
 * Check if a video exists in any of the user's playlists
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');
    const videoId = searchParams.get('videoId');

    if (!userId || !videoId) {
      return NextResponse.json(
        { error: 'userId and videoId are required' },
        { status: 400 }
      );
    }

    // Get all user's playlists
    const playlists = await getPlaylistsByUserId(userId);

    // Check if video exists in any playlist
    let exists = false;
    let playlistId: string | null = null;

    for (const playlist of playlists) {
      if (playlist.videos && playlist.videos.length > 0) {
        const videoExists = playlist.videos.some(video => 
          video.youtubeId === videoId || 
          video.id === videoId ||
          video.id === `video_${videoId}`
        );

        if (videoExists) {
          exists = true;
          playlistId = playlist.id;
          break;
        }
      }
    }

    return NextResponse.json({
      exists,
      playlistId,
      message: exists 
        ? 'Video exists in user playlists' 
        : 'Video not found in playlists'
    });

  } catch (error) {
    console.error('[Check Video] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check video existence',
        exists: false 
      },
      { status: 500 }
    );
  }
}
