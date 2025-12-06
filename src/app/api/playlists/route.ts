import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPlaylistsByUserId, createPlaylist, updatePlaylist, deletePlaylist, getAllPlaylists, getPlaylistById, type DynamoDBPlaylist } from '@/lib/dynamodb-service';
import { cache, generateCacheKey, CacheTTL } from '@/lib/cache';
import { getAuthenticatedUser, isAuthorizedForResource } from '@/lib/auth-utils';

// Utility function to extract YouTube ID from URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Helper function to transform video source objects into normalized video objects
interface VideoSource {
  id?: string;
  youtubeId?: string;
  title?: string;
  channelTitle?: string;
  thumbnail?: string;
  duration?: string;
  url?: string;
  youtubeURL?: string;
  description?: string;
  completionStatus?: number;
  addedAt?: string;
  addedBy?: string;
}

type PlaylistVideo = DynamoDBPlaylist['videos'][number];

function transformVideo(sourceVideo: VideoSource, addedBy: string = 'user'): PlaylistVideo {
  // Extract youtubeId from url if not provided
  const candidateUrl = sourceVideo.url ?? sourceVideo.youtubeURL ?? '';
  const extractedYoutubeId = candidateUrl ? extractYouTubeId(candidateUrl) : null;
  const youtubeId = sourceVideo.youtubeId ?? sourceVideo.id ?? extractedYoutubeId ?? '';
  const thumbnail = sourceVideo.thumbnail ?? (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '');
  const videoUrl = sourceVideo.youtubeURL ?? sourceVideo.url ?? (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '');
  
  return {
    id: `video_${uuidv4()}`,
    youtubeId: youtubeId || '',
    title: sourceVideo.title || 'Untitled Video',
    channelTitle: sourceVideo.channelTitle || '',
    thumbnail,
    duration: sourceVideo.duration || '0:00',
    url: videoUrl,
    youtubeURL: videoUrl,
    description: sourceVideo.description || '',
    completionStatus: sourceVideo.completionStatus ?? 0,
    addedAt: sourceVideo.addedAt || new Date().toISOString(),
    addedBy: sourceVideo.addedBy || addedBy,
  };
}

