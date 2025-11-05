'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { aiRecommendationService, type AIVideoRecommendation } from '@/services/aiRecommendationService';
import Image from 'next/image';

interface AIRecommendationsPanelProps {
  videoTitle: string;
  videoDescription?: string;
  channelName?: string;
  onVideoSelect?: (video: AIVideoRecommendation) => void;
  className?: string;
}

/**
 * AI-Powered Recommendations Panel
 * Shows semantic similarity based recommendations when user adds a video
 */
export function AIRecommendationsPanel({
  videoTitle,
  videoDescription,
  channelName,
  onVideoSelect,
  className,
}: AIRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<AIVideoRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    setIsEnabled(aiRecommendationService.isEnabled());
  }, []);

  useEffect(() => {
    if (videoTitle && isEnabled) {
      fetchRecommendations();
    }

    return () => {
      aiRecommendationService.cancelRequest();
    };
  }, [videoTitle, videoDescription, isEnabled]);

  const fetchRecommendations = async () => {
    if (!videoTitle?.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await aiRecommendationService.getRecommendationsForVideo(
        videoTitle,
        videoDescription,
        channelName
      );
      setRecommendations(results);
    } catch (err: any) {
      console.error('Failed to fetch AI recommendations:', err);
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    aiRecommendationService.clearCache();
    fetchRecommendations();
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI-Powered Recommendations
        </CardTitle>
        <CardDescription>
          Similar videos found using semantic search
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <span className="ml-3 text-sm text-muted-foreground">
              Finding similar content...
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && recommendations.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No similar videos found
          </div>
        )}

        {!loading && !error && recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((video, index) => (
              <div
                key={video.video_id}
                className="flex gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onVideoSelect?.(video)}
              >
                {/* Thumbnail */}
                <div className="relative w-32 h-18 flex-shrink-0 rounded overflow-hidden bg-muted">
                  {video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {video.duration}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium line-clamp-2 mb-1">
                    {video.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {video.channelName}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {video.genre}
                    </Badge>
                    {video.similarityScore && (
                      <Badge
                        variant="outline"
                        className="text-xs border-purple-500/50 text-purple-500"
                      >
                        {Math.round(video.similarityScore * 100)}% match
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {(video.viewCount / 1000).toFixed(1)}K views
                    </span>
                  </div>
                </div>

                {/* Rank indicator */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Powered by AI semantic search • {recommendations.length} recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
