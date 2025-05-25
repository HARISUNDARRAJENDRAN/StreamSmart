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

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, recordActivity, updateUserStats } = useUser();

  useEffect(() => {
    const loadPlaylists = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const userPlaylists = await playlistService.getPlaylists(user.id);
        
        const processedPlaylists = userPlaylists.map((p: any) => ({
          ...p,
          id: p._id, // MongoDB uses _id
          createdAt: new Date(p.createdAt),
          lastModified: new Date(p.updatedAt || p.createdAt),
          videos: (p.videos || []).map((video: any) => ({
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
          tags: p.tags || [],
          userId: p.userId,
          overallProgress: p.overallProgress || 0,
          aiRecommended: p.aiRecommended || false,
        }));
        
        // Sort by creation date, newest first
        processedPlaylists.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

    loadPlaylists();
  }, [user, toast]);

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

  if (isLoading) {
    return (
       <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Loading playlists...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="col-span-full text-center p-10 border-dashed">
        <CardTitle className="text-xl mb-2">Please Log In</CardTitle>
        <CardDescription className="mb-6">
          You need to be logged in to view your playlists.
        </CardDescription>
        <Link href="/login">
          <Button variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Log In
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Learning Playlists</h1>
          <p className="text-muted-foreground">Organize your YouTube learning journey.</p>
        </div>
        <Link href="/playlists/create">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircleIcon className="mr-2 h-5 w-5" />
            Create New Playlist
          </Button>
        </Link>
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-primary/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <Link href={`/playlists/${playlist.id}`} className="block group">
                <CardHeader className="relative p-0">
                  <Image
                    src={
                      playlist.videos && 
                      playlist.videos.length > 0 && 
                      playlist.videos[0] && 
                      playlist.videos[0].thumbnail && 
                      (playlist.videos[0].thumbnail.startsWith('https://i.ytimg.com') || playlist.videos[0].thumbnail.startsWith('https://placehold.co')) 
                      ? playlist.videos[0].thumbnail 
                      : `https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,15))}`
                    }
                    alt={playlist.title}
                    width={400}
                    height={240}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={playlist.tags && playlist.tags.length > 0 ? playlist.tags.join(' ').substring(0, 20) : 'technology'}
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/400x240.png?text=Error`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <CirclePlay className="h-16 w-16 text-white/80" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <CardTitle className="text-lg font-semibold mb-1 line-clamp-2 group-hover:text-primary">{playlist.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-3">{playlist.description}</CardDescription>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {playlist.tags && playlist.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{playlist.videos?.length || 0} videos</p>
                  {playlist.overallProgress > 0 && (
                    <div className="mt-2">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${playlist.overallProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{playlist.overallProgress}% complete</p>
                    </div>
                  )}
                </CardContent>
              </Link>
              <CardFooter className="p-4 border-t flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" asChild>
                  {/* TODO: Implement Edit functionality for MongoDB items */}
                  <Link href={`/playlists/edit/${playlist.id}`}>
                    <Edit3Icon className="mr-1 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                      <Trash2Icon className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the playlist "{playlist.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeletePlaylist(playlist.id)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="col-span-full text-center p-10 border-dashed">
           <ListVideoIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2">No Playlists Found</CardTitle>
          <CardDescription className="mb-6">
            It looks like you haven't created any playlists yet.
            <br />
            Get started by creating one to organize your learning videos.
          </CardDescription>
          <Link href="/playlists/create">
            <Button variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircleIcon className="mr-2 h-5 w-5" /> Create Your First Playlist
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

