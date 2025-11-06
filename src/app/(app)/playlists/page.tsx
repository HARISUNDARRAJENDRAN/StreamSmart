'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircleIcon, ListVideoIcon, Edit3Icon, Trash2Icon, CirclePlay } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Playlist } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';
import { PlaylistRenameDialog } from '@/components/playlists/playlist-rename-dialog';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, recordActivity, updateUserStats } = useUser();

  const loadPlaylists = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Loading playlists for user:', user.id);
      const userPlaylists = await playlistService.getPlaylists(user.id);
      console.log('Raw playlists received:', userPlaylists);
      console.log('First playlist raw data:', userPlaylists[0]);
      
      const processedPlaylists = userPlaylists.map((p: any, index: number) => {
        console.log(`Processing playlist ${index}:`, {
          _id: p._id,
          id: p.id,
          title: p.title,
          videoCount: p.videoCount,
          actualVideosLength: p.videos ? p.videos.length : 0,
          hasVideos: !!(p.videos && p.videos.length > 0)
        });
        
        const playlistId = p._id || p.id;
        if (!playlistId) {
          console.error('Playlist missing ID!', p);
        }
        
        return {
          ...p,
          id: playlistId, // Use _id or id, whichever is available
          videoCount: p.videoCount, // Pass through the correct video count from API
          createdAt: new Date(p.createdAt),
          lastModified: new Date(p.updatedAt || p.createdAt),
          videos: (p.videos || []).map((video: any) => ({
            id: video.id,
            title: video.title || '',
            youtubeURL: video.url || video.youtubeURL || '', // Map 'url' to 'youtubeURL'
            youtubeId: video.youtubeId || '', // Include youtubeId
            thumbnail: video.thumbnail || '',
            duration: video.duration || '',
            addedBy: video.addedBy || 'user',
            summary: video.summary || '',
            completionStatus: video.completionStatus || 0,
            channelTitle: video.channelTitle || '',
          })),
          tags: p.tags || [],
          userId: p.userId,
          overallProgress: p.overallProgress || 0,
          aiRecommended: p.aiRecommended || false,
        };
      });
      
      console.log('Processed playlists:', processedPlaylists);
      console.log('First processed playlist:', processedPlaylists[0]);
      console.log('First playlist videos:', processedPlaylists[0]?.videos);
      
      // Sort by creation date, newest first
      processedPlaylists.sort((a: Playlist, b: Playlist) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPlaylists(processedPlaylists);

    } catch (error) {
      console.error("Error loading playlists:", error);
      setPlaylists([]); 
      toast({
        title: "Error",
        description: "Could not load playlists.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user?.id) {
      loadPlaylists();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const result = await playlistService.deletePlaylist(playlistId);
      
      if (result.success) {
        setPlaylists(playlists.filter(p => p.id !== playlistId));
        
        // Record deletion activity
        await recordActivity({
          action: "Deleted playlist",
          item: playlists.find(p => p.id === playlistId)?.title || "Unknown playlist",
          type: "started"
        });
        
        toast({
          title: "Playlist Deleted",
          description: "The playlist has been removed.",
        });
        
        // Update user stats
        setTimeout(() => {
          updateUserStats();
        }, 100);
      } else {
        throw new Error(result.error || 'Failed to delete playlist');
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not delete the playlist.",
        variant: "destructive",
      });
    }
  };

  const handlePlaylistRenamed = () => {
    // Reload playlists after successful rename
    loadPlaylists();
  };

  if (isLoading) {
    return (
       <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg text-black/80">Loading playlists...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
        <div className="bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] p-10 text-center max-w-md">
          <h2 className="text-2xl font-semibold text-black mb-3">Please Log In</h2>
          <p className="text-black/60 mb-8">
            You need to be logged in to view your playlists.
          </p>
          <Link href="/login">
            <Button className="px-8 py-3 rounded-[12px] bg-black text-white hover:bg-black/90 transition-all hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              <span className="text-sm font-semibold">Log In</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-12">
      <div className="container mx-auto px-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] mb-4">
              <ListVideoIcon className="h-4 w-4 text-black" />
              <span className="text-xs font-semibold tracking-[0.18em] text-black uppercase">Learning</span>
            </div>
            <h1 className="text-[58px] font-semibold leading-[64px] tracking-[-0.04em] text-black mb-3">My Playlists</h1>
            <p className="text-base text-black/80">Organize your YouTube learning journey</p>
          </div>
          <Link href="/playlists/create">
            <Button className="px-6 py-3 rounded-[12px] bg-black text-white hover:bg-black/90 transition-all hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              <PlusCircleIcon className="mr-2 h-5 w-5" />
              <span className="text-sm font-semibold">Create New Playlist</span>
            </Button>
          </Link>
        </div>

        {playlists.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="group bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1">
                <Link href={`/playlists/${playlist.id}`} className="block">
                  <div className="relative">
                    <Image
                    src={
                      // Try to get thumbnail from first video
                      playlist.videos && 
                      playlist.videos.length > 0 && 
                      playlist.videos[0]?.thumbnail
                        ? playlist.videos[0].thumbnail
                        : // Try using the stored youtubeId field first
                          playlist.videos && 
                          playlist.videos.length > 0 && 
                          playlist.videos[0]?.youtubeId &&
                          playlist.videos[0].youtubeId.length === 11 &&
                          !playlist.videos[0].youtubeId.startsWith('video_')
                            ? `https://img.youtube.com/vi/${playlist.videos[0].youtubeId}/hqdefault.jpg`
                            : // Fallback to extracting YouTube ID from youtubeURL
                              playlist.videos && 
                              playlist.videos.length > 0 && 
                              playlist.videos[0]?.youtubeURL
                                ? (() => {
                                    const youtubeURL = playlist.videos[0].youtubeURL;
                                    console.log('Extracting YouTube ID from URL:', youtubeURL);
                                    
                                    // Extract YouTube ID from various URL formats
                                    let youtubeId = '';
                                    
                                    // Try different YouTube URL patterns
                                    const patterns = [
                                      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                                      /v=([a-zA-Z0-9_-]{11})/,
                                      /\/([a-zA-Z0-9_-]{11})$/
                                    ];
                                    
                                    for (const pattern of patterns) {
                                      const match = youtubeURL.match(pattern);
                                      if (match && match[1] && match[1].length === 11) {
                                        youtubeId = match[1];
                                        break;
                                      }
                                    }
                                    
                                    console.log('Extracted YouTube ID:', youtubeId);
                                    
                                    return youtubeId && youtubeId.length === 11
                                      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
                                      : `https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,20))}`;
                                  })()
                                : // Final fallback with playlist title
                                  `https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,20))}`
                    }
                    alt={playlist.title}
                    width={400}
                    height={240}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={playlist.tags && playlist.tags.length > 0 ? playlist.tags.join(' ').substring(0, 20) : 'technology'}
                    onError={(e) => { 
                      const target = e.currentTarget;
                      console.log('Image failed to load:', target.src);
                      
                      // If the primary thumbnail fails, try different YouTube thumbnail sizes
                      if (target.src.includes('hqdefault')) {
                        const newSrc = target.src.replace('hqdefault', 'mqdefault');
                        console.log('Trying mqdefault:', newSrc);
                        target.src = newSrc;
                      } else if (target.src.includes('mqdefault')) {
                        const newSrc = target.src.replace('mqdefault', 'default');
                        console.log('Trying default:', newSrc);
                        target.src = newSrc;
                      } else if (target.src.includes('default.jpg')) {
                        const newSrc = target.src.replace('default.jpg', '0.jpg');
                        console.log('Trying 0.jpg:', newSrc);
                        target.src = newSrc;
                      } else if (!target.src.includes('placehold.co')) {
                        // Final fallback to PNG placeholder
                        const finalSrc = `https://placehold.co/400x240.png?text=${encodeURIComponent('No Preview')}`;
                        console.log('Using final fallback:', finalSrc);
                        target.src = finalSrc;
                      }
                    }}
                  />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <CirclePlay className="h-16 w-16 text-white/80" />
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-[18px] font-semibold text-black line-clamp-2 group-hover:text-black/70 transition-colors">{playlist.title}</h3>
                    <p className="text-sm text-black/60 line-clamp-2">{playlist.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {playlist.tags && playlist.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium">{tag}</span>
                      ))}
                    </div>
                    <p className="text-xs text-black/50">{((playlist as any).videoCount || playlist.videos?.length || 0)} videos</p>
                    {(playlist as any).overallProgress > 0 && (
                      <div className="mt-2">
                        <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300 bg-black"
                            style={{ width: `${(playlist as any).overallProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-black/50 mt-1">{(playlist as any).overallProgress}% complete</p>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4 flex justify-end gap-2 border-t border-black/5">
                  <PlaylistRenameDialog
                    playlist={{
                      id: playlist.id,
                      title: playlist.title,
                      description: playlist.description
                    }}
                    onSuccess={handlePlaylistRenamed}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-black/60 hover:text-black hover:bg-black/5">
                        <Edit3Icon className="mr-1 h-4 w-4" /> Rename
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                        <Trash2Icon className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-black">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-black/60">
                          This action cannot be undone. This will permanently delete the playlist &ldquo;{playlist.title}&rdquo;.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white border-black/10 text-black hover:bg-black/5">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePlaylist(playlist.id)} className="bg-red-600 hover:bg-red-700 text-white">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] p-10 text-center">
            <ListVideoIcon className="mx-auto h-16 w-16 text-black/40 mb-6" />
            <h2 className="text-2xl font-semibold text-black mb-3">No Playlists Found</h2>
            <p className="text-black/60 mb-8 max-w-md mx-auto">
              It looks like you haven&apos;t created any playlists yet.
              <br />
              Get started by creating one to organize your learning videos.
            </p>
            <Link href="/playlists/create">
              <Button className="px-8 py-3 rounded-[12px] bg-black text-white hover:bg-black/90 transition-all hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                <PlusCircleIcon className="mr-2 h-5 w-5" />
                <span className="text-sm font-semibold">Create Your First Playlist</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