// GET - Fetch user's playlists
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    
    // Get requested userId from query params
    const requestedUserId = request.nextUrl.searchParams.get('userId');
    
    // Determine which userId to query
    let queryUserId: string;
    
    if (authResult.authenticated && authResult.user) {
      // Authenticated user - verify they're accessing their own data or use their ID
      if (requestedUserId && requestedUserId !== authResult.user.userId) {
        // User is trying to access another user's playlists - IDOR protection
        return NextResponse.json(
          { error: 'Access denied. You can only access your own playlists.' },
          { status: 403 }
        );
      }
      queryUserId = requestedUserId || authResult.user.userId;
    } else {
      // Not authenticated - only allow guest access
      if (requestedUserId && requestedUserId !== 'guest') {
        return NextResponse.json(
          { error: 'Authentication required to access playlists' },
          { status: 401 }
        );
      }
      queryUserId = 'guest';
    }

    // Generate cache key
    const cacheKey = generateCacheKey('playlists', { userId: queryUserId });
    
    // Check cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    try {
      let playlists;
      
      // Debug mode: return all playlists with their userIds (development only)
      if (requestedUserId === 'all-debug') {
        // Only allow in development environment for security
        if (process.env.NODE_ENV !== 'development') {
          return NextResponse.json(
            { error: 'Debug endpoints are only available in development mode' },
            { status: 403 }
          );
        }

        const result = await getAllPlaylists(20);
        playlists = result.items;
        const response = {
          success: true,
          debug: true,
          playlists: playlists.map(p => ({
            id: p.id,
            title: p.title || 'Untitled',
            description: p.description || '',
            videoCount: (p.videos || []).length,
            userId: p.userId,
            createdAt: p.createdAt
          }))
        };
        await cache.set(cacheKey, response, CacheTTL.SHORT);
        return NextResponse.json(response);
      }
      
      playlists = await getPlaylistsByUserId(queryUserId);
      
      // Reduce excessive logging in production
      if (process.env.NODE_ENV === 'development' && playlists.length > 0) {
        console.log('Found playlists:', playlists.length);
      }
      
      const response = { 
        success: true,
        playlists: playlists.map(p => ({
          _id: p.id,
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          tags: p.tags,
          isPublic: p.isPublic,
          videoCount: p.videos.length,
          overallProgress: p.overallProgress,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          userId: p.userId,
          // Include ALL videos with complete data for progress calculation
          videos: p.videos.map(video => ({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            youtubeURL: video.youtubeURL || video.url,
            youtubeId: video.youtubeId,
            duration: video.duration,
            channelTitle: video.channelTitle,
            completionStatus: video.completionStatus || 0,
            addedAt: video.addedAt,
            addedBy: video.addedBy,
            description: video.description || ''
          }))
        }))
      };
      
      // Cache the response
      await cache.set(cacheKey, response, CacheTTL.MEDIUM);
      
      return NextResponse.json(response);
    } catch (dbError) {
      console.error('DynamoDB query error:', dbError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, description, category, tags, isPublic, videos, firstVideo } = body;

    // Use authenticated user's ID instead of trusting client-provided userId
    const authenticatedUserId = authResult.user.userId;
    
    // If userId is provided, verify it matches the authenticated user
    if (userId && userId !== authenticatedUserId && userId !== 'guest') {
      return NextResponse.json(
        { error: 'Cannot create playlist for another user' },
        { status: 403 }
      );
    }

    console.log('Creating playlist with data:', { userId: authenticatedUserId, title, description, category, hasFirstVideo: !!firstVideo });

    // For new simple playlist creation (from genre page), we don't require all fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    try {
      console.log('Creating playlist in DynamoDB...');

      // Handle simple playlist creation (from genre page) - when firstVideo is provided
      if (firstVideo) {
        const playlistVideos: PlaylistVideo[] = [];
        
        // Add first video using helper
        const video = transformVideo(firstVideo);
        playlistVideos.push(video);

        const playlist = await createPlaylist({
          userId: authenticatedUserId,
          title,
          description: description || '',
          category: category || 'General',
          tags: tags || [],
          isPublic: isPublic || false,
          videos: playlistVideos,
          overallProgress: 0,
        });

        // Invalidate cache for this user
        await cache.invalidate(`playlists:userId=${playlist.userId}`);
        
        return NextResponse.json({ 
          success: true,
          playlist: {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            videoCount: playlist.videos.length
          }
        });
      }

      // Handle full playlist creation (from playlist create page)
      if (!category) {
        console.error('Missing required fields for full playlist creation:', { title: !!title, category: !!category });
        return NextResponse.json({ error: 'Category is required for full playlist creation' }, { status: 400 });
      }

      // Transform videos to include all required fields
  const transformedVideos: PlaylistVideo[] = (videos || []).map((video: VideoSource) => transformVideo(video));

      const playlist = await createPlaylist({
        userId: authenticatedUserId,
        title,
        description: description || '',
        category,
        tags: tags || [],
        isPublic: isPublic || false,
        videos: transformedVideos,
        overallProgress: 0,
      });

      // Invalidate cache for this user
      await cache.invalidate(`playlists:userId=${playlist.userId}`);
      
      return NextResponse.json({ 
        success: true,
        playlist: {
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          videoCount: playlist.videos.length
        }
      });
    } catch (dbError) {
      console.error('DynamoDB operation error:', dbError);
      
      if (dbError instanceof Error) {
        return NextResponse.json({ error: dbError.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}

// PUT - Update a playlist
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { playlistId, ...updateData } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Verify user owns the playlist (IDOR protection)
    const existingPlaylist = await getPlaylistById(playlistId);
    if (!existingPlaylist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }
    
    if (existingPlaylist.userId !== authResult.user.userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only modify your own playlists.' },
        { status: 403 }
      );
    }

    try {
      // Calculate overall progress if videos are being updated
      if (updateData.videos) {
        const videoSources = updateData.videos as VideoSource[];
        const normalizedVideos: PlaylistVideo[] = videoSources.map((video) => transformVideo(video));
        updateData.videos = normalizedVideos;

        const completedVideos = normalizedVideos.filter((v) => v.completionStatus === 100).length;
        const totalVideos = normalizedVideos.length;
        updateData.overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
      }

      const playlist = await updatePlaylist(playlistId, updateData);

      // Invalidate cache for this user
      await cache.invalidate(`playlists:userId=${playlist.userId}`);

      return NextResponse.json({ playlist });
    } catch (dbError) {
      console.error('DynamoDB error:', dbError);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

// DELETE - Delete a playlist with cascade deletion of all associated resources
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const playlistId = request.nextUrl.searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    try {
      // First, get the playlist to access video information before deletion
      const playlist = await getPlaylistById(playlistId);
      
      if (!playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
      }

      // Verify user owns the playlist (IDOR protection)
      if (playlist.userId !== authResult.user.userId) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete your own playlists.' },
          { status: 403 }
        );
      }

      // Cascade delete: Remove associated S3 transcripts and DynamoDB entries
      const deletionResults = {
        s3Deleted: [] as string[],
        s3Failed: [] as string[],
        dynamodbDeleted: [] as string[],
        dynamodbFailed: [] as string[],
      };

      if (playlist.videos && playlist.videos.length > 0) {
        console.log(`[Playlist Delete] Starting cascade deletion for ${playlist.videos.length} videos`);
        
        for (const video of playlist.videos) {
          // Delete S3 transcript if it exists
          if (video.transcriptS3Key || video.youtubeId) {
            try {
              const s3Key = video.transcriptS3Key || `${video.youtubeId}.json`;
              
              // Call Python backend to delete S3 transcript
              const deleteS3Response = await fetch('http://localhost:8000/api/transcripts/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  videoId: video.youtubeId || video.id,
                  s3Key: s3Key
                })
              });

              if (deleteS3Response.ok) {
                deletionResults.s3Deleted.push(s3Key);
                console.log(`[Playlist Delete] ✅ Deleted S3 transcript: ${s3Key}`);
              } else {
                deletionResults.s3Failed.push(s3Key);
                console.warn(`[Playlist Delete] ⚠️ Failed to delete S3: ${s3Key}`);
              }
            } catch (s3Error) {
              console.error(`[Playlist Delete] S3 deletion error:`, s3Error);
              deletionResults.s3Failed.push(video.transcriptS3Key || video.youtubeId || 'unknown');
            }
          }

          // Delete DynamoDB transcript metadata if it exists
          if (video.youtubeId) {
            try {
              const deleteDynamoResponse = await fetch('http://localhost:8000/api/transcripts/delete-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId: video.youtubeId })
              });

              if (deleteDynamoResponse.ok) {
                deletionResults.dynamodbDeleted.push(video.youtubeId);
                console.log(`[Playlist Delete] ✅ Deleted DynamoDB metadata: ${video.youtubeId}`);
              } else {
                deletionResults.dynamodbFailed.push(video.youtubeId);
                console.warn(`[Playlist Delete] ⚠️ Failed to delete DynamoDB: ${video.youtubeId}`);
              }
            } catch (dynamoError) {
              console.error(`[Playlist Delete] DynamoDB deletion error:`, dynamoError);
              deletionResults.dynamodbFailed.push(video.youtubeId);
            }
          }
        }

        console.log(`[Playlist Delete] Cascade deletion summary:`, {
          s3Deleted: deletionResults.s3Deleted.length,
          s3Failed: deletionResults.s3Failed.length,
          dynamodbDeleted: deletionResults.dynamodbDeleted.length,
          dynamodbFailed: deletionResults.dynamodbFailed.length,
        });
      }

      // Finally, delete the playlist itself
      const deletedPlaylist = await deletePlaylist(playlistId);
      const userIdForInvalidation = deletedPlaylist?.userId;

      // Invalidate caches
      try {
        if (userIdForInvalidation) {
          await cache.invalidate(`playlists:userId=${userIdForInvalidation}`);
        } else {
          console.warn('Playlist cache invalidation fallback triggered for playlist', playlistId);
          await cache.invalidate('playlists');
        }
      } catch (cacheError) {
        console.error('Playlist cache invalidate error:', cacheError);
      }

      return NextResponse.json({ 
        success: true,
        deletionSummary: {
          playlistDeleted: true,
          resourcesDeleted: {
            s3Transcripts: deletionResults.s3Deleted.length,
            dynamodbEntries: deletionResults.dynamodbDeleted.length,
          },
          resourcesFailed: {
            s3Transcripts: deletionResults.s3Failed.length,
            dynamodbEntries: deletionResults.dynamodbFailed.length,
          }
        }
      });
    } catch (deleteError) {
      console.error('DynamoDB delete error:', deleteError);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
} 