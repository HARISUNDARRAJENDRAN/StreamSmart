import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import User from '@/models/User';

// GET - Fetch user's activities
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const activities = await Activity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST - Record a new activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, item, type } = body;

    if (!userId || !action || !item || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const activity = new Activity({
      userId,
      action,
      item,
      type,
    });

    await activity.save();

    // Update user's learning streak
    await updateUserStreak(userId);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error recording activity:', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}

// Helper function to calculate and update user's learning streak
async function updateUserStreak(userId: string) {
  try {
    const activities = await Activity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(365); // Last year of activities

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group activities by date
    const activityDates = new Set();
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      date.setHours(0, 0, 0, 0);
      activityDates.add(date.getTime());
    });

    // Calculate streak
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      if (activityDates.has(checkDate.getTime())) {
        if (i === 0 || streak > 0) {
          streak++;
        }
      } else if (i === 0) {
        // No activity today, check yesterday
        continue;
      } else {
        // Gap in streak
        break;
      }
    }

    // Update user's streak
    await User.findByIdAndUpdate(userId, { learningStreak: streak });

    return streak;
  } catch (error) {
    console.error('Error updating user streak:', error);
    return 0;
  }
} 