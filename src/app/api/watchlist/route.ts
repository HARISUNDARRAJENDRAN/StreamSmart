import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import UserWatchlist from '@/models/UserWatchlist';
import mongoose from 'mongoose';

// POST - Add item to watchlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 [API POST /watchlist] Received body:', JSON.stringify(body, null, 2));
    
    const {
      userId,
      itemId,
      itemType,
      itemDetails,
      addedFrom,
      priority,
      notes
    } = body;

    console.log('🔍 [API POST /watchlist] Extracted fields:', {
      userId,
      itemId,
      itemType,
      itemDetails,
      addedFrom,
      priority,
      notes
    });

    // Validation
    if (!userId || !itemId || !itemType || !itemDetails) {
      console.log('❌ [API POST /watchlist] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: userId, itemId, itemType, itemDetails' },
        { status: 400 }
      );
    }

    if (!itemDetails.title || !itemDetails.thumbnail) {
      console.log('❌ [API POST /watchlist] Missing itemDetails fields');
      return NextResponse.json(
        { error: 'Item details must include title and thumbnail' },
        { status: 400 }
      );
    }

    console.log('✅ [API POST /watchlist] Validation passed');

    try {
      await connectToDatabase();
      console.log('✅ [API POST /watchlist] Database connected');
    } catch (dbError) {
      console.error('❌ [API POST /watchlist] MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if item already exists in watchlist (including soft-deleted items)
    console.log('🔍 [API POST /watchlist] Checking for existing item...');
    const existingItem = await UserWatchlist.findOne({
      userId,
      itemId
    }); // Note: removed isActive filter to check both active and inactive items

    if (existingItem) {
      if (existingItem.isActive) {
        console.log('⚠️ [API POST /watchlist] Item already exists in active watchlist');
        return NextResponse.json(
          { error: 'Item already exists in watchlist' },
          { status: 409 }
        );
      } else {
        // Item was soft-deleted, reactivate it
        console.log('🔄 [API POST /watchlist] Item was soft-deleted, reactivating...');
        
        // Update the existing item with new data and reactivate
        existingItem.isActive = true;
        existingItem.itemDetails = itemDetails; // Update with potentially new details
        existingItem.addedFrom = addedFrom || 'unknown';
        existingItem.priority = priority || 3;
        existingItem.notes = notes || null;
        existingItem.status = 'want_to_watch'; // Reset status
        existingItem.completionPercentage = 0; // Reset progress
        existingItem.watchedAt = null; // Reset watch date
        existingItem.updatedAt = new Date();

        await existingItem.save();
        console.log('✅ [API POST /watchlist] Item reactivated successfully');

        const responseData = {
          success: true,
          watchlistItem: {
            id: existingItem._id,
            itemId: existingItem.itemId,
            itemType: existingItem.itemType,
            itemDetails: existingItem.itemDetails,
            status: existingItem.status,
            priority: existingItem.priority,
            createdAt: existingItem.createdAt
          }
        };

        console.log('📤 [API POST /watchlist] Sending reactivation response:', JSON.stringify(responseData, null, 2));
        return NextResponse.json(responseData);
      }
    }

    console.log('✅ [API POST /watchlist] No existing item found, creating new one...');

    // Create new watchlist item
    const watchlistItem = new UserWatchlist({
      userId,
      itemId,
      itemType,
      itemDetails,
      addedFrom: addedFrom || 'unknown',
      priority: priority || 3,
      notes: notes || null
    });

    console.log('💾 [API POST /watchlist] About to save watchlist item:', JSON.stringify({
      userId: watchlistItem.userId,
      itemId: watchlistItem.itemId,
      itemType: watchlistItem.itemType,
      itemDetails: watchlistItem.itemDetails,
      addedFrom: watchlistItem.addedFrom,
      priority: watchlistItem.priority
    }, null, 2));

    await watchlistItem.save();
    console.log('✅ [API POST /watchlist] Watchlist item saved successfully');

    const responseData = {
      success: true,
      watchlistItem: {
        id: watchlistItem._id,
        itemId: watchlistItem.itemId,
        itemType: watchlistItem.itemType,
        itemDetails: watchlistItem.itemDetails,
        status: watchlistItem.status,
        priority: watchlistItem.priority,
        createdAt: watchlistItem.createdAt
      }
    };

    console.log('📤 [API POST /watchlist] Sending response:', JSON.stringify(responseData, null, 2));
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ [API POST /watchlist] Error adding to watchlist:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('❌ [API POST /watchlist] Error name:', error.name);
      console.error('❌ [API POST /watchlist] Error message:', error.message);
      console.error('❌ [API POST /watchlist] Error stack:', error.stack);
    }
    
    // Check for MongoDB duplicate key error
    if ((error as any).code === 11000) {
      console.error('❌ [API POST /watchlist] MongoDB duplicate key error');
      return NextResponse.json(
        { error: 'Item already exists in watchlist (duplicate key)' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add item to watchlist' },
      { status: 500 }
    );
  }
}

// GET - Retrieve user's watchlist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const itemType = searchParams.get('itemType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Build query
    const query: any = { userId, isActive: true };
    if (status) query.status = status;
    if (itemType) query.itemType = itemType;

    // Build sort options
    const sortOptions: any = {};
    if (sortBy === 'priority') {
      sortOptions.priority = sortOrder === 'asc' ? 1 : -1;
      sortOptions.createdAt = -1; // Secondary sort
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const watchlistItems = await UserWatchlist.find(query)
      .sort(sortOptions)
      .limit(limit);

    // Map MongoDB documents to have consistent id field
    const formattedItems = watchlistItems.map(item => ({
      id: item._id.toString(),
      itemId: item.itemId,
      itemType: item.itemType,
      itemDetails: item.itemDetails,
      addedFrom: item.addedFrom,
      priority: item.priority,
      notes: item.notes,
      status: item.status,
      completionPercentage: item.completionPercentage,
      watchedAt: item.watchedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isActive: item.isActive
    }));

    return NextResponse.json({ watchlistItems: formattedItems });

  } catch (error) {
    console.error('Error retrieving watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve watchlist' },
      { status: 500 }
    );
  }
}

