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

  // Smart thumbnail logic with multiple fallback strategies
  const getThumbnailSrc = () => {
    // PRIORITIZE: Try extracting YouTube ID from youtubeURL FIRST (most reliable)
    if (video.youtubeURL) {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /v=([a-zA-Z0-9_-]{11})/,
        /\/([a-zA-Z0-9_-]{11})$/
      ];
      
      for (const pattern of patterns) {
        const match = video.youtubeURL.match(pattern);
        if (match && match[1] && match[1].length === 11) {
          const thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
          return thumbnailUrl;
        }
      }
    }

    // Try using the stored youtubeId field if it's a valid YouTube ID (not generated ID)
    if (video.youtubeId && 
        video.youtubeId.length === 11 && 
        !video.youtubeId.startsWith('video_') &&
        /^[a-zA-Z0-9_-]{11}$/.test(video.youtubeId)) {
      const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
      return thumbnailUrl;
    }

    // LAST RESORT: Check stored thumbnail only if it doesn't contain generated IDs
    if (video.thumbnail && 
        (video.thumbnail.startsWith('http://') || video.thumbnail.startsWith('https://')) &&
        !video.thumbnail.includes('video_')) {
      return video.thumbnail;
    }

    // Final fallback to placeholder
    const placeholderUrl = `https://placehold.co/120x68.png?text=${encodeURIComponent(video.title?.substring(0,10) || 'Video')}`;
    return placeholderUrl;
  };

  const imgSrc = getThumbnailSrc();
  const errorFallbackSrc = `https://placehold.co/120x68.png?text=No+Preview`;

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
          "flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-200 group relative",
          isActive 
            ? "bg-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-black" 
            : "hover:bg-gray-50 border border-transparent hover:border-gray-200"
        )}
      >
        <button
          onClick={() => onSelectVideo(video)}
          className="flex items-center gap-2.5 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-lg min-w-0"
          aria-current={isActive ? "true" : "false"}
          aria-label={`Play video: ${video.title || 'Untitled Video'}`}
        >
          <div className="relative shrink-0 rounded-[10px] overflow-hidden">
            <Image
              src={imgSrc}
              alt={video.title || 'Video thumbnail'}
              width={100}
              height={56}
              className="rounded-[10px] aspect-video object-cover border border-gray-200"
              data-ai-hint="video thumbnail"
              onError={(e) => {
                if (e.currentTarget.src !== errorFallbackSrc) {
                  e.currentTarget.src = errorFallbackSrc;
                }
              }}
            />
            {isActive && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[10px]">
                <CirclePlay className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-grow overflow-hidden min-w-0">
            <h4 className={cn(
              "text-xs font-semibold truncate leading-tight",
              isActive ? "text-white" : "text-black"
            )}>
              {video.title || 'Untitled Video'}
            </h4>
            <p className={cn(
              "text-xs mt-0.5",
              isActive ? "text-white/70" : "text-black/60"
            )}>
              {video.duration || 'N/A'}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={cn(
                "h-1 flex-1 rounded-full overflow-hidden",
                isActive ? "bg-white/20" : "bg-gray-200"
              )}>
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    isActive ? "bg-white" : "bg-black"
                  )}
                  style={{ width: `${video.completionStatus || 0}%` }}
                ></div>
              </div>
              <span className={cn(
                "text-xs font-medium w-6 text-right shrink-0",
                isActive ? "text-white/70" : "text-black/60"
              )}>
                {video.completionStatus || 0}%
              </span>
              {(video.completionStatus === 100) && (
                <CircleCheck className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-white" : "text-black"
                )} />
              )}
            </div>
          </div>
        </button>

        {/* Delete Button */}
        {showDeleteButton && onDeleteVideo && (
          <div className="flex items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteClick}
              className={cn(
                "opacity-0 group-hover:opacity-100 transition-all duration-200 h-7 w-7 p-0 shrink-0 rounded-md",
                isActive 
                  ? "text-white/60 hover:text-white hover:bg-white/10" 
                  : "text-black/60 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
              )}
              aria-label={`Delete video: ${video.title || 'Untitled Video'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
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
    

