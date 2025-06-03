'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  videoTitle?: string;
}

export function VideoPlayer({ videoUrl, videoTitle }: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('🎥 [VideoPlayer] Attempting to load video:', { videoUrl, videoTitle });
    
    if (!videoUrl || !playerRef.current) {
      console.log('❌ [VideoPlayer] Missing videoUrl or playerRef:', { videoUrl, hasPlayerRef: !!playerRef.current });
      return;
    }

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    console.log('🔍 [VideoPlayer] Extracted video ID:', videoId, 'from URL:', videoUrl);
    
    if (!videoId) {
      console.log('❌ [VideoPlayer] Failed to extract video ID from URL:', videoUrl);
      return;
    }

    // Clear any existing content
    playerRef.current.innerHTML = '';

    // Load YouTube IFrame API
    if (!window.YT) {
      console.log('📡 [VideoPlayer] Loading YouTube IFrame API...');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log('✅ [VideoPlayer] YouTube API ready, creating player...');
        createPlayer(videoId);
      };
    } else {
      console.log('✅ [VideoPlayer] YouTube API already loaded, creating player...');
      createPlayer(videoId);
    }

    function createPlayer(videoId: string) {
      if (!playerRef.current) {
        console.log('❌ [VideoPlayer] PlayerRef not available during createPlayer');
        return;
      }

      console.log('🎬 [VideoPlayer] Creating YouTube player for video ID:', videoId);
      
      try {
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
              console.log('✅ [VideoPlayer] YouTube player ready for video:', videoId);
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                console.log('▶️ [VideoPlayer] Video started playing:', videoId);
              }
            },
            onError: (event: any) => {
              console.log('❌ [VideoPlayer] YouTube player error:', event.data, 'for video:', videoId);
              // Show error message in the player area
              if (playerRef.current) {
                playerRef.current.innerHTML = `
                  <div class="flex items-center justify-center h-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div class="text-center p-4">
                      <p class="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load video</p>
                      <p class="text-sm text-red-500 dark:text-red-300">Video ID: ${videoId}</p>
                      <p class="text-xs text-muted-foreground mt-1">Error code: ${event.data}</p>
                    </div>
                  </div>
                `;
              }
            },
          },
        });
      } catch (error) {
        console.error('❌ [VideoPlayer] Error creating YouTube player:', error);
        if (playerRef.current) {
          playerRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div class="text-center p-4">
                <p class="text-red-600 dark:text-red-400 font-medium mb-2">Player Creation Error</p>
                <p class="text-sm text-red-500 dark:text-red-300">Video ID: ${videoId}</p>
                <p class="text-xs text-muted-foreground mt-1">${error.message}</p>
              </div>
            </div>
          `;
        }
      }
    }
  }, [videoUrl]);

  function extractVideoId(url: string): string | null {
    console.log('🔍 [VideoPlayer] Extracting video ID from URL:', url);
    
    // Enhanced regex to handle various YouTube URL formats
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    const videoId = match && match[2].length === 11 ? match[2] : null;
    console.log('🎯 [VideoPlayer] Regex match result:', { match: match?.slice(0, 3), videoId });
    
    return videoId;
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <div ref={playerRef} className="w-full h-full" />
      {!videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <p className="text-muted-foreground">No video URL provided</p>
        </div>
      )}
      {videoTitle && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white text-lg font-medium truncate">{videoTitle}</h3>
        </div>
      )}
    </div>
  );
}

