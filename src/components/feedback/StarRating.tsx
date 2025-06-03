'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

const ratingLabels = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
};

export function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'md',
  className,
  showLabel = false
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseEnter = (star: number) => {
    if (!readonly) {
      setHoverRating(star);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const handleClick = (star: number) => {
    if (!readonly) {
      onRatingChange(star);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={cn(
              "transition-colors duration-150",
              !readonly && "hover:scale-110 transform cursor-pointer",
              readonly && "cursor-default"
            )}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(star)}
            disabled={readonly}
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors duration-150",
                star <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200"
              )}
            />
          </button>
        ))}
      </div>
      
      {showLabel && rating > 0 && (
        <span className="text-sm text-muted-foreground ml-2">
          {ratingLabels[rating as keyof typeof ratingLabels]}
        </span>
      )}
    </div>
  );
} 