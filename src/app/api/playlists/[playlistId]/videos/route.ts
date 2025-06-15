import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { playlistId } = await params; // Await the params
    const videoData = await request.json();

    console.log('Adding video to playlist:', playlistId);
    console.log('Video data received:', videoData);

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find the playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    console.log('Found playlist:', playlist.title);

    // Ensure all existing videos have required fields (defensive programming)
    playlist.videos = playlist.videos.map((video: any) => ({
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
    const existingVideo = playlist.videos.find(
      (video: any) => video.youtubeId === videoData.youtubeId
    );

    if (existingVideo) {
      return NextResponse.json({ 
        success: false,
        error: 'Video already exists in playlist' 
      }, { status: 400 });
    }

    // Create new video object with ALL required fields
    const newVideo = {
      id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      youtubeId: videoData.youtubeId || '', // Required field
      title: videoData.title || 'Untitled Video',
      thumbnail: videoData.thumbnail || '',
      duration: videoData.duration || '0:00',
      channelTitle: videoData.channelTitle || '',
      url: videoData.youtubeURL || videoData.url || '', // MongoDB schema uses 'url'
      youtubeURL: videoData.youtubeURL || videoData.url || '', // Required field
      description: videoData.description || '',
      addedAt: new Date().toISOString(), // Required field
      completionStatus: 0,
      addedBy: 'user'
    };

    console.log('New video object:', newVideo);

    // Add video to playlist
    playlist.videos.push(newVideo);
    
    // Update overall progress
    const completedVideos = playlist.videos.filter((v: any) => v.completionStatus === 100).length;
    const totalVideos = playlist.videos.length;
    playlist.overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
    
    await playlist.save();
    console.log('Video added successfully to playlist');

    return NextResponse.json({
      success: true,
      message: 'Video added to playlist successfully',
      video: newVideo,
      playlist: {
        id: playlist._id,
        title: playlist.title,
        videoCount: playlist.videos.length
      }
    });

  } catch (error) {
    console.error('Error adding video to playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 