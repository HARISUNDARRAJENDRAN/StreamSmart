import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserSearchHistory from '@/models/UserSearchHistory';

// POST: Track search behavior
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userId,
      action, // 'search', 'click_result', 'refine', 'abandon', 'complete'
      searchData
    } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let searchRecord;

    switch (action) {
      case 'search':
        // Create new search record
        if (!searchData.searchQuery) {
          return NextResponse.json(
            { error: 'Search query is required' },
            { status: 400 }
          );
        }

        searchRecord = new UserSearchHistory({
          userId,
          searchQuery: searchData.searchQuery,
          searchType: searchData.searchType || 'content',
          normalizedQuery: searchData.searchQuery.toLowerCase().trim(),
          queryLength: searchData.searchQuery.length,
          searchContext: {
            source: searchData.source || 'header_search',
            sessionId: searchData.sessionId,
            previousQuery: searchData.previousQuery,
            device: searchData.device || 'desktop',
            userAgent: searchData.userAgent,
          },
          resultsFound: searchData.resultsFound || 0,
          resultsDisplayed: searchData.resultsDisplayed || 0,
          noResultsFound: (searchData.resultsFound || 0) === 0,
          searchStartTime: new Date(),
          searchAbandoned: false,
          searchSuccessful: false,
          resultsScrollDepth: 0,
          clickedResults: [],
          searchRefinements: [],
        });
        
        await searchRecord.save();
        break;

      case 'click_result':
        // Update search record with result click
        searchRecord = await UserSearchHistory.findOne({
          userId,
          'searchContext.sessionId': searchData.sessionId,
          searchEndTime: null, // Find active search
        }).sort({ searchStartTime: -1 });

        if (!searchRecord) {
          return NextResponse.json(
            { error: 'Active search session not found' },
            { status: 404 }
          );
        }

        const clickTimestamp = new Date();
        
        // Add clicked result
        searchRecord.clickedResults.push({
          itemId: searchData.itemId,
          itemType: searchData.itemType,
          position: searchData.position,
          clickTimestamp,
        });

        // Update timing data
        if (!searchRecord.firstClickTime) {
          searchRecord.firstClickTime = clickTimestamp;
          searchRecord.timeToFirstClick = Math.round(
            (clickTimestamp.getTime() - searchRecord.searchStartTime.getTime()) / 1000
          );
        }

        searchRecord.searchSuccessful = true;
        await searchRecord.save();
        break;

      case 'refine':
        // Update search record with refinement
        searchRecord = await UserSearchHistory.findOne({
          userId,
          'searchContext.sessionId': searchData.sessionId,
          searchEndTime: null,
        }).sort({ searchStartTime: -1 });

        if (!searchRecord) {
          return NextResponse.json(
            { error: 'Active search session not found' },
            { status: 404 }
          );
        }

        searchRecord.searchRefinements.push({
          refinementType: searchData.refinementType,
          refinementValue: searchData.refinementValue,
          appliedAt: new Date(),
        });

        await searchRecord.save();
        break;

      case 'abandon':
      case 'complete':
        // End search session
        searchRecord = await UserSearchHistory.findOne({
          userId,
          'searchContext.sessionId': searchData.sessionId,
          searchEndTime: null,
        }).sort({ searchStartTime: -1 });

        if (!searchRecord) {
          return NextResponse.json(
            { error: 'Active search session not found' },
            { status: 404 }
          );
        }

        const endTime = new Date();
        searchRecord.searchEndTime = endTime;
        searchRecord.totalSearchDuration = Math.round(
          (endTime.getTime() - searchRecord.searchStartTime.getTime()) / 1000
        );

        if (action === 'abandon') {
          searchRecord.searchAbandoned = true;
          searchRecord.searchSuccessful = false;
        }

        if (searchData.resultsScrollDepth !== undefined) {
          searchRecord.resultsScrollDepth = searchData.resultsScrollDepth;
        }

        await searchRecord.save();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      searchRecord: {
        id: searchRecord._id,
        userId: searchRecord.userId,
        searchQuery: searchRecord.searchQuery,
        resultsFound: searchRecord.resultsFound,
        searchSuccessful: searchRecord.searchSuccessful,
        isActive: !searchRecord.searchEndTime,
      }
    });

  } catch (error) {
    console.error('Error tracking search history:', error);
    return NextResponse.json(
      { error: 'Failed to track search history' },
      { status: 500 }
    );
  }
}

// GET: Retrieve user search history
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');
    const successful = searchParams.get('successful');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const searchQuery: any = { userId, isActive: true };
    
    if (query) {
      searchQuery.normalizedQuery = { $regex: query.toLowerCase(), $options: 'i' };
    }
    
    if (successful !== null) {
      searchQuery.searchSuccessful = successful === 'true';
    }

    const skip = (page - 1) * limit;

    const [searchHistory, totalCount] = await Promise.all([
      UserSearchHistory.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      UserSearchHistory.countDocuments(searchQuery)
    ]);

    return NextResponse.json({
      success: true,
      data: searchHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search history' },
      { status: 500 }
    );
  }
} 