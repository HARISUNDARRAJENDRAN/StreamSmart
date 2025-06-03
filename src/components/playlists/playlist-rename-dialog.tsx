'use client';

import { useState } from 'react';
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
import { Edit3, Loader2 } from 'lucide-react';
import { playlistService } from '@/services/playlistService';
import { useToast } from "@/hooks/use-toast";

interface PlaylistRenameDialogProps {
  playlist: {
    id: string;
    title: string;
    description?: string;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function PlaylistRenameDialog({ playlist, onSuccess, trigger }: PlaylistRenameDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const handleRename = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Playlist title cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await playlistService.updatePlaylist(playlist.id, {
        title: title.trim(),
        description: description.trim()
      });

      if (result.success) {
        toast({
          title: "Playlist Updated",
          description: `"${playlist.title}" has been renamed to "${title.trim()}".`,
        });
        
        setIsOpen(false);
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Failed to rename playlist');
      }
    } catch (error) {
      console.error('Error renaming playlist:', error);
      toast({
        title: "Error",
        description: "Failed to rename playlist. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset form when opening
      setTitle(playlist.title);
      setDescription(playlist.description || '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Playlist</DialogTitle>
          <DialogDescription>
            Update the title and description for "{playlist.title}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Playlist Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter playlist title"
              className="mt-1"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter playlist description"
              className="mt-1 h-20"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit3 className="mr-2 h-4 w-4" />
                Update Playlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 