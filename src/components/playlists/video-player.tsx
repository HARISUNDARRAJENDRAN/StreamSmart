
'use client';

import { useEffect, useRef, useId } from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface VideoPlayerProps {
  videoUrl: string;
  videoTitle?: string;
  // Callbacks for future enhancements:
  // onVideoEnd?: () => void; 
  // onProgressUpdate?: (currentTime: number, duration: number) => void;
}

// Global state to manage YouTube API script loading
let youtubeApiLoaded = false;
let youtubeApiPromise: Promise<void> | null = null;

const loadYouTubeApi = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error("Cannot load YouTube API on server."));
  }

  if (youtubeApiLoaded) {
    // @ts-ignore
    if (window.YT && window.YT.Player) {
        return Promise.resolve();
    }
    // If YT object is missing after being marked loaded, reset and reload.
    youtubeApiLoaded = false; 
    youtubeApiPromise = null;
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    // Double check if API became available while promise was pending
    // @ts-ignore
    if (window.YT && window.YT.Player) {
      youtubeApiLoaded = true;
      resolve();
      return;
    }

    const scriptId = 'youtube-iframe-api-script';
    if (document.getElementById(scriptId)) {
      // Script tag might exist but API not ready, rely on onYouTubeIframeAPIReady
      // or if YT is already there.
    } else {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
          youtubeApiPromise = null; // Allow retry
          reject(new Error('YouTube Iframe API script failed to load.'));
        };
        document.head.appendChild(script);
    }
    
    // @ts-ignore
    window.onYouTubeIframeAPIReady = () => {
      youtubeApiLoaded = true;
      resolve();
    };
  });
  return youtubeApiPromise;
};


export function VideoPlayer({ videoUrl, videoTitle = "Video" }: VideoPlayerProps) {
  const playerRef = useRef<any>(null); // Stores YT.Player instance
  const playerDivRef = useRef<HTMLDivElement>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  
  // Generate a unique ID for the player div to avoid conflicts
  const uniquePlayerDivId = `youtube-player-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const extractVideoId = (url: string): string | null => {
      if (!url) return null;
      try {
        const urlObj = new URL(url);
        let videoIdToken: string | null = null;
        if (urlObj.hostname === 'youtu.be') {
          videoIdToken = urlObj.pathname.substring(1).split(/[?&]/)[0];
        } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
           if (urlObj.pathname === '/watch') {
            videoIdToken = urlObj.searchParams.get('v');
           } else if (urlObj.pathname.startsWith('/embed/')) {
            videoIdToken = urlObj.pathname.substring('/embed/'.length).split(/[?&]/)[0];
           } else if (urlObj.pathname.startsWith('/shorts/')) {
            videoIdToken = urlObj.pathname.substring('/shorts/'.length).split(/[?&]/)[0];
           }
        }
        return videoIdToken ? videoIdToken.trim() : null;
      } catch (error) {
        console.warn("Invalid video URL for ID extraction:", url, error);
        return null;
      }
    };

    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
      console.error("VideoPlayer: Could not extract video ID from URL:", videoUrl);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch(e) { console.error("Error destroying player:", e)}
        playerRef.current = null;
      }
      if (playerDivRef.current) {
        playerDivRef.current.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-muted text-muted-foreground p-4 rounded">Invalid video URL. Player cannot load.</div>`;
      }
      currentVideoIdRef.current = null;
      return;
    }
    
    // Clear any previous error message if videoId is now valid
    if (playerDivRef.current && playerDivRef.current.firstChild && playerDivRef.current.firstChild.textContent?.includes("Invalid video URL")) {
        playerDivRef.current.innerHTML = ''; // Clear out the placeholder div content
        // The player will be re-created in the div with id uniquePlayerDivId
    }


    loadYouTubeApi().then(() => {
      // Ensure the target div for the player is clean before creating a new player instance
      // This is important if the URL changes and we need to effectively replace the player.
      if (playerDivRef.current) {
         // If a player instance exists, destroy it cleanly before creating a new one
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.error("Error destroying previous player instance:", e);
          }
          playerRef.current = null; // Nullify the ref
        }
        // Ensure the div is empty for the new player
        // playerDivRef.current.innerHTML = ''; // This might be too aggressive if not managed carefully
      } else {
        // if playerDivRef.current is null, component might have unmounted or an error occurred.
        console.error("Player div ref not available for player initialization.");
        return;
      }


      if (playerDivRef.current && (!playerRef.current || currentVideoIdRef.current !== videoId)) {
        // Player doesn't exist OR video changed: create/recreate the player
        // @ts-ignore
        playerRef.current = new YT.Player(uniquePlayerDivId, { // Use the unique ID of the div
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            playsinline: 1, 
            modestbranding: 1, // Slightly reduce YouTube branding
          },
          events: {
            // 'onReady': (event) => { event.target.playVideo(); }, // Alternative to autoplay playerVar
            // 'onStateChange': onPlayerStateChange // To be added in next iteration
          },
        });
        currentVideoIdRef.current = videoId;
      } else if (playerRef.current && currentVideoIdRef.current === videoId) {
        // Video is the same. Player should ideally continue its current state.
        // If needed, one could call playerRef.current.playVideo() here if it was paused.
      }
    }).catch(error => {
      console.error("VideoPlayer: Error loading YouTube API or initializing player:", error);
      if (playerDivRef.current) {
        playerDivRef.current.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-muted text-muted-foreground p-4 rounded">Error loading video player.</div>`;
      }
    });

  }, [videoUrl, uniquePlayerDivId]); // Re-run effect if videoUrl or the unique ID changes

   // Effect for unmounting the player
   useEffect(() => {
    return () => {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
            try {
                playerRef.current.destroy();
            } catch (e) {
                console.error("Error destroying YouTube player on unmount:", e);
            }
            playerRef.current = null;
        }
    };
   }, []); // Empty dependency array means this runs once on mount and cleanup on unmount


  return (
    <Card className="overflow-hidden shadow-lg">
      <CardContent className="p-0 aspect-video bg-black">
        {/* The div where the YouTube player will be embedded */}
        <div id={uniquePlayerDivId} ref={playerDivRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}