// PUT - Update watchlist item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      watchlistId,
      userId,
      status,
      priority,
      notes,
      completionPercentage,
      watchedAt
    } = body;

    if (!watchlistId || !userId) {
      return NextResponse.json(
        { error: 'Watchlist ID and User ID are required' },
        { status: 400 }
      );
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Build update object
    const updateData: any = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (completionPercentage !== undefined) updateData.completionPercentage = completionPercentage;
    if (watchedAt !== undefined) updateData.watchedAt = watchedAt;

    // Convert string ID to ObjectId if needed
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(watchlistId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid watchlist ID format' },
        { status: 400 }
      );
    }

    const watchlistItem = await UserWatchlist.findOneAndUpdate(
      { _id: objectId, userId },
      updateData,
      { new: true }
    );

    if (!watchlistItem) {
      return NextResponse.json(
        { error: 'Watchlist item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      watchlistItem: {
        id: watchlistItem._id,
        status: watchlistItem.status,
        priority: watchlistItem.priority,
        notes: watchlistItem.notes,
        completionPercentage: watchlistItem.completionPercentage,
        updatedAt: watchlistItem.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating watchlist item:', error);
    return NextResponse.json(
      { error: 'Failed to update watchlist item' },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from watchlist (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const watchlistId = searchParams.get('watchlistId');
    const userId = searchParams.get('userId');

    console.log('DELETE watchlist request:', { watchlistId, userId, url: request.url });

    if (!watchlistId || !userId) {
      console.log('Missing required parameters:', { watchlistId, userId });
      return NextResponse.json(
        { error: 'Watchlist ID and User ID are required' },
        { status: 400 }
      );
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('Attempting to find and update watchlist item:', { watchlistId, userId });

    // Convert string ID to ObjectId if needed
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(watchlistId);
    } catch (error) {
      console.log('Invalid ObjectId format:', watchlistId);
      return NextResponse.json(
        { error: 'Invalid watchlist ID format' },
        { status: 400 }
      );
    }

    const watchlistItem = await UserWatchlist.findOneAndUpdate(
      { _id: objectId, userId },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    console.log('Database update result:', { found: !!watchlistItem, watchlistItem: watchlistItem ? 'found' : 'not found' });

    if (!watchlistItem) {
      console.log('Watchlist item not found for:', { watchlistId, userId });
      return NextResponse.json(
        { error: 'Watchlist item not found' },
        { status: 404 }
      );
    }

    console.log('Successfully removed watchlist item:', watchlistId);
    return NextResponse.json({ success: true, message: 'Item removed from watchlist' });

  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from watchlist' },
      { status: 500 }
    );
  }
} 