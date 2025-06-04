import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserNavigationHistory from '@/models/UserNavigationHistory';

// POST: Track navigation behavior
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userId,
      action, // 'page_visit', 'page_leave', 'click', 'scroll', 'category_explore'
      navigationData
    } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let navigationRecord;

    switch (action) {
      case 'page_visit':
        // Create new page visit record
        if (!navigationData.pageUrl || !navigationData.pagePath) {
          return NextResponse.json(
            { error: 'Page URL and path are required' },
            { status: 400 }
          );
        }

        navigationRecord = new UserNavigationHistory({
          userId,
          pageUrl: navigationData.pageUrl,
          pagePath: navigationData.pagePath,
          pageTitle: navigationData.pageTitle || '',
          pageType: navigationData.pageType || 'other',
          navigationContext: {
            sessionId: navigationData.sessionId,
            referrerUrl: navigationData.referrerUrl,
            referrerType: navigationData.referrerType || 'direct',
            entryPoint: navigationData.entryPoint || 'homepage',
            device: navigationData.device || 'desktop',
            viewport: {
              width: navigationData.viewport?.width || 1920,
              height: navigationData.viewport?.height || 1080,
            },
            userAgent: navigationData.userAgent,
          },
          visitStartTime: new Date(),
          scrollDepth: 0,
          scrollEvents: 0,
          clickEvents: [],
          contentInteractions: [],
          categoryExploration: [],
          previousPage: navigationData.previousPage,
          isBouncePage: false,
          pageLoadTime: navigationData.pageLoadTime,
          navigationSpeed: navigationData.navigationSpeed || 0,
        });
        
        await navigationRecord.save();
        break;

      case 'page_leave':
        // Update page visit record with exit data
        navigationRecord = await UserNavigationHistory.findOne({
          userId,
          'navigationContext.sessionId': navigationData.sessionId,
          pagePath: navigationData.pagePath,
          visitEndTime: null, // Find active page visit
        }).sort({ visitStartTime: -1 });

        if (!navigationRecord) {
          return NextResponse.json(
            { error: 'Active page visit not found' },
            { status: 404 }
          );
        }

        const endTime = new Date();
        navigationRecord.visitEndTime = endTime;
        navigationRecord.timeOnPage = Math.round(
          (endTime.getTime() - navigationRecord.visitStartTime.getTime()) / 1000
        );
        navigationRecord.nextPage = navigationData.nextPage;
        navigationRecord.exitAction = navigationData.exitAction || 'navigation';
        navigationRecord.isBouncePage = navigationData.isBouncePage || false;

        // Update final scroll depth if provided
        if (navigationData.scrollDepth !== undefined) {
          navigationRecord.scrollDepth = navigationData.scrollDepth;
        }

        await navigationRecord.save();
        break;

      case 'click':
        // Add click event to active page visit
        navigationRecord = await UserNavigationHistory.findOne({
          userId,
          'navigationContext.sessionId': navigationData.sessionId,
          visitEndTime: null,
        }).sort({ visitStartTime: -1 });

        if (!navigationRecord) {
          return NextResponse.json(
            { error: 'Active page visit not found' },
            { status: 404 }
          );
        }

        navigationRecord.clickEvents.push({
          elementType: navigationData.elementType,
          elementId: navigationData.elementId,
          elementText: navigationData.elementText,
          clickTimestamp: new Date(),
          coordinates: {
            x: navigationData.coordinates?.x || 0,
            y: navigationData.coordinates?.y || 0,
          },
        });

        await navigationRecord.save();
        break;

      case 'scroll':
        // Update scroll data for active page visit
        navigationRecord = await UserNavigationHistory.findOne({
          userId,
          'navigationContext.sessionId': navigationData.sessionId,
          visitEndTime: null,
        }).sort({ visitStartTime: -1 });

        if (!navigationRecord) {
          return NextResponse.json(
            { error: 'Active page visit not found' },
            { status: 404 }
          );
        }

        navigationRecord.scrollDepth = Math.max(
          navigationRecord.scrollDepth,
          navigationData.scrollDepth || 0
        );
        navigationRecord.scrollEvents += 1;

        await navigationRecord.save();
        break;

      case 'content_interaction':
        // Add content interaction to active page visit
        navigationRecord = await UserNavigationHistory.findOne({
          userId,
          'navigationContext.sessionId': navigationData.sessionId,
          visitEndTime: null,
        }).sort({ visitStartTime: -1 });

        if (!navigationRecord) {
          return NextResponse.json(
            { error: 'Active page visit not found' },
            { status: 404 }
          );
        }

        navigationRecord.contentInteractions.push({
          interactionType: navigationData.interactionType,
          targetId: navigationData.targetId,
          targetType: navigationData.targetType,
          duration: navigationData.duration,
          timestamp: new Date(),
        });

        await navigationRecord.save();
        break;

      case 'category_explore':
        // Add category exploration data
        navigationRecord = await UserNavigationHistory.findOne({
          userId,
          'navigationContext.sessionId': navigationData.sessionId,
          visitEndTime: null,
        }).sort({ visitStartTime: -1 });

        if (!navigationRecord) {
          return NextResponse.json(
            { error: 'Active page visit not found' },
            { status: 404 }
          );
        }

        navigationRecord.categoryExploration.push({
          categoryId: navigationData.categoryId,
          categoryName: navigationData.categoryName,
          timeSpent: navigationData.timeSpent || 0,
          itemsViewed: navigationData.itemsViewed || 0,
          timestamp: new Date(),
        });

        await navigationRecord.save();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      navigationRecord: {
        id: navigationRecord._id,
        userId: navigationRecord.userId,
        pagePath: navigationRecord.pagePath,
        pageType: navigationRecord.pageType,
        timeOnPage: navigationRecord.timeOnPage,
        isActive: !navigationRecord.visitEndTime,
      }
    });

  } catch (error) {
    console.error('Error tracking navigation:', error);
    return NextResponse.json(
      { error: 'Failed to track navigation' },
      { status: 500 }
    );
  }
}

// GET: Retrieve user navigation history
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageType = searchParams.get('pageType');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const query: any = { userId, isActive: true };
    
    if (pageType) {
      query.pageType = pageType;
    }
    
    if (sessionId) {
      query['navigationContext.sessionId'] = sessionId;
    }

    const skip = (page - 1) * limit;

    const [navigationHistory, totalCount] = await Promise.all([
      UserNavigationHistory.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      UserNavigationHistory.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: navigationHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching navigation history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch navigation history' },
      { status: 500 }
    );
  }
} 