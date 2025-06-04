import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserHoverInteraction from '@/models/UserHoverInteraction';

// POST: Track hover interactions
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Hover API: Starting request processing');
    
    await connectDB();
    console.log('🎯 Hover API: Database connected successfully');
    
    const requestBody = await request.json();
    console.log('🎯 Hover API: Request body:', JSON.stringify(requestBody, null, 2));
    
    const {
      userId,
      action, // 'hover_start', 'hover_end', 'hover_action'
      hoverData
    } = requestBody;

    console.log('🎯 Hover API: Extracted fields:', { userId, action, hoverDataKeys: Object.keys(hoverData || {}) });

    if (!userId || !action) {
      console.log('🎯 Hover API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let hoverRecord;

    switch (action) {
      case 'hover_start':
        console.log('🎯 Hover API: Processing hover_start');
        
        // Create new hover interaction record
        if (!hoverData.targetId || !hoverData.targetType) {
          console.log('🎯 Hover API: Missing targetId or targetType');
          return NextResponse.json(
            { error: 'Target ID and type are required' },
            { status: 400 }
          );
        }

        console.log('🎯 Hover API: Creating new hover record with data:', {
          targetId: hoverData.targetId,
          targetType: hoverData.targetType,
          entryDirection: hoverData.entryDirection
        });

        try {
          hoverRecord = new UserHoverInteraction({
            userId,
            targetId: hoverData.targetId,
            targetType: hoverData.targetType,
            targetContext: {
              containerType: hoverData.containerType || 'unknown',
              position: hoverData.position || 1,
              pageContext: hoverData.pageContext || 'unknown',
              sectionId: hoverData.sectionId,
            },
            hoverStartTime: new Date(),
            hoverDuration: 0,
            isSignificantHover: false,
            mouseMovement: {
              entryDirection: hoverData.entryDirection || 'unknown',
              movementPattern: 'unknown',
              totalMovementDistance: 0,
              movementSpeed: 0,
            },
            interactionContext: {
              sessionId: hoverData.sessionId,
              device: hoverData.device || 'desktop',
              viewport: {
                width: hoverData.viewport?.width || 1920,
                height: hoverData.viewport?.height || 1080,
              },
              scrollPosition: hoverData.scrollPosition || 0,
              elementPosition: {
                x: hoverData.elementPosition?.x || 0,
                y: hoverData.elementPosition?.y || 0,
              },
              elementSize: {
                width: hoverData.elementSize?.width || 0,
                height: hoverData.elementSize?.height || 0,
              },
            },
            hoverOutcome: {
              resultedInClick: false,
              resultedInScroll: false,
              resultedInNavigation: false,
            },
            actionsOnHover: [],
            recommendationData: hoverData.recommendationData || undefined,
            userState: {
              isFirstTimeSeeing: hoverData.isFirstTimeSeeing !== false,
              previousInteractions: hoverData.previousInteractions || 0,
              timeOnCurrentPage: hoverData.timeOnCurrentPage || 0,
              totalPageInteractions: hoverData.totalPageInteractions || 0,
            },
          });
          
          console.log('🎯 Hover API: Hover record created, attempting to save');
          await hoverRecord.save();
          console.log('🎯 Hover API: Hover record saved successfully');
        } catch (saveError) {
          console.error('🎯 Hover API: Error saving hover record:', saveError);
          console.error('🎯 Hover API: Save error details:', {
            name: saveError.name,
            message: saveError.message,
            stack: saveError.stack
          });
          throw saveError;
        }
        break;

      case 'hover_end':
        // Update hover record with end data
        hoverRecord = await UserHoverInteraction.findOne({
          userId,
          targetId: hoverData.targetId,
          'interactionContext.sessionId': hoverData.sessionId,
          hoverEndTime: null, // Find active hover
        }).sort({ hoverStartTime: -1 });

        if (!hoverRecord) {
          return NextResponse.json(
            { error: 'Active hover interaction not found' },
            { status: 404 }
          );
        }

        const endTime = new Date();
        hoverRecord.hoverEndTime = endTime;
        hoverRecord.hoverDuration = endTime.getTime() - hoverRecord.hoverStartTime.getTime();
        hoverRecord.isSignificantHover = hoverRecord.hoverDuration >= 500; // 500ms threshold

        // Update mouse movement data
        if (hoverData.mouseMovement) {
          hoverRecord.mouseMovement.exitDirection = hoverData.mouseMovement.exitDirection || 'unknown';
          hoverRecord.mouseMovement.movementPattern = hoverData.mouseMovement.movementPattern || 'unknown';
          hoverRecord.mouseMovement.totalMovementDistance = hoverData.mouseMovement.totalMovementDistance || 0;
          
          if (hoverRecord.hoverDuration > 0) {
            hoverRecord.mouseMovement.movementSpeed = 
              hoverRecord.mouseMovement.totalMovementDistance / (hoverRecord.hoverDuration / 1000);
          }
        }

        // Update hover outcome
        if (hoverData.hoverOutcome) {
          hoverRecord.hoverOutcome.resultedInClick = hoverData.hoverOutcome.resultedInClick || false;
          hoverRecord.hoverOutcome.resultedInScroll = hoverData.hoverOutcome.resultedInScroll || false;
          hoverRecord.hoverOutcome.resultedInNavigation = hoverData.hoverOutcome.resultedInNavigation || false;
          
          if (hoverData.hoverOutcome.clickTimestamp) {
            hoverRecord.hoverOutcome.clickTimestamp = hoverData.hoverOutcome.clickTimestamp;
            hoverRecord.hoverOutcome.timeToAction = Math.round(
              (new Date(hoverData.hoverOutcome.clickTimestamp).getTime() - endTime.getTime())
            );
          }
        }

        await hoverRecord.save();
        break;

      case 'hover_action':
        // Add action that occurred during hover
        hoverRecord = await UserHoverInteraction.findOne({
          userId,
          targetId: hoverData.targetId,
          'interactionContext.sessionId': hoverData.sessionId,
          hoverEndTime: null,
        }).sort({ hoverStartTime: -1 });

        if (!hoverRecord) {
          return NextResponse.json(
            { error: 'Active hover interaction not found' },
            { status: 404 }
          );
        }

        hoverRecord.actionsOnHover.push({
          actionType: hoverData.actionType,
          actionTimestamp: new Date(),
          actionData: hoverData.actionData,
        });

        await hoverRecord.save();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      hoverRecord: {
        id: hoverRecord._id,
        userId: hoverRecord.userId,
        targetId: hoverRecord.targetId,
        hoverDuration: hoverRecord.hoverDuration,
        isSignificantHover: hoverRecord.isSignificantHover,
        isActive: !hoverRecord.hoverEndTime,
      }
    });

  } catch (error) {
    console.error('🎯 Hover API: CRITICAL ERROR occurred');
    console.error('🎯 Hover API: Error name:', error?.name);
    console.error('🎯 Hover API: Error message:', error?.message);
    console.error('🎯 Hover API: Error stack:', error?.stack);
    
    // Log additional context
    console.error('🎯 Hover API: Error context:', {
      timestamp: new Date().toISOString(),
      requestMethod: 'POST',
      endpoint: '/api/tracking/hover'
    });
    
    // If it's a MongoDB validation error, log validation details
    if (error?.name === 'ValidationError') {
      console.error('🎯 Hover API: Validation errors:', error?.errors);
      Object.keys(error.errors || {}).forEach(field => {
        console.error(`🎯 Hover API: Field "${field}" validation failed:`, error.errors[field].message);
      });
    }
    
    // If it's a MongoDB cast error
    if (error?.name === 'CastError') {
      console.error('🎯 Hover API: Cast error details:', {
        path: error.path,
        value: error.value,
        kind: error.kind
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to track hover interaction' },
      { status: 500 }
    );
  }
}

// GET: Retrieve user hover interactions
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetId = searchParams.get('targetId');
    const significantOnly = searchParams.get('significantOnly') === 'true';
    const minDuration = parseInt(searchParams.get('minDuration') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const query: any = { userId, isActive: true };
    
    if (targetId) {
      query.targetId = targetId;
    }
    
    if (significantOnly) {
      query.isSignificantHover = true;
    }
    
    if (minDuration > 0) {
      query.hoverDuration = { $gte: minDuration };
    }

    const skip = (page - 1) * limit;

    const [hoverInteractions, totalCount] = await Promise.all([
      UserHoverInteraction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      UserHoverInteraction.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: hoverInteractions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching hover interactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hover interactions' },
      { status: 500 }
    );
  }
} 