
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3Icon, CheckCircle, TrendingUpIcon, ClockIcon, ListChecksIcon } from 'lucide-react';
import type { Playlist, Video } from '@/types';
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

interface OverallStats {
  playlistsCompleted: number;
  videosWatched: number;
  totalLearningTime: string; 
  averageCompletion: number; 
}

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

const learningTrendsData = [
  { day: "Mon", videosWatched: 2 },
  { day: "Tue", videosWatched: 3 },
  { day: "Wed", videosWatched: 1 },
  { day: "Thu", videosWatched: 4 },
  { day: "Fri", videosWatched: 2 },
  { day: "Sat", videosWatched: 5 },
  { day: "Sun", videosWatched: 3 },
];

const chartConfig = {
  videosWatched: {
    label: "Videos Watched",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export default function ProgressPage() {
  const [overallStats, setOverallStats] = useState<OverallStats>({
    playlistsCompleted: 0,
    videosWatched: 0,
    totalLearningTime: "0 minutes",
    averageCompletion: 0,
  });
  const [recentPlaylistsProgress, setRecentPlaylistsProgress] = useState<RecentPlaylistProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedPlaylistsRaw = localStorage.getItem('userPlaylists');
      const storedPlaylists = storedPlaylistsRaw ? JSON.parse(storedPlaylistsRaw) as Playlist[] : [];
      
      if (storedPlaylists.length === 0) {
        setOverallStats({
          playlistsCompleted: 0,
          videosWatched: 0,
          totalLearningTime: "0 minutes",
          averageCompletion: 0,
        });
        setRecentPlaylistsProgress([]);
        setIsLoading(false);
        return;
      }

      let totalVideos = 0;
      let totalCompletedVideos = 0;
      let sumOfCompletionPercentages = 0;
      let totalLearningSeconds = 0;
      let completedPlaylistsCount = 0;

      const processedPlaylistsActivity: RecentPlaylistProgress[] = [];

      storedPlaylists.forEach(playlist => {
        if (!playlist.videos || playlist.videos.length === 0) return;

        let playlistCompletedVideos = 0;
        let playlistTotalCompletion = 0;
        
        playlist.videos.forEach(video => {
          totalVideos++;
          const completion = video.completionStatus || 0;
          playlistTotalCompletion += completion;
          sumOfCompletionPercentages += completion;
          if (completion === 100) {
            totalCompletedVideos++;
            playlistCompletedVideos++;
            totalLearningSeconds += parseDurationToSeconds(video.duration);
          }
        });

        const playlistProgress = playlist.videos.length > 0 ? playlistTotalCompletion / playlist.videos.length : 0;
        if (playlistProgress === 100) {
          completedPlaylistsCount++;
        }
        
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


      setOverallStats({
        playlistsCompleted: completedPlaylistsCount,
        videosWatched: totalCompletedVideos,
        totalLearningTime: formatSecondsToHoursMinutes(totalLearningSeconds),
        averageCompletion: totalVideos > 0 ? parseFloat((sumOfCompletionPercentages / totalVideos).toFixed(0)) : 0,
      });
      setRecentPlaylistsProgress(processedPlaylistsActivity.slice(0, 5)); 

    } catch (error) {
      console.error("Error processing progress data:", error);
       setOverallStats({
          playlistsCompleted: 0,
          videosWatched: 0,
          totalLearningTime: "0 minutes",
          averageCompletion: 0,
        });
        setRecentPlaylistsProgress([]);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Calculating progress...</p>
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
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playlists Completed</CardTitle>
            <ListChecksIcon className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overallStats.playlistsCompleted}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Watched</CardTitle>
            <CheckCircle className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overallStats.videosWatched}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Learning Time</CardTitle>
            <ClockIcon className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overallStats.totalLearningTime}</div>
            <p className="text-xs text-muted-foreground">(Sum of completed video durations)</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <TrendingUpIcon className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overallStats.averageCompletion}%</div>
            <Progress value={overallStats.averageCompletion} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

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
           <CardDescription>Videos watched over the last 7 days (sample data).</CardDescription>
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
    </div>
  );
}

