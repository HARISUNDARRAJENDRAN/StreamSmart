'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  PlusCircleIcon, 
  BookOpenCheckIcon, 
  ZapIcon, 
  TrendingUpIcon, 
  ClockIcon, 
  CirclePlay, 
  AwardIcon, 
  StarIcon, 
  Flame, 
  CalendarIcon,
  TargetIcon,
  BrainIcon,
  UsersIcon,
  ChevronRightIcon,
  Trophy,
  Bookmark,
  CircleCheck
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Playlist } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';
import { WeeklyGoalSettings } from '@/components/dashboard/weekly-goal-settings';
import { AchievementsSystem } from '@/components/achievements/achievements-system';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, userStats, isAuthenticated, recordActivity } = useUser();

  useEffect(() => {
    const loadPlaylists = async () => {
      if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    try {
        const userPlaylists = await playlistService.getPlaylists(user.id);
        
        const processedPlaylists = userPlaylists.slice(0, 3).map((p: any) => ({
          ...p,
          id: p._id, // MongoDB uses _id
          createdAt: new Date(p.createdAt),
          lastModified: new Date(p.updatedAt || p.createdAt),
          videos: p.videos || [],
          tags: p.tags || [],
          userId: p.userId,
          overallProgress: p.overallProgress || 0,
        }));
        
        setPlaylists(processedPlaylists);
    } catch (error) {
      console.error("Error loading playlists:", error);
    }
    setIsLoading(false);
    };

    loadPlaylists();
  }, [user, isAuthenticated]);

  // Remove the old achievements array - we'll use the new AchievementsSystem component

  const recommendations = [
    {
      title: "Advanced React Patterns",
      description: "Based on your React learning",
      thumbnail: "https://i.ytimg.com/vi/BcVAq3YFiuc/hqdefault.jpg",
      duration: "45 min",
      difficulty: "Advanced"
    },
    {
      title: "TypeScript for Beginners",
      description: "Next step in your journey",
      thumbnail: "https://i.ytimg.com/vi/BwuLxPH8IDs/hqdefault.jpg",
      duration: "2h 15min",
      difficulty: "Beginner"
    }
  ];

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <h2 className="text-2xl font-bold mb-4">Welcome to StreamSmart!</h2>
        <p className="text-muted-foreground mb-6">Please sign in to access your dashboard.</p>
        <Link href="/login">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Sign In to Continue
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      {/* Welcome Header */}
      <motion.section variants={fadeInUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent p-8 text-primary-foreground">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white/20">
                <AvatarImage src={user?.avatarUrl || "https://placehold.co/100x100.png"} alt={user?.name} />
                <AvatarFallback className="bg-white/20 text-white font-semibold">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Learner'}! 👋</h1>
                <p className="text-lg text-primary-foreground/80">Ready to continue your learning journey?</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-300" />
                <span>{userStats?.currentStreak || 0} day streak</span>
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4 text-blue-300" />
                <span>{userStats?.totalLearningTime || '0h 0m'} total</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUpIcon className="h-4 w-4 text-green-300" />
                <span>{userStats?.overallProgress || 0}% complete</span>
              </div>
            </div>
          </div>
          <Link href="/playlists/create">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg transition-all duration-300 hover:scale-105">
              <PlusCircleIcon className="mr-2 h-5 w-5" />
              Create New Playlist
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Stats Overview */}
      <motion.section variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Playlists</p>
                <p className="text-3xl font-bold text-blue-600">{userStats?.totalPlaylists || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpenCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Videos Completed</p>
                <p className="text-3xl font-bold text-green-600">{userStats?.totalVideosCompleted || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CircleCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Streak</p>
                <p className="text-3xl font-bold text-orange-600">{userStats?.currentStreak || 0} days</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
                <p className="text-3xl font-bold text-purple-600">{userStats?.overallProgress || 0}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Continue Learning */}
          <motion.section variants={fadeInUp}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <CirclePlay className="h-6 w-6 text-primary" />
                Continue Learning
              </h2>
              <Link href="/playlists">
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  View All <ChevronRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {playlists.map((playlist) => {
                  const playlistProgress = playlist.videos.length > 0 
                    ? playlist.videos.reduce((acc, vid) => acc + (vid.completionStatus || 0), 0) / playlist.videos.length
                    : 0;
                  
                  return (
                    <motion.div
                      key={playlist.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
                        <Link href={`/playlists/${playlist.id}`}>
                          <div className="relative">
                            <Image 
                              src={playlist.videos[0]?.thumbnail || `https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,15))}`}
                              alt={playlist.title} 
                              width={400} 
                              height={240} 
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Progress value={playlistProgress} className="h-2" />
                              <p className="text-white text-sm mt-2">{Math.round(playlistProgress)}% complete</p>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                              {playlist.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {playlist.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{playlist.videos.length} videos</span>
                              {playlist.aiRecommended && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
                                  <ZapIcon className="w-3 h-3 mr-1" />
                                  AI Curated
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center p-12 border-dashed border-2">
                <BookOpenCheckIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start your learning journey by creating your first playlist or let our AI suggest content for you.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/playlists/create">
                    <Button className="w-full sm:w-auto">
                      <PlusCircleIcon className="mr-2 h-4 w-4" />
                      Create Playlist
                    </Button>
                  </Link>
                  <Link href="/playlists">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ZapIcon className="mr-2 h-4 w-4" />
                      Explore AI Suggestions
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </motion.section>

          {/* AI Recommendations */}
          <motion.section variants={fadeInUp}>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <BrainIcon className="h-6 w-6 text-primary" />
              Recommended for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((rec, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="relative">
                    <Image 
                      src={rec.thumbnail}
                      alt={rec.title}
                      width={400}
                      height={200}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                      {rec.difficulty}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {rec.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {rec.duration}
                      </span>
                      <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                        <Bookmark className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Achievements */}
          <motion.section variants={fadeInUp}>
            <AchievementsSystem maxDisplay={4} />
          </motion.section>

          {/* Recent Activity */}
          <motion.section variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userStats?.recentActivity && userStats.recentActivity.length > 0 ? (
                  userStats.recentActivity.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-accent/50 mt-0.5">
                        {activity.type === 'completed' && <CircleCheck className="h-4 w-4 text-green-500" />}
                        {activity.type === 'started' && <CirclePlay className="h-4 w-4 text-blue-500" />}
                        {activity.type === 'quiz' && <AwardIcon className="h-4 w-4 text-yellow-500" />}
                        {activity.type === 'created' && <PlusCircleIcon className="h-4 w-4 text-purple-500" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action}</span>{' '}
                          <span className="text-muted-foreground">{activity.item}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity yet. Start learning to see your progress here!
                  </p>
                )}
                <Button variant="outline" className="w-full mt-4">
                  View Activity Log
                </Button>
              </CardContent>
            </Card>
          </motion.section>

          {/* Learning Goals */}
          <motion.section variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5 text-green-500" />
                  Weekly Goal
                  </span>
                  <WeeklyGoalSettings />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Videos watched this week</span>
                    <span className="font-medium">
                      {userStats?.weeklyGoal.completed || 0} / {userStats?.weeklyGoal.target || 15}
                    </span>
                  </div>
                  <Progress value={userStats?.weeklyGoal.progress || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {userStats?.weeklyGoal.target ? 
                      `${Math.max(0, userStats.weeklyGoal.target - userStats.weeklyGoal.completed)} more videos to reach your weekly goal! 🎯` :
                      'Set a weekly goal to track your progress! 🎯'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
