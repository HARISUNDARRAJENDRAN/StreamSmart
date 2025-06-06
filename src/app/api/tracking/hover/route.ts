import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserHoverInteraction from '@/models/UserHoverInteraction';

// POST: Track hover interactions
export async function POST(request: NextRequest) {
  let requestBody;
  
  try {
    console.log('🎯 Hover API: Starting request processing');
    
    // Connect to database first
    await connectDB();
    console.log('🎯 Hover API: Database connected successfully');
    
    // Parse request body with error handling
    try {
      requestBody = await request.json();
      console.log('🎯 Hover API: Request body received');
    } catch (parseError) {
      console.error('🎯 Hover API: Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      userId,
      action, // 'hover_start', 'hover_end', 'hover_action'
      hoverData
    } = requestBody;

    console.log('🎯 Hover API: Extracted fields:', { 
      userId, 
      action, 
      hasHoverData: !!hoverData,
      hoverDataKeys: hoverData ? Object.keys(hoverData) : []
    });

    // Validate required fields
    if (!userId || !action) {
      console.log('🎯 Hover API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: userId and action are required' },
        { status: 400 }
      );
    }

    if (!hoverData || typeof hoverData !== 'object') {
      console.log('🎯 Hover API: Missing or invalid hoverData');
      return NextResponse.json(
        { error: 'Missing or invalid hoverData object' },
        { status: 400 }
      );
    }

    let hoverRecord;

    switch (action) {
      case 'hover_start':
        console.log('🎯 Hover API: Processing hover_start');
        
        // Validate required fields for hover_start
        if (!hoverData.targetId || !hoverData.targetType) {
          console.log('🎯 Hover API: Missing targetId or targetType');
          return NextResponse.json(
            { error: 'Target ID and type are required for hover_start' },
            { status: 400 }
          );
        }

        // Validate and sanitize data with safe defaults
        const safeHoverData = {
          // Required fields
          targetId: String(hoverData.targetId),
          targetType: hoverData.targetType,
          
          // Optional fields with safe defaults
          containerType: hoverData.containerType || 'unknown',
          position: Math.max(1, parseInt(hoverData.position) || 1),
          pageContext: hoverData.pageContext || 'unknown',
          sectionId: hoverData.sectionId || null,
          sessionId: hoverData.sessionId || 'unknown',
          device: hoverData.device || 'desktop',
          
          // Viewport with safe defaults
          viewport: {
            width: Math.max(1, parseInt(hoverData.viewport?.width) || 1920),
            height: Math.max(1, parseInt(hoverData.viewport?.height) || 1080)
          },
          
          // Position data with safe defaults
          scrollPosition: Math.max(0, parseInt(hoverData.scrollPosition) || 0),
          elementPosition: {
            x: Math.max(0, parseInt(hoverData.elementPosition?.x) || 0),
            y: Math.max(0, parseInt(hoverData.elementPosition?.y) || 0)
          },
          elementSize: {
            width: Math.max(0, parseInt(hoverData.elementSize?.width) || 0),
            height: Math.max(0, parseInt(hoverData.elementSize?.height) || 0)
          },
          
          // Movement data
          entryDirection: hoverData.entryDirection || 'unknown',
          
          // User state data
          isFirstTimeSeeing: hoverData.isFirstTimeSeeing !== false,
          previousInteractions: Math.max(0, parseInt(hoverData.previousInteractions) || 0),
          timeOnCurrentPage: Math.max(0, parseInt(hoverData.timeOnCurrentPage) || 0),
          totalPageInteractions: Math.max(0, parseInt(hoverData.totalPageInteractions) || 0),
          
          // Recommendation data (optional)
          recommendationData: hoverData.recommendationData || undefined
        };

        console.log('🎯 Hover API: Sanitized hover data:', {
          targetId: safeHoverData.targetId,
          targetType: safeHoverData.targetType,
          viewport: safeHoverData.viewport,
          elementPosition: safeHoverData.elementPosition,
          elementSize: safeHoverData.elementSize
        });

        try {
          hoverRecord = new UserHoverInteraction({
            userId,
            targetId: safeHoverData.targetId,
            targetType: safeHoverData.targetType,
            targetContext: {
              containerType: safeHoverData.containerType,
              position: safeHoverData.position,
              pageContext: safeHoverData.pageContext,
              sectionId: safeHoverData.sectionId,
            },
            hoverStartTime: new Date(),
            hoverDuration: 0,
            isSignificantHover: false,
            mouseMovement: {
              entryDirection: safeHoverData.entryDirection,
              movementPattern: 'unknown',
              totalMovementDistance: 0,
              movementSpeed: 0,
            },
            interactionContext: {
              sessionId: safeHoverData.sessionId,
              device: safeHoverData.device,
              viewport: safeHoverData.viewport,
              scrollPosition: safeHoverData.scrollPosition,
              elementPosition: safeHoverData.elementPosition,
              elementSize: safeHoverData.elementSize,
            },
            hoverOutcome: {
              resultedInClick: false,
              resultedInScroll: false,
              resultedInNavigation: false,
            },
            actionsOnHover: [],
            recommendationData: safeHoverData.recommendationData,
            userState: {
              isFirstTimeSeeing: safeHoverData.isFirstTimeSeeing,
              previousInteractions: safeHoverData.previousInteractions,
              timeOnCurrentPage: safeHoverData.timeOnCurrentPage,
              totalPageInteractions: safeHoverData.totalPageInteractions,
            },
          });
          
          console.log('🎯 Hover API: Hover record created, attempting to save');
          await hoverRecord.save();
          console.log('🎯 Hover API: Hover record saved successfully with ID:', hoverRecord._id);
        } catch (saveError) {
          console.error('🎯 Hover API: Error saving hover record:', saveError);
          
          // Enhanced error logging for validation errors
          if (saveError.name === 'ValidationError') {
            console.error('🎯 Hover API: Validation error details:');
            Object.keys(saveError.errors || {}).forEach(field => {
              console.error(`  - Field "${field}": ${saveError.errors[field].message}`);
              console.error(`  - Provided value:`, saveError.errors[field].value);
            });
          }
          
          throw saveError;
        }
        break;

      case 'hover_end':
        console.log('🎯 Hover API: Processing hover_end');
        
        if (!hoverData.targetId || !hoverData.sessionId) {
          console.log('🎯 Hover API: Missing targetId or sessionId for hover_end');
          return NextResponse.json(
            { error: 'Target ID and session ID are required for hover_end' },
            { status: 400 }
          );
        }

        // Find active hover record
        hoverRecord = await UserHoverInteraction.findOne({
          userId,
          targetId: hoverData.targetId,
          'interactionContext.sessionId': hoverData.sessionId,
          hoverEndTime: null, // Find active hover
        }).sort({ hoverStartTime: -1 });

        if (!hoverRecord) {
          console.log('🎯 Hover API: Active hover interaction not found');
          return NextResponse.json(
            { error: 'Active hover interaction not found' },
            { status: 404 }
          );
        }

        const endTime = new Date();
        hoverRecord.hoverEndTime = endTime;
        hoverRecord.hoverDuration = endTime.getTime() - hoverRecord.hoverStartTime.getTime();
        hoverRecord.isSignificantHover = hoverRecord.hoverDuration >= 500; // 500ms threshold

        // Update mouse movement data if provided
        if (hoverData.mouseMovement) {
          hoverRecord.mouseMovement.exitDirection = hoverData.mouseMovement.exitDirection || 'unknown';
          hoverRecord.mouseMovement.movementPattern = hoverData.mouseMovement.movementPattern || 'unknown';
          hoverRecord.mouseMovement.totalMovementDistance = Math.max(0, hoverData.mouseMovement.totalMovementDistance || 0);
          
          if (hoverRecord.hoverDuration > 0) {
            hoverRecord.mouseMovement.movementSpeed = 
              hoverRecord.mouseMovement.totalMovementDistance / (hoverRecord.hoverDuration / 1000);
          }
        }

        // Update hover outcome if provided
        if (hoverData.hoverOutcome) {
          hoverRecord.hoverOutcome.resultedInClick = hoverData.hoverOutcome.resultedInClick || false;
          hoverRecord.hoverOutcome.resultedInScroll = hoverData.hoverOutcome.resultedInScroll || false;
          hoverRecord.hoverOutcome.resultedInNavigation = hoverData.hoverOutcome.resultedInNavigation || false;
          
          if (hoverData.hoverOutcome.clickTimestamp) {
            hoverRecord.hoverOutcome.clickTimestamp = new Date(hoverData.hoverOutcome.clickTimestamp);
            hoverRecord.hoverOutcome.timeToAction = Math.max(0, Math.round(
              (new Date(hoverData.hoverOutcome.clickTimestamp).getTime() - endTime.getTime())
            ));
          }
        }

        await hoverRecord.save();
        console.log('🎯 Hover API: Hover end data saved successfully');
        break;

      case 'hover_action':
        console.log('🎯 Hover API: Processing hover_action');
        
        if (!hoverData.targetId || !hoverData.sessionId || !hoverData.actionType) {
          console.log('🎯 Hover API: Missing required fields for hover_action');
          return NextResponse.json(
            { error: 'Target ID, session ID, and action type are required for hover_action' },
            { status: 400 }
          );
        }

        // Find active hover record
        hoverRecord = await UserHoverInteraction.findOne({
          userId,
          targetId: hoverData.targetId,
          'interactionContext.sessionId': hoverData.sessionId,
          hoverEndTime: null,
        }).sort({ hoverStartTime: -1 });

        if (!hoverRecord) {
          console.log('🎯 Hover API: Active hover interaction not found for action');
          return NextResponse.json(
            { error: 'Active hover interaction not found' },
            { status: 404 }
          );
        }

        hoverRecord.actionsOnHover.push({
          actionType: hoverData.actionType,
          actionTimestamp: new Date(),
          actionData: hoverData.actionData || null,
        });

        await hoverRecord.save();
        console.log('🎯 Hover API: Hover action saved successfully');
        break;

      default:
        console.log('🎯 Hover API: Invalid action:', action);
        return NextResponse.json(
          { error: `Invalid action: ${action}. Must be one of: hover_start, hover_end, hover_action` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Hover ${action} tracked successfully`,
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
    
    // Log request context for debugging
    console.error('🎯 Hover API: Request context:', {
      timestamp: new Date().toISOString(),
      method: 'POST',
      endpoint: '/api/tracking/hover',
      hasRequestBody: !!requestBody,
      requestBodyKeys: requestBody ? Object.keys(requestBody) : []
    });
    
    // Enhanced error logging for different error types
    if (error?.name === 'ValidationError') {
      console.error('🎯 Hover API: MongoDB validation error details:');
      Object.keys(error.errors || {}).forEach(field => {
        const fieldError = error.errors[field];
        console.error(`  - Field "${field}":`, {
          message: fieldError.message,
          value: fieldError.value,
          kind: fieldError.kind,
          path: fieldError.path
        });
      });
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: Object.keys(error.errors || {}).map(field => ({
            field,
            message: error.errors[field].message
          }))
        },
        { status: 400 }
      );
    }
    
    if (error?.name === 'CastError') {
      console.error('🎯 Hover API: MongoDB cast error details:', {
        path: error.path,
        value: error.value,
        kind: error.kind,
        reason: error.reason
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid data type',
          details: `Field "${error.path}" expected ${error.kind} but received: ${error.value}`
        },
        { status: 400 }
      );
    }
    
    if (error?.name === 'MongoServerError') {
      console.error('🎯 Hover API: MongoDB server error:', {
        code: error.code,
        codeName: error.codeName
      });
    }
    
    // Generic server error response
    return NextResponse.json(
      { 
        error: 'Failed to track hover interaction',
        message: 'Internal server error occurred while processing hover tracking'
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve user hover interactions
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Hover API: Processing GET request');
    
    await connectDB();
    console.log('🎯 Hover API: Database connected for GET request');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetId = searchParams.get('targetId');
    const significantOnly = searchParams.get('significantOnly') === 'true';
    const minDuration = parseInt(searchParams.get('minDuration') || '0');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
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

    console.log('🎯 Hover API: Executing query with:', { query, limit, skip });

    const [hoverInteractions, totalCount] = await Promise.all([
      UserHoverInteraction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      UserHoverInteraction.countDocuments(query)
    ]);

    console.log('🎯 Hover API: Query results:', { 
      foundInteractions: hoverInteractions.length, 
      totalCount 
    });

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
    console.error('🎯 Hover API: Error in GET request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch hover interactions',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 