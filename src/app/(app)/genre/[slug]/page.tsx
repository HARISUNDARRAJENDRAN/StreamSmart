'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  ExternalLink
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BertGenreRecommendations from '@/components/BertGenreRecommendations';

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
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
        // Call Python backend API directly
        const response = await fetch(`http://localhost:8000/genre/${slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        if (data.success) {
          // Transform backend data to match frontend expectations
          const transformedVideos = data.videos.map((video: any) => ({
            youtubeId: video.video_id,
            title: video.title,
            thumbnail: video.thumbnail_url,
            duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'N/A',
            category: data.genre,
            channelTitle: video.channel_name,
            viewCount: video.view_count || 0,
            youtubeURL: `https://youtube.com/watch?v=${video.video_id}`,
            publishedAt: video.upload_date,
            difficulty: 'intermediate' // Default value
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

  // Filter and sort videos
  useEffect(() => {
    let filtered = [...videos];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.channelTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(video => video.difficulty === difficultyFilter);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
        break;
      case 'views':
        filtered.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
      case 'duration':
        filtered.sort((a, b) => {
          const aDuration = parseDuration(a.duration);
          const bDuration = parseDuration(b.duration);
          return bDuration - aDuration;
        });
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    setFilteredVideos(filtered);
  }, [videos, searchQuery, sortBy, difficultyFilter]);

  const parseDuration = (duration: string): number => {
    // Convert duration string like "1h 23min" to minutes
    const match = duration.match(/(?:(\d+)h\s*)?(?:(\d+)min)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    return hours * 60 + minutes;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'advanced': return 'bg-red-500/20 text-red-700 dark:text-red-300';
      default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const handleVideoClick = (video: Video) => {
    // Open YouTube video in new tab
    window.open(video.youtubeURL, '_blank');
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
            </div>
          </div>
        </div>
      </div>

      {/* BERT AI Recommendations */}
      <div className="container mx-auto px-4 py-6 border-b bg-gradient-to-r from-blue-50/30 to-purple-50/30">
        <BertGenreRecommendations 
          genre={categoryName || slug} 
          userId="user_123" // This would come from your auth context
        />
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
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.youtubeId || video._id || `video-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {viewMode === 'grid' ? (
                  <Card 
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30"
                    onClick={() => handleVideoClick(video)}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-t-lg flex items-center justify-center">
                          <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <Badge className="absolute top-2 right-2 bg-black/80 text-white">
                          {video.duration}
                        </Badge>
                        <Badge className={`absolute top-2 left-2 ${getDifficultyColor(video.difficulty)}`}>
                          {video.difficulty}
                        </Badge>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {video.channelTitle}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(video.viewCount || 0)}
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {formatNumber(video.likeCount || 0)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30"
                    onClick={() => handleVideoClick(video)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-32 h-24 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <Badge className="absolute bottom-1 right-1 bg-black/80 text-white text-xs">
                            {video.duration}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                              {video.title}
                            </h3>
                            <Badge className={getDifficultyColor(video.difficulty)}>
                              {video.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {video.channelTitle}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {video.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {formatNumber(video.viewCount || 0)} views
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4" />
                              {formatNumber(video.likeCount || 0)} likes
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(video.publishedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
} 