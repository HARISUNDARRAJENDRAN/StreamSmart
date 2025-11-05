import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, updateUser } from '@/lib/dynamodb-service-server';

// PUT - Update user profile for Cognito authenticated users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, phoneNumber, bio, avatarUrl } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await findUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const updatedUser = await updateUser(user.id, updates);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        createdAt: updatedUser.createdAt,
        lastLoginDate: updatedUser.lastLoginDate,
        learningStreak: updatedUser.learningStreak,
        totalLearningTime: updatedUser.totalLearningTime,
        weeklyGoal: updatedUser.weeklyGoal,
        preferences: updatedUser.preferences,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
