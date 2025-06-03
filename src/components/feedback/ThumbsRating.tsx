'use client';

import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThumbsRatingProps {
  rating: number | null; // 1 for thumbs up, 0 for thumbs down, null for no rating
  onRatingChange: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCounts?: boolean;
  upCount?: number;
  downCount?: number;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

export function ThumbsRating({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'md',
  className,
  showCounts = false,
  upCount = 0,
  downCount = 0
}: ThumbsRatingProps) {

  const handleThumbsUp = () => {
    if (!readonly) {
      onRatingChange(rating === 1 ? 0 : 1); // Toggle if already selected
    }
  };

  const handleThumbsDown = () => {
    if (!readonly) {
      onRatingChange(rating === 0 ? 1 : 0); // Toggle if already selected, default to neutral (1) otherwise
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Thumbs Up */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "transition-all duration-150 rounded-full p-1",
            !readonly && "hover:scale-110 cursor-pointer hover:bg-green-50",
            readonly && "cursor-default",
            rating === 1 && "bg-green-100"
          )}
          onClick={handleThumbsUp}
          disabled={readonly}
          aria-label="Thumbs up"
        >
          <ThumbsUp
            className={cn(
              sizeClasses[size],
              "transition-colors duration-150",
              rating === 1
                ? "fill-green-500 text-green-500"
                : "text-gray-400 hover:text-green-500"
            )}
          />
        </button>
        {showCounts && (
          <span className="text-sm text-muted-foreground">{upCount}</span>
        )}
      </div>

      {/* Thumbs Down */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "transition-all duration-150 rounded-full p-1",
            !readonly && "hover:scale-110 cursor-pointer hover:bg-red-50",
            readonly && "cursor-default",
            rating === 0 && "bg-red-100"
          )}
          onClick={handleThumbsDown}
          disabled={readonly}
          aria-label="Thumbs down"
        >
          <ThumbsDown
            className={cn(
              sizeClasses[size],
              "transition-colors duration-150",
              rating === 0
                ? "fill-red-500 text-red-500"
                : "text-gray-400 hover:text-red-500"
            )}
          />
        </button>
        {showCounts && (
          <span className="text-sm text-muted-foreground">{downCount}</span>
        )}
      </div>
    </div>
  );
} 