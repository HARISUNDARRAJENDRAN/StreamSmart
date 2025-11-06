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
      <motion.div variants={fadeInUp} className="rounded-[24px] p-6 bg-white border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            {/* Title and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-black leading-tight">{playlist.title}</h1>
                  {playlist.aiRecommended && (
                    <Badge className="bg-black text-white border-0 rounded-full font-medium">
                      <BrainIcon className="w-3.5 h-3.5 mr-1.5" />
                      AI Curated
                    </Badge>
                  )}
                </div>
                <p className="text-black/60 max-w-2xl text-sm leading-relaxed">{playlist.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <PlaylistRenameDialog
                  playlist={{
                    id: playlist.id,
                    title: playlist.title,
                    description: playlist.description
                  }}
                  onSuccess={handlePlaylistRenamed}
                  trigger={
                    <Button size="sm" className="rounded-full bg-black hover:bg-black/90 text-white border-0 font-medium text-xs gap-1.5 px-3 py-1.5 h-8">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Rename</span>
                    </Button>
                  }
                />
                <Button size="sm" className="rounded-full border-2 border-black/10 hover:border-black/20 bg-white hover:bg-gray-50 text-black font-medium text-xs gap-1.5 px-3 py-1.5 h-8">
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button size="sm" className="rounded-full border-2 border-black/10 hover:border-black/20 bg-white hover:bg-gray-50 text-black font-medium text-xs gap-1.5 px-3 py-1.5 h-8">
                  <BookmarkIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-[16px] border border-gray-200 text-center">
                <div className="text-2xl font-bold text-black">{playlist.videos.length}</div>
                <div className="text-xs text-black/60 font-medium mt-0.5">Videos</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-[16px] border border-gray-200 text-center">
                <div className="text-2xl font-bold text-black">{completedVideos}</div>
                <div className="text-xs text-black/60 font-medium mt-0.5">Completed</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-[16px] border border-gray-200 text-center">
                <div className="text-2xl font-bold text-black">{Math.round(overallProgress)}%</div>
                <div className="text-xs text-black/60 font-medium mt-0.5">Progress</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-black">Overall Progress</span>
                <span className="text-sm font-bold text-black">{Math.round(overallProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-black rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Tags */}
            {playlist.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {playlist.tags.map((tag, index) => (
                  <Badge key={index} className="rounded-full bg-black/5 border border-black/10 text-black/70 text-xs font-medium px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-black/60 font-medium pt-1">
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-black/50" />
                <span>Created by you</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-black/30"></div>
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-black/50" />
                <span>{playlist.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-black/30"></div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 text-black/50" />
                <span>{playlist.lastModified.toLocaleDateString()}</span>
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
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 bg-white rounded-[20px] border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <TabsTrigger 
                  value="info" 
                  className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-200"
                >
                  <InfoIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline font-medium">Info</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-quiz" 
                  className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-200"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline font-medium">AI Quiz</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="study-plan" 
                  className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-200"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline font-medium">Study Plan</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="chatbot" 
                  className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-200"
                >
                  <MessageCircleIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline font-medium">AI Chat</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="info" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-white rounded-[24px] border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
                      {currentVideo && (
                        <div className="p-8 space-y-6">
                          {/* Header with Title and Action */}
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              <h2 className="text-3xl font-bold text-black leading-tight">{currentVideo.title}</h2>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-full">
                                  <ClockIcon className="w-4 h-4 text-black/60" />
                                  <span className="text-sm font-medium text-black/80">{currentVideo.duration}</span>
                                </div>
                                <Badge 
                                  variant={currentVideo.completionStatus === 100 ? "default" : "outline"}
                                  className={currentVideo.completionStatus === 100 
                                    ? "bg-green-500 hover:bg-green-600 text-white border-0" 
                                    : "border-black/20 text-black/70"}
                                >
                                  {currentVideo.completionStatus === 100 ? "✓ Completed" : "In Progress"}
                                </Badge>
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleToggleCompletion(currentVideo.id)}
                              variant={currentVideo.completionStatus === 100 ? "outline" : "default"}
                              className={`shrink-0 rounded-full px-6 font-medium transition-all duration-300 hover:scale-105 ${
                                currentVideo.completionStatus === 100 
                                  ? "border-black/20 hover:bg-black/5" 
                                  : "bg-black hover:bg-black/90 text-white"
                              }`}
                            >
                              {currentVideo.completionStatus === 100 ? 
                                <><CircleCheck className="mr-2 h-4 w-4" /> Mark Incomplete</> : 
                                <><CircleIcon className="mr-2 h-4 w-4" /> Mark Complete</>}
                            </Button>
                          </div>
                          
                          {/* Summary Section */}
                          {currentVideo.summary && (
                            <div className="bg-gray-100 rounded-[20px] p-6 border border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <InfoIcon className="w-4 h-4 text-black/60" />
                                </div>
                                <h3 className="font-semibold text-black">Video Summary</h3>
                              </div>
                              <p className="text-black/70 leading-relaxed">{currentVideo.summary}</p>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          {currentVideo.youtubeURL && (
                            <div className="flex flex-wrap gap-3 pt-2">
                              <Button 
                                variant="outline" 
                                asChild
                                className="rounded-full border-black/10 hover:bg-black/5 hover:border-black/20"
                              >
                                <a href={currentVideo.youtubeURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                  </svg>
                                  Watch on YouTube
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </motion.div>
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
          <Card className="h-fit max-h-[calc(100vh-28rem)] flex flex-col bg-white border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] rounded-[24px] overflow-hidden">
            <CardHeader className="border-b border-black/5 bg-white p-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-black">
                <ListIcon className="h-5 w-5 text-black" />
                Playlist Videos
              </CardTitle>
              <CardDescription className="text-xs text-black/60 font-medium mt-1">
                {playlist.videos.length} videos • {Math.round(overallProgress)}% complete
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-full"> 
                <div className="p-3 space-y-1.5">
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
                    <div className="p-8 text-center">
                      <ListIcon className="w-10 h-10 mx-auto mb-3 text-black/20" />
                      <p className="text-sm text-black/50 font-medium">No videos yet</p>
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
