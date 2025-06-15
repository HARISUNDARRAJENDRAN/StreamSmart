import { NextRequest, NextResponse } from 'next/server';
import { Playlist } from '@/models/Playlist';
import { connectToDatabase } from '@/lib/mongodb';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /v=([a-zA-Z0-9_-]{11})/,
    /\/([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    console.log('🔧 Starting thumbnail fix process...');
    
    // Get all playlists
    const playlists = await Playlist.find({});
    console.log(`📋 Found ${playlists.length} playlists to process`);
    
    let totalVideosFixed = 0;
    let totalPlaylistsUpdated = 0;
    
    for (const playlist of playlists) {
      let playlistUpdated = false;
      let videosFixedInPlaylist = 0;
      
      console.log(`\n📁 Processing playlist: ${playlist.title || 'Untitled'}`);
      
      for (let i = 0; i < playlist.videos.length; i++) {
        const video = playlist.videos[i];
        const youtubeUrl = video.youtubeURL || video.url || '';
        const currentThumbnail = video.thumbnail || '';
        
        if (youtubeUrl) {
          // Extract the real YouTube ID
          const youtubeId = extractYouTubeId(youtubeUrl);
          
          if (youtubeId) {
            // Generate correct thumbnail URL
            const correctThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
            
            // Check if we need to update
            if (currentThumbnail !== correctThumbnail) {
              console.log(`  🎥 Video: ${(video.title || 'Untitled').substring(0, 50)}`);
              console.log(`     📺 YouTube ID: ${youtubeId}`);
              console.log(`     ❌ Old thumbnail: ${currentThumbnail}`);
              console.log(`     ✅ New thumbnail: ${correctThumbnail}`);
              
              // Update the video
              playlist.videos[i].thumbnail = correctThumbnail;
              playlist.videos[i].youtubeId = youtubeId;
              videosFixedInPlaylist++;
              playlistUpdated = true;
            }
          } else {
            console.log(`  ⚠️  Could not extract YouTube ID from: ${youtubeUrl}`);
          }
        } else {
          console.log(`  ⚠️  Video missing youtubeURL: ${video.title || 'Untitled'}`);
        }
      }
      
      // Update the playlist in database if any videos were fixed
      if (playlistUpdated) {
        await playlist.save();
        console.log(`  ✅ Updated playlist with ${videosFixedInPlaylist} video fixes`);
        totalVideosFixed += videosFixedInPlaylist;
        totalPlaylistsUpdated++;
      } else {
        console.log(`  ℹ️  No updates needed for this playlist`);
      }
    }
    
    console.log(`\n🎉 Thumbnail fix complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Playlists updated: ${totalPlaylistsUpdated}`);
    console.log(`   - Videos fixed: ${totalVideosFixed}`);
    
    return NextResponse.json({
      success: true,
      message: 'Thumbnail fix completed successfully',
      playlistsUpdated: totalPlaylistsUpdated,
      videosFixed: totalVideosFixed
    });
    
  } catch (error) {
    console.error('❌ Error fixing thumbnails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fix thumbnails' },
      { status: 500 }
    );
  }
} 