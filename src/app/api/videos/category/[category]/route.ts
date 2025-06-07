import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

// Video schema to match our database structure
const videoSchema = new mongoose.Schema({
  youtubeId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  thumbnail: String,
  duration: String,
  category: String,
  channelTitle: String,
  publishedAt: Date,
  viewCount: Number,
  likeCount: Number,
  youtubeURL: String,
  tags: [String],
  difficulty: String,
  createdAt: { type: Date, default: Date.now }
});

// Only create the model if it doesn't exist
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    // Connect to database
    await connectDB();
    
    const category = decodeURIComponent(params.category);
    
    // Fetch videos from database
    const videos = await Video.find({ category })
      .sort({ createdAt: -1 })
      .limit(200) // Limit to prevent excessive data
      .select('-__v') // Exclude version field
      .lean(); // Return plain objects for better performance

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
      category
    });

  } catch (error) {
    console.error('Error fetching videos by category:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch videos',
        videos: [],
        count: 0
      },
      { status: 500 }
    );
  }
} 