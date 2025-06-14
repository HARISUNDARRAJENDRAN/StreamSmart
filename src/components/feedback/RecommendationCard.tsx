'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bookmark, 
  BookmarkCheck, 
  Clock, 
  X, 
  MoreHorizontal,
  MessageSquare,
  Play
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from './StarRating';
import { ThumbsRating } from './ThumbsRating';
import { cn } from '@/lib/utils';
// Note: Implicit tracking service removed - will be implemented in new recommendation system
import { useUser } from '@/contexts/UserContext';

interface RecommendationCardProps {
  recommendation: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    difficulty: string;
    creator?: string;
    url?: string;
  };
  userFeedback?: {
    rating?: number;
    thumbsRating?: number | null;
    inWatchlist?: boolean;
    notInterested?: boolean;
    hasReview?: boolean;
  };
  onRating?: (rating: number) => void;
  onThumbsRating?: (rating: number) => void;
  onWatchlistToggle?: () => void;
  onNotInterested?: () => void;
  onWriteReview?: () => void;
  onPlay?: () => void;
  recommendationContext?: {
    source: string;
    algorithm: string;
    position: number;
  };
  ratingType?: 'stars' | 'thumbs';
  className?: string;
  isLoading?: boolean;
}

export function RecommendationCard({
  recommendation,
  userFeedback = {},
  onRating,
  onThumbsRating,
  onWatchlistToggle,
  onNotInterested,
  onWriteReview,
  onPlay,
  recommendationContext,
  ratingType = 'stars',
  className,
  isLoading = false
}: RecommendationCardProps) {
  const [isActionsLoading, setIsActionsLoading] = useState<string | null>(null);
  const { user } = useUser();

  // Note: User tracking will be implemented in new recommendation system
  useEffect(() => {
    if (user) {
      console.log('User ID available for tracking:', user.id);
    }
  }, [user]);

  const handleAction = async (action: string, callback?: () => void) => {
    if (!callback) return;
    
    setIsActionsLoading(action);
    
    // Track the interaction
    if (user) {
      await trackNavigation.click({
        elementType: 'button',
        elementId: `${action}-${recommendation.id}`,
        elementText: action,
        coordinates: { x: 0, y: 0 } // Would be filled by actual mouse event
      });

      await trackNavigation.content({
        interactionType: 'click',
        targetId: recommendation.id,
        targetType: 'video',
        duration: 0
      });
    }

    try {
      await callback();
    } finally {
      setIsActionsLoading(null);
    }
  };

  const handlePlayClick = async () => {
    if (!onPlay || !user) return;

    // Track content interaction
    await trackNavigation.content({
      interactionType: 'click',
      targetId: recommendation.id,
      targetType: 'video',
    });

    // Track the play action specifically
    await trackNavigation.click({
      elementType: 'play_button',
      elementId: `play-${recommendation.id}`,
      elementText: 'Play',
    });

    onPlay();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (userFeedback.notInterested) {
    return null; // Don't render if user marked as not interested
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all duration-300 group",
        isLoading && "opacity-50",
        className
      )}
      // Add implicit tracking attributes
      data-track-hover={recommendation.id}
      data-hover-type="recommendation_card"
      data-container-type="recommendation_grid"
      data-position={recommendationContext?.position || 1}
      data-section-id="dashboard-recommendations"
    >
      <div className="relative">
        <Image 
          src={recommendation.thumbnail}
          alt={recommendation.title}
          width={400}
          height={200}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Difficulty Badge */}
        <Badge className={cn(
          "absolute top-2 right-2",
          getDifficultyColor(recommendation.difficulty)
        )}>
          {recommendation.difficulty}
        </Badge>

        {/* Play Button Overlay */}
        {onPlay && (
          <button
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            disabled={isActionsLoading === 'play'}
            data-track-hover={`${recommendation.id}-play`}
            data-hover-type="play_button"
          >
            <div className="bg-white/90 rounded-full p-3 hover:bg-white transition-colors">
              <Play className="h-6 w-6 text-gray-900 fill-current" />
            </div>
          </button>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {recommendation.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {recommendation.description}
        </p>
        
        {recommendation.creator && (
          <p className="text-xs text-muted-foreground mb-2">
            by {recommendation.creator}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recommendation.duration}
          </span>
        </div>

        {/* Rating Component */}
        <div className="mb-3">
          {ratingType === 'stars' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rate:</span>
              <StarRating
                rating={userFeedback.rating || 0}
                onRatingChange={(rating) => handleAction('rating', () => onRating?.(rating))}
                size="sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Helpful?</span>
              <ThumbsRating
                rating={userFeedback.thumbsRating}
                onRatingChange={(rating) => handleAction('thumbs', () => onThumbsRating?.(rating))}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Watchlist Button */}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleAction('watchlist', onWatchlistToggle)}
              disabled={isActionsLoading === 'watchlist'}
              className={cn(
                "text-primary hover:text-primary/80",
                userFeedback.inWatchlist && "bg-primary/10"
              )}
              data-track-hover={`${recommendation.id}-watchlist`}
              data-hover-type="button"
            >
              {userFeedback.inWatchlist ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-1" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>

            {/* Review Button */}
            {onWriteReview && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => handleAction('review', onWriteReview)}
                disabled={isActionsLoading === 'review'}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  userFeedback.hasReview && "text-primary"
                )}
                data-track-hover={`${recommendation.id}-review`}
                data-hover-type="button"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {userFeedback.hasReview ? 'Edit Review' : 'Review'}
              </Button>
            )}
          </div>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-muted-foreground"
                data-track-hover={`${recommendation.id}-menu`}
                data-hover-type="menu_button"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onNotInterested && (
                <DropdownMenuItem 
                  onClick={() => handleAction('notInterested', onNotInterested)}
                  className="text-red-600"
                >
                  <X className="h-4 w-4 mr-2" />
                  Not Interested
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => console.log('Report content')}>
                Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Share')}>
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Context Info (for debugging/admin) */}
        {recommendationContext && process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
            Source: {recommendationContext.source} | 
            Algorithm: {recommendationContext.algorithm} | 
            Position: {recommendationContext.position}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 