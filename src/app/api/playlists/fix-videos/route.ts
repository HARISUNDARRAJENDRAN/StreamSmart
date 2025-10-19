import { NextResponse } from 'next/server';
import { getAllPlaylists, updatePlaylist } from '@/lib/dynamodb-service';

// POST - Fix existing playlists with missing video fields
export async function POST() {
  try {
    // Find all playlists using pagination
    const allPlaylists = [];
    let lastEvaluatedKey: Record<string, string | number | boolean> | undefined;
    const pageSize = 100; // Reasonable page size for DynamoDB scan
    
    // Paginate through all playlists
    do {
      const result = await getAllPlaylists(pageSize, lastEvaluatedKey);
      allPlaylists.push(...result.items);
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const playlist of allPlaylists) {
      try {
        let needsUpdate = false;
        
        // Fix videos with missing required fields
        const fixedVideos = playlist.videos.map((video: Record<string, unknown>) => {
          const fixedVideo = { ...video };
          
          // Ensure required fields exist
          if (!fixedVideo.youtubeId) {
            fixedVideo.youtubeId = video.id || `fixed_${Date.now()}`;
            needsUpdate = true;
          }
          
          if (!fixedVideo.youtubeURL) {
            fixedVideo.youtubeURL = video.url || `https://youtube.com/watch?v=${fixedVideo.youtubeId}`;
            needsUpdate = true;
          }
          
          if (!fixedVideo.addedAt) {
            fixedVideo.addedAt = new Date().toISOString();
            needsUpdate = true;
          }
          
          if (!fixedVideo.title) {
            fixedVideo.title = 'Untitled Video';
            needsUpdate = true;
          }
          
          if (!fixedVideo.duration) {
            fixedVideo.duration = '0:00';
            needsUpdate = true;
          }
          
          if (!fixedVideo.thumbnail) {
            fixedVideo.thumbnail = `https://img.youtube.com/vi/${fixedVideo.youtubeId}/default.jpg`;
            needsUpdate = true;
          }
          
          if (!fixedVideo.url) {
            fixedVideo.url = fixedVideo.youtubeURL;
            needsUpdate = true;
          }
          
          if (!fixedVideo.channelTitle) {
            fixedVideo.channelTitle = '';
            needsUpdate = true;
          }
          
          if (!fixedVideo.description) {
            fixedVideo.description = '';
            needsUpdate = true;
          }
          
          if (!fixedVideo.addedBy) {
            fixedVideo.addedBy = 'user';
            needsUpdate = true;
          }
          
          if (fixedVideo.completionStatus === undefined) {
            fixedVideo.completionStatus = 0;
            needsUpdate = true;
          }
          
          return fixedVideo;
        });
        
        if (needsUpdate) {
          await updatePlaylist(playlist.id, { videos: fixedVideos });
          fixedCount++;
          console.log(`Fixed playlist: ${playlist.title} (${playlist.id})`);
        }
        
      } catch (error) {
        console.error(`Error fixing playlist ${playlist.id}:`, error);
        errorCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} playlists, ${errorCount} errors`,
      fixedCount,
      errorCount,
      totalPlaylists: allPlaylists.length
    });
    
  } catch (error) {
    console.error('Error fixing playlists:', error);
    return NextResponse.json({ error: 'Failed to fix playlists' }, { status: 500 });
  }
} 
