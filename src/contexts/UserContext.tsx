'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginDate: Date;
  learningStreak: number;
  totalLearningTime: number; // in minutes
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
  login: (userData: Partial<User>) => void;
  logout: () => void;
  updateUserStats: () => void;
  recordActivity: (activity: { action: string; item: string; type: 'completed' | 'started' | 'created' | 'quiz' }) => void;
  calculateStreak: () => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Calculate learning streak based on daily activity
  const calculateStreak = (): number => {
    if (!user) return 0;
    
    try {
      const activityLog = JSON.parse(localStorage.getItem(`userActivity_${user.id}`) || '[]');
      if (activityLog.length === 0) return 0;

      // Sort activities by date (newest first)
      const sortedActivities = activityLog.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Check each day going backwards
      for (let i = 0; i < 30; i++) { // Check last 30 days
        const dayToCheck = new Date(currentDate);
        dayToCheck.setDate(dayToCheck.getDate() - i);
        
        const hasActivityOnDay = sortedActivities.some((activity: any) => {
          const activityDate = new Date(activity.timestamp);
          activityDate.setHours(0, 0, 0, 0);
          return activityDate.getTime() === dayToCheck.getTime();
        });

        if (hasActivityOnDay) {
          if (i === 0 || streak > 0) { // Today or continuing streak
            streak++;
          }
        } else if (i === 0) {
          // No activity today, check yesterday
          continue;
        } else {
          // Gap in streak
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  // Record user activity for streak tracking
  const recordActivity = (activity: { action: string; item: string; type: 'completed' | 'started' | 'created' | 'quiz' }) => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error('Error recording activity:', error);
    }
  };

  // Update user statistics
  const updateUserStats = () => {
    if (!user) return;

    try {
      // Get user playlists
      const playlists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');
      const userPlaylists = playlists.filter((p: any) => p.userId === user.id);

      // Calculate stats
      const totalVideos = userPlaylists.reduce((sum: number, playlist: any) => 
        sum + (playlist.videos?.length || 0), 0);
      
      const completedVideos = userPlaylists.reduce((sum: number, playlist: any) => 
        sum + (playlist.videos?.filter((v: any) => v.completionStatus === 100).length || 0), 0);

      const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

      // Get activity log
      const activityLog = JSON.parse(localStorage.getItem(`userActivity_${user.id}`) || '[]');
      const recentActivity = activityLog.slice(0, 5).map((activity: any) => ({
        ...activity,
        timestamp: new Date(activity.timestamp),
      }));

      // Calculate weekly goal (example: 15 videos per week)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weeklyCompleted = activityLog.filter((activity: any) => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= weekStart && activity.type === 'completed';
      }).length;

      const weeklyTarget = 15;
      const weeklyProgress = Math.min(Math.round((weeklyCompleted / weeklyTarget) * 100), 100);

      // Calculate total learning time (rough estimate)
      const totalMinutes = completedVideos * 8; // Assume 8 minutes average per video
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const totalLearningTime = `${hours}h ${minutes}m`;

      const newStats: UserStats = {
        totalPlaylists: userPlaylists.length,
        totalVideosCompleted: completedVideos,
        currentStreak: calculateStreak(),
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
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  // Login function
  const login = (userData: Partial<User>) => {
    const newUser: User = {
      id: userData.id || Date.now().toString(),
      name: userData.name || 'Anonymous User',
      email: userData.email || 'user@example.com',
      avatarUrl: userData.avatarUrl,
      createdAt: userData.createdAt || new Date(),
      lastLoginDate: new Date(),
      learningStreak: 0,
      totalLearningTime: 0,
      preferences: {
        theme: 'system',
        notifications: true,
      },
    };

    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    // Record login activity
    setTimeout(() => {
      recordActivity({
        action: 'Logged in',
        item: 'StreamSmart',
        type: 'started',
      });
    }, 100);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setUserStats(null);
    localStorage.removeItem('currentUser');
  };

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData.createdAt = new Date(userData.createdAt);
        userData.lastLoginDate = new Date(userData.lastLoginDate);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
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
    login,
    logout,
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