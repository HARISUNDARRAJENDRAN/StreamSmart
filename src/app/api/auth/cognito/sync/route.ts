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

    console.log('[COGNITO-SYNC] Starting sync:', { cognitoUserId, email, name });

    if (!cognitoUserId || !email) {
      console.log('[COGNITO-SYNC] Missing required fields');
      return NextResponse.json(
        { error: 'Cognito user ID and email are required' },
        { status: 400 }
      );
    }

    // Check if user exists by cognitoId first, then by email
    console.log('[COGNITO-SYNC] Checking if user exists by cognitoId...');
    let user = await findUserByCognitoId(cognitoUserId);
    
    if (!user) {
      console.log('[COGNITO-SYNC] Not found by cognitoId, checking by email...');
      user = await findUserByEmail(email);
    }

    if (!user) {
      // Create new user in DynamoDB
      console.log('[COGNITO-SYNC] User not found, creating new user...');
      try {
        const userData = {
          name: name || attributes?.name || email.split('@')[0],
          email: email,
          avatarUrl: attributes?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
          phoneNumber: attributes?.phone_number || '',
          bio: '',
          authProvider: 'cognito',
          cognitoId: cognitoUserId,
        };
        console.log('[COGNITO-SYNC] Creating user with data:', JSON.stringify(userData));
        
        user = await createUser(userData);

        console.log('[COGNITO-SYNC] User created successfully:', user.id);
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
        console.error('[COGNITO-SYNC] Error creating user in DynamoDB:', createError);
        console.error('[COGNITO-SYNC] Error details:', JSON.stringify(createError, Object.getOwnPropertyNames(createError)));
        return NextResponse.json(
          { error: 'Failed to create user in database', details: createError instanceof Error ? createError.message : String(createError) },
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
    console.error('[COGNITO-SYNC] Top-level error:', error);
    console.error('[COGNITO-SYNC] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[COGNITO-SYNC] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: 'Internal server error during user sync', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
