import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3Icon, CheckCircle, TrendingUpIcon } from 'lucide-react';

// Placeholder data - replace with actual data fetching and types
const overallStats = {
  playlistsCompleted: 3,
  videosWatched: 42,
  totalLearningTime: "25 hours",
  averageCompletion: 68, // percentage
};

const recentPlaylistsProgress = [
  { id: '1', title: 'Advanced JavaScript', progress: 75, lastActivity: '2 days ago' },
  { id: '2', title: 'Python for Data Science', progress: 40, lastActivity: '5 days ago' },
  { id: '3', title: 'React Native Development', progress: 90, lastActivity: '1 day ago' },
  { id: '4', title: 'The Art of Prompt Engineering', progress: 25, lastActivity: 'Today' },
];

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center">
          <BarChart3Icon className="mr-3 h-8 w-8" />
          My Learning Progress
        </h1>
        {/* Potential actions: Export report, Set goals */}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playlists Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overallStats.playlistsCompleted}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Watched</CardTitle>
            <TrendingUpIcon className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overallStats.videosWatched}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Learning Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{overallStats.totalLearningTime}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
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
          <CardDescription>Overview of your progress in ongoing playlists.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {recentPlaylistsProgress.map((playlist) => (
            <div key={playlist.id} className="p-4 border rounded-lg bg-background/50 hover:border-primary transition-colors">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-lg text-foreground">{playlist.title}</h3>
                <span className="text-sm text-muted-foreground">{playlist.lastActivity}</span>
              </div>
              <Progress value={playlist.progress} className="h-3 mb-1" />
              <p className="text-xs text-muted-foreground text-right">{playlist.progress}% complete</p>
            </div>
          ))}
           {recentPlaylistsProgress.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No recent activity to display. Start a playlist!</p>
          )}
        </CardContent>
      </Card>
      
      {/* Placeholder for more detailed charts or visualizations */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Learning Trends (Placeholder)</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center bg-muted rounded-md">
          <p className="text-muted-foreground">Detailed charts and visualizations coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
