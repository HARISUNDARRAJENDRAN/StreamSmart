import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/dynamodb-service';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Try to connect to DynamoDB
    try {
      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists with this email' },
          { status: 409 }
        );
      }
    } catch (dbError) {
      console.error('DynamoDB query failed during registration:', dbError);
      return NextResponse.json(
        { error: 'Database query failed. Please check your DynamoDB configuration.' },
        { status: 500 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    try {
      const user = await createUser({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        authProvider: 'email',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });

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
      }, { status: 201 });
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user in database' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 