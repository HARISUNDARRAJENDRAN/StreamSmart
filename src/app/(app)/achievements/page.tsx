'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Filter, Star, Flame, BookOpenCheck, Target, Zap, Brain, Crown } from 'lucide-react';
import { AchievementsSystem } from '@/components/achievements/achievements-system';
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
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-full" style={{ background: 'hsl(var(--primary))' }}>
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Achievements</h1>
        </div>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Track your learning journey and unlock achievements as you progress. 
          Complete videos, maintain streaks, and explore AI features to earn points and badges!
        </p>
      </div>

      {/* Achievement Categories */}
      <Card className="bg-gradient-to-r from-black to-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
              <Filter className="h-4 w-4 text-white" />
            </div>
            Categories
          </CardTitle>
          <CardDescription className="text-gray-300">
            Filter achievements by category to focus on specific goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 ${
                  selectedCategory === category.id 
                    ? "text-white" 
                    : "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
                style={selectedCategory === category.id ? { background: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : undefined}
              >
                {category.icon}
                {category.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Tips */}
      <Card className="border" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
              <Brain className="h-4 w-4 text-white" />
            </div>
            Pro Tips for Earning Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 shrink-0" style={{ background: 'color-mix(in hsl, hsl(var(--primary)) 15%, white)' }}>
                <Flame className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Maintain Daily Streaks</p>
                <p className="text-gray-400">Complete at least one video daily to build learning streaks</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                <Zap className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Speed Learning Days</p>
                <p className="text-gray-400">Complete multiple videos in one day for speed achievements</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 shrink-0" style={{ background: 'color-mix(in hsl, hsl(var(--primary)) 15%, white)' }}>
                <Brain className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Explore AI Features</p>
                <p className="text-gray-400">Use quizzes, mind maps, and AI chat to unlock special achievements</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                <Target className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Set Weekly Goals</p>
                <p className="text-gray-400">Customize and achieve your weekly learning targets</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Display */}
      <AchievementsSystem showAll={true} />

      {/* Achievement Tiers Info */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Tiers</CardTitle>
          <CardDescription>
            Achievements are categorized into different tiers based on difficulty and rarity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-amber-800">Bronze</h3>
              <p className="text-xs text-amber-600 mt-1">10-30 points</p>
              <p className="text-xs text-amber-700 mt-1">Basic achievements for getting started</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Silver</h3>
              <p className="text-xs text-gray-600 mt-1">50-100 points</p>
              <p className="text-xs text-gray-700 mt-1">Intermediate milestones</p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-800">Gold</h3>
              <p className="text-xs text-yellow-600 mt-1">150-500 points</p>
              <p className="text-xs text-yellow-700 mt-1">Advanced accomplishments</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-800">Platinum</h3>
              <p className="text-xs text-purple-600 mt-1">500-1000 points</p>
              <p className="text-xs text-purple-700 mt-1">Rare and special achievements</p>
            </div>
            
            <div className="text-center p-4 bg-cyan-50 rounded-lg border border-cyan-200">
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Crown className="h-6 w-6 text-cyan-600" />
              </div>
              <h3 className="font-semibold text-cyan-800">Diamond</h3>
              <p className="text-xs text-cyan-600 mt-1">1000+ points</p>
              <p className="text-xs text-cyan-700 mt-1">Legendary achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 