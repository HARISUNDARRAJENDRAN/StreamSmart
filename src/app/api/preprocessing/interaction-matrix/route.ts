import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { dataPreprocessingService } from '@/services/dataPreprocessingService';
import User from '@/models/User';

// POST: Create user-item interaction matrix for collaborative filtering
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const {
      userIds,
      itemIds,
      matrixType = 'dense', // 'dense' or 'sparse'
      minInteractions = 3,
      includeImplicit = true,
      timeWindow
    } = await request.json();

    // Auto-discover users and items if not provided
    let finalUserIds = userIds;
    let finalItemIds = itemIds;

    if (!finalUserIds) {
      // Get active users with minimum interaction count
      const users = await User.find({ isActive: true }).select('_id').lean();
      finalUserIds = users.map(u => u._id.toString());
    }

    if (!finalItemIds) {
      // Get unique item IDs from viewing history
      const pipeline = [
        { $match: { isActive: true } },
        { $group: { _id: '$itemId' } },
        { $limit: 1000 } // Limit for performance
      ];
      
      const items = await mongoose.connection.db
        .collection('userviewinghistories')
        .aggregate(pipeline)
        .toArray();
      
      finalItemIds = items.map(item => item._id);
    }

    console.log(`Creating interaction matrix for ${finalUserIds.length} users and ${finalItemIds.length} items`);

    // Create interaction matrix
    const interactions = await dataPreprocessingService.createInteractionMatrix(
      finalUserIds,
      finalItemIds
    );

    // Filter by minimum interactions if specified
    const userInteractionCounts = new Map<string, number>();
    interactions.forEach(interaction => {
      const current = userInteractionCounts.get(interaction.userId) || 0;
      userInteractionCounts.set(interaction.userId, current + 1);
    });

    const filteredInteractions = interactions.filter(interaction => {
      const userCount = userInteractionCounts.get(interaction.userId) || 0;
      return userCount >= minInteractions;
    });

    // Convert to requested matrix format
    let matrixData;
    let metadata;

    if (matrixType === 'dense') {
      const result = createDenseMatrix(filteredInteractions, finalUserIds, finalItemIds);
      matrixData = result.matrix;
      metadata = result.metadata;
    } else {
      const result = createSparseMatrix(filteredInteractions);
      matrixData = result.sparseEntries;
      metadata = result.metadata;
    }

    // Calculate matrix statistics
    const stats = calculateMatrixStatistics(filteredInteractions, finalUserIds, finalItemIds);

    return NextResponse.json({
      success: true,
      data: {
        matrix: matrixData,
        interactions: filteredInteractions,
        format: matrixType
      },
      metadata: {
        ...metadata,
        userCount: finalUserIds.length,
        itemCount: finalItemIds.length,
        totalInteractions: filteredInteractions.length,
        originalInteractions: interactions.length,
        filteredOutUsers: interactions.length - filteredInteractions.length,
        processedAt: new Date().toISOString(),
        parameters: {
          matrixType,
          minInteractions,
          includeImplicit,
          timeWindow
        }
      },
      statistics: stats
    });

  } catch (error) {
    console.error('Error creating interaction matrix:', error);
    return NextResponse.json(
      { error: 'Failed to create interaction matrix' },
      { status: 500 }
    );
  }
}

// Helper function to create dense matrix (users × items)
function createDenseMatrix(interactions: any[], userIds: string[], itemIds: string[]) {
  const userIndexMap = new Map<string, number>();
  const itemIndexMap = new Map<string, number>();
  
  // Create index mappings
  userIds.forEach((userId, index) => {
    userIndexMap.set(userId, index);
  });
  
  itemIds.forEach((itemId, index) => {
    itemIndexMap.set(itemId, index);
  });

  // Initialize matrix with zeros
  const matrix: number[][] = Array(userIds.length)
    .fill(null)
    .map(() => Array(itemIds.length).fill(0));

  // Fill matrix with ratings
  interactions.forEach(interaction => {
    const userIndex = userIndexMap.get(interaction.userId);
    const itemIndex = itemIndexMap.get(interaction.itemId);
    
    if (userIndex !== undefined && itemIndex !== undefined) {
      // Use explicit rating if available, otherwise use implicit rating
      const rating = interaction.explicitRating || interaction.implicitRating;
      matrix[userIndex][itemIndex] = rating;
    }
  });

  return {
    matrix,
    metadata: {
      userIndexMap: Object.fromEntries(userIndexMap),
      itemIndexMap: Object.fromEntries(itemIndexMap),
      shape: [userIds.length, itemIds.length]
    }
  };
}

// Helper function to create sparse matrix representation
function createSparseMatrix(interactions: any[]) {
  const sparseEntries = interactions.map(interaction => ({
    userId: interaction.userId,
    itemId: interaction.itemId,
    rating: interaction.explicitRating || interaction.implicitRating,
    confidence: interaction.confidenceScore,
    isExplicit: !!interaction.explicitRating,
    recency: interaction.interactionRecency,
    context: interaction.contextSource
  }));

  return {
    sparseEntries,
    metadata: {
      format: 'coordinate_list',
      entryCount: sparseEntries.length
    }
  };
}

