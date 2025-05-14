
'use server';
/**
 * @fileOverview YouTube Data API service.
 * Fetches video details and searches for videos.
 */
import type { Video } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper function to format ISO 8601 duration to HH:MM:SS or MM:SS
function formatDuration(isoDuration: string): string {
  if (!isoDuration) return "0:00";
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  let formattedTime = "";
  if (hours > 0) {
    formattedTime += `${hours}:`;
    formattedTime += `${minutes < 10 ? '0' : ''}${minutes}:`;
  } else {
    formattedTime += `${minutes}:`;
  }
  formattedTime += `${seconds < 10 ? '0' : ''}${seconds}`;
  return formattedTime;
}

interface YouTubeSnippet {
  title: string;
  description: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
    standard?: { url: string };
    maxres?: { url: string };
  };
  channelTitle?: string;
  publishedAt?: string;
}

interface YouTubeContentDetails {
  duration: string;
}

interface YouTubeVideoItem {
  id: string; // Video ID
  snippet: YouTubeSnippet;
  contentDetails?: YouTubeContentDetails;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: YouTubeSnippet;
}

/**
 * Fetches detailed information for a given YouTube video ID.
 */
export async function getVideoDetails(videoId: string): Promise<Partial<Video> | null> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY is not set. Cannot fetch video details.');
    // Fallback to constructing a basic object, similar to how it was before
     return {
      id: videoId,
      title: `YouTube Video (${videoId})`,
      youtubeURL: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: "N/A",
      summary: "Details unavailable (API key missing).",
    };
  }

  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API error (getVideoDetails):', response.status, errorData.error?.message);
      return null;
    }
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const item: YouTubeVideoItem = data.items[0];
      return {
        id: item.id,
        title: item.snippet.title,
        youtubeURL: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        duration: item.contentDetails ? formatDuration(item.contentDetails.duration) : 'N/A',
        summary: item.snippet.description.substring(0, 200) + (item.snippet.description.length > 200 ? '...' : ''),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

/**
 * Searches for YouTube videos based on a query.
 * Returns a list of video details, including duration fetched via a second call.
 */
export async function searchVideos(query: string, maxResults: number = 5): Promise<Partial<Video>[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY is not set. Cannot search videos.');
    return [];
  }

  try {
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('YouTube API error (searchVideos):', searchResponse.status, errorData.error?.message);
      return [];
    }
    const searchData = await searchResponse.json();
    
    const videoItems: YouTubeSearchItem[] = searchData.items || [];
    const videoIds = videoItems.map(item => item.id.videoId).filter(id => id);

    if (videoIds.length === 0) {
      return [];
    }

    // Fetch contentDetails (including duration) for all found videos in one call
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );
    if (!detailsResponse.ok) {
        const errorData = await detailsResponse.json();
        console.error('YouTube API error (fetching details for search):', detailsResponse.status, errorData.error?.message);
        // Fallback: return snippet data from search if details fail
        return videoItems.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            youtubeURL: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            duration: 'N/A', // Duration not available from search snippet directly
            summary: item.snippet.description.substring(0, 200) + (item.snippet.description.length > 200 ? '...' : ''),
        }));
    }
    const detailsData = await detailsResponse.json();
    const detailedItems: YouTubeVideoItem[] = detailsData.items || [];

    const videoDetailsMap = new Map<string, YouTubeVideoItem>();
    detailedItems.forEach(item => videoDetailsMap.set(item.id, item));

    return videoItems.map(searchItem => {
      const detailedItem = videoDetailsMap.get(searchItem.id.videoId);
      return {
        id: searchItem.id.videoId,
        title: detailedItem?.snippet.title || searchItem.snippet.title,
        youtubeURL: `https://www.youtube.com/watch?v=${searchItem.id.videoId}`,
        thumbnail: detailedItem?.snippet.thumbnails?.high?.url || searchItem.snippet.thumbnails?.high?.url || searchItem.snippet.thumbnails?.medium?.url || searchItem.snippet.thumbnails?.default?.url || '',
        duration: detailedItem?.contentDetails ? formatDuration(detailedItem.contentDetails.duration) : 'N/A',
        summary: (detailedItem?.snippet.description || searchItem.snippet.description || '').substring(0, 200) + ((detailedItem?.snippet.description || searchItem.snippet.description || '').length > 200 ? '...' : ''),
      };
    });

  } catch (error) {
    console.error('Error searching videos:', error);
    return [];
  }
}
