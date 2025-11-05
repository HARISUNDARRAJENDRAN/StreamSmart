'use client'; 

import { useState, useEffect, useId } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/playlists/video-player';
import { LexVoiceChat } from '@/components/playlists/lex-voice-chat';
import { VideoProgressItem } from '@/components/playlists/video-progress-item';
import { PlaylistRenameDialog } from '@/components/playlists/playlist-rename-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// Avatar components removed - to be used later
import { MessageCircleIcon, InfoIcon, ShareIcon, BookmarkIcon, Edit3, Sparkles, BookOpen, User as UserIcon, Calendar as CalendarIcon, Clock as ClockIcon, CheckCircle as CircleCheck, Circle as CircleIcon, Brain as BrainIcon, List as ListIcon } from 'lucide-react'; 
import type { Playlist, Video } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';
import { QuizGenerator, StudyPlanViewer, RelatedVideos } from '@/components/ai';


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
            youtubeId: video.youtubeId || video.id, // Keep YouTube ID
            title: video.title || '',
            youtubeURL: video.url || video.youtubeURL || '', // Map 'url' to 'youtubeURL'
            thumbnail: video.thumbnail || '',
            duration: video.duration || '',
            addedBy: video.addedBy || 'user',
            summary: video.summary || '',
            completionStatus: video.completionStatus || 0,
            channelTitle: video.channelTitle || '',
            transcriptS3Key: video.transcriptS3Key,
            hasTranscript: video.hasTranscript,
          })),
          tags: foundPlaylist.tags || [],
          userId: foundPlaylist.userId,
          overallProgress: foundPlaylist.overallProgress || 0,
          aiRecommended: foundPlaylist.aiRecommended || false,
        };
        
        setPlaylist(processedPlaylist);
        if (processedPlaylist.videos.length > 0) {
          setCurrentVideo(processedPlaylist.videos[0]);
          console.log('[PlaylistDetailPage] Set current video:', {
            id: processedPlaylist.videos[0].id,
            title: processedPlaylist.videos[0].title,
            youtubeURL: processedPlaylist.videos[0].youtubeURL,
            hasURL: !!processedPlaylist.videos[0].youtubeURL
          });
        }
        
        console.log('[PlaylistDetailPage] Loaded playlist:', {
          id: processedPlaylist.id,
          title: processedPlaylist.title,
          videosCount: processedPlaylist.videos.length,
          firstVideoURL: processedPlaylist.videos[0]?.youtubeURL,
          videos: processedPlaylist.videos.map((v: Video) => ({
            id: v.id,
            title: v.title,
            youtubeURL: v.youtubeURL
          }))
        });
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

  useEffect(() => {
    loadPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, user, toast]);

  // Real-time sync: Poll for playlist updates (optimized)
  useEffect(() => {
    if (!playlistId || !user) return;

    let lastChecked = Date.now();
    let isPolling = true;
    let intervalId: NodeJS.Timeout | null = null;

    const checkForUpdates = async () => {
      if (!isPolling) return;

      // Skip polling if page is not visible (performance optimization)
      if (document.hidden) {
        return;
      }

      try {
        const response = await fetch(
          `/api/playlists/check-updates?playlistId=${playlistId}&lastChecked=${lastChecked}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.hasUpdates) {
            console.log('[PlaylistDetailPage] Updates detected, reloading playlist');
            
            // Show toast notification
            toast({
              title: "Playlist Updated",
              description: data.latestVideo 
                ? `New video added: ${data.latestVideo.title}` 
                : "Playlist has been updated",
              duration: 5000,
            });

            // Reload the playlist
            await loadPlaylist();
          }

          // Update lastChecked timestamp
          lastChecked = Date.now();
        }
      } catch (error) {
        console.error('[PlaylistDetailPage] Error checking for updates:', error);
      }
    };

    // Start polling after a delay to avoid immediate check
    const startPolling = () => {
      // Poll every 30 seconds (reduced from 10s to minimize server load)
      intervalId = setInterval(checkForUpdates, 30000);
    };

    // Start polling after 30 seconds (no immediate check)
    const startTimeout = setTimeout(startPolling, 30000);

    // Handle visibility change - pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - clear interval to save resources
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        // Page visible again - restart polling if not already running
        if (!intervalId && isPolling) {
          startPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      isPolling = false;
      clearTimeout(startTimeout);
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playlistId, user, toast]);

  const handleSelectVideo = (video: Video) => {
    setCurrentVideo(video);
  };

  const handlePlaylistRenamed = () => {
    // Reload playlist data after successful rename
    loadPlaylist();
  };

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

    // Update the playlist state for immediate feedback
    setPlaylist(prev => prev ? { ...prev, videos: updatedVideos } : null);
    
    // Update the current video if it's the one being modified
    if (currentVideo && currentVideo.id === videoId) {
      setCurrentVideo(prev => prev ? { ...prev, completionStatus: newCompletionStatus } : null);
    }

    // Record activity for the user
    recordActivity({
      action: newCompletionStatus === 100 ? 'Completed' : 'Marked incomplete',
      item: targetVideo.title,
      type: newCompletionStatus === 100 ? 'completed' : 'started',
    });
    
    try {
      // Update playlist in MongoDB
      const result = await playlistService.updatePlaylist(playlist.id, {
        videos: updatedVideos.map(v => ({
          id: v.id,
          title: v.title || '',
          channelTitle: v.channelTitle || '',
          thumbnail: v.thumbnail || '',
          duration: v.duration || '',
          youtubeURL: v.youtubeURL || '',
          addedBy: v.addedBy || user?.id || '',
          completionStatus: v.completionStatus || 0,
        })),
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update playlist');
      }
      
      // Update user stats after saving (delayed to prevent excessive calls)
      setTimeout(() => {
        updateUserStats(false); // Non-forced update
      }, 3000);
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast({
        title: "Error",
        description: "Could not save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!playlist || !playlist.videos) return;

    const targetVideo = playlist.videos.find(v => v.id === videoId);
    if (!targetVideo) return;

    const updatedVideos = playlist.videos.filter(video => video.id !== videoId);

    // Update the playlist state for immediate feedback
    setPlaylist(prev => prev ? { ...prev, videos: updatedVideos } : null);
    
    // If the deleted video was currently playing, switch to first video or clear
    if (currentVideo && currentVideo.id === videoId) {
      setCurrentVideo(updatedVideos.length > 0 ? updatedVideos[0] : null);
    }

    // Record activity for the user
    recordActivity({
      action: 'Deleted video',
      item: targetVideo.title,
      type: 'started', // Use 'started' as a generic activity type
    });
    
    try {
      // Update playlist in MongoDB
      const result = await playlistService.updatePlaylist(playlist.id, {
        videos: updatedVideos.map(v => ({
          id: v.id,
          title: v.title || '',
          channelTitle: v.channelTitle || '',
          thumbnail: v.thumbnail || '',
          duration: v.duration || '',
          youtubeURL: v.youtubeURL || '',
          addedBy: v.addedBy || user?.id || '',
          completionStatus: v.completionStatus || 0,
        })),
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update playlist');
      }
      
      toast({
        title: "Video Deleted",
        description: `"${targetVideo.title}" has been removed from the playlist.`,
      });
      
      // Real-time sync: Trigger immediate playlist sync after deletion
      console.log('🔄 Triggering real-time sync after video deletion...');
      localStorage.removeItem(`lastPlaylistSync_${user?.id}`);
      
      playlistService.syncPlaylistsForRecommendations(user?.id || '', true)
        .then((syncResult) => {
          if (syncResult.success) {
            console.log(`✅ Real-time sync after deletion: ${syncResult.syncedCount} videos`);
            
            // Dispatch event to notify feed page
            const event = new CustomEvent('playlistSynced', {
              detail: { userId: user?.id, syncedCount: syncResult.syncedCount }
            });
            window.dispatchEvent(event);
          }
        })
        .catch(err => console.error('❌ Sync after deletion failed:', err));
      
      // Update user stats after saving (delayed to prevent excessive calls)
      setTimeout(() => {
        updateUserStats(false); // Non-forced update
      }, 3000);
    } catch (error) {
      console.error("Error deleting video from playlist:", error);
      toast({
        title: "Error",
        description: "Could not delete video. Please try again.",
        variant: "destructive",
      });
      
      // Revert the state change on error
      setPlaylist(prev => prev ? { ...prev, videos: playlist.videos } : null);
      if (targetVideo.id === currentVideo?.id) {
        setCurrentVideo(targetVideo);
      }
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
      <motion.div variants={fadeInUp} className="rounded-2xl p-8 border" style={{ background: 'linear-gradient(90deg, hsla(var(--primary), 0.08) 0%, hsla(var(--secondary), 0.08) 100%)', borderColor: 'hsl(var(--border))' }}>
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
                <PlaylistRenameDialog
                  playlist={{
                    id: playlist.id,
                    title: playlist.title,
                    description: playlist.description
                  }}
                  onSuccess={handlePlaylistRenamed}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Rename
                    </Button>
                  }
                />
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
              <Card className="overflow-hidden shadow-lg bg-card border border-border">
                <VideoPlayer 
                  key={videoPlayerKey + currentVideo.id} 
                  videoUrl={currentVideo.youtubeURL} 
                  videoTitle={currentVideo.title}
                />
              </Card>
            </motion.div>
          )}
          
          {/* Interactive Tabs */}
          <motion.div variants={fadeInUp}>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 p-1 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)' }}>
                <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <InfoIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Info</span>
                </TabsTrigger>
                <TabsTrigger value="ai-quiz" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">AI Quiz</span>
                </TabsTrigger>
                <TabsTrigger value="study-plan" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Study Plan</span>
                </TabsTrigger>
                <TabsTrigger value="chatbot" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageCircleIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">AI Chat</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="info" className="space-y-6">
                  <Card className="p-6 bg-card border border-border">
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
                          <div className="p-4 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)' }}>
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
                  <div className="space-y-4">
                    {/* Text-based RAG Chatbot with Voice Option */}
                    <LexVoiceChat
                      userId={user?.id || 'anonymous'}
                      playlistId={playlist.id}
                      videoIds={playlist.videos?.map(v => v.youtubeId || v.id).filter(id => id && id.length === 11)}
                    />
                  </div>
                </TabsContent>

                {/* AI Quiz Tab - Phase 1 Implementation */}
                <TabsContent value="ai-quiz">
                  {currentVideo ? (
                    <QuizGenerator
                      videoId={currentVideo.youtubeId || currentVideo.id}
                      numQuestions={5}
                    />
                  ) : (
                    <Card className="p-8 text-center">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Select a Video</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a video from the playlist to generate an AI-powered quiz
                      </p>
                    </Card>
                  )}
                </TabsContent>

                {/* Study Plan Tab - Phase 1 Implementation */}
                <TabsContent value="study-plan">
                  <StudyPlanViewer
                    playlistId={playlist.id}
                    videoTitles={playlist.videos.map(v => v.title)}
                    playlistTitle={playlist.title}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>

        {/* Playlist Videos Sidebar */}
        <motion.div variants={fadeInUp} className="xl:col-span-1 space-y-6">
          <Card className="shadow-lg h-fit max-h-[calc(100vh-28rem)] flex flex-col bg-card border border-border">
            <CardHeader className="border-b" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'hsl(var(--border))' }}>
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
                  {playlist.videos.map((video) => (
                    <VideoProgressItem
                      key={video.id}
                      video={video}
                      isActive={currentVideo?.id === video.id}
                      onSelectVideo={handleSelectVideo}
                      onDeleteVideo={handleDeleteVideo}
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
