import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

// POST - Fix existing playlists with missing video fields
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Find all playlists
    const playlists = await Playlist.find({});
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const playlist of playlists) {
      try {
        let needsUpdate = false;
        
        // Fix videos with missing required fields
        const fixedVideos = playlist.videos.map((video: any) => {
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
          playlist.videos = fixedVideos;
          await playlist.save();
          fixedCount++;
          console.log(`Fixed playlist: ${playlist.title} (${playlist._id})`);
        }
        
      } catch (error) {
        console.error(`Error fixing playlist ${playlist._id}:`, error);
        errorCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} playlists, ${errorCount} errors`,
      fixedCount,
      errorCount,
      totalPlaylists: playlists.length
    });
    
  } catch (error) {
    console.error('Error fixing playlists:', error);
    return NextResponse.json({ error: 'Failed to fix playlists' }, { status: 500 });
  }
} 