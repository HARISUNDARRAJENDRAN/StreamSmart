import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, findUserByGoogleId, updateUser } from '@/lib/dynamodb-service';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, authProvider, googleId, name, avatarUrl } = await request.json();

    try {
      if (authProvider === 'email') {
        // Email/Password login
        if (!email || !password) {
          console.error('Missing email or password:', { email: !!email, password: !!password });
          return NextResponse.json(
            { error: 'Email and password are required' },
            { status: 400 }
          );
        }

        const user = await findUserByEmail(email);
        
        if (!user) {
          console.error('User not found for email:', email);
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        console.log('User found:', { 
          id: user.id, 
          email: user.email, 
          authProvider: user.authProvider,
          hasPassword: !!user.password 
        });

        if (!user.password) {
          console.error('User has no password field:', { 
            userId: user.id, 
            authProvider: user.authProvider 
          });
          
          // Provide helpful error message based on auth provider
          let errorMessage = 'Invalid login method. ';
          if (user.authProvider === 'google') {
            errorMessage += 'This account was created with Google. Please use the "Google" login button.';
          } else if (user.authProvider === 'demo') {
            errorMessage += 'This account was created in demo mode. Please use the "Demo" login button.';
          } else {
            errorMessage += 'This account was created with a different authentication method.';
          }
          
          return NextResponse.json(
            { error: errorMessage },
            { status: 400 }
          );
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          console.error('Invalid password for user:', user.email);
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        }

        // Update last login date
        await updateUser(user.id, { lastLoginDate: Date.now() });

        return NextResponse.json({
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
        });

      } else if (authProvider === 'google') {
        // Google OAuth login
        if (!email || !googleId) {
          return NextResponse.json(
            { error: 'Google authentication data required' },
            { status: 400 }
          );
        }

        // Try to find user by email or googleId
        let user = await findUserByEmail(email);
        
        if (!user) {
          user = await findUserByGoogleId(googleId);
        }

        if (!user) {
          // Create new user for Google login
          user = await createUser({
            name: name || email.split('@')[0],
            email: email.toLowerCase(),
            avatarUrl: avatarUrl,
            authProvider: 'google',
            googleId: googleId,
          });
        } else {
          // Update existing user
          const updates: Record<string, string | number | boolean> = { lastLoginDate: Date.now() };
          if (googleId && !user.googleId) {
            updates.googleId = googleId;
          }
          user = await updateUser(user.id, updates);
        }

        return NextResponse.json({
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
        });

      } else if (authProvider === 'demo') {
        // Demo login - find or create demo user
        let user = await findUserByEmail('demo@streamsmart.com');

        if (!user) {
          user = await createUser({
            name: 'Demo User',
            email: 'demo@streamsmart.com',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
            authProvider: 'demo',
          });
        } else {
          await updateUser(user.id, { lastLoginDate: Date.now() });
        }

        return NextResponse.json({
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
        });
      }

      return NextResponse.json(
        { error: 'Invalid authentication provider' },
        { status: 400 }
      );

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      
      // Fallback authentication for demo purposes
      if (authProvider === 'demo' || (authProvider === 'email' && email === 'demo@example.com')) {
        return NextResponse.json({
          user: {
            id: 'demo-user-id',
            name: 'Demo User',
            email: 'demo@example.com',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
            phoneNumber: '',
            bio: '',
            createdAt: Date.now(),
            lastLoginDate: Date.now(),
            learningStreak: 0,
            totalLearningTime: 0,
            weeklyGoal: 15,
            preferences: {
              theme: 'system',
              notifications: true,
            },
          }
        });
      }
      
      return NextResponse.json(
        { error: 'Database connection failed. Please try demo mode or set up DynamoDB.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 