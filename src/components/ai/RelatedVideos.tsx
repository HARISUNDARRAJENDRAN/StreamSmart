'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, Play, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface RelatedVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  similarity: number;
}

interface RelatedVideosProps {
  videoId: string;
  playlistId?: string;
  compact?: boolean;
}

export function RelatedVideos({
  videoId,
  playlistId,
  compact = false
}: RelatedVideosProps) {
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelated = async () => {
      setLoading(true);
      setError(null);

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/suggest-related`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            exclude_playlist_id: playlistId || null
          })
        });

        if (!response.ok) {
          throw new Error('Failed to load related videos');
        }

        const data = await response.json();
        setRelated(data.relatedVideos || []);

        // Analytics
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.track('related_videos_loaded', {
            videoId,
            count: data.relatedVideos?.length || 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error('Failed to load related videos:', err);
        setError(err.message || 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchRelated();
    }
  }, [videoId, playlistId]);

  const handleVideoClick = (relatedVideoId: string, similarity: number) => {
    // Analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('related_video_clicked', {
        from: videoId,
        to: relatedVideoId,
        similarity,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Related Content
        </h4>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground">{error}</p>
        ) : related.length === 0 ? (
          <p className="text-xs text-muted-foreground">No related videos found</p>
        ) : (
          <div className="space-y-2">
            {related.map((video) => (
              <Link
                key={video.videoId}
                href={`/video/${video.videoId}`}
                onClick={() => handleVideoClick(video.videoId, video.similarity)}
                className="block group"
              >
                <div className="flex gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={video.thumbnail || '/placeholder-video.jpg'}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-6 w-6 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h5>
                    <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                      {Math.round(video.similarity * 100)}% match
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Related Videos
        </CardTitle>
        <CardDescription>
          Other videos you might find interesting based on content similarity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-32 h-24 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        ) : related.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No related videos found</p>
            <p className="text-xs mt-1">Try exploring other playlists</p>
          </div>
        ) : (
          <div className="space-y-3">
            {related.map((video, index) => (
              <motion.div
                key={video.videoId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/video/${video.videoId}`}
                  onClick={() => handleVideoClick(video.videoId, video.similarity)}
                  className="block group"
                >
                  <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all hover:shadow-md border border-transparent hover:border-primary/20">
                    {/* Thumbnail */}
                    <div className="relative w-40 h-28 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={video.thumbnail || '/placeholder-video.jpg'}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" fill="white" />
                      </div>
                      {/* Similarity Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant="default"
                          className="text-xs font-semibold shadow-lg"
                        >
                          {Math.round(video.similarity * 100)}%
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.description || 'No description available'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Similar Content
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && !error && related.length > 0 && (
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Recommendations powered by AI semantic search
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
