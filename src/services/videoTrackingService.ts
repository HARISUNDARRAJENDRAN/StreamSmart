/**
 * Video Activity Tracking Service
 * Tracks user video watching behavior for personalized recommendations
 */

import { API_BASE_URL } from '@/lib/api-base';

export interface VideoActivity {
  userId: string;
  videoId: string;
  genre: string;
  videoTitle: string;
  channelName: string;
  watchDuration?: number; // in seconds
  playlistId?: string;
  action: 'started' | 'completed' | 'paused' | 'resumed';
}

export interface TrackingOptions {
  autoTrack?: boolean;
  minWatchDuration?: number; // minimum watch duration to record (seconds)
}

class VideoTrackingService {
  private watchSessions: Map<string, {
    startTime: number;
    lastPing: number;
    totalDuration: number;
  }> = new Map();

  /**
   * Track video watch start
   */
  async trackVideoStart(activity: Omit<VideoActivity, 'action' | 'watchDuration'>): Promise<void> {
    try {
      // Start tracking watch duration
      this.watchSessions.set(activity.videoId, {
        startTime: Date.now(),
        lastPing: Date.now(),
        totalDuration: 0
      });

      // Send activity to backend
      await this.recordActivity({
        ...activity,
        action: 'started'
      });

      console.log(`[VideoTracking] Started tracking: ${activity.videoTitle} (${activity.genre})`);
    } catch (error) {
      console.error('[VideoTracking] Error tracking video start:', error);
    }
  }

  /**
   * Track video watch completion
   */
  async trackVideoComplete(activity: Omit<VideoActivity, 'action'>): Promise<void> {
    try {
      const session = this.watchSessions.get(activity.videoId);
      const watchDuration = session 
        ? Math.floor((Date.now() - session.startTime) / 1000) 
        : activity.watchDuration || 0;

      // Send activity to backend with watch duration
      await this.recordActivity({
        ...activity,
        watchDuration,
        action: 'completed'
      });

      // Clean up session
      this.watchSessions.delete(activity.videoId);

      console.log(`[VideoTracking] Completed: ${activity.videoTitle} - ${watchDuration}s watched`);
    } catch (error) {
      console.error('[VideoTracking] Error tracking video completion:', error);
    }
  }

  /**
   * Track video pause (periodic checkpoint)
   */
  async trackVideoPause(videoId: string): Promise<void> {
    const session = this.watchSessions.get(videoId);
    if (session) {
      session.totalDuration += Math.floor((Date.now() - session.lastPing) / 1000);
      session.lastPing = Date.now();
      console.log(`[VideoTracking] Paused: ${videoId} - ${session.totalDuration}s total`);
    }
  }

  /**
   * Track video resume
   */
  async trackVideoResume(videoId: string): Promise<void> {
    const session = this.watchSessions.get(videoId);
    if (session) {
      session.lastPing = Date.now();
      console.log(`[VideoTracking] Resumed: ${videoId}`);
    }
  }

  /**
   * Get current watch duration for a video
   */
  getWatchDuration(videoId: string): number {
    const session = this.watchSessions.get(videoId);
    if (!session) return 0;
    
    const currentDuration = Math.floor((Date.now() - session.lastPing) / 1000);
    return session.totalDuration + currentDuration;
  }

  /**
   * Record activity to backend
   */
  private async recordActivity(activity: VideoActivity): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: activity.userId,
          action: activity.action,
          item: activity.videoId,
          type: activity.action === 'completed' ? 'completed' : 'started',
          videoId: activity.videoId,
          genre: activity.genre,
          videoTitle: activity.videoTitle,
          channelName: activity.channelName,
          watchDuration: activity.watchDuration,
          playlistId: activity.playlistId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record activity');
      }

      const result = await response.json();
      console.log('[VideoTracking] Activity recorded:', result);
    } catch (error) {
      console.error('[VideoTracking] Failed to record activity:', error);
      // Don't throw - tracking errors shouldn't break the user experience
    }
  }

  /**
   * Cleanup all tracking sessions (e.g., on page unload)
   */
  cleanup(): void {
    this.watchSessions.clear();
  }
}

// Export singleton instance
export const videoTrackingService = new VideoTrackingService();

/**
 * React hook for video tracking
 */
export function useVideoTracking() {
  const trackVideoStart = async (
    videoId: string,
    genre: string,
    videoTitle: string,
    channelName: string,
    userId: string,
    playlistId?: string
  ) => {
    return videoTrackingService.trackVideoStart({
      userId,
      videoId,
      genre,
      videoTitle,
      channelName,
      playlistId,
    });
  };

  const trackVideoComplete = async (
    videoId: string,
    genre: string,
    videoTitle: string,
    channelName: string,
    userId: string,
    watchDuration?: number,
    playlistId?: string
  ) => {
    return videoTrackingService.trackVideoComplete({
      userId,
      videoId,
      genre,
      videoTitle,
      channelName,
      watchDuration,
      playlistId,
    });
  };

  const trackVideoPause = (videoId: string) => {
    return videoTrackingService.trackVideoPause(videoId);
  };

  const trackVideoResume = (videoId: string) => {
    return videoTrackingService.trackVideoResume(videoId);
  };

  const getWatchDuration = (videoId: string) => {
    return videoTrackingService.getWatchDuration(videoId);
  };

  return {
    trackVideoStart,
    trackVideoComplete,
    trackVideoPause,
    trackVideoResume,
    getWatchDuration,
  };
}
