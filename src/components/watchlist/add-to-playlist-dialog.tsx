'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderPlus, Loader2, Plus } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';
import { feedbackService } from '@/services/feedbackService';
import { useToast } from "@/hooks/use-toast";

interface WatchlistItem {
  id: string;
  itemId: string;
  itemType: 'video' | 'playlist';
  itemDetails: {
    title: string;
    thumbnail: string;
    duration?: string;
    description?: string;
    creator?: string;
  };
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  videos: any[];
}

interface AddToPlaylistDialogProps {
  item: WatchlistItem;
}

export function AddToPlaylistDialog({ item }: AddToPlaylistDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New playlist creation states
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  
  const { user } = useUser();
  const { toast } = useToast();

  // Helper function to extract YouTube video ID from various URL formats
  const extractYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Function to get the real YouTube video ID
  const getRealVideoId = (): string => {
    // First, try to find a YouTube URL in the item details description (where we store the original URL)
    if (item.itemDetails.description && item.itemDetails.description.includes('Original URL:')) {
      const urlMatch = item.itemDetails.description.match(/Original URL: (https?:\/\/[^\s\n]+)/);
      if (urlMatch) {
        const extractedId = extractYouTubeVideoId(urlMatch[1]);
        if (extractedId) {
          console.log('🎯 [getRealVideoId] Found YouTube ID from stored URL:', extractedId, 'from:', urlMatch[1]);
          return extractedId;
        }
      }
    }

    // Check if itemId is already a valid YouTube ID (11 chars alphanumeric)
    if (item.itemId && item.itemId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(item.itemId)) {
      console.log('🎯 [getRealVideoId] Using itemId as video ID:', item.itemId);
      return item.itemId;
    }

    // Try to extract from any URLs in the description
    if (item.itemDetails.description) {
      const extractedId = extractYouTubeVideoId(item.itemDetails.description);
      if (extractedId) {
        console.log('🎯 [getRealVideoId] Found YouTube ID from description:', extractedId);
        return extractedId;
      }
    }

    // Last resort: log the issue and provide guidance
    console.error('⚠️ [getRealVideoId] Could not find valid YouTube ID for item:', {
      itemId: item.itemId,
      title: item.itemDetails.title,
      description: item.itemDetails.description?.substring(0, 100)
    });
    
    // Return the itemId as fallback - this might work if it's already correct
    return item.itemId;
  };

  useEffect(() => {
    if (isOpen && user) {
      loadPlaylists();
    }
  }, [isOpen, user]);

  const loadPlaylists = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const userPlaylists = await playlistService.getPlaylists(user.id);
      setPlaylists(userPlaylists.map((p: any) => ({
        id: p._id || p.id,
        title: p.title,
        description: p.description,
        videos: p.videos || []
      })));
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast({
        title: "Error",
        description: "Failed to load playlists. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistSelectionChange = (value: string) => {
    if (value === 'create-new') {
      setIsCreatingNew(true);
      setSelectedPlaylistId('');
      // Auto-populate new playlist title with video title
      setNewPlaylistTitle(`${item.itemDetails.title} Playlist`);
    } else {
      setIsCreatingNew(false);
      setSelectedPlaylistId(value);
      setNewPlaylistTitle('');
      setNewPlaylistDescription('');
    }
  };

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistTitle.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Prepare video data for the new playlist
      const videoData = {
        id: getRealVideoId(),
        title: item.itemDetails.title,
        thumbnail: item.itemDetails.thumbnail,
        duration: item.itemDetails.duration || '',
        url: `https://www.youtube.com/watch?v=${getRealVideoId()}`,
        channelTitle: item.itemDetails.creator || '',
        completionStatus: 0,
        summary: item.itemDetails.description || ''
      };

      // Create new playlist with the video
      const result = await playlistService.createPlaylist({
        userId: user.id,
        title: newPlaylistTitle.trim(),
        description: newPlaylistDescription.trim() || `Playlist created from watchlist video: ${item.itemDetails.title}`,
        category: 'General',
        tags: ['watchlist', 'created-from-video'],
        isPublic: false,
        videos: [videoData]
      });

      if (result.success) {
        // Remove from watchlist after successful creation
        await feedbackService.removeFromWatchlist(item.id, user.id);
        
        toast({
          title: "Playlist Created",
          description: `"${newPlaylistTitle}" has been created with "${item.itemDetails.title}" and removed from your watchlist.`,
        });
        
        resetDialog();
        
        // Refresh the page to update the watchlist
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: "Error",
        description: "Failed to create playlist. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToExistingPlaylist = async () => {
    if (!selectedPlaylistId || !user) return;

    setIsSubmitting(true);
    try {
      const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
      if (!selectedPlaylist) return;

      // Prepare video data for playlist
      const videoData = {
        id: getRealVideoId(),
        title: item.itemDetails.title,
        thumbnail: item.itemDetails.thumbnail,
        duration: item.itemDetails.duration || '',
        url: `https://www.youtube.com/watch?v=${getRealVideoId()}`,
        channelTitle: item.itemDetails.creator || '',
        completionStatus: 0,
        summary: item.itemDetails.description || ''
      };

      // Add video to playlist
      const updatedVideos = [...selectedPlaylist.videos, videoData];
      
      const result = await playlistService.updatePlaylist(selectedPlaylistId, {
        videos: updatedVideos
      });

      if (result.success) {
        // Remove from watchlist after successful addition to playlist
        await feedbackService.removeFromWatchlist(item.id, user.id);
        
        toast({
          title: "Added to Playlist",
          description: `"${item.itemDetails.title}" has been added to "${selectedPlaylist.title}" and removed from your watchlist.`,
        });
        
        resetDialog();
        
        // Refresh the page to update the watchlist
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to add to playlist');
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast({
        title: "Error",
        description: "Failed to add to playlist. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDialog = () => {
    setIsOpen(false);
    setSelectedPlaylistId('');
    setIsCreatingNew(false);
    setNewPlaylistTitle('');
    setNewPlaylistDescription('');
  };

  const handleAction = () => {
    if (isCreatingNew) {
      handleCreateNewPlaylist();
    } else {
      handleAddToExistingPlaylist();
    }
  };

  const isActionDisabled = isCreatingNew 
    ? !newPlaylistTitle.trim() || isSubmitting
    : !selectedPlaylistId || isSubmitting;

  // Only show for video items
  if (item.itemType !== 'video') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-purple-500 hover:text-purple-700"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>
            Choose a playlist to add "{item.itemDetails.title}" to, or create a new one. The video will be removed from your watchlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading playlists...</span>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Select Option</label>
              <Select value={isCreatingNew ? 'create-new' : selectedPlaylistId} onValueChange={handlePlaylistSelectionChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a playlist or create new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-new">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2 text-green-500" />
                      <div>
                        <div className="font-medium text-green-600">Create New Playlist</div>
                        <div className="text-xs text-muted-foreground">
                          Make a new playlist with this video
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      <div>
                        <div className="font-medium">{playlist.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {playlist.videos.length} videos
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* New Playlist Creation Form */}
              {isCreatingNew && (
                <div className="mt-4 space-y-3 p-3 border rounded-lg bg-muted/20">
                  <div>
                    <label className="text-sm font-medium">Playlist Title *</label>
                    <Input
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                      placeholder="Enter playlist title"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Enter playlist description"
                      className="mt-1 h-20"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={isActionDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isCreatingNew ? 'Creating...' : 'Adding...'}
              </>
            ) : (
              <>
                {isCreatingNew ? (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Playlist
                  </>
                ) : (
                  'Add to Playlist'
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 