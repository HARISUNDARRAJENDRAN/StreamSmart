/**
 * Genre Exploration Page
 * Streamlined implementation using CSV-based recommendations
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  TrendingUp,
  Clock,
  BookOpen,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  List,
  Star,
  AlertCircle,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { recommendationService, type VideoRecommendation } from '@/services/recommendationService';
import { CSVRecommendationCard } from '@/components/recommendations/CSVRecommendationCard';

const GENRE_MAP: Record<string, any> = {
  'ai-innovation': {
    slug: 'ai-innovation',
    name: 'AI & Innovation',
    description: 'Artificial intelligence, machine learning, and future tech',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-pink-500 to-rose-600'
  },
  'coding-programming': {
    slug: 'coding-programming',
    name: 'Coding & Programming',
    description: 'Programming tutorials, languages, and development practices',
    icon: <BookOpen className="w-5 h-5" />,
    gradient: 'from-indigo-500 to-purple-600'
  },
  'data-science-ai': {
    slug: 'data-science-ai',
    name: 'Data Science & AI',
    description: 'Data analysis, ML models, and AI applications',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-yellow-500 to-orange-600'
  },
  'mathematics': {
    slug: 'mathematics',
    name: 'Mathematics',
    description: 'Algebra, calculus, geometry, and mathematical concepts',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-purple-500 to-pink-600'
  },
  'physics': {
    slug: 'physics',
    name: 'Physics',
    description: 'Classical mechanics, quantum physics, and physical phenomena',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-blue-500 to-cyan-600'
  },
  'chemistry': {
    slug: 'chemistry',
    name: 'Chemistry',
    description: 'Organic, inorganic chemistry, and chemical reactions',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-green-500 to-emerald-600'
  },
  'biology': {
    slug: 'biology',
    name: 'Biology',
    description: 'Life sciences, anatomy, genetics, and ecosystems',
    icon: <BookOpen className="w-5 h-5" />,
    gradient: 'from-green-600 to-teal-600'
  },
  'entrepreneurship': {
    slug: 'entrepreneurship',
    name: 'Entrepreneurship',
    description: 'Business, startups, and entrepreneurial skills',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-orange-500 to-red-600'
  },
  'financial-literacy': {
    slug: 'financial-literacy',
    name: 'Financial Literacy',
    description: 'Personal finance, investing, and money management',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-green-600'
  },
  'design': {
    slug: 'design',
    name: 'Design',
    description: 'Graphic design, UI/UX, and creative design principles',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-purple-500 to-pink-500'
  },
  'digital-marketing': {
    slug: 'digital-marketing',
    name: 'Digital Marketing',
    description: 'SEO, social media, and online marketing strategies',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-cyan-500 to-blue-600'
  },
  'productivity': {
    slug: 'productivity',
    name: 'Productivity',
    description: 'Time management, efficiency, and productivity hacks',
    icon: <Clock className="w-5 h-5" />,
    gradient: 'from-amber-500 to-orange-600'
  },
  'language-learning': {
    slug: 'language-learning',
    name: 'Language Learning',
    description: 'Foreign languages, linguistics, and communication skills',
    icon: <BookOpen className="w-5 h-5" />,
    gradient: 'from-rose-500 to-pink-600'
  },
  'public-speaking': {
    slug: 'public-speaking',
    name: 'Public Speaking',
    description: 'Communication, presentation, and speaking skills',
    icon: <BookOpen className="w-5 h-5" />,
    gradient: 'from-violet-500 to-purple-600'
  },
  'cybersecurity': {
    slug: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Information security, ethical hacking, and cyber defense',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-red-600 to-rose-700'
  }
};

export default function GenrePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  
  const slug = params.slug as string;
  const genreInfo = GENRE_MAP[slug] || GENRE_MAP['coding-programming'];
  
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'quality' | 'views'>('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'highquality'>('all');
  
  const fetchVideos = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      // Pass userId for personalized recommendations based on watch history
      const response = await recommendationService.getSuggestions({
        genre: slug,
        topN: 50,
        excludeIds: [],
        userId: user?.id // Include user ID for personalized recommendations
      });
      
      if (response.success) {
        setVideos(response.recommendations);
      } else {
        throw new Error(response.message || 'Failed to load videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos for this genre',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, toast, user?.id]);
  
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);
  
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...videos];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.channelName.toLowerCase().includes(query)
      );
    }
    
    switch (activeTab) {
      case 'trending':
        filtered = filtered.filter(v => v.viewCount > 100000);
        break;
      case 'highquality':
        filtered = filtered.filter(v => v.qualityScore >= 0.85);
        break;
    }
    
    switch (sortBy) {
      case 'views':
        filtered.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case 'quality':
        filtered.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
    }
    
    return filtered;
  }, [videos, searchQuery, sortBy, activeTab]);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVideos(false);
    toast({
      title: 'Refreshed',
      description: 'Videos have been updated',
    });
  }, [fetchVideos, toast]);
  
  const handleVideoClick = useCallback((video: VideoRecommendation) => {
    router.push(`/video/${video.video_id}?source=genre&genre=${slug}`);
  }, [router, slug]);
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading {genreInfo.name} videos...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className={`bg-gradient-to-r ${genreInfo.gradient} rounded-2xl p-8 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {genreInfo.icon}
                <h1 className="text-4xl font-bold">{genreInfo.name}</h1>
              </div>
              <p className="text-lg opacity-90">{genreInfo.description}</p>
            </div>
            
            <Button
              variant="secondary"
              size="lg"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${genreInfo.name.toLowerCase()} videos...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="views">View Count</SelectItem>
              <SelectItem value="quality">Quality Score</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
            <TabsTrigger value="all">
              All Videos
              <Badge variant="secondary" className="ml-2">
                {videos.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="w-4 h-4 mr-1" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="highquality">
              <Star className="w-4 h-4 mr-1" />
              High Quality
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {searchQuery && (
        <Alert className="mb-4">
          <Search className="h-4 w-4" />
          <AlertDescription>
            Found {filteredAndSortedVideos.length} results for "{searchQuery}"
            {filteredAndSortedVideos.length === 0 && (
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {filteredAndSortedVideos.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedVideos.map((video, index) => (
              <CSVRecommendationCard
                key={video.video_id}
                video={video}
                onVideoClick={handleVideoClick}
                priority={index < 8}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedVideos.map((video) => (
              <CSVRecommendationCard
                key={video.video_id}
                video={video}
                variant="compact"
                onVideoClick={handleVideoClick}
              />
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No videos found</p>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : `No ${genreInfo.name.toLowerCase()} videos available`}
            </p>
            <Button onClick={() => {
              setSearchQuery('');
              setActiveTab('all');
              handleRefresh();
            }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset & Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
