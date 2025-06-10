import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

// Video schema matching frontend expectations
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

const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Genre mapping for categories
const GENRE_QUERIES = {
  'Skill-Based': [
    { query: 'cooking tutorial for beginners', subGenre: 'Cooking' },
    { query: 'DIY home improvement projects', subGenre: 'DIY & Crafts' },
    { query: 'photography tips and techniques', subGenre: 'Photography' },
    { query: 'music production tutorial', subGenre: 'Music Production' },
    { query: 'digital art drawing tutorial', subGenre: 'Art & Design' }
  ],
  'Academic': [
    { query: 'mathematics calculus tutorial', subGenre: 'Mathematics' },
    { query: 'physics experiments explained', subGenre: 'Science' },
    { query: 'world history documentary', subGenre: 'History' },
    { query: 'english literature analysis', subGenre: 'Literature' },
    { query: 'computer science algorithms', subGenre: 'Computer Science' }
  ],
  'Career': [
    { query: 'job interview tips and tricks', subGenre: 'Interview Prep' },
    { query: 'resume writing guide 2024', subGenre: 'Resume Building' },
    { query: 'freelancing for beginners', subGenre: 'Freelancing' },
    { query: 'career development strategies', subGenre: 'Career Growth' },
    { query: 'professional networking tips', subGenre: 'Networking' }
  ],
  'Tech News': [
    { query: 'latest AI technology news', subGenre: 'AI Updates' },
    { query: 'new gadget reviews 2024', subGenre: 'Product Reviews' },
    { query: 'tech industry analysis', subGenre: 'Industry Trends' },
    { query: 'startup news and funding', subGenre: 'Startup News' },
    { query: 'cybersecurity news updates', subGenre: 'Security' }
  ]
};

async function fetchYouTubeVideos(query: string, maxResults: number = 10) {
  try {
    const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    // Get detailed video information
    const detailsUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    
    if (!detailsResponse.ok) {
      throw new Error(`YouTube API error: ${detailsResponse.status}`);
    }
    
    const detailsData = await detailsResponse.json();
    return detailsData.items;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    throw error;
  }
}

function parseDuration(duration: string): string {
  // Convert ISO 8601 duration to readable format
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return duration;
  
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);
  
  return parts.join(' ') || '0s';
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // Connect to database
    await connectDB();

    // Get request body
    const body = await request.json();
    const { category, limit = 5 } = body;

    // Determine which queries to use
    let queriesToProcess: Array<{ category: string; query: string; subGenre: string }> = [];
    
    if (category && GENRE_QUERIES[category as keyof typeof GENRE_QUERIES]) {
      // Process specific category
      const queries = GENRE_QUERIES[category as keyof typeof GENRE_QUERIES];
      queriesToProcess = queries.map(q => ({ category, ...q }));
    } else {
      // Process all categories
      for (const [cat, queries] of Object.entries(GENRE_QUERIES)) {
        queriesToProcess.push(...queries.map(q => ({ category: cat, ...q })));
      }
    }

    let totalInserted = 0;
    let totalUpdated = 0;
    const errors: string[] = [];

    // Process each query
    for (const { category: cat, query, subGenre } of queriesToProcess) {
      try {
        console.log(`Fetching videos for: ${cat} - ${subGenre}`);
        const videos = await fetchYouTubeVideos(query, limit);

        for (const video of videos) {
          const videoData = {
            youtubeId: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
            duration: parseDuration(video.contentDetails.duration),
            category: cat,
            channelTitle: video.snippet.channelTitle,
            publishedAt: new Date(video.snippet.publishedAt),
            viewCount: parseInt(video.statistics.viewCount || '0'),
            likeCount: parseInt(video.statistics.likeCount || '0'),
            youtubeURL: `https://www.youtube.com/watch?v=${video.id}`,
            tags: video.snippet.tags || [],
            difficulty: 'Beginner' // Default difficulty, can be enhanced later
          };

          // Upsert video
          const result = await Video.findOneAndUpdate(
            { youtubeId: video.id },
            { $set: videoData },
            { upsert: true, new: true }
          );

          if (result.createdAt.getTime() === result.updatedAt?.getTime()) {
            totalInserted++;
          } else {
            totalUpdated++;
          }
        }
      } catch (error: any) {
        const errorMsg = `Error processing ${cat} - ${subGenre}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        
        // Check for quota exceeded
        if (error.message.includes('403')) {
          errors.push('YouTube API quota exceeded. Please try again later.');
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Video population completed',
      stats: {
        totalInserted,
        totalUpdated,
        totalProcessed: totalInserted + totalUpdated,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error in populate videos endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to populate videos'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check population status
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const stats = await Video.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          latestVideo: { $max: '$createdAt' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const totalVideos = await Video.countDocuments();

    return NextResponse.json({
      success: true,
      totalVideos,
      categoryCounts: stats,
      hasYouTubeApiKey: !!YOUTUBE_API_KEY
    });

  } catch (error: any) {
    console.error('Error checking video stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get video statistics'
      },
      { status: 500 }
    );
  }
} 