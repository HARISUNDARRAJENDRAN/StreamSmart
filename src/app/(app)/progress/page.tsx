'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3Icon, CheckCircle, TrendingUpIcon, ClockIcon, ListChecksIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';
import { useToast } from "@/hooks/use-toast";

interface RecentPlaylistProgress {
  id: string;
  title: string;
  progress: number; 
  lastActivity: string; 
  videoCount: number;
  completedVideoCount: number;
}

function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr || durationStr === 'N/A' || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  let seconds = 0;
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) { // HH:MM:SS
    seconds += parts[0] * 3600;
    seconds += parts[1] * 60;
    seconds += parts[2];
  } else if (parts.length === 2) { // MM:SS
    seconds += parts[0] * 60;
    seconds += parts[1];
  } else if (parts.length === 1) { // SS
    seconds += parts[0];
  }
  return seconds;
}

function formatSecondsToHoursMinutes(totalSeconds: number): string {
  if (totalSeconds === 0) return "0 minutes";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  let timeString = "";
  if (hours > 0) {
    timeString += `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    if (timeString.length > 0) timeString += " ";
    timeString += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (timeString.length === 0 && totalSeconds > 0) {
      return "< 1 minute";
  }
  return timeString || "0 minutes";
}

// Generate learning trends data based on recent activities
function generateLearningTrends(activities: any[]): any[] {
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    const dayActivities = activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate.toDateString() === date.toDateString() && 
             activity.type === 'completed';
    });
    
    last7Days.push({
      day: dayName,
      videosWatched: dayActivities.length,
    });
  }
  
  return last7Days;
}

const chartConfig = {
  videosWatched: {
    label: "Videos Watched",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function ProgressPage() {
  const { user, userStats, isLoading: userLoading, updateUserStats } = useUser();
  const [recentPlaylistsProgress, setRecentPlaylistsProgress] = useState<RecentPlaylistProgress[]>([]);
  const [learningTrendsData, setLearningTrendsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { toast } = useToast();

  const fetchProgressData = async (forceRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Prevent frequent refetches (minimum 30 seconds between automatic fetches)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < 30000) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch playlists from MongoDB
      const playlists = await playlistService.getPlaylists(user.id);
      
      // Fetch all activities for trends
      const allActivities = await playlistService.getActivities(user.id, 100);
      
      // Process playlist progress
      const processedPlaylistsActivity: RecentPlaylistProgress[] = [];

      playlists.forEach((playlist: any) => {
        if (!playlist.videos || playlist.videos.length === 0) return;

        let playlistCompletedVideos = 0;
        let playlistTotalCompletion = 0;
        
        playlist.videos.forEach((video: any) => {
          const completion = video.completionStatus || 0;
          playlistTotalCompletion += completion;
          if (completion === 100) {
            playlistCompletedVideos++;
          }
        });

        const playlistProgress = playlist.videos.length > 0 ? playlistTotalCompletion / playlist.videos.length : 0;
        
        processedPlaylistsActivity.push({
          id: playlist._id || playlist.id,
          title: playlist.title,
          progress: parseFloat(playlistProgress.toFixed(0)),
          lastActivity: new Date(playlist.lastModified || playlist.createdAt).toLocaleDateString(),
          videoCount: playlist.videos.length,
          completedVideoCount: playlistCompletedVideos,
        });
      });
      
      // Sort by last activity
      processedPlaylistsActivity.sort((a, b) => {
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      setRecentPlaylistsProgress(processedPlaylistsActivity.slice(0, 5)); 
      
      // Generate learning trends
      const trends = generateLearningTrends(allActivities);
      setLearningTrendsData(trends);

      // Update user stats only if this is a forced refresh
      if (forceRefresh) {
        updateUserStats();
      }

      setLastFetchTime(now);

    } catch (error) {
      console.error("Error fetching progress data:", error);
      
      // Fallback to localStorage if MongoDB fails
      try {
        const storedPlaylistsRaw = localStorage.getItem('userPlaylists');
        const storedPlaylists = storedPlaylistsRaw ? JSON.parse(storedPlaylistsRaw) : [];
        const userPlaylists = storedPlaylists.filter((p: any) => p.userId === user.id);
        
        const processedPlaylistsActivity: RecentPlaylistProgress[] = [];

        userPlaylists.forEach((playlist: any) => {
          if (!playlist.videos || playlist.videos.length === 0) return;

          let playlistCompletedVideos = 0;
          let playlistTotalCompletion = 0;
          
          playlist.videos.forEach((video: any) => {
            const completion = video.completionStatus || 0;
            playlistTotalCompletion += completion;
            if (completion === 100) {
              playlistCompletedVideos++;
            }
          });

          const playlistProgress = playlist.videos.length > 0 ? playlistTotalCompletion / playlist.videos.length : 0;
          
          processedPlaylistsActivity.push({
            id: playlist.id,
            title: playlist.title,
            progress: parseFloat(playlistProgress.toFixed(0)),
            lastActivity: new Date(playlist.lastModified || playlist.createdAt).toLocaleDateString(),
            videoCount: playlist.videos.length,
            completedVideoCount: playlistCompletedVideos,
          });
        });
        
        processedPlaylistsActivity.sort((a, b) => {
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

        setRecentPlaylistsProgress(processedPlaylistsActivity.slice(0, 5));
        
        // Generate trends from localStorage activities
        const activityLog = JSON.parse(localStorage.getItem(`userActivity_${user.id}`) || '[]');
        const trends = generateLearningTrends(activityLog);
        setLearningTrendsData(trends);
        
      } catch (fallbackError) {
        console.error("Error with localStorage fallback:", fallbackError);
        setRecentPlaylistsProgress([]);
        setLearningTrendsData([]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProgressData();
  }, [user]); // Removed updateUserStats from dependencies to prevent excessive calls

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Calculating progress...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Please log in to view your progress</p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center">
          <BarChart3Icon className="mr-3 h-8 w-8" />
          My Learning Progress
        </h1>
        <Button 
          variant="outline" 
          onClick={async () => {
            toast({
              title: "Refreshing progress data...",
              description: "Please wait while we refresh your progress data.",
            });
            try {
              await fetchProgressData(true); // Force refresh
              toast({
                title: "Progress Updated! ✅",
                description: "Your progress data has been refreshed.",
              });
            } catch (error) {
              console.error("Error refreshing progress:", error);
              toast({
                title: "Refresh Error",
                description: "Could not refresh progress data. Please try again.",
                variant: "destructive",
              });
            }
          }}
          disabled={isLoading}
        >
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playlists Completed</CardTitle>
            <ListChecksIcon className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {userStats?.totalPlaylists || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Watched</CardTitle>
            <CheckCircle className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {userStats?.totalVideosCompleted || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Learning Time</CardTitle>
            <ClockIcon className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {userStats?.totalLearningTime || "0h 0m"}
            </div>
            <p className="text-xs text-muted-foreground">(Estimated from completed videos)</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUpIcon className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {userStats?.overallProgress || 0}%
            </div>
            <Progress value={userStats?.overallProgress || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Weekly Goal Progress */}
      {userStats?.weeklyGoal && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Weekly Learning Goal</CardTitle>
            <CardDescription>
              Your progress towards completing {userStats.weeklyGoal.target} videos this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {userStats.weeklyGoal.completed} / {userStats.weeklyGoal.target} videos
              </span>
              <span className="text-sm text-muted-foreground">
                {userStats.weeklyGoal.progress}%
              </span>
            </div>
            <Progress value={userStats.weeklyGoal.progress} className="h-3" />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Playlist Activity</CardTitle>
          <CardDescription>Overview of your progress in ongoing playlists (sorted by last activity).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {recentPlaylistsProgress.length > 0 ? (
            recentPlaylistsProgress.map((playlist) => (
              <Link href={`/playlists/${playlist.id}`} key={playlist.id} legacyBehavior>
                <a className="block p-4 border rounded-lg bg-card hover:border-primary transition-colors shadow-sm hover:shadow-md">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{playlist.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {playlist.completedVideoCount} / {playlist.videoCount} videos completed
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Last active: {playlist.lastActivity}</span>
                  </div>
                  <Progress value={playlist.progress} className="h-3 mb-1" />
                  <p className="text-xs text-muted-foreground text-right">{playlist.progress}% complete</p>
                </a>
              </Link>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-6">
                <p className="mb-4">No playlist activity yet. Start learning with a playlist to see your progress here!</p>
                <Button asChild variant="outline">
                    <Link href="/playlists">View Playlists</Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Learning Trends</CardTitle>
           <CardDescription>Videos completed over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={learningTrendsData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    allowDecimals={false}
                 />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="videosWatched" fill="var(--color-videosWatched)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {userStats?.recentActivity && userStats.recentActivity.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userStats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'completed' ? 'bg-green-500' :
                      activity.type === 'started' ? 'bg-blue-500' :
                      activity.type === 'created' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.item}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

