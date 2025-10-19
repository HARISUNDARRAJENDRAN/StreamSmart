import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/dynamodb';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const VIDEOS_TABLE = 'Videos';

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
    const videoIds = searchData.items.map((item: {id: {videoId: string}}) => item.id.videoId).join(',');
    
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
    let totalFailed = 0;
    const errors: string[] = [];
    
    // Connect to DynamoDB
    const client = await connectToDatabase();

    // Process each query
    for (const { category: cat, query, subGenre } of queriesToProcess) {
      try {
        console.log(`Fetching videos for: ${cat} - ${subGenre}`);
        const videos = await fetchYouTubeVideos(query, limit);

        for (const video of videos) {
          const videoData = {
            id: video.id,
            youtubeId: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
            duration: parseDuration(video.contentDetails.duration),
            category: cat,
            subGenre: subGenre,
            channelTitle: video.snippet.channelTitle,
            publishedAt: new Date(video.snippet.publishedAt).getTime(),
            viewCount: parseInt(video.statistics.viewCount || '0'),
            likeCount: parseInt(video.statistics.likeCount || '0'),
            youtubeURL: `https://www.youtube.com/watch?v=${video.id}`,
            tags: video.snippet.tags || [],
            difficulty: 'Beginner',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          try {
            // Try conditional Put first (for new items)
            await client.send(new PutCommand({
              TableName: VIDEOS_TABLE,
              Item: videoData,
              ConditionExpression: 'attribute_not_exists(id)'
            }));
            totalInserted++;
          } catch (error) {
            // If conditional check fails, item exists - update it
            if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
              try {
                await client.send(new UpdateCommand({
                  TableName: VIDEOS_TABLE,
                  Key: { id: video.id },
                  UpdateExpression: 'SET #title = :title, #desc = :desc, #thumb = :thumb, #dur = :dur, #cat = :cat, #subGenre = :subGenre, #ch = :ch, #pub = :pub, #vc = :vc, #lc = :lc, #url = :url, #tags = :tags, #diff = :diff, #updatedAt = :updatedAt',
                  ExpressionAttributeNames: {
                    '#title': 'title',
                    '#desc': 'description',
                    '#thumb': 'thumbnail',
                    '#dur': 'duration',
                    '#cat': 'category',
                    '#subGenre': 'subGenre',
                    '#ch': 'channelTitle',
                    '#pub': 'publishedAt',
                    '#vc': 'viewCount',
                    '#lc': 'likeCount',
                    '#url': 'youtubeURL',
                    '#tags': 'tags',
                    '#diff': 'difficulty',
                    '#updatedAt': 'updatedAt'
                  },
                  ExpressionAttributeValues: {
                    ':title': videoData.title,
                    ':desc': videoData.description,
                    ':thumb': videoData.thumbnail,
                    ':dur': videoData.duration,
                    ':cat': videoData.category,
                    ':subGenre': videoData.subGenre,
                    ':ch': videoData.channelTitle,
                    ':pub': videoData.publishedAt,
                    ':vc': videoData.viewCount,
                    ':lc': videoData.likeCount,
                    ':url': videoData.youtubeURL,
                    ':tags': videoData.tags,
                    ':diff': videoData.difficulty,
                    ':updatedAt': videoData.updatedAt
                  }
                }));
                totalUpdated++;
              } catch (updateError) {
                totalFailed++;
                const errorMsg = `Failed to update video ${video.id}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`;
                console.error(errorMsg);
                errors.push(errorMsg);
              }
            } else {
              // Unexpected error during Put
              totalFailed++;
              const errorMsg = `Failed to insert video ${video.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          }
        }
      } catch (error) {
        const errorMsg = `Error processing ${cat} - ${subGenre}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        
        // Check for quota exceeded
        if (error instanceof Error && error.message.includes('403')) {
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
        totalFailed,
        totalProcessed: totalInserted + totalUpdated + totalFailed,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in populate videos endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' || 'Failed to populate videos'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check population status
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Video population endpoint available',
      hasYouTubeApiKey: !!YOUTUBE_API_KEY,
      info: 'Use POST to populate videos, requires YouTube API key'
    });

  } catch (error) {
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