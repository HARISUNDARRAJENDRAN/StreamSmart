'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userService } from '@/services/userService';
import { playlistService } from '@/services/playlistService';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: Date;
  lastLoginDate: Date;
  learningStreak: number;
  totalLearningTime: number; // in minutes
  weeklyGoal: number; // customizable weekly goal
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
}

export interface UserStats {
  totalPlaylists: number;
  totalVideosCompleted: number;
  currentStreak: number;
  overallProgress: number;
  totalLearningTime: string;
  weeklyGoal: {
    target: number;
    completed: number;
    progress: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    item: string;
    timestamp: Date;
    type: 'completed' | 'started' | 'created' | 'quiz';
  }>;
}

interface UserContextType {
  user: User | null;
  userStats: UserStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: Partial<User>) => Promise<void>;
  loginWithAPI: (email: string, password?: string, authProvider?: 'email' | 'google' | 'demo', additionalData?: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserProfile: (data: { name?: string; phoneNumber?: string; bio?: string }) => Promise<{ success: boolean; error?: string }>;
  updateWeeklyGoal: (weeklyGoal: number) => Promise<{ success: boolean; error?: string }>;
  updateUserStats: (forceUpdate?: boolean) => void;
  recordActivity: (activity: { action: string; item: string; type: 'completed' | 'started' | 'created' | 'quiz' }) => void;
  calculateStreak: () => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastStatsUpdate, setLastStatsUpdate] = useState<number>(0);

  // Calculate learning streak based on daily activity
  const calculateStreak = (): number => {
    return user?.learningStreak || 0;
  };

  // Record user activity for streak tracking
  const recordActivity = async (activity: { action: string; item: string; type: 'completed' | 'started' | 'created' | 'quiz' }) => {
    if (!user) return;

    try {
      const result = await playlistService.recordActivity({
        userId: user.id,
        ...activity,
      });
      
      if (result.success) {
        // Update stats after recording activity
        updateUserStats();
      } else {
        // Fallback to localStorage if MongoDB fails
        console.log('Falling back to localStorage for activity recording');
        const activityLog = JSON.parse(localStorage.getItem(`userActivity_${user.id}`) || '[]');
        const newActivity = {
          id: Date.now().toString(),
          ...activity,
          timestamp: new Date(),
        };

        activityLog.unshift(newActivity);
        // Keep only last 100 activities
        const trimmedLog = activityLog.slice(0, 100);
        
        localStorage.setItem(`userActivity_${user.id}`, JSON.stringify(trimmedLog));
        updateUserStats();
      }
    } catch (error) {
      console.error('Error recording activity:', error);
      
      // Fallback to localStorage
      try {
        console.log('Falling back to localStorage for activity recording');
        const activityLog = JSON.parse(localStorage.getItem(`userActivity_${user.id}`) || '[]');
        const newActivity = {
          id: Date.now().toString(),
          ...activity,
          timestamp: new Date(),
        };

        activityLog.unshift(newActivity);
        // Keep only last 100 activities
        const trimmedLog = activityLog.slice(0, 100);
        
        localStorage.setItem(`userActivity_${user.id}`, JSON.stringify(trimmedLog));
        updateUserStats();
      } catch (fallbackError) {
        console.error('Error with localStorage fallback:', fallbackError);
      }
    }
  };

  // Update user statistics with throttling
  const updateUserStats = async (forceUpdate = false) => {
    if (!user) return;

    // Throttle updates to prevent excessive API calls (minimum 10 seconds between updates)
    const now = Date.now();
    if (!forceUpdate && now - lastStatsUpdate < 10000) {
      return;
    }

    try {
      // Try to get user playlists from MongoDB first
      let playlists = await playlistService.getPlaylists(user.id);
      let activities = await playlistService.getActivities(user.id, 5);
      let allActivities = await playlistService.getActivities(user.id, 100);

      // If MongoDB is not available, fall back to localStorage
      if (playlists.length === 0 && activities.length === 0) {
        console.log('Falling back to localStorage for user stats');
        
        // Get playlists from localStorage
        const storedPlaylistsRaw = localStorage.getItem('userPlaylists');
        const storedPlaylists = storedPlaylistsRaw ? JSON.parse(storedPlaylistsRaw) : [];
        playlists = storedPlaylists.filter((p: any) => p.userId === user.id);

        // Get activities from localStorage
        const activityLog = JSON.parse(localStorage.getItem(`userActivity_${user.id}`) || '[]');
        activities = activityLog.slice(0, 5);
        allActivities = activityLog.slice(0, 100);
      }

      // Calculate stats
      const totalVideos = playlists.reduce((sum: number, playlist: any) => 
        sum + (playlist.videos?.length || 0), 0);
      
      const completedVideos = playlists.reduce((sum: number, playlist: any) => 
        sum + (playlist.videos?.filter((v: any) => v.completionStatus === 100).length || 0), 0);

      const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

      // Process recent activities
      const recentActivity = activities.map((activity: any) => ({
        ...activity,
        id: activity._id || activity.id || Date.now().toString(),
        timestamp: new Date(activity.timestamp),
      }));

      // Calculate weekly goal progress
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weeklyCompleted = allActivities.filter((activity: any) => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= weekStart && activity.type === 'completed';
      }).length;

      const weeklyTarget = user.weeklyGoal || 15;
      const weeklyProgress = Math.min(Math.round((weeklyCompleted / weeklyTarget) * 100), 100);

      // Calculate total learning time (rough estimate)
      const totalMinutes = completedVideos * 8; // Assume 8 minutes average per video
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const totalLearningTime = `${hours}h ${minutes}m`;

      const newStats: UserStats = {
        totalPlaylists: playlists.length,
        totalVideosCompleted: completedVideos,
        currentStreak: user.learningStreak || 0,
        overallProgress,
        totalLearningTime,
        weeklyGoal: {
          target: weeklyTarget,
          completed: weeklyCompleted,
          progress: weeklyProgress,
        },
        recentActivity,
      };

      setUserStats(newStats);
      setLastStatsUpdate(now);
    } catch (error) {
      console.error('Error updating user stats:', error);
      // Set default stats to prevent crashes
      const defaultStats: UserStats = {
        totalPlaylists: 0,
        totalVideosCompleted: 0,
        currentStreak: user.learningStreak || 0,
        overallProgress: 0,
        totalLearningTime: '0h 0m',
        weeklyGoal: {
          target: user.weeklyGoal || 15,
          completed: 0,
          progress: 0,
        },
        recentActivity: [],
      };
      setUserStats(defaultStats);
    }
  };

  // Login with API
  const loginWithAPI = async (
    email: string, 
    password?: string, 
    authProvider: 'email' | 'google' | 'demo' = 'email',
    additionalData?: any
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const loginData = {
        email,
        password,
        authProvider,
        ...additionalData,
      };

      const result = await userService.login(loginData);

      if (result.error) {
        setIsLoading(false);
        return { success: false, error: result.error };
      }

      if (result.user) {
        const userData: User = {
          ...result.user,
          createdAt: new Date(result.user.createdAt),
          lastLoginDate: new Date(result.user.lastLoginDate),
          weeklyGoal: result.user.weeklyGoal || 15,
        };
        
        setUser(userData);
        
        // Store user session in localStorage for persistence
        localStorage.setItem('userSession', JSON.stringify({
          userId: userData.id,
          email: userData.email,
          loginTime: new Date().toISOString(),
        }));

        // Record login activity
        await recordActivity({
          action: 'Logged in',
          item: 'StreamSmart',
          type: 'started',
        });

        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    }
  };

  // Legacy login function for backward compatibility
  const login = async (userData: Partial<User>) => {
    const newUser: User = {
      id: userData.id || Date.now().toString(),
      name: userData.name || 'Anonymous User',
      email: userData.email || 'user@example.com',
      avatarUrl: userData.avatarUrl,
      phoneNumber: userData.phoneNumber || '',
      bio: userData.bio || '',
      createdAt: userData.createdAt || new Date(),
      lastLoginDate: new Date(),
      learningStreak: 0,
      totalLearningTime: 0,
      weeklyGoal: 15,
      preferences: {
        theme: 'system',
        notifications: true,
      },
    };

    setUser(newUser);
    
    // Record login activity
    setTimeout(() => {
      recordActivity({
        action: 'Logged in',
        item: 'StreamSmart',
        type: 'started',
      });
    }, 100);
  };

  // Update user profile
  const updateUserProfile = async (data: { name?: string; phoneNumber?: string; bio?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const result = await userService.updateProfile({
        userId: user.id,
        ...data,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.user) {
        const updatedUser: User = {
          ...result.user,
          createdAt: new Date(result.user.createdAt),
          lastLoginDate: new Date(result.user.lastLoginDate),
          weeklyGoal: result.user.weeklyGoal || 15,
        };
        
        setUser(updatedUser);
        return { success: true };
      }

      return { success: false, error: 'Update failed' };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Update failed' };
    }
  };

  // Update weekly goal
  const updateWeeklyGoal = async (weeklyGoal: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const result = await userService.updateWeeklyGoal(user.id, weeklyGoal);

      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.user) {
        const updatedUser: User = {
          ...user,
          weeklyGoal: result.user.weeklyGoal,
        };
        
        setUser(updatedUser);
        updateUserStats(true); // Force update stats to reflect new goal
        return { success: true };
      }

      return { success: false, error: 'Update failed' };
    } catch (error) {
      console.error('Weekly goal update error:', error);
      return { success: false, error: 'Update failed' };
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setUserStats(null);
    localStorage.removeItem('userSession');
  };

  // Load user session on mount
  useEffect(() => {
    const loadUserSession = async () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          const { userId } = JSON.parse(session);
          
          // Fetch user data from API
          const result = await userService.getProfile(userId);
          
          if (result.user) {
            const userData: User = {
              ...result.user,
              createdAt: new Date(result.user.createdAt),
              lastLoginDate: new Date(result.user.lastLoginDate),
              weeklyGoal: result.user.weeklyGoal || 15,
            };
            setUser(userData);
          } else {
            // Invalid session, clear it
            localStorage.removeItem('userSession');
          }
        }
      } catch (error) {
        console.error('Error loading user session:', error);
        localStorage.removeItem('userSession');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSession();
  }, []);

  // Update stats when user changes
  useEffect(() => {
    if (user) {
      updateUserStats();
    }
  }, [user]);

  const contextValue: UserContextType = {
    user,
    userStats,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithAPI,
    logout,
    updateUserProfile,
    updateWeeklyGoal,
    updateUserStats,
    recordActivity,
    calculateStreak,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 