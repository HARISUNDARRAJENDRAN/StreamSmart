import type { Video } from '@/types';

const API_BASE_URL = '/api';

export const playlistService = {
  // Fetch all playlists for a user
  async getPlaylists(userId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists?userId=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Playlists API error:', data);
        throw new Error(data.error || 'Failed to fetch playlists');
      }
      
      return data.playlists || [];
    } catch (error) {
      console.error('Error fetching playlists:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Fetch a single playlist by ID
  async getPlaylistById(playlistId: string) {
    try {
      console.log('Fetching playlist with ID:', playlistId);
      const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
      
      console.log('Playlist fetch response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Playlist API error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        
        console.error('Playlist API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch playlist`);
      }
      
      const data = await response.json();
      console.log('Playlist data received:', data);
      
      // Handle both old and new response formats
      const playlist = data.playlist || data;
      
      // Ensure we have the correct ID field
      if (playlist && !playlist._id && playlist.id) {
        playlist._id = playlist.id;
      }
      
      return playlist;
    } catch (error) {
      console.error('Error fetching playlist:', error);
      throw error; // Re-throw to allow caller to handle
    }
  },

  // Create a new playlist
  async createPlaylist(playlistData: {
    userId: string;
    title: string;
    description?: string;
    category: string;
    tags?: string[];
    isPublic?: boolean;
    videos?: Video[];
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playlistData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Create playlist API error:', data);
        return { success: false, error: data.error || 'Failed to create playlist' };
      }
      
      return { success: true, playlist: data.playlist };
    } catch (error) {
      console.error('Error creating playlist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create playlist' };
    }
  },

  // Update a playlist
  async updatePlaylist(playlistId: string, updateData: Partial<{title: string; description: string; category: string; tags: string[]; isPublic: boolean; videos: Video[]}>) {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId, ...updateData }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Update playlist API error:', data);
        throw new Error(data.error || 'Failed to update playlist');
      }
      
      return { success: true, playlist: data.playlist };
    } catch (error) {
      console.error('Error updating playlist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update playlist' };
    }
  },

  // Delete a playlist
  async deletePlaylist(playlistId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists?playlistId=${playlistId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Delete playlist API error:', data);
        throw new Error(data.error || 'Failed to delete playlist');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete playlist' };
    }
  },

  // Record an activity
  async recordActivity(activityData: {
    userId: string;
    action: string;
    item: string;
    type: 'completed' | 'started' | 'created' | 'quiz';
    videoId?: string;
    genre?: string;
    videoTitle?: string;
    channelName?: string;
    watchDuration?: number;
    playlistId?: string;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Record activity API error:', data);
        throw new Error(data.error || 'Failed to record activity');
      }
      
      return { success: true, activity: data.activity };
    } catch (error) {
      console.error('Error recording activity:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to record activity' };
    }
  },

  // Get user activities
  async getActivities(userId: string, limit: number = 100) {
    try {
      const response = await fetch(`${API_BASE_URL}/activities?userId=${userId}&limit=${limit}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Activities API error:', data);
        throw new Error(data.error || 'Failed to fetch activities');
      }
      
      return data.activities || [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Sync playlists for personalized recommendations
  async syncPlaylistsForRecommendations(userId: string, forceResync: boolean = false) {
    try {
      console.log('Starting playlist sync for user:', userId, forceResync ? '(FORCE RESYNC)' : '');
      
      // Step 1: Fetch all user playlists
      const playlists = await this.getPlaylists(userId);
      
      if (!playlists || playlists.length === 0) {
        console.log('No playlists found for user');
        return {
          success: true,
          syncedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          genresExtracted: [],
          message: 'No playlists to sync'
        };
      }
      
      console.log(`Found ${playlists.length} playlists to sync`);
      
      // Step 2: Transform playlists to backend format
      const syncPayload = {
        user_id: userId,
        playlists: playlists.map((playlist: any) => ({
          playlistId: playlist._id || playlist.id,
          category: playlist.category || 'General',
          videos: (playlist.videos || []).map((video: any) => ({
            id: video.youtubeId || video.id,
            title: video.title || 'Untitled',
            channelTitle: video.channelTitle || video.channel || null
          }))
        })),
        force_resync: forceResync
      };
      
      // Step 3: Call Python backend sync endpoint
      const PYTHON_API_BASE = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
      const response = await fetch(`${PYTHON_API_BASE}/api/recommendations/sync-playlist-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncPayload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Playlist sync API error:', data);
        throw new Error(data.detail || data.error || 'Failed to sync playlists');
      }
      
      console.log('Playlist sync successful:', data);
      
      return {
        success: true,
        syncedCount: data.syncedCount || data.synced_count || 0,
        skippedCount: data.skippedCount || data.skipped_count || 0,
        failedCount: data.failedCount || data.failed_count || 0,
        genresExtracted: data.genresExtracted || data.genres_extracted || [],
        message: data.message || 'Playlists synced successfully'
      };
    } catch (error) {
      console.error('Error syncing playlists:', error);
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        genresExtracted: [],
        message: error instanceof Error ? error.message : 'Failed to sync playlists'
      };
    }
  },
}; 