import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPlaylistsByUserId, createPlaylist, getPlaylistById, updatePlaylist, deletePlaylist, getAllPlaylists } from '@/lib/dynamodb-service';

// Utility function to extract YouTube ID from URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Helper function to transform video source objects into normalized video objects
interface VideoSource {
  id?: string;
  youtubeId?: string;
  title?: string;
  channelTitle?: string;
  thumbnail?: string;
  duration?: string;
  url?: string;
  youtubeURL?: string;
  description?: string;
  completionStatus?: number;
  addedAt?: string;
  addedBy?: string;
}

function transformVideo(sourceVideo: VideoSource, addedBy: string = 'user'): Record<string, unknown> {
  // Extract youtubeId from url if not provided
  const youtubeId = sourceVideo.youtubeId || sourceVideo.id || extractYouTubeId(sourceVideo.url || sourceVideo.youtubeURL);
  
  return {
    id: `video_${uuidv4()}`,
    youtubeId: youtubeId || '',
    title: sourceVideo.title || 'Untitled Video',
    channelTitle: sourceVideo.channelTitle || '',
    thumbnail: sourceVideo.thumbnail || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    duration: sourceVideo.duration || '0:00',
    url: sourceVideo.url || sourceVideo.youtubeURL || `https://www.youtube.com/watch?v=${youtubeId}`,
    youtubeURL: sourceVideo.youtubeURL || sourceVideo.url || `https://www.youtube.com/watch?v=${youtubeId}`,
    description: sourceVideo.description || '',
    completionStatus: sourceVideo.completionStatus || 0,
    addedAt: sourceVideo.addedAt || new Date().toISOString(),
    addedBy: sourceVideo.addedBy || addedBy,
  };
}

// GET - Fetch user's playlists
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    // For demo purposes, allow fetching all playlists if no userId provided
    const queryUserId = userId || 'guest';

    try {
      let playlists;
      
      // Debug mode: return all playlists with their userIds
      if (userId === 'all-debug') {
        const result = await getAllPlaylists(20);
        playlists = result.items;
        return NextResponse.json({ 
          success: true,
          debug: true,
          playlists: playlists.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            videoCount: p.videos.length,
            userId: p.userId,
            createdAt: p.createdAt
          }))
        });
      }
      
      playlists = await getPlaylistsByUserId(queryUserId);
      
      console.log('Found playlists count:', playlists.length);
      if (playlists.length > 0) {
        console.log('First playlist id:', playlists[0].id, 'type:', typeof playlists[0].id);
        console.log('First playlist title:', playlists[0].title);
        console.log('First playlist videos count:', playlists[0].videos.length);
        if (playlists[0].videos.length > 0) {
          console.log('First video data:', {
            id: playlists[0].videos[0].id,
            youtubeId: playlists[0].videos[0].youtubeId,
            youtubeURL: playlists[0].videos[0].youtubeURL,
            url: playlists[0].videos[0].url,
            title: playlists[0].videos[0].title,
            completionStatus: playlists[0].videos[0].completionStatus
          });
        }
      }
      
      return NextResponse.json({ 
        success: true,
        playlists: playlists.map(p => ({
          _id: p.id,
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          tags: p.tags,
          isPublic: p.isPublic,
          videoCount: p.videos.length,
          overallProgress: p.overallProgress,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          userId: p.userId,
          // Include ALL videos with complete data for progress calculation
          videos: p.videos.map(video => ({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            youtubeURL: video.youtubeURL || video.url,
            youtubeId: video.youtubeId,
            duration: video.duration,
            channelTitle: video.channelTitle,
            completionStatus: video.completionStatus || 0,
            addedAt: video.addedAt,
            addedBy: video.addedBy,
            description: video.description || ''
          }))
        }))
      });
    } catch (dbError) {
      console.error('DynamoDB query error:', dbError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, description, category, tags, isPublic, videos, firstVideo } = body;

    console.log('Creating playlist with data:', { userId, title, description, category, hasFirstVideo: !!firstVideo });
    console.log('Environment check:', { 
      AWS_REGION: !!process.env.AWS_REGION,
      NODE_ENV: process.env.NODE_ENV 
    });

    // For new simple playlist creation (from genre page), we don't require all fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    try {
      console.log('Creating playlist in DynamoDB...');

      // Handle simple playlist creation (from genre page) - when firstVideo is provided
      if (firstVideo) {
        const playlistVideos = [];
        
        // Add first video using helper
        const video = transformVideo(firstVideo);
        playlistVideos.push(video);

        const playlist = await createPlaylist({
          userId: userId || 'guest',
          title,
          description: description || '',
          category: category || 'General',
          tags: tags || [],
          isPublic: isPublic || false,
          videos: playlistVideos,
          overallProgress: 0,
        });

        console.log('Playlist created successfully:', playlist.id);
        
        return NextResponse.json({ 
          success: true,
          playlist: {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            videoCount: playlist.videos.length
          }
        });
      }

      // Handle full playlist creation (from playlist create page)
      if (!userId || !category) {
        console.error('Missing required fields for full playlist creation:', { userId: !!userId, title: !!title, category: !!category });
        return NextResponse.json({ error: 'Missing required fields for full playlist creation' }, { status: 400 });
      }

      // Transform videos to include all required fields
      const transformedVideos = (videos || []).map((video: VideoSource) => transformVideo(video));

      const playlist = await createPlaylist({
        userId,
        title,
        description: description || '',
        category,
        tags: tags || [],
        isPublic: isPublic || false,
        videos: transformedVideos,
        overallProgress: 0,
      });

      console.log('Full playlist created successfully:', playlist.id);
      
      return NextResponse.json({ 
        success: true,
        playlist: {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          videoCount: playlist.videos.length
        }
      });
    } catch (dbError) {
      console.error('DynamoDB operation error:', dbError);
      
      if (dbError instanceof Error) {
        return NextResponse.json({ error: dbError.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}

// PUT - Update a playlist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistId, ...updateData } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      // Calculate overall progress if videos are being updated
      if (updateData.videos) {
        // Transform videos to include all required fields
        updateData.videos = updateData.videos.map((video: VideoSource) => transformVideo(video));

        const completedVideos = updateData.videos.filter((v: Record<string, unknown>) => v.completionStatus === 100).length;
        const totalVideos = updateData.videos.length;
        updateData.overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
      }

      const playlist = await updatePlaylist(playlistId, updateData);

      return NextResponse.json({ playlist });
    } catch (dbError) {
      console.error('DynamoDB error:', dbError);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

// DELETE - Delete a playlist
export async function DELETE(request: NextRequest) {
  try {
    const playlistId = request.nextUrl.searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      await deletePlaylist(playlistId);
      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('DynamoDB error:', dbError);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
} 