/**
 * CSV Recommendation Card Component
 * Production-ready React component with optimized rendering and accessibility
 */

'use client';

import React, { memo, useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, 
  Clock, 
  Eye, 
  Star, 
  BookmarkPlus,
  ExternalLink,
  TrendingUp,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoRecommendation } from '@/services/recommendationService';

// ============= Type Definitions =============

interface CSVRecommendationCardProps {
  video: VideoRecommendation;
  onAddToPlaylist?: (video: VideoRecommendation) => void;
  onVideoClick?: (video: VideoRecommendation) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
  showMetrics?: boolean;
  priority?: boolean; // For Next.js Image optimization
}

// ============= Helper Functions =============

const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const formatDuration = (duration: string): string => {
  // Convert various duration formats to consistent display
  if (duration.includes(':')) {
    return duration;
  }
  // Handle duration in seconds
  const seconds = parseInt(duration, 10);
  if (!isNaN(seconds)) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  return duration;
};

const getGenreColor = (genre: string): string => {
  const colors: Record<string, string> = {
    technology: 'bg-blue-500',
    science: 'bg-green-500',
    mathematics: 'bg-purple-500',
    programming: 'bg-indigo-500',
    'ai-innovation': 'bg-pink-500',
    business: 'bg-yellow-500',
    design: 'bg-orange-500',
    default: 'bg-gray-500'
  };
  return colors[genre.toLowerCase()] || colors.default;
};

// ============= Component Implementation =============

const CSVRecommendationCard = memo<CSVRecommendationCardProps>(({
  video,
  onAddToPlaylist,
  onVideoClick,
  className,
  variant = 'default',
  showMetrics = true,
  priority = false
}) => {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = useCallback(() => {
    if (onVideoClick) {
      onVideoClick(video);
    } else {
      // Navigate to video page or open YouTube link
      window.open(video.youtubeUrl, '_blank', 'noopener,noreferrer');
    }
  }, [video, onVideoClick]);

  const handleAddToPlaylist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToPlaylist) {
      onAddToPlaylist(video);
    }
  }, [video, onAddToPlaylist]);

  const qualityPercentage = Math.round(video.qualityScore * 100);
  const isHighQuality = video.qualityScore >= 0.8;
  const isTrending = video.viewCount > 100000;

  // Render different variants
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors",
          className
        )}
        onClick={handleCardClick}
        role="article"
        aria-label={`Video: ${video.title}`}
      >
        <div className="relative w-24 h-14 flex-shrink-0">
          {!imageError ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover rounded"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-muted rounded flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{video.channelName}</p>
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all duration-300",
          "hover:shadow-xl hover:scale-[1.02]",
          className
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-video">
          {!imageError ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
          {/* Overlay with video info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold line-clamp-2 mb-2">{video.title}</h3>
                <p className="text-sm opacity-90 mb-3">{video.channelName}</p>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {formatViewCount(video.viewCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(video.duration)}
                  </span>
                  {isHighQuality && (
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-400" />
                      High Quality
                    </span>
                  )}
                </div>
              </div>
              
              <Badge className={cn(getGenreColor(video.genre), "text-white")}>
                {video.genre}
              </Badge>
            </div>
          </div>

          {/* Play button overlay on hover */}
          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PlayCircle className="w-20 h-20 text-white drop-shadow-lg animate-in zoom-in duration-200" />
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        className
      )}
      onClick={handleCardClick}
      role="article"
      aria-label={`Video: ${video.title}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {!imageError ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayCircle className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>

        {/* Quality indicator */}
        {isHighQuality && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-yellow-500/90 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              HD
            </Badge>
          </div>
        )}

        {/* Trending indicator */}
        {isTrending && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-red-500/90 text-white border-0">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          </div>
        )}

        {/* Play button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <PlayCircle className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        
        <p className="text-xs text-muted-foreground mb-3">{video.channelName}</p>
        
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-xs", getGenreColor(video.genre), "bg-opacity-10")}>
            {video.genre}
          </Badge>
          
          {showMetrics && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatViewCount(video.viewCount)}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {qualityPercentage}%
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-8 text-xs"
            onClick={handleCardClick}
          >
            <PlayCircle className="w-3 h-3 mr-1" />
            Watch
          </Button>
          
          {onAddToPlaylist && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleAddToPlaylist}
              aria-label="Add to playlist"
            >
              <BookmarkPlus className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              window.open(video.youtubeUrl, '_blank', 'noopener,noreferrer');
            }}
            aria-label="Open in YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

CSVRecommendationCard.displayName = 'CSVRecommendationCard';

export { CSVRecommendationCard };
export default CSVRecommendationCard;
