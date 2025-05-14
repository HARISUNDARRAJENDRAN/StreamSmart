
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircleIcon } from 'lucide-react';
import type { Video } from '@/types';

interface RecommendedVideoCardProps {
  video: Video;
  onAdd: () => void;
  isLoading?: boolean;
}

export function RecommendedVideoCard({ video, onAdd, isLoading }: RecommendedVideoCardProps) {
  // video.thumbnail should be a valid URL string (either from YouTube or the AI tool's fallback like placehold.co)
  const primarySrc = video.thumbnail;
  
  // A distinct fallback for the onError event
  const errorFallbackSrc = `https://placehold.co/300x180.png?text=ThumbErr`;

  return (
    <Card className="flex flex-col overflow-hidden shadow-md transition-all hover:shadow-lg hover:border-primary">
      <CardHeader className="p-0 relative">
        <Image
          src={primarySrc} // Use video.thumbnail directly
          alt={video.title || 'Recommended video'}
          width={300} // Intrinsic width for next/image
          height={180} // Intrinsic height for next/image
          className="w-full h-40 object-cover" // CSS to style the rendered image
          data-ai-hint="video thumbnail"
          onError={(e) => {
            // Prevent an infinite loop if the errorFallbackSrc itself fails
            if (e.currentTarget.src !== errorFallbackSrc) {
              e.currentTarget.src = errorFallbackSrc;
            }
          }}
        />
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-base font-semibold mb-1 line-clamp-2" title={video.title}>
          {video.title || 'Untitled Video'}
        </CardTitle>
        {video.summary && (
          <CardDescription className="text-xs text-muted-foreground line-clamp-3" title={video.summary}>
            Reasoning: {video.summary}
          </CardDescription>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-primary border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={onAdd}
          disabled={isLoading}
        >
          <PlusCircleIcon className="mr-2 h-4 w-4" /> Add to Playlist
        </Button>
      </CardFooter>
    </Card>
  );
}
