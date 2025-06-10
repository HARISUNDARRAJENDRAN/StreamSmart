'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
interface User {
  userId: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  type: 'authenticated' | 'guest';
  subscription?: {
    plan: string;
    limits: {
      monthlyVideos: number;
      storageGB: number;
      ragQueries: number;
    };
    usage: {
      videosProcessed: number;
      storageUsed: number;
      ragQueriesUsed: number;
    };
  };
  preferences?: {
    language: string;
    theme: string;
    defaultSummaryLength: string;
  };
  limitations?: {
    maxVideos: number;
    maxQueries: number;
    sessionDuration?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUsage: (metric: string, increment?: number) => void;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    sessionId: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        const storedSessionId = localStorage.getItem('session_id');

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          setAuthState({
            user,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
            sessionId: storedSessionId,
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData();
      }
    };

    initializeAuth();
  }, []);

  // Helper function to clear auth data
  const clearAuthData = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('session_id');
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionId: null,
    });
  };

  // Helper function to store auth data
  const storeAuthData = (token: string, user: User, sessionId: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('session_id', sessionId);
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      sessionId,
    });
  };

  // API helper with auth headers
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(authState.token && { Authorization: `Bearer ${authState.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      clearAuthData();
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      
      if (data.success) {
        storeAuthData(data.token, data.user, data.session.sessionId);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      // After successful registration, log the user in
      await login(userData.email, userData.password);
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // Guest login function
  const loginAsGuest = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`${API_BASE_URL}/auth/guest-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create guest session');
      }

      const data = await response.json();
      
      if (data.success) {
        storeAuthData(data.token, data.user, data.session.sessionId);
      } else {
        throw new Error(data.message || 'Guest session creation failed');
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (authState.token) {
        await apiCall('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearAuthData();
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      if (!authState.token) return;

      const userData = await apiCall('/user/profile');
      const updatedUser = { ...authState.user, ...userData };
      
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      setAuthState(prev => ({ ...prev, user: updatedUser }));
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Update usage statistics optimistically
  const updateUsage = (metric: string, increment: number = 1) => {
    if (!authState.user || authState.user.type === 'guest') return;

    setAuthState(prev => {
      if (!prev.user?.subscription) return prev;

      const updatedUser = {
        ...prev.user,
        subscription: {
          ...prev.user.subscription,
          usage: {
            ...prev.user.subscription.usage,
            [metric]: (prev.user.subscription.usage[metric as keyof typeof prev.user.subscription.usage] as number) + increment,
          },
        },
      };

      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    loginAsGuest,
    logout,
    refreshUser,
    updateUsage,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Helper hook for API calls
export function useAPI() {
  const { token } = useAuth();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  return { apiCall };
} 