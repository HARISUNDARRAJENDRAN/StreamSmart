import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

// GET - Fetch a single playlist by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { playlistId } = await params;
    
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }
    
    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
} 