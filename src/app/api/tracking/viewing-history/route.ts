import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserViewingHistory from '@/models/UserViewingHistory';

// POST: Start a new viewing session or update existing one
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userId,
      itemId,
      itemType,
      action, // 'start', 'update', 'complete', 'pause', 'resume'
      viewingData
    } = await request.json();

    if (!userId || !itemId || !itemType || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let viewingRecord;

    switch (action) {
      case 'start':
        // Create new viewing session
        viewingRecord = new UserViewingHistory({
          userId,
          itemId,
          itemType,
          viewStartTime: new Date(),
          totalViewDuration: 0,
          completionPercentage: 0,
          pauseCount: 0,
          seekCount: 0,
          skipCount: 0,
          replayCount: 0,
          viewingContext: {
            source: viewingData.source || 'unknown',
            device: viewingData.device || 'desktop',
            referrer: viewingData.referrer,
            sessionId: viewingData.sessionId,
          },
          averagePlaybackSpeed: viewingData.playbackSpeed || 1.0,
          qualityChanges: 0,
          bufferingEvents: 0,
          fullScreenUsed: false,
          volumeAdjustments: 0,
          captionsEnabled: viewingData.captionsEnabled || false,
          actualDuration: viewingData.actualDuration,
        });
        
        await viewingRecord.save();
        break;

      case 'update':
        // Update existing viewing session
        viewingRecord = await UserViewingHistory.findOne({
          userId,
          itemId,
          viewEndTime: null, // Find active session
        }).sort({ viewStartTime: -1 }); // Get most recent

        if (!viewingRecord) {
          return NextResponse.json(
            { error: 'Active viewing session not found' },
            { status: 404 }
          );
        }

        // Update fields
        if (viewingData.totalViewDuration !== undefined) {
          viewingRecord.totalViewDuration = viewingData.totalViewDuration;
        }
        if (viewingData.completionPercentage !== undefined) {
          viewingRecord.completionPercentage = viewingData.completionPercentage;
        }
        if (viewingData.pauseCount !== undefined) {
          viewingRecord.pauseCount = viewingData.pauseCount;
        }
        if (viewingData.seekCount !== undefined) {
          viewingRecord.seekCount = viewingData.seekCount;
        }
        if (viewingData.skipCount !== undefined) {
          viewingRecord.skipCount = viewingData.skipCount;
        }
        if (viewingData.replayCount !== undefined) {
          viewingRecord.replayCount = viewingData.replayCount;
        }
        if (viewingData.playbackSpeed !== undefined) {
          viewingRecord.averagePlaybackSpeed = viewingData.playbackSpeed;
        }
        if (viewingData.qualityChanges !== undefined) {
          viewingRecord.qualityChanges = viewingData.qualityChanges;
        }
        if (viewingData.bufferingEvents !== undefined) {
          viewingRecord.bufferingEvents = viewingData.bufferingEvents;
        }
        if (viewingData.fullScreenUsed !== undefined) {
          viewingRecord.fullScreenUsed = viewingData.fullScreenUsed;
        }
        if (viewingData.volumeAdjustments !== undefined) {
          viewingRecord.volumeAdjustments = viewingData.volumeAdjustments;
        }
        if (viewingData.captionsEnabled !== undefined) {
          viewingRecord.captionsEnabled = viewingData.captionsEnabled;
        }

        await viewingRecord.save();
        break;

      case 'complete':
      case 'pause':
        // End viewing session
        viewingRecord = await UserViewingHistory.findOne({
          userId,
          itemId,
          viewEndTime: null, // Find active session
        }).sort({ viewStartTime: -1 });

        if (!viewingRecord) {
          return NextResponse.json(
            { error: 'Active viewing session not found' },
            { status: 404 }
          );
        }

        viewingRecord.viewEndTime = new Date();
        
        // Update final stats if provided
        if (viewingData.totalViewDuration !== undefined) {
          viewingRecord.totalViewDuration = viewingData.totalViewDuration;
        }
        if (viewingData.completionPercentage !== undefined) {
          viewingRecord.completionPercentage = viewingData.completionPercentage;
        }

        await viewingRecord.save();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      viewingRecord: {
        id: viewingRecord._id,
        userId: viewingRecord.userId,
        itemId: viewingRecord.itemId,
        totalViewDuration: viewingRecord.totalViewDuration,
        completionPercentage: viewingRecord.completionPercentage,
        isActive: !viewingRecord.viewEndTime,
      }
    });

  } catch (error) {
    console.error('Error tracking viewing history:', error);
    return NextResponse.json(
      { error: 'Failed to track viewing history' },
      { status: 500 }
    );
  }
}

// GET: Retrieve user viewing history
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const itemId = searchParams.get('itemId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const query: any = { userId, isActive: true };
    if (itemId) {
      query.itemId = itemId;
    }

    const skip = (page - 1) * limit;

    const [viewingHistory, totalCount] = await Promise.all([
      UserViewingHistory.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      UserViewingHistory.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: viewingHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching viewing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing history' },
      { status: 500 }
    );
  }
} 