
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
  const thumbnailUrl = video.thumbnail && video.thumbnail.startsWith('https://') 
    ? video.thumbnail 
    : `https://placehold.co/300x180.png?text=${encodeURIComponent(video.title.substring(0,10) || 'Video')}`;

  return (
    <Card className="flex flex-col overflow-hidden shadow-md transition-all hover:shadow-lg hover:border-primary">
      <CardHeader className="p-0 relative">
        <Image
          src={thumbnailUrl}
          alt={video.title || 'Recommended video'}
          width={300}
          height={180}
          className="w-full h-40 object-cover"
          data-ai-hint="video thumbnail"
          onError={(e) => { e.currentTarget.src = `https://placehold.co/300x180.png?text=Error`; }}
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

