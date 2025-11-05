'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Hub } from '@aws-amplify/core';
import { 
  signInUser, 
  signUpUser, 
  confirmSignUpUser, 
  signOutUser, 
  getAuthenticatedUser,
  isAuthenticated as checkAuth,
  resendVerificationCode,
  requestPasswordReset,
  confirmPasswordReset,
  updateUserProfile,
  AuthUser 
} from '@/lib/auth-service';
import '@/lib/cognito-config'; // Initialize Amplify

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function CognitoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Listen for auth events
  useEffect(() => {
    const listener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkAuthStatus();
          break;
        case 'signedOut':
          setUser(null);
          setIsAuthenticated(false);
          break;
        case 'tokenRefresh':
          checkAuthStatus();
          break;
        case 'tokenRefresh_failure':
          setUser(null);
          setIsAuthenticated(false);
          break;
      }
    });

    return () => listener();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authenticatedUser = await getAuthenticatedUser();
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Force sign out any existing user first
      try {
        await signOutUser();
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
      } catch (e) {
        // Ignore errors, continue with sign in
      }
      
      const authenticatedUser = await signInUser(email, password);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Sign in error:', error);
      // If error is about existing user, clear and show message
      if (error.message?.includes('already a signed in user')) {
        try {
          await signOutUser();
          if (typeof window !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
          }
        } catch (e) {}
        throw new Error('Session cleared. Please try logging in again.');
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await signUpUser(email, password, name);
      
      if (!result.isSignUpComplete && result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        return { needsConfirmation: true };
      }
      
      // If sign up is complete, sign the user in
      if (result.isSignUpComplete) {
        await signIn(email, password);
        return { needsConfirmation: false };
      }
      
      return { needsConfirmation: true };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const confirmSignUp = async (email: string, code: string) => {
    try {
      const isComplete = await confirmSignUpUser(email, code);
      
      if (isComplete) {
        // User needs to sign in after confirmation
        // Don't auto sign-in as we don't have the password here
        return;
      }
      
      throw new Error('Sign up confirmation incomplete');
    } catch (error: any) {
      console.error('Confirm sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setIsAuthenticated(false);
      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Force clear even on error
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      throw error;
    }
  };

  const resendCode = async (email: string) => {
    try {
      await resendVerificationCode(email);
    } catch (error: any) {
      console.error('Resend code error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await requestPasswordReset(email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const confirmResetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await confirmPasswordReset(email, code, newPassword);
    } catch (error: any) {
      console.error('Confirm reset password error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      await updateUserProfile(updates);
      // Refresh user data
      await checkAuthStatus();
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    resendCode,
    resetPassword,
    confirmResetPassword,
    updateProfile,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a CognitoAuthProvider');
  }
  return context;
}
