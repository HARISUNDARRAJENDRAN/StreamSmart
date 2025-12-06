import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUser } from '@/lib/dynamodb-service';
import { cache, generateCacheKey, CacheTTL } from '@/lib/cache';
import { getAuthenticatedUser } from '@/lib/auth-utils';

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, name, phoneNumber, bio, preferences } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify user can only update their own profile
    if (userId !== authResult.user.userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only modify your own profile.' },
        { status: 403 }
      );
    }

    try {
      // Find user
      const user = await findUserById(userId);
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: Record<string, string | number | boolean | Record<string, unknown>> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (bio !== undefined) updateData.bio = bio;
      if (preferences !== undefined) {
        updateData.preferences = { ...user.preferences, ...preferences };
      }

      // Update user
      const updatedUser = await updateUser(userId, updateData);

      // Invalidate cache
      await cache.invalidate(`user-profile:userId=${userId}`);

      return NextResponse.json({
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl,
          phoneNumber: updatedUser.phoneNumber,
          bio: updatedUser.bio,
          createdAt: updatedUser.createdAt,
          lastLoginDate: updatedUser.lastLoginDate,
          learningStreak: updatedUser.learningStreak,
          totalLearningTime: updatedUser.totalLearningTime,
          preferences: updatedUser.preferences,
        }
      });
    } catch (dbError) {
      console.error('DynamoDB operation error:', dbError);
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // If no userId specified, return authenticated user's profile
    const userId = requestedUserId || authResult.user.userId;

    // IDOR Protection: Verify user can only access their own profile
    if (userId !== authResult.user.userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only view your own profile.' },
        { status: 403 }
      );
    }

    // Check cache first
    const cacheKey = generateCacheKey('user-profile', { userId });
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    try {
      const user = await findUserById(userId);
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const response = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          createdAt: user.createdAt,
          lastLoginDate: user.lastLoginDate,
          learningStreak: user.learningStreak,
          totalLearningTime: user.totalLearningTime,
          preferences: user.preferences,
        }
      };

      // Cache the response
      await cache.set(cacheKey, response, CacheTTL.MEDIUM);

      return NextResponse.json(response);
    } catch (dbError) {
      console.error('DynamoDB query error:', dbError);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 