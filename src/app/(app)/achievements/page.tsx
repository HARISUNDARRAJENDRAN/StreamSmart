'use client';

import { useState } from 'react';
import { Trophy, Filter, Star, Flame, BookOpenCheck, Target, Zap, Brain, Crown } from 'lucide-react';
import { AchievementsSystem } from '@/components/achievements/achievements-system';
import { UserAchievementSummary } from '@/components/achievements/user-achievement-summary';
import { motion } from 'framer-motion';

const categories = [
  { id: 'all', label: 'All Achievements', icon: <Trophy className="h-4 w-4" /> },
  { id: 'learning', label: 'Learning', icon: <BookOpenCheck className="h-4 w-4" /> },
  { id: 'streak', label: 'Streaks', icon: <Flame className="h-4 w-4" /> },
  { id: 'completion', label: 'Completion', icon: <Star className="h-4 w-4" /> },
  { id: 'speed', label: 'Speed', icon: <Zap className="h-4 w-4" /> },
  { id: 'dedication', label: 'Dedication', icon: <Target className="h-4 w-4" /> },
  { id: 'special', label: 'Special', icon: <Crown className="h-4 w-4" /> },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-12">
      <div className="container mx-auto px-6 max-w-[1400px]">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/5">
                <Trophy className="h-4 w-4 text-black" />
                <span className="text-sm font-medium text-black">Progress</span>
              </div>
            </div>
            <h1 className="text-[58px] font-semibold leading-[64px] tracking-[-0.04em] text-black mb-4">Achievements</h1>
            <p className="text-[18px] text-black/60 max-w-2xl mx-auto">
              Track your learning journey and unlock achievements as you progress. 
              Complete videos, maintain streaks, and explore AI features to earn points and badges!
            </p>
          </div>

          {/* Dynamic User Achievement Summary */}
          <UserAchievementSummary />

          {/* Achievement Categories */}
          <div className="bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)]">
            <div className="p-8 border-b border-black/5">
              <h3 className="text-[18px] font-semibold text-black flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-[12px] bg-black/5 flex items-center justify-center">
                  <Filter className="h-4 w-4 text-black" />
                </div>
                Categories
              </h3>
              <p className="text-black/60">
                Filter achievements by category to focus on specific goals
              </p>
            </div>
            <div className="p-8">
              <div className="flex flex-wrap gap-2.5">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center gap-2.5 px-5 py-3 rounded-full font-medium text-sm transition-all duration-200 ${
                      selectedCategory === category.id 
                        ? "bg-gradient-to-r from-black to-black/90 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
                        : "bg-white border border-black/8 text-black/70 hover:bg-black/[0.02] hover:border-black/15 hover:text-black shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    <span className={selectedCategory === category.id ? "opacity-100" : "opacity-60"}>
                      {category.icon}
                    </span>
                    <span>{category.label}</span>
                    {selectedCategory === category.id && (
                      <motion.div
                        layoutId="activeCategory"
                        className="absolute inset-0 bg-gradient-to-r from-black to-black/90 rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Achievement Tips */}
          <div className="bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)]">
            <div className="p-8 border-b border-black/5">
              <h3 className="text-[18px] font-semibold text-black flex items-center gap-2">
                <div className="w-8 h-8 rounded-[12px] bg-black/5 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-black" />
                </div>
                Pro Tips for Earning Achievements
              </h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-black/5 flex items-center justify-center mt-0.5 shrink-0">
                    <Flame className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Maintain Daily Streaks</p>
                    <p className="text-black/60">Complete at least one video daily to build learning streaks</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-black/5 flex items-center justify-center mt-0.5 shrink-0">
                    <Zap className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Speed Learning Days</p>
                    <p className="text-black/60">Complete multiple videos in one day for speed achievements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-black/5 flex items-center justify-center mt-0.5 shrink-0">
                    <Brain className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Explore AI Features</p>
                    <p className="text-black/60">Use quizzes, mind maps, and AI chat to unlock special achievements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-black/5 flex items-center justify-center mt-0.5 shrink-0">
                    <Target className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Set Weekly Goals</p>
                    <p className="text-black/60">Customize and achieve your weekly learning targets</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Display */}
          <AchievementsSystem showAll={true} />

          {/* Achievement Tiers Info */}
          <div className="bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)]">
            <div className="p-8 border-b border-black/5">
              <h3 className="text-[18px] font-semibold text-black mb-2">Achievement Tiers</h3>
              <p className="text-black/60">
                Achievements are categorized into different tiers based on difficulty and rarity
              </p>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center p-5 bg-amber-50/80 rounded-[16px] border border-amber-200">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trophy className="h-6 w-6 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-amber-900 mb-1">Bronze</h4>
                  <p className="text-xs text-amber-700 font-medium mb-2">10-30 points</p>
                  <p className="text-xs text-amber-800/80">Basic achievements for getting started</p>
                </div>
                
                <div className="text-center p-5 bg-gray-50/80 rounded-[16px] border border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-gray-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Silver</h4>
                  <p className="text-xs text-gray-700 font-medium mb-2">50-100 points</p>
                  <p className="text-xs text-gray-800/80">Intermediate milestones</p>
                </div>
                
                <div className="text-center p-5 bg-yellow-50/80 rounded-[16px] border border-yellow-200">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Gold</h4>
                  <p className="text-xs text-yellow-700 font-medium mb-2">150-500 points</p>
                  <p className="text-xs text-yellow-800/80">Advanced accomplishments</p>
                </div>
                
                <div className="text-center p-5 bg-gray-100 rounded-[16px] border border-black/10">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Crown className="h-6 w-6 text-black" />
                  </div>
                  <h4 className="font-semibold text-black mb-1">Platinum</h4>
                  <p className="text-xs text-black/70 font-medium mb-2">500-1000 points</p>
                  <p className="text-xs text-black/80">Rare and special achievements</p>
                </div>
                
                <div className="text-center p-5 bg-cyan-50/80 rounded-[16px] border border-cyan-200">
                  <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Crown className="h-6 w-6 text-cyan-600" />
                  </div>
                  <h4 className="font-semibold text-cyan-900 mb-1">Diamond</h4>
                  <p className="text-xs text-cyan-700 font-medium mb-2">1000+ points</p>
                  <p className="text-xs text-cyan-800/80">Legendary achievements</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 