import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

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

// GET - Fetch user's playlists
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    // For demo purposes, allow fetching all playlists if no userId provided
    const queryUserId = userId || 'guest';

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Debug mode: return all playlists with their userIds
    if (userId === 'all-debug') {
      const allPlaylists = await Playlist.find({}).sort({ createdAt: -1 }).limit(20);
      return NextResponse.json({ 
        success: true,
        debug: true,
        playlists: allPlaylists.map(p => ({
          id: p._id,
          title: p.title,
          description: p.description,
          videoCount: p.videos.length,
          userId: p.userId,
          createdAt: p.createdAt
        }))
      });
    }
    
    const playlists = await Playlist.find({ userId: queryUserId }).sort({ createdAt: -1 });
    
    console.log('Found playlists count:', playlists.length);
    if (playlists.length > 0) {
      console.log('First playlist _id:', playlists[0]._id, 'type:', typeof playlists[0]._id);
      console.log('First playlist title:', playlists[0].title);
      console.log('First playlist videos count:', playlists[0].videos.length);
      if (playlists[0].videos.length > 0) {
        console.log('First video data:', {
          id: playlists[0].videos[0].id,
          youtubeId: playlists[0].videos[0].youtubeId,
          youtubeURL: playlists[0].videos[0].youtubeURL,
          url: playlists[0].videos[0].url,
          title: playlists[0].videos[0].title
        });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      playlists: playlists.map(p => ({
        _id: p._id.toString(), // Ensure _id is stringified
        id: p._id.toString(),  // Ensure id is also stringified
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
        // Include first video for thumbnail
        videos: p.videos.length > 0 ? [{
          id: p.videos[0].id,
          title: p.videos[0].title,
          thumbnail: p.videos[0].thumbnail,
          youtubeURL: p.videos[0].youtubeURL || p.videos[0].url,
          youtubeId: p.videos[0].youtubeId, // Include the actual youtubeId
          duration: p.videos[0].duration,
          channelTitle: p.videos[0].channelTitle,
        }] : []
      }))
    });
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
      MONGO_URI: !!process.env.MONGO_URI,
      NODE_ENV: process.env.NODE_ENV 
    });

    // For new simple playlist creation (from genre page), we don't require all fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    try {
      console.log('Attempting to connect to MongoDB...');
      await connectToDatabase();
      console.log('MongoDB connection successful');
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      
      // Check if it's a missing environment variable
      if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
        return NextResponse.json({ 
          error: 'Database not configured. Please set MONGO_URI environment variable.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Database connection failed. Please check your MongoDB Atlas configuration.' 
      }, { status: 500 });
    }

    // Handle simple playlist creation (from genre page) - when firstVideo is provided
    if (firstVideo) {
      const playlistVideos = [];
      
      // Add first video
      const video = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        youtubeId: firstVideo.youtubeId,
        title: firstVideo.title,
        thumbnail: firstVideo.thumbnail,
        duration: firstVideo.duration,
        channelTitle: firstVideo.channelTitle,
        url: firstVideo.youtubeURL,
        youtubeURL: firstVideo.youtubeURL,
        description: firstVideo.description,
        addedAt: new Date().toISOString(),
        completionStatus: 0,
        addedBy: 'user'
      };
      playlistVideos.push(video);

      const playlist = new Playlist({
        userId: userId || 'guest', // Use provided userId or fallback to guest
        title,
        description: description || '',
        category: category || 'General',
        tags: tags || [],
        isPublic: isPublic || false,
        videos: playlistVideos,
        overallProgress: 0,
      });

      try {
        await playlist.save();
        console.log('Playlist saved successfully:', playlist._id);
        
        return NextResponse.json({ 
          success: true,
          playlist: {
            id: playlist._id,
            title: playlist.title,
            description: playlist.description,
            videoCount: playlist.videos.length
          }
        });
      } catch (saveError) {
        console.error('Error saving playlist:', saveError);
        return NextResponse.json({ error: 'Failed to save playlist to database' }, { status: 500 });
      }
    }

    // Handle full playlist creation (from playlist create page)
    if (!userId || !category) {
      console.error('Missing required fields for full playlist creation:', { userId: !!userId, title: !!title, category: !!category });
      return NextResponse.json({ error: 'Missing required fields for full playlist creation' }, { status: 400 });
    }

    // Transform videos to include all required fields
    const transformedVideos = (videos || []).map((video: any, index: number) => {
      // Extract youtubeId from url if not provided
      const youtubeId = video.youtubeId || video.id || extractYouTubeId(video.url || video.youtubeURL);
      
      return {
        id: video.id || `video_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        youtubeId: youtubeId || '', // Required field
        title: video.title || 'Untitled Video',
        channelTitle: video.channelTitle || '',
        thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        duration: video.duration || '0:00',
        url: video.url || video.youtubeURL || `https://www.youtube.com/watch?v=${youtubeId}`,
        youtubeURL: video.youtubeURL || video.url || `https://www.youtube.com/watch?v=${youtubeId}`, // Required field
        description: video.description || '',
        completionStatus: video.completionStatus || 0,
        addedAt: video.addedAt || new Date().toISOString(), // Required field
        addedBy: video.addedBy || 'user',
      };
    });

    const playlist = new Playlist({
      userId,
      title,
      description: description || '',
      category,
      tags: tags || [],
      isPublic: isPublic || false,
      videos: transformedVideos,
      overallProgress: 0,
    });

    try {
      await playlist.save();
      console.log('Full playlist saved successfully:', playlist._id);
      
      return NextResponse.json({ 
        success: true,
        playlist: {
          id: playlist._id,
          title: playlist.title,
          description: playlist.description,
          videoCount: playlist.videos.length
        }
      });
    } catch (saveError) {
      console.error('Error saving full playlist:', saveError);
      if (saveError instanceof Error) {
        return NextResponse.json({ error: saveError.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
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
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Calculate overall progress if videos are being updated
    if (updateData.videos) {
      // Transform videos to include all required fields
      updateData.videos = updateData.videos.map((video: any, index: number) => {
        // Extract youtubeId from url if not provided
        const youtubeId = video.youtubeId || video.id || extractYouTubeId(video.url || video.youtubeURL);
        
        return {
          id: video.id || `video_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          youtubeId: youtubeId || '', // Required field
          title: video.title || 'Untitled Video',
          channelTitle: video.channelTitle || '',
          thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
          duration: video.duration || '0:00',
          url: video.url || video.youtubeURL || `https://www.youtube.com/watch?v=${youtubeId}`,
          youtubeURL: video.youtubeURL || video.url || `https://www.youtube.com/watch?v=${youtubeId}`, // Required field
          description: video.description || '',
          completionStatus: video.completionStatus || 0,
          addedAt: video.addedAt || new Date().toISOString(), // Required field
          addedBy: video.addedBy || 'user',
        };
      });

      const completedVideos = updateData.videos.filter((v: any) => v.completionStatus === 100).length;
      const totalVideos = updateData.videos.length;
      updateData.overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
    }

    const playlist = await Playlist.findByIdAndUpdate(
      playlistId,
      updateData,
      { new: true }
    );

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({ playlist });
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
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const result = await Playlist.findByIdAndDelete(playlistId);

    if (!result) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
} 