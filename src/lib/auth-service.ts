'use client';

import { 
  signIn, 
  signUp, 
  signOut, 
  confirmSignUp, 
  resendSignUpCode, 
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  updateUserAttributes
} from '@aws-amplify/auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: number;
  lastLoginDate: number;
  learningStreak: number;
  totalLearningTime: number;
  weeklyGoal: number;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
}

// Sync Cognito user with DynamoDB via API route
async function syncUserWithDynamoDB(cognitoUser: any): Promise<AuthUser> {
  const attributes = await fetchUserAttributes();
  const email = attributes.email!;
  
  // Call server-side API to sync user with DynamoDB
  const response = await fetch('/api/auth/cognito/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cognitoUserId: cognitoUser.userId,
      email: email,
      name: attributes.name || email.split('@')[0],
      attributes: {
        picture: attributes.picture,
        phone_number: attributes.phone_number,
        name: attributes.name,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync user with database');
  }

  const data = await response.json();
  
  if (!data.success || !data.user) {
    throw new Error('Failed to sync user with database');
  }

  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    avatarUrl: data.user.avatarUrl,
    phoneNumber: data.user.phoneNumber,
    bio: data.user.bio,
    createdAt: data.user.createdAt,
    lastLoginDate: data.user.lastLoginDate,
    learningStreak: data.user.learningStreak,
    totalLearningTime: data.user.totalLearningTime,
    weeklyGoal: data.user.weeklyGoal || 15,
    preferences: data.user.preferences || {
      theme: 'system',
      notifications: true
    }
  };
}

// Sign up new user
export async function signUpUser(email: string, password: string, name: string) {
  try {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name
        }
      }
    });
    
    return {
      isSignUpComplete: result.isSignUpComplete,
      userId: result.userId,
      nextStep: result.nextStep
    };
  } catch (error: any) {
    throw new Error(error.message || 'Sign up failed');
  }
}

// Confirm sign up with verification code
export async function confirmSignUpUser(email: string, code: string) {
  try {
    const result = await confirmSignUp({
      username: email,
      confirmationCode: code
    });
    
    return result.isSignUpComplete;
  } catch (error: any) {
    throw new Error(error.message || 'Confirmation failed');
  }
}

// Sign in user
export async function signInUser(email: string, password: string): Promise<AuthUser> {
  try {
    const result = await signIn({
      username: email,
      password
    });
    
    if (result.isSignedIn) {
      const cognitoUser = await getCurrentUser();
      const user = await syncUserWithDynamoDB(cognitoUser);
      return user;
    } else {
      throw new Error('Sign in incomplete');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Sign in failed');
  }
}

// Sign out user
export async function signOutUser() {
  try {
    await signOut();
  } catch (error: any) {
    throw new Error(error.message || 'Sign out failed');
  }
}

// Get current authenticated user
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const cognitoUser = await getCurrentUser();
    if (cognitoUser) {
      const user = await syncUserWithDynamoDB(cognitoUser);
      return user;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return !!session.tokens;
  } catch (error) {
    return false;
  }
}

// Resend verification code
export async function resendVerificationCode(email: string) {
  try {
    await resendSignUpCode({
      username: email
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to resend code');
  }
}

// Reset password
export async function requestPasswordReset(email: string) {
  try {
    const result = await resetPassword({
      username: email
    });
    return result;
  } catch (error: any) {
    throw new Error(error.message || 'Password reset request failed');
  }
}

// Confirm password reset
export async function confirmPasswordReset(email: string, code: string, newPassword: string) {
  try {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword
    });
  } catch (error: any) {
    throw new Error(error.message || 'Password reset failed');
  }
}

// Update user profile
export async function updateUserProfile(updates: Partial<AuthUser>) {
  try {
    const cognitoUser = await getCurrentUser();
    
    // Update Cognito attributes
    const cognitoAttributes: Record<string, string> = {};
    if (updates.name) cognitoAttributes.name = updates.name;
    if (updates.phoneNumber) cognitoAttributes.phone_number = updates.phoneNumber;
    if (updates.avatarUrl) cognitoAttributes.picture = updates.avatarUrl;
    
    if (Object.keys(cognitoAttributes).length > 0) {
      await updateUserAttributes({
        userAttributes: cognitoAttributes
      });
    }
    
    // Update DynamoDB via API
    const attributes = await fetchUserAttributes();
    const email = attributes.email!;
    
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        ...updates,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile in database');
    }
    
    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Profile update failed');
  }
}
