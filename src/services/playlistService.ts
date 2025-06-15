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
    videos?: any[];
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
  async updatePlaylist(playlistId: string, updateData: any) {
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
}; 