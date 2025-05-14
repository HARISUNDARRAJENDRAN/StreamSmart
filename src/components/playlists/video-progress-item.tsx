
'use client';

import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2Icon, PlayCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Video } from '@/types';

interface VideoProgressItemProps {
  video: Video;
  isActive?: boolean;
  onSelectVideo: (video: Video) => void;
}

export function VideoProgressItem({ video, isActive, onSelectVideo }: VideoProgressItemProps) {
  let imgSrc = `https://placehold.co/120x68.png?text=${encodeURIComponent(video.title?.substring(0,10) || 'Video')}`;
  if (typeof video.thumbnail === 'string' && (video.thumbnail.startsWith('http://') || video.thumbnail.startsWith('https://'))) {
    imgSrc = video.thumbnail;
  }
  
  const errorFallbackSrc = `https://placehold.co/120x68.png?text=Err`;


  return (
    <button
      onClick={() => onSelectVideo(video)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg w-full text-left transition-colors duration-150",
        isActive ? "bg-primary/20 border border-primary" : "hover:bg-muted/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
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
            <PlayCircleIcon className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      <div className="flex-grow overflow-hidden">
        <h4 className="text-sm font-medium truncate" title={video.title || 'Untitled Video'}>
          {video.title || 'Untitled Video'}
        </h4>
        <p className="text-xs text-muted-foreground mb-1">{video.duration || 'N/A'}</p>
        <div className="flex items-center gap-2">
          <Progress value={video.completionStatus || 0} className="h-1.5 w-full" aria-label={`${video.title || 'Video'} progress ${video.completionStatus || 0}%`} />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {video.completionStatus || 0}%
          </span>
          {(video.completionStatus === 100) && (
            <CheckCircle2Icon className="h-4 w-4 text-green-500 shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}
    
