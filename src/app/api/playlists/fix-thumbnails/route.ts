import { NextResponse } from 'next/server';
import { getAllPlaylists, updatePlaylist } from '@/lib/dynamodb-service';

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

export async function POST() {
  try {
    console.log('🔧 Starting thumbnail fix process...');
    
    // Get all playlists
    const playlists = await getAllPlaylists(1000);
    console.log(`Found ${playlists.length} playlists to process`);
    
    let totalVideosFixed = 0;
    let totalPlaylistsUpdated = 0;
    
    for (const playlist of playlists) {
      let videosFixedInPlaylist = 0;
      
      console.log(`\n📝 Processing playlist: ${playlist.title || 'Untitled'}`);
      
      const updatedVideos = playlist.videos.map((video: Record<string, unknown>) => {
        const youtubeUrl = video.youtubeURL || video.url || '';
        const currentThumbnail = video.thumbnail || '';
        
        if (youtubeUrl) {
          // Extract the real YouTube ID
          const youtubeId = extractYouTubeId(youtubeUrl);
          
          if (youtubeId) {
            // Generate the proper thumbnail URL
            const correctThumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
            
            if (currentThumbnail !== correctThumbnail) {
              console.log(`  ✓ Fixed thumbnail for: ${video.title}`);
              videosFixedInPlaylist++;
              return { ...video, thumbnail: correctThumbnail };
            }
          }
        }
        
        return video;
      });
      
      if (videosFixedInPlaylist > 0) {
        await updatePlaylist(playlist.id, { videos: updatedVideos });
        totalPlaylistsUpdated++;
        totalVideosFixed += videosFixedInPlaylist;
        console.log(`Playlist updated with ${videosFixedInPlaylist} fixed videos`);
      } else {
        console.log('No thumbnails needed fixing');
      }
    }
    
    console.log('\nThumbnail fix completed!');
    console.log(`Summary: ${totalPlaylistsUpdated} playlists updated, ${totalVideosFixed} videos fixed`);
    
    return NextResponse.json({
      success: true,
      message: 'Thumbnail fix completed successfully',
      totalPlaylistsUpdated,
      totalVideosFixed,
      totalPlaylists: playlists.length
    });
    
  } catch (error) {
    console.error('Error fixing thumbnails:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fix thumbnails' 
    }, { status: 500 });
  }
} 
