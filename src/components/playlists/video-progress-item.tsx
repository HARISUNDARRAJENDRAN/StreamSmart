'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CircleCheck, CirclePlay, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Video } from '@/types';
import { VideoDeleteDialog } from './video-delete-dialog';

interface VideoProgressItemProps {
  video: Video;
  isActive?: boolean;
  onSelectVideo: (video: Video) => void;
  onDeleteVideo?: (videoId: string) => void;
  showDeleteButton?: boolean;
}

export function VideoProgressItem({ 
  video, 
  isActive, 
  onSelectVideo, 
  onDeleteVideo,
  showDeleteButton = true 
}: VideoProgressItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  let imgSrc = `https://placehold.co/120x68.png?text=${encodeURIComponent(video.title?.substring(0,10) || 'Video')}`;
  if (typeof video.thumbnail === 'string' && (video.thumbnail.startsWith('http://') || video.thumbnail.startsWith('https://'))) {
    imgSrc = video.thumbnail;
  }
  
  const errorFallbackSrc = `https://placehold.co/120x68.png?text=Err`;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelectVideo
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (onDeleteVideo) {
      setIsDeleting(true);
      try {
        await onDeleteVideo(video.id);
        setShowDeleteDialog(false);
      } catch (error) {
        console.error('Error deleting video:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg transition-colors duration-150 group relative",
          isActive ? "bg-primary/20 border border-primary" : "hover:bg-muted/50"
        )}
      >
        <button
          onClick={() => onSelectVideo(video)}
          className="flex items-center gap-3 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg min-w-0"
          aria-current={isActive ? "true" : "false"}
          aria-label={`Play video: ${video.title || 'Untitled Video'}`}
        >
          <div className="relative shrink-0">
            <Image
              src={imgSrc}
              alt={video.title || 'Video thumbnail'}
              width={120}
              height={68}
              className="rounded-md aspect-video object-cover border"
              data-ai-hint="video thumbnail"
              onError={(e) => {
                if (e.currentTarget.src !== errorFallbackSrc) {
                  e.currentTarget.src = errorFallbackSrc;
                }
              }}
            />
            {isActive && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-md">
                <CirclePlay className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <div className="flex-grow overflow-hidden min-w-0">
            <h4 className="text-sm font-medium truncate" title={video.title || 'Untitled Video'}>
              {video.title || 'Untitled Video'}
            </h4>
            <p className="text-xs text-muted-foreground mb-1">{video.duration || 'N/A'}</p>
            <div className="flex items-center gap-2">
              <Progress value={video.completionStatus || 0} className="h-1.5 flex-1" aria-label={`${video.title || 'Video'} progress ${video.completionStatus || 0}%`} />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {video.completionStatus || 0}%
              </span>
              {(video.completionStatus === 100) && (
                <CircleCheck className="h-4 w-4 text-green-500 shrink-0" />
              )}
            </div>
          </div>
        </button>

        {/* Delete Button - Always visible on hover with better positioning */}
        {showDeleteButton && onDeleteVideo && (
          <div className="flex items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteClick}
              className="opacity-20 group-hover:opacity-100 transition-all duration-200 h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950 dark:text-red-400 dark:hover:text-red-300 shrink-0 z-10 bg-white/80 dark:bg-gray-800/80 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600"
              aria-label={`Delete video: ${video.title || 'Untitled Video'}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <VideoDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        videoTitle={video.title || 'Untitled Video'}
        isDeleting={isDeleting}
      />
    </>
  );
}
    
