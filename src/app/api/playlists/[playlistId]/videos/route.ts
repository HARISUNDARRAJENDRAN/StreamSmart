import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistById, updatePlaylist } from '@/lib/dynamodb-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { playlistId } = await params;
    const videoData = await request.json();

    console.log('Adding video to playlist:', playlistId);
    console.log('Video data received:', videoData);

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      // Find the playlist
      const playlist = await getPlaylistById(playlistId);
      if (!playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
      }

      console.log('Found playlist:', playlist.title);

      // Ensure all existing videos have required fields (defensive programming)
      const validatedVideos = playlist.videos.map((video: Record<string, unknown>) => ({
        ...video,
        youtubeId: video.youtubeId || video.id || 'unknown',
        youtubeURL: video.youtubeURL || video.url || `https://youtube.com/watch?v=${video.youtubeId || video.id}`,
        addedAt: video.addedAt || new Date().toISOString(),
        title: video.title || 'Untitled Video',
        duration: video.duration || '0:00',
        thumbnail: video.thumbnail || '',
        url: video.url || video.youtubeURL || `https://youtube.com/watch?v=${video.youtubeId || video.id}`,
        description: video.description || '',
        channelTitle: video.channelTitle || '',
        completionStatus: video.completionStatus || 0,
        addedBy: video.addedBy || 'user'
      }));

      // Check if video already exists in playlist
      // Skip duplicate check if youtubeId is missing or placeholder value
      if (videoData.youtubeId && videoData.youtubeId !== 'unknown') {
        const existingVideo = validatedVideos.find(
          (video: Record<string, unknown>) => 
            video.youtubeId === videoData.youtubeId && 
            video.youtubeId !== 'unknown'
        );

        if (existingVideo) {
          return NextResponse.json({ 
            success: false,
            error: 'Video already exists in playlist' 
          }, { status: 400 });
        }
      }

      // Create new video object with ALL required fields
      const newVideo = {
        id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        youtubeId: videoData.youtubeId || '',
        title: videoData.title || 'Untitled Video',
        thumbnail: videoData.thumbnail || '',
        duration: videoData.duration || '0:00',
        channelTitle: videoData.channelTitle || '',
        url: videoData.youtubeURL || videoData.url || '',
        youtubeURL: videoData.youtubeURL || videoData.url || '',
        description: videoData.description || '',
        addedAt: new Date().toISOString(),
        completionStatus: 0,
        addedBy: 'user'
      };

      console.log('New video object:', newVideo);

      // Add video to playlist
      validatedVideos.push(newVideo);
      
      // Update overall progress
      const completedVideos = validatedVideos.filter((v: Record<string, unknown>) => v.completionStatus === 100).length;
      const totalVideos = validatedVideos.length;
      const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
      
      // Update playlist in DynamoDB
      const updatedPlaylist = await updatePlaylist(playlistId, {
        videos: validatedVideos,
        overallProgress
      });

      console.log('Video added successfully to playlist');

      return NextResponse.json({
        success: true,
        message: 'Video added to playlist successfully',
        video: newVideo,
        playlist: {
          id: updatedPlaylist.id,
          title: updatedPlaylist.title,
          videoCount: updatedPlaylist.videos.length
        }
      });

    } catch (dbError) {
      console.error('DynamoDB operation error:', dbError);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error adding video to playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 