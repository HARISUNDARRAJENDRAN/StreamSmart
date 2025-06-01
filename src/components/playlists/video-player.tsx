'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  videoTitle?: string;
}

export function VideoPlayer({ videoUrl, videoTitle }: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoUrl || !playerRef.current) return;

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return;

    // Clear any existing content
    playerRef.current.innerHTML = '';

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer(videoId);
      };
    } else {
      createPlayer(videoId);
    }

    function createPlayer(videoId: string) {
      if (!playerRef.current) return;

      new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube player ready for video:', videoId);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              console.log('Video started playing:', videoId);
            }
          },
        },
      });
    }
  }, [videoUrl]);

  function extractVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <div ref={playerRef} className="w-full h-full" />
      {videoTitle && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white text-lg font-medium truncate">{videoTitle}</h3>
        </div>
      )}
    </div>
  );
}

