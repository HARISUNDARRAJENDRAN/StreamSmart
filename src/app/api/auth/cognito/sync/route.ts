import { NextRequest, NextResponse } from 'next/server';
import { 
  createUser, 
  findUserByEmail, 
  findUserByCognitoId,
  updateUser,
  type DynamoDBUser 
} from '@/lib/dynamodb-service-server';

// POST - Sync Cognito user with DynamoDB
export async function POST(request: NextRequest) {
  try {
    const { cognitoUserId, email, name, attributes } = await request.json();

    if (!cognitoUserId || !email) {
      return NextResponse.json(
        { error: 'Cognito user ID and email are required' },
        { status: 400 }
      );
    }

    // Check if user exists by cognitoId first, then by email
    let user = await findUserByCognitoId(cognitoUserId);
    
    if (!user) {
      user = await findUserByEmail(email);
    }

    if (!user) {
      // Create new user in DynamoDB
      try {
        user = await createUser({
          name: name || attributes?.name || email.split('@')[0],
          email: email,
          avatarUrl: attributes?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
          phoneNumber: attributes?.phone_number || '',
          bio: '',
          authProvider: 'cognito',
          cognitoId: cognitoUserId,
        });

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            phoneNumber: user.phoneNumber,
            bio: user.bio,
            createdAt: user.createdAt,
            lastLoginDate: user.lastLoginDate,
            learningStreak: user.learningStreak,
            totalLearningTime: user.totalLearningTime,
            weeklyGoal: user.weeklyGoal,
            preferences: user.preferences,
          },
        }, { status: 201 });
      } catch (createError) {
        console.error('Error creating user in DynamoDB:', createError);
        return NextResponse.json(
          { error: 'Failed to create user in database' },
          { status: 500 }
        );
      }
    }

    // Update existing user - update last login and cognitoId if needed
    try {
      const updates: Partial<DynamoDBUser> = {
        lastLoginDate: Date.now(),
      };

      // Update cognitoId if it's missing or different
      if (!user.cognitoId || user.cognitoId !== cognitoUserId) {
        updates.cognitoId = cognitoUserId;
      }

      user = await updateUser(user.id, updates);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          createdAt: user.createdAt,
          lastLoginDate: user.lastLoginDate,
          learningStreak: user.learningStreak,
          totalLearningTime: user.totalLearningTime,
          weeklyGoal: user.weeklyGoal,
          preferences: user.preferences,
        },
      });
    } catch (updateError) {
      console.error('Error updating user in DynamoDB:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cognito sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error during user sync' },
      { status: 500 }
    );
  }
}
