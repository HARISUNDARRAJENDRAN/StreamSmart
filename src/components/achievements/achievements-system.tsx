'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Flame, 
  BookOpenCheck, 
  Star, 
  Target, 
  Zap, 
  Crown, 
  Medal, 
  Award, 
  Rocket, 
  Brain, 
  Clock, 
  Calendar,
  TrendingUp,
  Users,
  Heart,
  Shield,
  Gem,
  Sparkles,
  CheckCircle,
  Lock
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'learning' | 'streak' | 'completion' | 'speed' | 'dedication' | 'social' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  requirement: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  points: number;
  color: string;
}

const achievementDefinitions = [
  // Learning Achievements
  {
    id: 'first_video',
    title: 'First Steps',
    description: 'Complete your first video',
    icon: <CheckCircle className="h-5 w-5" />,
    category: 'learning' as const,
    tier: 'bronze' as const,
    requirement: 1,
    points: 10,
    color: 'text-green-500',
    checkProgress: (userStats: any) => userStats?.totalVideosCompleted || 0,
  },
  {
    id: 'video_novice',
    title: 'Video Novice',
    description: 'Complete 5 videos',
    icon: <BookOpenCheck className="h-5 w-5" />,
    category: 'learning' as const,
    tier: 'bronze' as const,
    requirement: 5,
    points: 25,
    color: 'text-blue-500',
    checkProgress: (userStats: any) => userStats?.totalVideosCompleted || 0,
  },
  {
    id: 'video_enthusiast',
    title: 'Video Enthusiast',
    description: 'Complete 25 videos',
    icon: <BookOpenCheck className="h-5 w-5" />,
    category: 'learning' as const,
    tier: 'silver' as const,
    requirement: 25,
    points: 100,
    color: 'text-purple-500',
    checkProgress: (userStats: any) => userStats?.totalVideosCompleted || 0,
  },
  {
    id: 'video_master',
    title: 'Video Master',
    description: 'Complete 100 videos',
    icon: <Crown className="h-5 w-5" />,
    category: 'learning' as const,
    tier: 'gold' as const,
    requirement: 100,
    points: 500,
    color: 'text-yellow-500',
    checkProgress: (userStats: any) => userStats?.totalVideosCompleted || 0,
  },
  {
    id: 'video_legend',
    title: 'Video Legend',
    description: 'Complete 500 videos',
    icon: <Gem className="h-5 w-5" />,
    category: 'learning' as const,
    tier: 'diamond' as const,
    requirement: 500,
    points: 2000,
    color: 'text-cyan-500',
    checkProgress: (userStats: any) => userStats?.totalVideosCompleted || 0,
  },

  // Streak Achievements
  {
    id: 'streak_starter',
    title: 'Streak Starter',
    description: 'Maintain a 3-day learning streak',
    icon: <Flame className="h-5 w-5" />,
    category: 'streak' as const,
    tier: 'bronze' as const,
    requirement: 3,
    points: 30,
    color: 'text-orange-500',
    checkProgress: (userStats: any) => userStats?.currentStreak || 0,
  },
  {
    id: 'streak_keeper',
    title: 'Streak Keeper',
    description: 'Maintain a 7-day learning streak',
    icon: <Flame className="h-5 w-5" />,
    category: 'streak' as const,
    tier: 'silver' as const,
    requirement: 7,
    points: 75,
    color: 'text-orange-600',
    checkProgress: (userStats: any) => userStats?.currentStreak || 0,
  },
  {
    id: 'streak_warrior',
    title: 'Streak Warrior',
    description: 'Maintain a 30-day learning streak',
    icon: <Flame className="h-5 w-5" />,
    category: 'streak' as const,
    tier: 'gold' as const,
    requirement: 30,
    points: 300,
    color: 'text-red-500',
    checkProgress: (userStats: any) => userStats?.currentStreak || 0,
  },
  {
    id: 'streak_legend',
    title: 'Streak Legend',
    description: 'Maintain a 100-day learning streak',
    icon: <Crown className="h-5 w-5" />,
    category: 'streak' as const,
    tier: 'diamond' as const,
    requirement: 100,
    points: 1000,
    color: 'text-red-600',
    checkProgress: (userStats: any) => userStats?.currentStreak || 0,
  },

  // Completion Achievements
  {
    id: 'first_playlist',
    title: 'Playlist Pioneer',
    description: 'Create your first playlist',
    icon: <Star className="h-5 w-5" />,
    category: 'completion' as const,
    tier: 'bronze' as const,
    requirement: 1,
    points: 20,
    color: 'text-purple-500',
    checkProgress: (userStats: any) => userStats?.totalPlaylists || 0,
  },
  {
    id: 'playlist_curator',
    title: 'Playlist Curator',
    description: 'Create 5 playlists',
    icon: <Star className="h-5 w-5" />,
    category: 'completion' as const,
    tier: 'silver' as const,
    requirement: 5,
    points: 100,
    color: 'text-purple-600',
    checkProgress: (userStats: any) => userStats?.totalPlaylists || 0,
  },
  {
    id: 'completionist',
    title: 'Completionist',
    description: 'Achieve 100% progress on any playlist',
    icon: <Trophy className="h-5 w-5" />,
    category: 'completion' as const,
    tier: 'gold' as const,
    requirement: 100,
    points: 200,
    color: 'text-yellow-500',
    checkProgress: (userStats: any) => userStats?.overallProgress || 0,
  },

  // Speed Achievements
  {
    id: 'speed_learner',
    title: 'Speed Learner',
    description: 'Complete 5 videos in one day',
    icon: <Zap className="h-5 w-5" />,
    category: 'speed' as const,
    tier: 'silver' as const,
    requirement: 5,
    points: 75,
    color: 'text-yellow-400',
    checkProgress: (userStats: any) => {
      // Check today's completed videos from recent activity
      const today = new Date().toDateString();
      return userStats?.recentActivity?.filter((activity: any) => 
        activity.type === 'completed' && 
        new Date(activity.timestamp).toDateString() === today
      ).length || 0;
    },
  },
  {
    id: 'lightning_fast',
    title: 'Lightning Fast',
    description: 'Complete 10 videos in one day',
    icon: <Rocket className="h-5 w-5" />,
    category: 'speed' as const,
    tier: 'gold' as const,
    requirement: 10,
    points: 150,
    color: 'text-blue-400',
    checkProgress: (userStats: any) => {
      const today = new Date().toDateString();
      return userStats?.recentActivity?.filter((activity: any) => 
        activity.type === 'completed' && 
        new Date(activity.timestamp).toDateString() === today
      ).length || 0;
    },
  },

  // Dedication Achievements
  {
    id: 'goal_achiever',
    title: 'Goal Achiever',
    description: 'Complete your weekly goal',
    icon: <Target className="h-5 w-5" />,
    category: 'dedication' as const,
    tier: 'silver' as const,
    requirement: 100,
    points: 100,
    color: 'text-green-600',
    checkProgress: (userStats: any) => userStats?.weeklyGoal?.progress || 0,
  },
  {
    id: 'time_master',
    title: 'Time Master',
    description: 'Accumulate 10 hours of learning time',
    icon: <Clock className="h-5 w-5" />,
    category: 'dedication' as const,
    tier: 'gold' as const,
    requirement: 600, // 10 hours in minutes
    points: 250,
    color: 'text-blue-600',
    checkProgress: (userStats: any) => {
      // Extract hours from totalLearningTime string like "5h 30m"
      const timeStr = userStats?.totalLearningTime || '0h 0m';
      const hours = parseInt(timeStr.match(/(\d+)h/)?.[1] || '0');
      const minutes = parseInt(timeStr.match(/(\d+)m/)?.[1] || '0');
      return hours * 60 + minutes;
    },
  },

  // Special Achievements
  {
    id: 'early_adopter',
    title: 'Early Adopter',
    description: 'One of the first users of StreamSmart',
    icon: <Sparkles className="h-5 w-5" />,
    category: 'special' as const,
    tier: 'platinum' as const,
    requirement: 1,
    points: 500,
    color: 'text-pink-500',
    checkProgress: (userStats: any, user: any) => {
      // Check if user created account in first month
      const accountAge = Date.now() - new Date(user?.createdAt || Date.now()).getTime();
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      return accountAge < oneMonth ? 1 : 0;
    },
  },
  {
    id: 'ai_explorer',
    title: 'AI Explorer',
    description: 'Use AI features (quiz, mind map, chat)',
    icon: <Brain className="h-5 w-5" />,
    category: 'special' as const,
    tier: 'gold' as const,
    requirement: 1,
    points: 150,
    color: 'text-purple-400',
    checkProgress: (userStats: any) => {
      // Check if user has any quiz-related activities
      return userStats?.recentActivity?.some((activity: any) => 
        activity.type === 'quiz' || activity.action.toLowerCase().includes('quiz')
      ) ? 1 : 0;
    },
  },
];

