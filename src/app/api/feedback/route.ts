import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import UserFeedback from '@/models/UserFeedback';

// POST - Submit user feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      itemId,
      itemType,
      feedbackType,
      rating,
      reviewText,
      reviewTitle,
      recommendationContext
    } = body;

    // Validation
    if (!userId || !itemId || !itemType || !feedbackType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, itemId, itemType, feedbackType' },
        { status: 400 }
      );
    }

    // Validate feedback type specific data
    if (feedbackType === 'rating' && (rating === undefined || rating < 0 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 0 and 5' },
        { status: 400 }
      );
    }

    if (feedbackType === 'review' && !reviewText) {
      return NextResponse.json(
        { error: 'Review text is required for review feedback' },
        { status: 400 }
      );
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if feedback already exists and update or create new
    const existingFeedback = await UserFeedback.findOne({
      userId,
      itemId,
      feedbackType,
      isActive: true
    });

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.rating = rating;
      existingFeedback.reviewText = reviewText;
      existingFeedback.reviewTitle = reviewTitle;
      existingFeedback.recommendationContext = recommendationContext;
      existingFeedback.updatedAt = new Date();
      
      feedback = await existingFeedback.save();
    } else {
      // Create new feedback
      feedback = new UserFeedback({
        userId,
        itemId,
        itemType,
        feedbackType,
        rating,
        reviewText,
        reviewTitle,
        recommendationContext: recommendationContext || {
          source: 'unknown',
          algorithm: 'unknown',
          position: 0
        }
      });

      await feedback.save();
    }

    return NextResponse.json({ 
      success: true, 
      feedback: {
        id: feedback._id,
        feedbackType: feedback.feedbackType,
        rating: feedback.rating,
        reviewText: feedback.reviewText,
        reviewTitle: feedback.reviewTitle,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// GET - Retrieve user feedback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const itemId = searchParams.get('itemId');
    const feedbackType = searchParams.get('feedbackType');
    const limit = parseInt(searchParams.get('limit') || '50');

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
    if (itemId) query.itemId = itemId;
    if (feedbackType) query.feedbackType = feedbackType;

    const feedback = await UserFeedback.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('Error retrieving feedback:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    );
  }
}

// DELETE - Remove feedback (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('feedbackId');
    const userId = searchParams.get('userId');

    if (!feedbackId || !userId) {
      return NextResponse.json(
        { error: 'Feedback ID and User ID are required' },
        { status: 400 }
      );
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const feedback = await UserFeedback.findOneAndUpdate(
      { _id: feedbackId, userId },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Feedback removed' });

  } catch (error) {
    console.error('Error removing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to remove feedback' },
      { status: 500 }
    );
  }
} 