'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Clock, 
  Eye, 
  ThumbsUp,
  Play,
  ExternalLink,
  RefreshCw,
  Plus,
  PlayCircle,
  BookmarkPlus,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from '@/contexts/UserContext';

interface Video {
  _id: string;
  youtubeId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  category: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  youtubeURL: string;
  tags: string[];
  difficulty: string;
  createdAt: string;
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  videoCount: number;
}

// Map URL slugs to category names
const categoryMap: { [key: string]: string } = {
  'coding-programming': 'Coding and Programming',
  'data-science-ai': 'Data Science and AI/ML',
  'design': 'Design(UI/UX , graphic, product)',
  'digital-marketing': 'Digital Marketing',
  'productivity': 'Productivity & Time Management',
  'financial-literacy': 'Financial Literacy & Investing',
  'soft-skills': 'Soft Skills (Communication, Leadership)',
  'entrepreneurship': 'Entrepreneurship & Startups',
  'writing-content': 'Writing & Content Creation',
  'public-speaking': 'Public Speaking',
  'mathematics': 'Mathematics',
  'physics': 'Physics',
  'chemistry': 'Chemistry',
  'biology': 'Biology',
  'history': 'History',
  'geography': 'Geography',
  'language-learning': 'Language Learning',
  'resume-job-hunting': 'Resume Building & Job Hunting',
  'interview-prep': 'Interview Preparation',
  'workplace-skills': 'Workplace Skills',
  'tech-news': 'Tech News & Product Launches',
  'cybersecurity': 'Cybersecurity',
  'cloud-computing': 'Cloud Computing',
  'artificial-intelligence': 'Artificial Intelligence',
  'trivia-facts': 'Did You Know / Trivia',
  'philosophy': 'Philosophy & Critical Thinking',
  'psychology': 'Psychology & Human Behavior',
  'robotics-iot': 'Robotics & IoT',
  'electronics-circuits': 'Electronics & Circuits',
  'crafts-artistic': 'Crafts & Artistic Skills',
  'health-fitness': 'Health & Fitness',
  'cooking-nutrition': 'Cooking & Nutrition',
  'mental-wellness': 'Personal Development & Mental Health'
};

