
'use client'; 

import { useState, useEffect, useId } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/playlists/video-player';
import { PlaylistChatbot } from '@/components/playlists/playlist-chatbot';
import { MindMapDisplay } from '@/components/playlists/mind-map-display';
import { OtherLearnersProgress } from '@/components/playlists/other-learners-progress'; 
import { VideoProgressItem } from '@/components/playlists/video-progress-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { BrainIcon, MessageCircleIcon, ListIcon, InfoIcon, PercentIcon, CheckCircle2Icon, CircleIcon, LightbulbIcon, UsersIcon } from 'lucide-react'; 
import type { Playlist, Video } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { PlaylistQuiz } from '@/components/playlists/playlist-quiz';

// Placeholder data fetching function for fallback
async function getOriginalMockPlaylistDetails(playlistId: string): Promise<Playlist | null> {
  await new Promise(resolve => setTimeout(resolve, 100)); 
  
  const mockVideos: Video[] = [
    { id: 'Tn6-PIqc4UM', title: 'React in 100 Seconds', youtubeURL: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM', thumbnail: 'https://i.ytimg.com/vi/Tn6-PIqc4UM/hqdefault.jpg', duration: '2:18', addedBy: 'user1', completionStatus: 100, summary: 'A quick introduction to React by Fireship.' },
    { id: 'Sklc_fQBmcs', title: 'Next.js in 100 Seconds', youtubeURL: 'https://www.youtube.com/watch?v=Sklc_fQBmcs', thumbnail: 'https://i.ytimg.com/vi/Sklc_fQBmcs/hqdefault.jpg', duration: '2:23', addedBy: 'user1', completionStatus: 60, summary: 'A quick overview of Next.js by Fireship.' },
    { id: 'qz0aGYrrlhU', title: 'HTML Full Course by Mosh', youtubeURL: 'https://www.youtube.com/watch?v=qz0aGYrrlhU', thumbnail: 'https://i.ytimg.com/vi/qz0aGYrrlhU/hqdefault.jpg', duration: '1:00:00', addedBy: 'user1', completionStatus: 20, summary: 'Learn HTML in one hour.' },
    { id: 'OEV8gMkCHXQ', title: 'CSS in 100 Seconds', youtubeURL: 'https://www.youtube.com/watch?v=OEV8gMkCHXQ', thumbnail: 'https://i.ytimg.com/vi/OEV8gMkCHXQ/hqdefault.jpg', duration: '2:15', addedBy: 'user1', completionStatus: 0, summary: 'A quick introduction to CSS by Fireship.' },
  ];
  
  const baseDate = new Date('2023-01-01T00:00:00Z');
  if (playlistId === "1" || playlistId === "2" || playlistId === "3") {
     return {
      id: playlistId,
      title: playlistId === "1" ? 'Web Development Fundamentals (Mock)' : playlistId === "2" ? 'Python for Data Science (Mock)' : 'React Native Development (Mock)',
      description: 'This is a detailed description of the MOCK playlist focusing on its core concepts and learning objectives. It covers various topics including X, Y, and Z.',
      userId: 'user1',
      createdAt: new Date(baseDate.setDate(baseDate.getDate() + parseInt(playlistId) * 10)),
      lastModified: new Date(baseDate.setDate(baseDate.getDate() + parseInt(playlistId) * 10)),
      videos: mockVideos,
      aiRecommended: playlistId === "2",
      tags: ['sample', 'learning', 'tech', 'mock'],
    };
  }
  return null;
}


export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.playlistId as string;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const videoPlayerKey = useId(); 

  useEffect(() => {
    if (playlistId) {
      setIsLoading(true);
      let foundPlaylist: Playlist | null = null;
      try {
        const storedPlaylistsRaw = localStorage.getItem('userPlaylists');
        if (storedPlaylistsRaw) {
          const storedPlaylists = JSON.parse(storedPlaylistsRaw) as Playlist[];
          foundPlaylist = storedPlaylists.find(p => p.id === playlistId) || null;
          if (foundPlaylist) {
            // Ensure dates are Date objects
            foundPlaylist.createdAt = new Date(foundPlaylist.createdAt);
            foundPlaylist.lastModified = new Date(foundPlaylist.lastModified); 
            foundPlaylist.videos = foundPlaylist.videos.map(v => ({
                ...v, 
            }));
          }
        }
      } catch (error) {
        console.error("Error loading playlist from localStorage:", error);
      }

      if (foundPlaylist) {
        setPlaylist(foundPlaylist);
        if (foundPlaylist.videos.length > 0) {
          setCurrentVideo(foundPlaylist.videos[0]);
        }
        setIsLoading(false);
      } else {
        // Fallback to original mock data if not in localStorage
        getOriginalMockPlaylistDetails(playlistId).then(data => {
          setPlaylist(data);
          if (data && data.videos.length > 0) {
            setCurrentVideo(data.videos[0]);
          }
          setIsLoading(false);
        });
      }
    }
  }, [playlistId]);

  const handleSelectVideo = (video: Video) => {
    setCurrentVideo(video);
  };
  
  const compiledPlaylistContentForRAG = playlist ? 
    `Playlist Title: ${playlist.title}\nPlaylist Description: ${playlist.description}\n\nVideo Content:\n${playlist.videos.map(v => `Video Title: ${v.title}\nVideo Summary: ${v.summary || 'No summary available.'}\nVideo Transcript (if available): ${v.transcript || 'No transcript available.'}`).join('\n\n---\n\n')}`
    : "No playlist content available.";

  const handleToggleCompletion = (videoId: string) => {
    if (!playlist || !playlist.videos) return;

    const updatedVideos = playlist.videos.map(video => {
      if (video.id === videoId) {
        return { ...video, completionStatus: video.completionStatus === 100 ? 0 : 100 };
      }
      return video;
    });

    const updatedPlaylist = { ...playlist, videos: updatedVideos, lastModified: new Date() }; 
    setPlaylist(updatedPlaylist);

    if (currentVideo && currentVideo.id === videoId) {
      setCurrentVideo(prevCurrentVideo => {
        if (!prevCurrentVideo) return null;
        return {
            ...prevCurrentVideo,
            completionStatus: prevCurrentVideo.completionStatus === 100 ? 0 : 100
        };
      });
    }
    
    try {
      const storedPlaylistsRaw = localStorage.getItem('userPlaylists');
      const storedPlaylists = storedPlaylistsRaw ? JSON.parse(storedPlaylistsRaw) as Playlist[] : [];
      const playlistIndex = storedPlaylists.findIndex(p => p.id === playlistId);
      if (playlistIndex > -1) {
        storedPlaylists[playlistIndex] = updatedPlaylist;
        localStorage.setItem('userPlaylists', JSON.stringify(storedPlaylists));
        toast({
          title: "Progress Updated",
          description: `Video completion status changed.`,
        });
      } else {
        console.warn("Tried to update progress for a playlist not found in localStorage (likely a mock).");
      }
    } catch (error) {
      console.error("Error updating playlist in localStorage:", error);
      toast({
        title: "Error",
        description: "Could not save progress. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return <div className="text-center py-10">Playlist not found. Ensure it was created or try a different ID.</div>;
  }
  
  const overallProgress = playlist.videos.length > 0 
    ? playlist.videos.reduce((acc, vid) => acc + (vid.completionStatus || 0), 0) / playlist.videos.length
    : 0;


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-2/3 flex flex-col gap-6">
        {currentVideo && <VideoPlayer key={videoPlayerKey + currentVideo.id} videoUrl={currentVideo.youtubeURL} videoTitle={currentVideo.title} />}
        
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-5 md:grid-cols-6 bg-card border">
            <TabsTrigger value="info"><InfoIcon className="w-4 h-4 mr-1 md:mr-2" />Info</TabsTrigger>
            <TabsTrigger value="chatbot"><MessageCircleIcon className="w-4 h-4 mr-1 md:mr-2" />Chatbot</TabsTrigger>
            <TabsTrigger value="mindmap"><BrainIcon className="w-4 h-4 mr-1 md:mr-2" />Mind Map</TabsTrigger>
            <TabsTrigger value="quiz"><LightbulbIcon className="w-4 h-4 mr-1 md:mr-2" />Quiz</TabsTrigger>
            <TabsTrigger value="fellows" className="sm:flex"><UsersIcon className="w-4 h-4 mr-1 md:mr-2" />Learners</TabsTrigger> 
            <TabsTrigger value="progress" className="hidden md:flex"><PercentIcon className="w-4 h-4 mr-1 md:mr-2" />Progress</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-4 p-4 border rounded-lg bg-card">
            <h2 className="text-2xl font-semibold mb-2 text-primary">{playlist.title}</h2>
            <p className="text-muted-foreground mb-1">
              {playlist.videos.length} videos
              {playlist.aiRecommended && <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">AI Recommended</span>}
            </p>
            <p className="text-sm mb-4">{playlist.description}</p>
            
            {currentVideo && (
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold text-primary">Current Video: {currentVideo.title}</h3>
                {currentVideo.summary && (
                  <div>
                    <h4 className="font-medium">Summary:</h4>
                    <p className="text-sm text-muted-foreground">{currentVideo.summary}</p>
                  </div>
                )}
                {currentVideo.youtubeURL && (
                  <div className="mt-1">
                    <a href={currentVideo.youtubeURL} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Watch on YouTube
                    </a>
                  </div>
                )}
                <Button 
                  onClick={() => handleToggleCompletion(currentVideo.id)}
                  variant={currentVideo.completionStatus === 100 ? "secondary" : "default"}
                  size="sm"
                  className="mt-2"
                >
                  {currentVideo.completionStatus === 100 ? 
                    <><CheckCircle2Icon className="mr-2 h-4 w-4" /> Mark as Incomplete</> : 
                    <><CircleIcon className="mr-2 h-4 w-4" /> Mark as Completed</>}
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="chatbot" className="mt-4">
             <PlaylistChatbot playlistId={playlist.id} playlistContent={compiledPlaylistContentForRAG} />
          </TabsContent>
          <TabsContent value="mindmap" className="mt-4">
            <MindMapDisplay playlistTitle={playlist.title} playlistId={playlist.id}/>
          </TabsContent>
           <TabsContent value="quiz" className="mt-4">
            <PlaylistQuiz 
              playlistId={playlist.id} 
              playlistTitle={playlist.title} 
              playlistContent={compiledPlaylistContentForRAG} 
            />
          </TabsContent>
          <TabsContent value="fellows" className="mt-4"> 
            <OtherLearnersProgress playlistTitle={playlist.title} />
          </TabsContent>
          <TabsContent value="progress" className="mt-4 p-4 border rounded-lg bg-card">
             <h3 className="text-xl font-semibold mb-2">Overall Progress: {overallProgress.toFixed(0)}%</h3>
             <div className="w-full bg-muted rounded-full h-4 mb-1 shadow-inner">
                <div 
                    className="bg-primary h-4 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${overallProgress.toFixed(0)}%` }}
                    aria-valuenow={overallProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                    aria-label={`Overall playlist progress ${overallProgress.toFixed(0)}%`}
                ></div>
            </div>
            <p className="text-xs text-muted-foreground text-right">{overallProgress.toFixed(0)}% complete</p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:w-1/3 lg:max-h-full flex flex-col">
        <Card className="flex-grow flex flex-col shadow-lg overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center">
              <ListIcon className="h-6 w-6 mr-2 text-primary" />
              Playlist Videos
            </CardTitle>
            <CardDescription>Select a video to play. ({playlist.videos.length} total)</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-grow overflow-hidden">
            <ScrollArea className="h-full max-h-[calc(100vh-theme(spacing.24)-theme(spacing.12)-4rem)]"> 
              <div className="p-2 space-y-1">
                {playlist.videos.map((video) => (
                  <VideoProgressItem
                    key={video.id}
                    video={video}
                    isActive={currentVideo?.id === video.id}
                    onSelectVideo={handleSelectVideo}
                  />
                ))}
                 {playlist.videos.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground">No videos in this playlist yet.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
