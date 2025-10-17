import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistById } from '@/lib/dynamodb-service';

// GET - Fetch a single playlist by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { playlistId } = await params;
    
    console.log('Fetching playlist by ID:', playlistId);
    
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      const playlist = await getPlaylistById(playlistId);
      
      if (!playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
      }

      console.log('Playlist found:', playlist.title, 'with', playlist.videos?.length ?? 0, 'videos');
      
      return NextResponse.json({ 
        success: true,
        playlist: {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          category: playlist.category,
          tags: playlist.tags,
          isPublic: playlist.isPublic,
          videos: playlist.videos,
          overallProgress: playlist.overallProgress,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
          userId: playlist.userId
        }
      });
    } catch (dbError) {
      console.error('DynamoDB query error:', dbError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
} 