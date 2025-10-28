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
import { createUser, findUserByEmail, updateUser } from './dynamodb-service';

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

// Sync Cognito user with DynamoDB
async function syncUserWithDynamoDB(cognitoUser: any): Promise<AuthUser> {
  const attributes = await fetchUserAttributes();
  const email = attributes.email!;
  
  // Check if user exists in DynamoDB
  let user = await findUserByEmail(email);
  
  if (!user) {
    // Create new user in DynamoDB
    user = await createUser({
      name: attributes.name || email.split('@')[0],
      email: email,
      avatarUrl: attributes.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(attributes.name || email)}`,
      phoneNumber: attributes.phone_number || '',
      bio: '',
      authProvider: 'cognito',
      cognitoId: cognitoUser.userId
    });
  } else {
    // Update last login
    user = await updateUser(user.id, { 
      lastLoginDate: Date.now(),
      cognitoId: cognitoUser.userId
    });
  }
  
  return {
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
    weeklyGoal: user.weeklyGoal || 15,
    preferences: user.preferences || {
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
    
    // Update DynamoDB
    const attributes = await fetchUserAttributes();
    const email = attributes.email!;
    const user = await findUserByEmail(email);
    
    if (user) {
      await updateUser(user.id, updates);
    }
    
    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Profile update failed');
  }
}