// Calculate various statistics about the interaction matrix
function calculateMatrixStatistics(interactions: any[], userIds: string[], itemIds: string[]) {
  const totalCells = userIds.length * itemIds.length;
  const filledCells = interactions.length;
  const sparsity = ((totalCells - filledCells) / totalCells) * 100;

  // User interaction distribution
  const userInteractionCounts = new Map<string, number>();
  interactions.forEach(interaction => {
    const current = userInteractionCounts.get(interaction.userId) || 0;
    userInteractionCounts.set(interaction.userId, current + 1);
  });

  const interactionCounts = Array.from(userInteractionCounts.values());
  const avgInteractionsPerUser = interactionCounts.length > 0 ? 
    interactionCounts.reduce((sum, count) => sum + count, 0) / interactionCounts.length : 0;

  // Item popularity distribution  
  const itemInteractionCounts = new Map<string, number>();
  interactions.forEach(interaction => {
    const current = itemInteractionCounts.get(interaction.itemId) || 0;
    itemInteractionCounts.set(interaction.itemId, current + 1);
  });

  const itemCounts = Array.from(itemInteractionCounts.values());
  const avgInteractionsPerItem = itemCounts.length > 0 ?
    itemCounts.reduce((sum, count) => sum + count, 0) / itemCounts.length : 0;

  // Rating distribution
  const explicitRatings = interactions
    .filter(i => i.explicitRating)
    .map(i => i.explicitRating);
  
  const implicitRatings = interactions
    .map(i => i.implicitRating)
    .filter(rating => rating > 0);

  return {
    sparsity: Math.round(sparsity * 100) / 100,
    density: Math.round((100 - sparsity) * 100) / 100,
    avgInteractionsPerUser: Math.round(avgInteractionsPerUser * 100) / 100,
    avgInteractionsPerItem: Math.round(avgInteractionsPerItem * 100) / 100,
    usersWith1Interaction: interactionCounts.filter(count => count === 1).length,
    usersWith5PlusInteractions: interactionCounts.filter(count => count >= 5).length,
    itemsWith1Interaction: itemCounts.filter(count => count === 1).length,
    itemsWith5PlusInteractions: itemCounts.filter(count => count >= 5).length,
    explicitRatingsCount: explicitRatings.length,
    implicitRatingsCount: implicitRatings.length,
    explicitRatingRange: explicitRatings.length > 0 ? {
      min: Math.min(...explicitRatings),
      max: Math.max(...explicitRatings),
      avg: Math.round((explicitRatings.reduce((sum, r) => sum + r, 0) / explicitRatings.length) * 100) / 100
    } : null,
    implicitRatingRange: implicitRatings.length > 0 ? {
      min: Math.round(Math.min(...implicitRatings) * 100) / 100,
      max: Math.round(Math.max(...implicitRatings) * 100) / 100,
      avg: Math.round((implicitRatings.reduce((sum, r) => sum + r, 0) / implicitRatings.length) * 100) / 100
    } : null
  };
}

// GET: Get matrix metadata and statistics without the full matrix
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const sampleSize = parseInt(searchParams.get('sampleSize') || '100');

    // Get sample of users and items for quick statistics
    const users = await User.find({ isActive: true })
      .select('_id')
      .limit(sampleSize)
      .lean();
    
    const userIds = users.map(u => u._id.toString());
    
    // Get sample interactions for statistics
    const sampleInteractions = await dataPreprocessingService.createInteractionMatrix(
      userIds.slice(0, Math.min(20, userIds.length)), // Small sample for quick stats
      [] // Auto-discover items
    );

    const quickStats = {
      sampleUserCount: userIds.length,
      sampleInteractionCount: sampleInteractions.length,
      estimatedTotalUsers: users.length,
      dataQuality: {
        usersWithInteractions: sampleInteractions.length > 0 ? 
          new Set(sampleInteractions.map(i => i.userId)).size : 0,
        avgConfidenceScore: sampleInteractions.length > 0 ?
          sampleInteractions.reduce((sum, i) => sum + i.confidenceScore, 0) / sampleInteractions.length : 0,
        explicitImplicitRatio: sampleInteractions.length > 0 ?
          sampleInteractions.filter(i => i.explicitRating).length / sampleInteractions.length : 0
      }
    };

    return NextResponse.json({
      success: true,
      data: quickStats,
      recommendations: {
        minInteractions: quickStats.dataQuality.avgConfidenceScore > 0.7 ? 3 : 5,
        matrixType: sampleInteractions.length > 10000 ? 'sparse' : 'dense',
        includeImplicit: quickStats.dataQuality.explicitImplicitRatio < 0.3
      }
    });

  } catch (error) {
    console.error('Error getting matrix metadata:', error);
    return NextResponse.json(
      { error: 'Failed to get matrix metadata' },
      { status: 500 }
    );
  }
} 