import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

const VIDEOS_TABLE = 'Videos';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    // Connect to DynamoDB
    const client = await connectToDatabase();
    
    const category = decodeURIComponent(params.category);
    
    // Get pagination parameters
    const nextToken = request.nextUrl.searchParams.get('nextToken');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '200', 10);
    
    // Decode the nextToken if provided (it's base64-encoded ExclusiveStartKey)
    let exclusiveStartKey: Record<string, any> | undefined;
    if (nextToken) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
      } catch (error) {
        console.error('Error decoding nextToken:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid pagination token' },
          { status: 400 }
        );
      }
    }
    
    // Fetch videos from DynamoDB using category index
    const result = await client.send(new QueryCommand({
      TableName: VIDEOS_TABLE,
      IndexName: 'category-createdAt-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category
      },
      ScanIndexForward: false, // Sort by createdAt descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey
    }));

    const videos = (result.Items || []).map(video => ({
      id: video.id,
      youtubeId: video.youtubeId,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      duration: video.duration,
      category: video.category,
      subGenre: video.subGenre,
      channelTitle: video.channelTitle,
      publishedAt: video.publishedAt,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      youtubeURL: video.youtubeURL,
      tags: video.tags,
      difficulty: video.difficulty,
      createdAt: video.createdAt
    }));

    // Encode LastEvaluatedKey for client to use as nextToken
    const responseNextToken = result.LastEvaluatedKey 
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
      category,
      nextToken: responseNextToken,
      hasMore: !!result.LastEvaluatedKey
    });

  } catch (error) {
    console.error('Error fetching videos by category:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch videos'
      },
      { status: 500 }
    );
  }
} 