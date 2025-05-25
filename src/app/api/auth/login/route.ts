import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, authProvider, googleId, name, avatarUrl } = await request.json();

    // Try to connect to MongoDB
    let mongoConnected = false;
    try {
      await connectDB();
      mongoConnected = true;
    } catch (dbError) {
      console.error('MongoDB connection failed:', dbError);
      
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
            createdAt: new Date(),
            lastLoginDate: new Date(),
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
        { error: 'Database connection failed. Please try demo mode or set up MongoDB.' },
        { status: 500 }
      );
    }

    if (authProvider === 'email') {
      // Email/Password login
      if (!email || !password) {
        console.error('Missing email or password:', { email: !!email, password: !!password });
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.error('User not found for email:', email);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.log('User found:', { 
        id: user._id, 
        email: user.email, 
        authProvider: user.authProvider,
        hasPassword: !!user.password 
      });

      if (!user.password) {
        console.error('User has no password field:', { 
          userId: user._id, 
          authProvider: user.authProvider 
        });
        return NextResponse.json(
          { error: 'Invalid login method. This account was created with a different authentication method.' },
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
      user.lastLoginDate = new Date();
      await user.save();

      return NextResponse.json({
        user: {
          id: user._id.toString(),
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

      let user = await User.findOne({ 
        $or: [
          { email: email.toLowerCase() },
          { googleId: googleId }
        ]
      });

      if (!user) {
        // Create new user for Google login
        user = new User({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          avatarUrl: avatarUrl,
          authProvider: 'google',
          googleId: googleId,
          lastLoginDate: new Date(),
        });
        await user.save();
      } else {
        // Update existing user
        user.lastLoginDate = new Date();
        if (googleId && !user.googleId) {
          user.googleId = googleId;
        }
        await user.save();
      }

      return NextResponse.json({
        user: {
          id: user._id.toString(),
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
      let user = await User.findOne({ email: 'demo@streamsmart.com' });

      if (!user) {
        user = new User({
          name: 'Demo User',
          email: 'demo@streamsmart.com',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
          authProvider: 'demo',
          lastLoginDate: new Date(),
        });
        await user.save();
      } else {
        user.lastLoginDate = new Date();
        await user.save();
      }

      return NextResponse.json({
        user: {
          id: user._id.toString(),
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

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 