export default function GenrePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useUser();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [aiRefreshLoading, setAiRefreshLoading] = useState(false);
  const [algorithmUsed, setAlgorithmUsed] = useState<string>("loading");
  const [totalAvailable, setTotalAvailable] = useState(0);
  
  // Preview and Playlist states
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedVideoForPlaylist, setSelectedVideoForPlaylist] = useState<Video | null>(null);

  const categoryName = categoryMap[slug];

  // Fetch videos from Python backend
  useEffect(() => {
    const fetchVideos = async () => {
      if (!slug) {
        setError('Category not found');
        setLoading(false);
        return;
      }

      try {
        // Try the new smart recommendation API first
        let response = await fetch(`http://localhost:8000/api/smart/genre/${slug}?user_id=guest&limit=200`);
        
        if (!response.ok) {
          // Fallback to old API
          response = await fetch(`http://localhost:8000/genre/${slug}`);
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        if (data.success) {
          // Set algorithm info
          setAlgorithmUsed(data.algorithm_used || 'unknown');
          setTotalAvailable(data.total_available || data.videos.length);
          
          // Transform backend data to match frontend expectations
          const transformedVideos = data.videos.map((video: any) => ({
            _id: video._id || video.youtubeId || `${Date.now()}-${Math.random()}`,
            youtubeId: video.youtubeId || video.video_id,
            title: video.title || '',
            description: video.description || '',
            thumbnail: video.thumbnail || video.thumbnail_url || 'https://placehold.co/480x360.png?text=Video',
            duration: video.duration || 'N/A',
            category: data.genre_name || data.genre,
            channelTitle: video.channelTitle || video.channel_name || video.channel || '',
            viewCount: video.viewCount || video.view_count || 0,
            likeCount: video.likeCount || 0,
            youtubeURL: video.youtubeURL || video.url || `https://youtube.com/watch?v=${video.youtubeId || video.video_id}`,
            publishedAt: video.publishedAt || video.published || video.collected_at || '',
            difficulty: video.difficulty || 'intermediate',
            tags: video.tags || [],
            quality_score: video.quality_score || 0,
            search_query: video.search_query || '',
            similarity_score: video.similarity_score || 0
          }));
          
          setVideos(transformedVideos);
          setFilteredVideos(transformedVideos);
        } else {
          throw new Error('Failed to fetch videos from backend');
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [slug]);

  // Helper function to fetch playlists
  const fetchPlaylists = async () => {
    try {
      // Use the actual user ID if logged in, otherwise use 'guest'
      const userId = user?.id || 'guest';
      console.log('=== PLAYLIST FETCH DEBUG ===');
      console.log('User object:', user);
      console.log('Fetching playlists for userId:', userId);
      console.log('user?.id:', user?.id);
      
      const response = await fetch(`/api/playlists?userId=${userId}`);
      console.log('Playlists response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Playlists data received:', data);
        setPlaylists(data.playlists || []);
      } else {
        console.error('Failed to fetch playlists:', response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  // Fetch user playlists on component mount and when user changes
  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  // Filter and sort videos
  useEffect(() => {
    let filtered = videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           video.channelTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDifficulty = difficultyFilter === 'all' || video.difficulty === difficultyFilter;
      
      return matchesSearch && matchesDifficulty;
    });

    // Sort videos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'oldest':
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        case 'views':
          return (b.viewCount || 0) - (a.viewCount || 0);
        case 'duration':
          return parseDuration(b.duration) - parseDuration(a.duration);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredVideos(filtered);
  }, [videos, searchQuery, sortBy, difficultyFilter]);

  // AI Refresh functionality
  const handleAiRefresh = async () => {
    setAiRefreshLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/smart/ai-refresh/guest?genre=${slug}&limit=51`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh recommendations');
      }
      
      const data = await response.json();
      if (data.success) {
        setAlgorithmUsed(data.algorithm_used || 'ai_refreshed');
        setTotalAvailable(data.total_available || data.videos.length);
        
        const transformedVideos = data.videos.map((video: any) => ({
          _id: video._id || video.youtubeId || `${Date.now()}-${Math.random()}`,
          youtubeId: video.youtubeId || video.video_id,
          title: video.title || '',
          description: video.description || '',
          thumbnail: video.thumbnail || video.thumbnail_url || `https://img.youtube.com/vi/${video.youtubeId || video.video_id}/maxresdefault.jpg`,
          duration: video.duration || 'N/A',
          category: categoryName || slug,
          channelTitle: video.channelTitle || video.channel_name || video.channel || '',
          viewCount: video.viewCount || video.view_count || 0,
          likeCount: video.likeCount || 0,
          youtubeURL: video.youtubeURL || video.url || `https://youtube.com/watch?v=${video.youtubeId || video.video_id}`,
          publishedAt: video.publishedAt || video.published || video.collected_at || '',
          difficulty: video.difficulty || 'intermediate',
          tags: video.tags || [],
          quality_score: video.quality_score || 0,
          search_query: video.search_query || '',
          similarity_score: video.similarity_score || 0
        }));
        
        setVideos(transformedVideos);
      }
    } catch (err) {
      console.error('Error refreshing recommendations:', err);
    } finally {
      setAiRefreshLoading(false);
    }
  };

  const parseDuration = (duration: string): number => {
    if (!duration || duration === 'N/A') return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePreviewVideo = (video: Video) => {
    setPreviewVideo(video);
  };

  const handleAddToPlaylist = async (video: Video, playlistId: string) => {
    try {
      // Close any open modals first
      setPreviewVideo(null);
      setShowCreatePlaylist(false);
      
      const response = await fetch(`/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeId: video.youtubeId,
          title: video.title,
          thumbnail: video.thumbnail,
          duration: video.duration,
          channelTitle: video.channelTitle,
          youtubeURL: video.youtubeURL,
          description: video.description
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Video added to playlist successfully!');
          // Refresh playlists to update video counts
          await fetchPlaylists();
        } else {
          alert(data.error || 'Failed to add video to playlist');
        }
      } else {
        const errorData = await response.text();
        console.error('Add to playlist error:', errorData);
        alert('Failed to add video to playlist');
      }
    } catch (err) {
      console.error('Error adding video to playlist:', err);
      alert('Error adding video to playlist');
    }
  };

  const handlePlaylistAction = (video: Video) => {
    console.log('=== PLAYLIST ACTION DEBUG ===');
    console.log('Video:', video.title);
    console.log('Current modal states:', { 
      showCreatePlaylist, 
      previewVideo: !!previewVideo, 
      selectedVideoForPlaylist: !!selectedVideoForPlaylist 
    });
    
    // Ensure no other modals are open
    setPreviewVideo(null);
    
    // Set state for new playlist creation
    setSelectedVideoForPlaylist(video);
    setShowCreatePlaylist(true);
    
    console.log('Modal states after action:', { 
      showCreatePlaylist: true, 
      previewVideo: false, 
      selectedVideoForPlaylist: true 
    });
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim() || !selectedVideoForPlaylist) return;

    try {
      console.log('Sending playlist creation request...');
      const requestData = {
        userId: user?.id || 'guest',
        title: newPlaylistTitle,
        description: newPlaylistDescription,
        firstVideo: {
          youtubeId: selectedVideoForPlaylist.youtubeId,
          title: selectedVideoForPlaylist.title,
          thumbnail: selectedVideoForPlaylist.thumbnail,
          duration: selectedVideoForPlaylist.duration,
          channelTitle: selectedVideoForPlaylist.channelTitle,
          youtubeURL: selectedVideoForPlaylist.youtubeURL,
          description: selectedVideoForPlaylist.description
        }
      };
      
      console.log('Request data:', requestData);
      
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
          console.log('Playlist created successfully, refreshing list...');
          
          // Reset form state FIRST to prevent UI blocking
          setNewPlaylistTitle('');
          setNewPlaylistDescription('');
          setShowCreatePlaylist(false);
          setSelectedVideoForPlaylist(null);
          
          // Then refresh playlists from server
          await fetchPlaylists();
          
          alert('Playlist created successfully! Redirecting to playlists page...');
          
          // Small delay to ensure playlist is saved before redirect
          setTimeout(() => {
            router.push('/playlists');
          }, 1000);
        } else {
          alert(data.error || 'Failed to create playlist');
        }
      } else {
        const errorData = await response.text();
        console.error('Create playlist error:', errorData);
        
        // Try to parse error message
        let errorMessage = 'Failed to create playlist';
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // Use default message if parsing fails
        }
        
        alert(errorMessage);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert('Network error: Could not create playlist. Please check your connection.');
    }
  };

  // Enhanced close handler for create playlist modal
  const handleCloseCreatePlaylist = () => {
    console.log('=== CLOSING CREATE PLAYLIST MODAL ===');
    setShowCreatePlaylist(false);
    setSelectedVideoForPlaylist(null);
    setNewPlaylistTitle('');
    setNewPlaylistDescription('');
    console.log('Modal closed, all states reset');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error || !categoryName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'The requested category does not exist.'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{categoryName}</h1>
                <p className="text-muted-foreground">
                  {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="views">Most Views</SelectItem>
                  <SelectItem value="duration">Longest First</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              {/* AI Refresh Button */}
              <Button
                onClick={handleAiRefresh}
                disabled={aiRefreshLoading}
                variant="outline"
                size="sm"
                className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                title="Refresh recommendations"
              >
                <RefreshCw className={`h-4 w-4 ${aiRefreshLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* Playlist Refresh Button for debugging */}
              <Button
                onClick={fetchPlaylists}
                variant="outline"
                size="sm"
                className="border-green-200 hover:bg-green-50 hover:border-green-300"
                title={`Refresh playlists (${playlists.length} found)`}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="ml-1 text-xs">P:{playlists.length}</span>
              </Button>
              
              {/* Debug button to check all playlists */}
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/playlists?userId=all-debug');
                    const data = await response.json();
                    console.log('=== ALL PLAYLISTS DEBUG ===');
                    console.log('All playlists in database:', data);
                  } catch (err) {
                    console.error('Debug fetch error:', err);
                  }
                }}
                variant="outline"
                size="sm"
                className="border-red-200 hover:bg-red-50 hover:border-red-300"
                title="Debug: Check all playlists"
              >
                Debug
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No videos found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search terms.' : 'No videos available in this category yet.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/dashboard')}>
                Explore Other Categories
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredVideos.map((video, index) => {
              const uniqueKey = video.youtubeId || video._id || `video-${index}-${Date.now()}`;
              
              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30">
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={video.thumbnail || `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                          alt={video.title}
                          loading="lazy"
                          className="w-full h-48 object-cover rounded-t-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes('maxresdefault')) {
                              target.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
                            } else if (target.src.includes('hqdefault')) {
                              target.src = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
                            } else {
                              target.src = `https://img.youtube.com/vi/${video.youtubeId}/default.jpg`;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-t-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-black hover:bg-white"
                            onClick={() => handlePreviewVideo(video)}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                        <Badge className="absolute top-2 right-2 bg-black/80 text-white">
                          {video.duration}
                        </Badge>
                        <Badge className={`absolute top-2 left-2 ${getDifficultyColor(video.difficulty)}`}>
                          {video.difficulty}
                        </Badge>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                          {video.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          {video.channelTitle}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(video.viewCount || 0)}
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {formatNumber(video.likeCount || 0)}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePreviewVideo(video)}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" className="bg-[#D90429] hover:bg-[#C80021]">
                                <BookmarkPlus className="h-4 w-4 mr-1" />
                                Add to Playlist
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Choose Action</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handlePlaylistAction(video)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Playlist
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Add to Existing Playlist</DropdownMenuLabel>
                              {playlists.length > 0 ? (
                                playlists.map((playlist) => (
                                  <DropdownMenuItem
                                    key={playlist.id}
                                    onClick={() => handleAddToPlaylist(video, playlist.id)}
                                  >
                                    {playlist.title} ({playlist.videoCount} videos)
                                  </DropdownMenuItem>
                                ))
                              ) : (
                                <DropdownMenuItem disabled>
                                  No playlists available
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh] z-50">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg line-clamp-1">
                {previewVideo?.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewVideo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {previewVideo && (
            <div className="space-y-4">
              {/* YouTube Embed */}
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${previewVideo.youtubeId}?autoplay=1`}
                  title={previewVideo.title}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              
              {/* Video Info */}
              <div className="space-y-2">
                <h3 className="font-semibold">{previewVideo.title}</h3>
                <p className="text-sm text-muted-foreground">{previewVideo.channelTitle}</p>
                <p className="text-sm">{previewVideo.description}</p>
                
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{formatNumber(previewVideo.viewCount || 0)} views</span>
                  <span>{formatNumber(previewVideo.likeCount || 0)} likes</span>
                  <span>{previewVideo.duration}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => window.open(previewVideo.youtubeURL, '_blank')}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Watch on YouTube
                </Button>
                
                                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button className="bg-[#D90429] hover:bg-[#C80021]">
                       <BookmarkPlus className="h-4 w-4 mr-2" />
                       Add to Playlist
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent>
                     <DropdownMenuLabel>Choose Action</DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                       onClick={() => {
                         handlePlaylistAction(previewVideo);
                         setPreviewVideo(null);
                       }}
                     >
                       <Plus className="h-4 w-4 mr-2" />
                       Create New Playlist
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuLabel>Add to Existing Playlist</DropdownMenuLabel>
                     {playlists.length > 0 ? (
                       playlists.map((playlist) => (
                         <DropdownMenuItem
                           key={playlist.id}
                           onClick={() => {
                             handleAddToPlaylist(previewVideo, playlist.id);
                             setPreviewVideo(null);
                           }}
                         >
                           {playlist.title} ({playlist.videoCount} videos)
                         </DropdownMenuItem>
                       ))
                     ) : (
                       <DropdownMenuItem disabled>
                         No playlists available
                       </DropdownMenuItem>
                     )}
                   </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Playlist Modal */}
      <Dialog open={showCreatePlaylist} onOpenChange={handleCloseCreatePlaylist}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          
          {selectedVideoForPlaylist && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium">Adding video:</p>
              <p className="text-sm text-gray-600 line-clamp-1">{selectedVideoForPlaylist.title}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Playlist Title</label>
              <Input
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="Enter playlist title..."
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description..."
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseCreatePlaylist}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistTitle.trim()}
                className="bg-[#D90429] hover:bg-[#C80021]"
              >
                Create Playlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 