import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function PUT(request: NextRequest) {
  try {
    const { userId, weeklyGoal } = await request.json();

    if (!userId || weeklyGoal === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (weeklyGoal < 1 || weeklyGoal > 100) {
      return NextResponse.json({ error: 'Weekly goal must be between 1 and 100' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      userId,
      { weeklyGoal },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Weekly goal update error:', error);
    return NextResponse.json({ error: 'Failed to update weekly goal' }, { status: 500 });
  }
} 