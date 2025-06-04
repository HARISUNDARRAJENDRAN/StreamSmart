import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { dataPreprocessingService } from '@/services/dataPreprocessingService';

// POST: Process user features for recommendation algorithms
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userIds,
      batchSize = 50,
      timeWindow
    } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Validate time window if provided
    let parsedTimeWindow;
    if (timeWindow) {
      parsedTimeWindow = {
        start: new Date(timeWindow.start),
        end: new Date(timeWindow.end)
      };
    }

    // Process users in batches
    const processedFeatures = await dataPreprocessingService.preprocessUsersInBatch(
      userIds, 
      batchSize
    );

    // Calculate some basic statistics
    const stats = {
      totalUsers: userIds.length,
      processedUsers: processedFeatures.length,
      successRate: (processedFeatures.length / userIds.length) * 100,
      userTypeDistribution: calculateUserTypeDistribution(processedFeatures),
      engagementDistribution: calculateEngagementDistribution(processedFeatures),
      averageMetrics: calculateAverageMetrics(processedFeatures)
    };

    return NextResponse.json({
      success: true,
      data: processedFeatures,
      stats,
      processingInfo: {
        batchSize,
        timeWindow: parsedTimeWindow,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing user features:', error);
    return NextResponse.json(
      { error: 'Failed to process user features' },
      { status: 500 }
    );
  }
}

// GET: Get processed features for a single user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Extract user data
    const userData = await dataPreprocessingService.extractUserData(userId);
    
    // Process features
    const userFeatures = await dataPreprocessingService.engineerUserFeatures({
      userId,
      ...userData
    });

    return NextResponse.json({
      success: true,
      data: userFeatures,
      metadata: {
        processedAt: new Date().toISOString(),
        dataFreshness: calculateDataFreshness(userData)
      }
    });

  } catch (error) {
    console.error('Error processing single user features:', error);
    return NextResponse.json(
      { error: 'Failed to process user features' },
      { status: 500 }
    );
  }
}

// Helper functions for statistics
function calculateUserTypeDistribution(features: any[]) {
  const distribution: Record<string, number> = {};
  
  features.forEach(feature => {
    distribution[feature.userType] = (distribution[feature.userType] || 0) + 1;
  });
  
  // Convert to percentages
  const total = features.length;
  Object.keys(distribution).forEach(key => {
    distribution[key] = Math.round((distribution[key] / total) * 100);
  });
  
  return distribution;
}

function calculateEngagementDistribution(features: any[]) {
  const distribution: Record<string, number> = {};
  
  features.forEach(feature => {
    distribution[feature.engagementLevel] = (distribution[feature.engagementLevel] || 0) + 1;
  });
  
  // Convert to percentages
  const total = features.length;
  Object.keys(distribution).forEach(key => {
    distribution[key] = Math.round((distribution[key] / total) * 100);
  });
  
  return distribution;
}

function calculateAverageMetrics(features: any[]) {
  if (features.length === 0) return {};
  
  const totals = features.reduce((acc, feature) => {
    return {
      avgRating: acc.avgRating + feature.avgRating,
      avgCompletionRate: acc.avgCompletionRate + feature.avgCompletionRate,
      bingeTendency: acc.bingeTendency + feature.bingeTendency,
      contentDiversity: acc.contentDiversity + feature.contentDiversity,
      searchFrequency: acc.searchFrequency + feature.searchFrequency,
      hoverEngagement: acc.hoverEngagement + feature.hoverEngagement
    };
  }, {
    avgRating: 0,
    avgCompletionRate: 0,
    bingeTendency: 0,
    contentDiversity: 0,
    searchFrequency: 0,
    hoverEngagement: 0
  });
  
  const count = features.length;
  return {
    avgRating: Math.round((totals.avgRating / count) * 100) / 100,
    avgCompletionRate: Math.round((totals.avgCompletionRate / count) * 100) / 100,
    bingeTendency: Math.round((totals.bingeTendency / count) * 100) / 100,
    contentDiversity: Math.round((totals.contentDiversity / count) * 100) / 100,
    searchFrequency: Math.round((totals.searchFrequency / count) * 100) / 100,
    hoverEngagement: Math.round((totals.hoverEngagement / count) * 100) / 100
  };
}

function calculateDataFreshness(userData: any) {
  const now = new Date();
  
  const latestTimestamps = [
    userData.viewingHistory[0]?.createdAt,
    userData.searchHistory[0]?.createdAt,
    userData.feedback[0]?.createdAt
  ].filter(Boolean).map(ts => new Date(ts));
  
  if (latestTimestamps.length === 0) return 'no_data';
  
  const mostRecent = new Date(Math.max(...latestTimestamps.map(d => d.getTime())));
  const daysSinceLastActivity = (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastActivity < 1) return 'very_fresh';
  if (daysSinceLastActivity < 7) return 'fresh';
  if (daysSinceLastActivity < 30) return 'moderate';
  return 'stale';
} 