interface AchievementsSystemProps {
  showAll?: boolean;
  maxDisplay?: number;
}

export function AchievementsSystem({ showAll = false, maxDisplay = 4 }: AchievementsSystemProps) {
  const { user, userStats } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!user || !userStats) return;

    const processedAchievements = achievementDefinitions.map(def => {
      const currentProgress = def.checkProgress(userStats, user);
      const isUnlocked = currentProgress >= def.requirement;
      
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        tier: def.tier,
        requirement: def.requirement,
        currentProgress,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date() : undefined,
        points: def.points,
        color: def.color,
      };
    });

    // Sort: unlocked first, then by tier, then by progress
    processedAchievements.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) return b.isUnlocked ? 1 : -1;
      
      const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5 };
      if (tierOrder[a.tier] !== tierOrder[b.tier]) {
        return tierOrder[a.tier] - tierOrder[b.tier];
      }
      
      return (b.currentProgress / b.requirement) - (a.currentProgress / a.requirement);
    });

    setAchievements(processedAchievements);
    
    // Calculate total points from unlocked achievements
    const points = processedAchievements
      .filter(a => a.isUnlocked)
      .reduce((sum, a) => sum + a.points, 0);
    setTotalPoints(points);
  }, [user, userStats]);

  const displayedAchievements = showAll ? achievements : achievements.slice(0, maxDisplay);
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'diamond': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return <Medal className="h-3 w-3" />;
      case 'silver': return <Award className="h-3 w-3" />;
      case 'gold': return <Trophy className="h-3 w-3" />;
      case 'platinum': return <Crown className="h-3 w-3" />;
      case 'diamond': return <Gem className="h-3 w-3" />;
      default: return <Medal className="h-3 w-3" />;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Log in to track your achievements!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Achievement Stats - Simplified to 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6 text-center">
            <Trophy className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-yellow-800 mb-1">{unlockedCount}</div>
            <div className="text-sm text-yellow-700">Achievements Unlocked</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 text-center">
            <Star className="h-10 w-10 text-purple-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-purple-800 mb-1">{totalPoints}</div>
            <div className="text-sm text-purple-700">Total Points</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Grid - More spacious */}
      <div className="space-y-6">
        {displayedAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`relative overflow-hidden transition-all duration-300 ${
              achievement.isUnlocked 
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md hover:shadow-lg' 
                : 'bg-gray-50 border-gray-200 opacity-75 hover:opacity-90'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    achievement.isUnlocked 
                      ? 'bg-white shadow-sm' 
                      : 'bg-gray-200'
                  }`}>
                    <div className={achievement.isUnlocked ? achievement.color : 'text-gray-400'}>
                      {achievement.isUnlocked ? achievement.icon : <Lock className="h-6 w-6" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg font-semibold ${
                        achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {achievement.title}
                      </h3>
                      <Badge className={`text-sm px-3 py-1 ${getTierColor(achievement.tier)}`}>
                        {getTierIcon(achievement.tier)}
                        <span className="ml-2 capitalize">{achievement.tier}</span>
                      </Badge>
                    </div>
                    
                    <p className={`text-sm ${
                      achievement.isUnlocked ? 'text-gray-700' : 'text-gray-500'
                    }`}>
                      {achievement.description}
                    </p>
                    
                    {!achievement.isUnlocked && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span className="font-medium">{achievement.currentProgress} / {achievement.requirement}</span>
                        </div>
                        <Progress 
                          value={(achievement.currentProgress / achievement.requirement) * 100} 
                          className="h-3"
                        />
                      </div>
                    )}
                    
                    {achievement.isUnlocked && (
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-sm bg-green-100 text-green-800 px-3 py-1">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Unlocked
                        </Badge>
                        <span className="text-sm font-semibold text-green-700">
                          +{achievement.points} points
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              
              {achievement.isUnlocked && (
                <div className="absolute top-3 right-3">
                  <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      
      {!showAll && achievements.length > maxDisplay && (
        <div className="text-center pt-4">
          <Button variant="outline" size="lg" asChild>
            <a href="/achievements">
              <Trophy className="mr-2 h-5 w-5" />
              View All {achievements.length} Achievements
            </a>
          </Button>
        </div>
      )}
    </div>
  );
} 