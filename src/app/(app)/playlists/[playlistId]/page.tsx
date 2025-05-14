'use client'; // Required for useState, useEffect, and event handlers

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/playlists/video-player';
import { PlaylistChatbot } from '@/components/playlists/playlist-chatbot';
import { MindMapDisplay } from '@/components/playlists/mind-map-display';
import { VideoProgressItem } from '@/components/playlists/video-progress-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainIcon, MessageCircleIcon, ListIcon, InfoIcon, PercentIcon } from 'lucide-react';
import type { Playlist, Video } from '@/types';

// Placeholder data fetching function
async function getPlaylistDetails(playlistId: string): Promise<Playlist | null> {
  console.log("Fetching playlist:", playlistId);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockVideos: Video[] = [
    { id: 'vid1', title: 'Introduction to Quantum Physics', youtubeURL: 'https://www.youtube.com/watch?v= primjer1', thumbnail: 'https://placehold.co/120x68.png?text=QP1', duration: '12:34', addedBy: 'user1', completionStatus: 100, summary: 'Basics of quantum mechanics.' },
    { id: 'vid2', title: 'Superposition and Entanglement', youtubeURL: 'https://www.youtube.com/watch?v= primjer2', thumbnail: 'https://placehold.co/120x68.png?text=QP2', duration: '15:50', addedBy: 'user1', completionStatus: 60, summary: 'Exploring key quantum phenomena.' },
    { id: 'vid3', title: 'Quantum Computing Explained', youtubeURL: 'https://www.youtube.com/watch?v= primjer3', thumbnail: 'https://placehold.co/120x68.png?text=QC', duration: '18:22', addedBy: 'user1', completionStatus: 20, summary: 'How quantum computers work.' },
    { id: 'vid4', title: 'The Future of Quantum Tech', youtubeURL: 'https://www.youtube.com/watch?v= primjer4', thumbnail: 'https://placehold.co/120x68.png?text=QFuture', duration: '10:05', addedBy: 'user1', completionStatus: 0, summary: 'Potential applications and advancements.' },
  ];
  
  if (playlistId === "1" || playlistId === "2" || playlistId === "3") { // Match IDs from playlists page
     return {
      id: playlistId,
      title: playlistId === "1" ? 'Advanced JavaScript Concepts' : playlistId === "2" ? 'Python for Data Science' : 'React Native Development',
      description: 'This is a detailed description of the playlist focusing on its core concepts and learning objectives. It covers various topics including X, Y, and Z.',
      userId: 'user1',
      createdAt: new Date(),
      videos: mockVideos,
      aiRecommended: playlistId === "2",
      tags: ['sample', 'learning', 'tech'],
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

  useEffect(() => {
    if (playlistId) {
      setIsLoading(true);
      getPlaylistDetails(playlistId).then(data => {
        setPlaylist(data);
        if (data && data.videos.length > 0) {
          setCurrentVideo(data.videos[0]);
        }
        setIsLoading(false);
      });
    }
  }, [playlistId]);

  const handleSelectVideo = (video: Video) => {
    setCurrentVideo(video);
  };
  
  const compiledPlaylistContentForRAG = playlist ? 
    `${playlist.title}\n${playlist.description}\n\n${playlist.videos.map(v => `${v.title}\n${v.summary || ''}\n${v.transcript || ''}`).join('\n\n')}`
    : "No playlist content available.";


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return <div className="text-center py-10">Playlist not found.</div>;
  }
  
  const overallProgress = playlist.videos.reduce((acc, vid) => acc + vid.completionStatus, 0) / (playlist.videos.length || 1);


  return (
    <div className="flex flex-col lg:flex-row gap-6 max-h-[calc(100vh-theme(space.24))]"> {/* Adjust max-h based on header height */}
      {/* Main Content Area (Video Player + Tabs) */}
      <div className="lg:w-2/3 flex flex-col gap-6">
        {currentVideo && <VideoPlayer videoUrl={currentVideo.youtubeURL} videoTitle={currentVideo.title} />}
        
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 bg-card border">
            <TabsTrigger value="info"><InfoIcon className="w-4 h-4 mr-1 md:mr-2" />Info</TabsTrigger>
            <TabsTrigger value="chatbot"><MessageCircleIcon className="w-4 h-4 mr-1 md:mr-2" />Chatbot</TabsTrigger>
            <TabsTrigger value="mindmap"><BrainIcon className="w-4 h-4 mr-1 md:mr-2" />Mind Map</TabsTrigger>
            <TabsTrigger value="progress" className="hidden md:flex"><PercentIcon className="w-4 h-4 mr-1 md:mr-2" />Progress</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-4 p-4 border rounded-lg bg-card">
            <h2 className="text-2xl font-semibold mb-2 text-primary">{playlist.title}</h2>
            <p className="text-muted-foreground mb-1">
              {playlist.videos.length} videos
              {playlist.aiRecommended && <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">AI Recommended</span>}
            </p>
            <p className="text-sm mb-4">{playlist.description}</p>
            {currentVideo?.summary && (
              <div>
                <h4 className="font-semibold text-primary">Current Video Summary:</h4>
                <p className="text-sm text-muted-foreground">{currentVideo.summary}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="chatbot" className="mt-4">
             <PlaylistChatbot playlistId={playlist.id} playlistContent={compiledPlaylistContentForRAG} />
          </TabsContent>
          <TabsContent value="mindmap" className="mt-4">
            <MindMapDisplay playlistTitle={playlist.title} />
          </TabsContent>
          <TabsContent value="progress" className="mt-4 p-4 border rounded-lg bg-card">
             <h3 className="text-xl font-semibold mb-2">Overall Progress: {overallProgress.toFixed(0)}%</h3>
             {/* More detailed progress visualization can go here */}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar Area (Video List) */}
      <div className="lg:w-1/3 lg:max-h-full flex flex-col">
        <Card className="flex-grow flex flex-col shadow-lg overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center">
              <ListIcon className="h-6 w-6 mr-2 text-primary" />
              Playlist Videos
            </CardTitle>
            <CardDescription>Select a video to play.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-grow overflow-hidden">
            <ScrollArea className="h-full"> {/* Adjust height dynamically or set a fixed one */}
              <div className="p-2 space-y-1">
                {playlist.videos.map((video) => (
                  <VideoProgressItem
                    key={video.id}
                    video={video}
                    isActive={currentVideo?.id === video.id}
                    onSelectVideo={handleSelectVideo}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
