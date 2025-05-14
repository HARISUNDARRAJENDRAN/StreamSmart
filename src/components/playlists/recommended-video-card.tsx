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
  return (
    <Card className="flex flex-col overflow-hidden shadow-md transition-all hover:shadow-lg hover:border-primary">
      <CardHeader className="p-0 relative">
        <Image
          src={video.thumbnail}
          alt={video.title}
          width={300}
          height={180}
          className="w-full h-40 object-cover"
          data-ai-hint="video thumbnail"
        />
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-base font-semibold mb-1 line-clamp-2" title={video.title}>
          {video.title}
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
