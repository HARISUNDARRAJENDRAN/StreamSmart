'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, TrendingUp, Flame, Award, Sparkles, Crown, Zap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

interface AchievementStats {
  totalUnlocked: number;
  totalPoints: number;
  currentStreak: number;
  recentAchievements: Array<{
    id: string;
    title: string;
    tier: string;
    unlockedAt: Date;
  }>;
  nextMilestone: {
    title: string;
    progress: number;
    total: number;
  };
}

export function UserAchievementSummary() {
  const { user, userStats } = useUser();
  const [stats, setStats] = useState<AchievementStats>({
    totalUnlocked: 0,
    totalPoints: 0,
    currentStreak: 0,
    recentAchievements: [],
    nextMilestone: {
      title: 'Complete 5 videos',
      progress: 0,
      total: 5,
    },
  });

  useEffect(() => {
    if (userStats) {
      // Calculate achievement stats from user data
      const videosCompleted = userStats.totalVideosCompleted || 0;
      const currentStreak = userStats.currentStreak || 0;
      
      // Calculate unlocked achievements
      let totalUnlocked = 0;
      let totalPoints = 0;

      // Basic achievement calculations
      if (videosCompleted >= 1) { totalUnlocked++; totalPoints += 10; }
      if (videosCompleted >= 5) { totalUnlocked++; totalPoints += 25; }
      if (videosCompleted >= 25) { totalUnlocked++; totalPoints += 50; }
      if (videosCompleted >= 50) { totalUnlocked++; totalPoints += 100; }
      if (videosCompleted >= 100) { totalUnlocked++; totalPoints += 150; }
      
      if (currentStreak >= 3) { totalUnlocked++; totalPoints += 20; }
      if (currentStreak >= 7) { totalUnlocked++; totalPoints += 50; }
      if (currentStreak >= 30) { totalUnlocked++; totalPoints += 100; }

      // Determine next milestone
      let nextMilestone = { title: 'Complete 5 videos', progress: videosCompleted, total: 5 };
      if (videosCompleted >= 5 && videosCompleted < 25) {
        nextMilestone = { title: 'Complete 25 videos', progress: videosCompleted, total: 25 };
      } else if (videosCompleted >= 25 && videosCompleted < 50) {
        nextMilestone = { title: 'Complete 50 videos', progress: videosCompleted, total: 50 };
      } else if (videosCompleted >= 50 && videosCompleted < 100) {
        nextMilestone = { title: 'Complete 100 videos', progress: videosCompleted, total: 100 };
      } else if (videosCompleted >= 100) {
        nextMilestone = { title: 'All milestones reached!', progress: 100, total: 100 };
      }

      setStats({
        totalUnlocked,
        totalPoints,
        currentStreak,
        recentAchievements: [],
        nextMilestone,
      });
    }
  }, [userStats]);

  const progressPercentage = Math.min(
    (stats.nextMilestone.progress / stats.nextMilestone.total) * 100,
    100
  );

  return (
    <div className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] overflow-hidden">
      {/* Header with gradient background */}
      <div className="relative bg-gradient-to-r from-black via-black/95 to-black/90 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-[24px] font-semibold text-white">Your Achievement Journey</h3>
              <p className="text-white/70 text-sm">
                {user?.name ? `${user.name}'s Progress` : 'Track your learning milestones'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Achievements */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-[20px] p-6 border border-amber-200/50 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-[28px] font-bold text-amber-900">{stats.totalUnlocked}</div>
            </div>
            <p className="text-sm font-medium text-amber-800">Achievements Unlocked</p>
            <p className="text-xs text-amber-600 mt-1">Out of 50+ total</p>
          </motion.div>

          {/* Total Points */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-br from-gray-50 to-gray-200/40 rounded-[20px] p-6 border border-black/10 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-black" />
              </div>
              <div className="text-[28px] font-bold text-black">{stats.totalPoints}</div>
            </div>
            <p className="text-sm font-medium text-black">Total Points</p>
            <p className="text-xs text-black/60 mt-1">Keep earning more!</p>
          </motion.div>

          {/* Current Streak */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-[20px] p-6 border border-orange-200/50 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-[28px] font-bold text-orange-900">{stats.currentStreak}</div>
            </div>
            <p className="text-sm font-medium text-orange-800">Day Streak</p>
            <p className="text-xs text-orange-600 mt-1">
              {stats.currentStreak > 0 ? 'Keep it going!' : 'Start your streak today'}
            </p>
          </motion.div>

          {/* Videos Completed */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-[20px] p-6 border border-blue-200/50 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-[28px] font-bold text-blue-900">
                {userStats?.totalVideosCompleted || 0}
              </div>
            </div>
            <p className="text-sm font-medium text-blue-800">Videos Completed</p>
            <p className="text-xs text-blue-600 mt-1">Your learning progress</p>
          </motion.div>
        </div>

        {/* Next Milestone Progress */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-[20px] p-6 border border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-black to-black/80 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-black">Next Milestone</h4>
                <p className="text-sm text-black/60">{stats.nextMilestone.title}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-black">
                {stats.nextMilestone.progress}/{stats.nextMilestone.total}
              </div>
              <p className="text-xs text-black/50">Progress</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-black/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-black via-black/90 to-black/80 rounded-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
          <p className="text-xs text-black/50 mt-2 text-center">
            {progressPercentage === 100
              ? '🎉 Milestone reached! Check for new achievements.'
              : `${Math.round(progressPercentage)}% complete - Keep going!`}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="text-center p-4 bg-white rounded-[16px] border border-black/5">
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-2">
              <Crown className="h-4 w-4 text-cyan-600" />
            </div>
            <div className="text-xl font-bold text-black">
              {stats.totalUnlocked >= 10 ? 'Expert' : stats.totalUnlocked >= 5 ? 'Advanced' : 'Beginner'}
            </div>
            <p className="text-xs text-black/50">Level</p>
          </div>

          <div className="text-center p-4 bg-white rounded-[16px] border border-black/5">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-xl font-bold text-black">
              {userStats?.weeklyGoal?.progress || 0}%
            </div>
            <p className="text-xs text-black/50">Weekly Goal</p>
          </div>

          <div className="text-center p-4 bg-white rounded-[16px] border border-black/5">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-2">
              <Trophy className="h-4 w-4 text-pink-600" />
            </div>
            <div className="text-xl font-bold text-black">
              {stats.totalPoints >= 500 ? 'Gold' : stats.totalPoints >= 200 ? 'Silver' : 'Bronze'}
            </div>
            <p className="text-xs text-black/50">Rank</p>
          </div>

          <div className="text-center p-4 bg-white rounded-[16px] border border-black/5">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="h-4 w-4 text-gray-700" />
            </div>
            <div className="text-xl font-bold text-black">
              {userStats?.totalPlaylists || 0}
            </div>
            <p className="text-xs text-black/50">Playlists</p>
          </div>
        </div>
      </div>
    </div>
  );
}
