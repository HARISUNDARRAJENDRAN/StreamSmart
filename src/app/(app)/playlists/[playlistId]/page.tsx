'use client'; 

import { useState, useEffect, useId } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/playlists/video-player';
import { PlaylistChatbot } from '@/components/playlists/playlist-chatbot';
import { MindMapDisplay } from '@/components/playlists/mind-map-display';
import { VideoProgressItem } from '@/components/playlists/video-progress-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrainIcon, MessageCircleIcon, ListIcon, InfoIcon, PercentIcon, CircleCheck, CircleIcon, LightbulbIcon, ShareIcon, BookmarkIcon, ClockIcon, CalendarIcon, UserIcon, TrendingUpIcon } from 'lucide-react'; 
import type { Playlist, Video } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { PlaylistQuiz } from '@/components/playlists/playlist-quiz';
import { MLEnhancedVideoSummary } from '@/components/playlists/ml-enhanced-video-summary';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';

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

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.playlistId as string;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, recordActivity, updateUserStats } = useUser();
  const videoPlayerKey = useId(); 

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!playlistId || !user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch the specific playlist by ID from MongoDB
        const foundPlaylist = await playlistService.getPlaylistById(playlistId);
        
        if (foundPlaylist) {
          const processedPlaylist = {
            ...foundPlaylist,
            id: foundPlaylist._id, // MongoDB uses _id
            createdAt: new Date(foundPlaylist.createdAt),
            lastModified: new Date(foundPlaylist.updatedAt || foundPlaylist.createdAt),
            videos: (foundPlaylist.videos || []).map((video: any) => ({
              id: video.id,
              title: video.title || '',
              youtubeURL: video.url || video.youtubeURL || '', // Map 'url' to 'youtubeURL'
              thumbnail: video.thumbnail || '',
              duration: video.duration || '',
              addedBy: video.addedBy || 'user',
              summary: video.summary || '',
              completionStatus: video.completionStatus || 0,
              channelTitle: video.channelTitle || '',
            })),
            tags: foundPlaylist.tags || [],
            userId: foundPlaylist.userId,
            overallProgress: foundPlaylist.overallProgress || 0,
            aiRecommended: foundPlaylist.aiRecommended || false,
          };
          
          setPlaylist(processedPlaylist);
          if (processedPlaylist.videos.length > 0) {
            setCurrentVideo(processedPlaylist.videos[0]);
          }
        } else {
          setPlaylist(null);
        }
      } catch (error) {
        console.error("Error loading playlist:", error);
        setPlaylist(null);
        toast({
          title: "Error",
          description: "Could not load playlist.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };

    loadPlaylist();
  }, [playlistId, user, toast]);

  const handleSelectVideo = (video: Video) => {
    setCurrentVideo(video);
  };
  
  const compiledPlaylistContentForRAG = playlist ? 
    `Playlist Title: ${playlist.title}
Playlist Description: ${playlist.description}
Total Videos: ${playlist.videos.length}
Tags: ${playlist.tags.join(', ')}

=== VIDEO CONTENT ===

${playlist.videos.map((v, index) => `
Video ${index + 1}:
- Title: ${v.title}
- Channel: ${v.channelTitle || 'Unknown Channel'}
- Duration: ${v.duration}
- Video URL: ${v.youtubeURL}
- Summary: ${v.summary || 'No summary available.'}
- Completion Status: ${v.completionStatus}%
- Transcript: ${v.transcript || 'No transcript available.'}
${v.channelTitle && v.channelTitle.toLowerCase().includes('mosh') ? '- Instructor: Mosh Hamedani (Programming with Mosh)' : ''}
${v.title && (v.title.toLowerCase().includes('oops') || v.title.toLowerCase().includes('oop') || v.title.toLowerCase().includes('object oriented')) ? '- Topic: Object-Oriented Programming (OOP/OOPS) concepts' : ''}
${v.title && v.title.toLowerCase().includes('python') ? '- Language: Python Programming' : ''}
${v.title && v.title.toLowerCase().includes('comparison') ? '- Covers: Comparison operators and conditional logic' : ''}
${v.title && v.title.toLowerCase().includes('beginner') ? '- Level: Beginner-friendly content' : ''}
${v.title && v.title.toLowerCase().includes('full course') ? '- Type: Comprehensive course covering multiple topics' : ''}
`).join('\n---\n')}

=== ADDITIONAL CONTEXT ===
- This playlist contains programming tutorials
- Videos may include coding concepts, tutorials, and explanations
- Channel information and instructor names are included where available
- OOP/OOPS refers to Object-Oriented Programming concepts
- For Python videos, common topics include: variables, data types, operators, control structures, functions, classes
- Comparison operators in Python include: ==, !=, <, >, <=, >=, is, is not, in, not in
- When transcript data is unavailable, provide educational explanations based on video titles and general programming knowledge
` : "No playlist content available.";

  const handleToggleCompletion = async (videoId: string) => {
    if (!playlist || !playlist.videos) return;

    const targetVideo = playlist.videos.find(v => v.id === videoId);
    if (!targetVideo) return;

    const newCompletionStatus = targetVideo.completionStatus === 100 ? 0 : 100;
    const updatedVideos = playlist.videos.map(video => {
      if (video.id === videoId) {
        return { ...video, completionStatus: newCompletionStatus };
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
            completionStatus: newCompletionStatus
        };
      });
    }

    // Record activity for streak tracking
    if (newCompletionStatus === 100) {
      recordActivity({
        action: "Completed",
        item: targetVideo.title,
        type: "completed"
      });
      toast({
        title: "Video Completed! 🎉",
        description: `Great job completing "${targetVideo.title}"`,
      });
    } else {
      recordActivity({
        action: "Marked as incomplete",
        item: targetVideo.title,
        type: "started"
      });
      toast({
        title: "Progress Updated",
        description: `"${targetVideo.title}" marked as incomplete.`,
      });
    }
    
    try {
      // Update playlist in MongoDB
      const result = await playlistService.updatePlaylist(playlist.id, {
        videos: updatedVideos.map(v => ({
          id: v.id,
          title: v.title || '',
          channelTitle: v.channelTitle || '',
          thumbnail: v.thumbnail || '',
          duration: v.duration || '',
          url: v.youtubeURL || '',
          completionStatus: v.completionStatus || 0,
        })),
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update playlist');
      }
      
      // Update user stats after saving
      setTimeout(() => {
        updateUserStats();
      }, 100);
    } catch (error) {
      console.error("Error updating playlist:", error);
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

  const completedVideos = playlist.videos.filter(video => video.completionStatus === 100).length;
  const totalDuration = playlist.videos.reduce((acc, video) => {
    // Enhanced duration parsing to handle various formats: "2:18", "1:30:45", "10:30", etc.
    if (!video.duration || video.duration === 'N/A') return acc;
    
    const parts = video.duration.split(':').map(Number);
    let totalSeconds = 0;
    
    if (parts.length === 3) {
      // Format: "H:MM:SS"
      const [hours, minutes, seconds] = parts;
      totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    } else if (parts.length === 2) {
      // Format: "MM:SS" or "H:MM" (assume MM:SS for most YouTube videos)
      const [minutes, seconds] = parts;
      totalSeconds = (minutes * 60) + seconds;
    } else if (parts.length === 1) {
      // Format: "SS" (just seconds)
      totalSeconds = parts[0];
    }
    
    return acc + totalSeconds;
  }, 0);

  // Convert total seconds to a readable format
  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{ 
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      className="space-y-6"
    >
      {/* Playlist Header */}
      <motion.div variants={fadeInUp} className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 border">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-foreground">{playlist.title}</h1>
                  {playlist.aiRecommended && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <BrainIcon className="w-3 h-3 mr-1" />
                      AI Curated
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground max-w-2xl">{playlist.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <ShareIcon className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <BookmarkIcon className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-background/60 rounded-lg">
                <div className="text-2xl font-bold text-primary">{playlist.videos.length}</div>
                <div className="text-sm text-muted-foreground">Videos</div>
              </div>
              <div className="text-center p-3 bg-background/60 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{completedVideos}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-3 bg-background/60 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{Math.round(overallProgress)}%</div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {playlist.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span>Created by you</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>Created {playlist.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                <span>Updated {playlist.lastModified.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          {/* Video Player */}
          {currentVideo && (
            <motion.div variants={fadeInUp}>
              <Card className="overflow-hidden shadow-lg">
                <VideoPlayer key={videoPlayerKey + currentVideo.id} videoUrl={currentVideo.youtubeURL} videoTitle={currentVideo.title} />
              </Card>
            </motion.div>
          )}
          
          {/* Interactive Tabs */}
          <motion.div variants={fadeInUp}>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <InfoIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Info</span>
                </TabsTrigger>
                <TabsTrigger value="chatbot" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageCircleIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">AI Chat</span>
                </TabsTrigger>
                <TabsTrigger value="mindmap" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <BrainIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">AI Mind Map</span>
                </TabsTrigger>
                <TabsTrigger value="quiz" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <LightbulbIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Quiz</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <TrendingUpIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="info" className="space-y-6">
                  <Card className="p-6">
                    {currentVideo && (
                      <div className="space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h2 className="text-2xl font-semibold text-primary">{currentVideo.title}</h2>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                {currentVideo.duration}
                              </span>
                              <Badge variant={currentVideo.completionStatus === 100 ? "default" : "outline"}>
                                {currentVideo.completionStatus === 100 ? "Completed" : "In Progress"}
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleToggleCompletion(currentVideo.id)}
                            variant={currentVideo.completionStatus === 100 ? "secondary" : "default"}
                            className="transition-all duration-300 hover:scale-105"
                          >
                            {currentVideo.completionStatus === 100 ? 
                              <><CircleCheck className="mr-2 h-4 w-4" /> Mark as Incomplete</> : 
                              <><CircleIcon className="mr-2 h-4 w-4" /> Mark as Completed</>}
                          </Button>
                        </div>
                        
                        {currentVideo.summary && (
                          <div className="p-4 bg-accent/20 rounded-lg">
                            <h3 className="font-medium mb-2">Video Summary</h3>
                            <p className="text-muted-foreground leading-relaxed">{currentVideo.summary}</p>
                          </div>
                        )}
                        
                        {currentVideo.youtubeURL && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" asChild>
                              <a href={currentVideo.youtubeURL} target="_blank" rel="noopener noreferrer">
                                Watch on YouTube
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </TabsContent>
                
                <TabsContent value="chatbot">
                   <PlaylistChatbot 
                     playlistId={playlist.id} 
                     playlistContent={compiledPlaylistContentForRAG}
                     currentVideoTitle={currentVideo?.title}
                     currentVideoSummary={currentVideo?.summary}
                   />
                </TabsContent>
                
                <TabsContent value="mindmap">
                  <div className="space-y-6">
                    {/* Enhanced Mind Map with ML Analysis */}
                    {currentVideo && (
                      <MLEnhancedVideoSummary 
                        video={currentVideo}
                        onEnhancedSummaryGenerated={(enhancedSummary, multiModalData) => {
                          setCurrentVideo(prev => prev ? { ...prev, enhancedSummary } : null);
                          toast({
                            title: "AI Mind Map Enhanced! 🧠",
                            description: "Mind map updated with multi-modal analysis.",
                          });
                        }}
                      />
                    )}
                    
                    {/* Traditional Mind Map for Playlist Overview */}
                  <MindMapDisplay playlistTitle={playlist.title} playlistId={playlist.id}/>
                  </div>
                </TabsContent>
                
                <TabsContent value="quiz">
                  <PlaylistQuiz 
                    playlistId={playlist.id} 
                    playlistTitle={playlist.title} 
                    playlistContent={compiledPlaylistContentForRAG} 
                  />
                </TabsContent>
                
                <TabsContent value="progress">
                  <Card className="p-6">
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold mb-2">{Math.round(overallProgress)}%</h3>
                        <p className="text-muted-foreground">Overall Progress</p>
                        <Progress value={overallProgress} className="h-4 mt-4" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CircleCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-600">{completedVideos}</div>
                          <div className="text-sm text-muted-foreground">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <CircleIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-600">{playlist.videos.length - completedVideos}</div>
                          <div className="text-sm text-muted-foreground">Remaining</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                          <ClockIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-purple-600">{formatDuration(totalDuration)}</div>
                          <div className="text-sm text-muted-foreground">Total Time</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>

        {/* Playlist Videos Sidebar */}
        <motion.div variants={fadeInUp} className="xl:col-span-1">
          <Card className="shadow-lg h-fit max-h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader className="border-b bg-accent/20">
              <CardTitle className="flex items-center">
                <ListIcon className="h-5 w-5 mr-2 text-primary" />
                Playlist Videos
              </CardTitle>
              <CardDescription>
                {playlist.videos.length} videos • {Math.round(overallProgress)}% complete
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-full"> 
                <div className="p-2 space-y-1">
                  {playlist.videos.map((video, index) => (
                    <VideoProgressItem
                      key={video.id}
                      video={video}
                      isActive={currentVideo?.id === video.id}
                      onSelectVideo={handleSelectVideo}
                    />
                  ))}
                  {playlist.videos.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <ListIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No videos in this playlist yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
