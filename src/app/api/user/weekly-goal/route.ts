import { NextRequest, NextResponse } from 'next/server';
import { updateUser, findUserById } from '@/lib/dynamodb-service';

export async function PUT(request: NextRequest) {
  try {
    const { userId, weeklyGoal } = await request.json();

    if (!userId || weeklyGoal === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (weeklyGoal < 1 || weeklyGoal > 100) {
      return NextResponse.json({ error: 'Weekly goal must be between 1 and 100' }, { status: 400 });
    }

    try {
      const updatedUser = await updateUser(userId, { weeklyGoal });

      if (!updatedUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      return NextResponse.json({ user: userWithoutPassword });
    } catch (dbError) {
      console.error('DynamoDB operation error:', dbError);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Weekly goal update error:', error);
    return NextResponse.json({ error: 'Failed to update weekly goal' }, { status: 500 });
  }
} 