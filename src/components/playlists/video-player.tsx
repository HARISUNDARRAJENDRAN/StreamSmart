'use client';

import { Card, CardContent } from "@/components/ui/card";
import Image from 'next/image';

interface VideoPlayerProps {
  videoUrl: string;
  videoTitle?: string;
}

export function VideoPlayer({ videoUrl, videoTitle = "Video" }: VideoPlayerProps) {
  // In a real app, you'd use a library like ReactPlayer here.
  // For now, this is a placeholder.
  
  // Extract video ID for YouTube embed or thumbnail
  let videoId = '';
  try {
    const url = new URL(videoUrl);
    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.substring(1);
    } else if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
      videoId = url.searchParams.get('v') || '';
    }
  } catch (error) {
    console.warn("Invalid video URL for placeholder:", videoUrl);
  }

  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '';
  const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://placehold.co/1280x720.png?text=Video+Player';


  return (
    <Card className="overflow-hidden shadow-lg">
      <CardContent className="p-0 aspect-video">
        {embedUrl ? (
           <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title={videoTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="bg-black"
          ></iframe>
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center">
            <Image 
              src={thumbnailUrl} 
              alt={videoTitle} 
              layout="fill" 
              objectFit="cover"
              data-ai-hint="video player"
            />
            <p className="absolute text-lg text-foreground bg-black/50 p-2 rounded">Video player placeholder for: {videoUrl}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
