import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

// GET - Fetch user's playlists
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 });
    
    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, description, category, tags, isPublic, videos } = body;

    if (!userId || !title || !category) {
      console.error('Missing required fields:', { userId: !!userId, title: !!title, category: !!category });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const playlist = new Playlist({
      userId,
      title,
      description: description || '',
      category,
      tags: tags || [],
      isPublic: isPublic || false,
      videos: videos || [],
      overallProgress: 0,
    });

    try {
      await playlist.save();
      return NextResponse.json({ playlist });
    } catch (saveError) {
      console.error('Error saving playlist:', saveError);
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