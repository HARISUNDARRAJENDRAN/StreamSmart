'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, TrendingUp, Loader2, Play, Clock, Eye, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { aiRecommendationService, type AIVideoRecommendation } from '@/services/aiRecommendationService';
import { playlistService } from '@/services/playlistService';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/**
 * AI-Powered Feed Page
 * Personalized recommendations like YouTube - analyzes user's playlists and viewing history
 */
export default function AIFeedPage() {
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<AIVideoRecommendation[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading
  const [error, setError] = useState<string | null>(null);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [recommendationReason, setRecommendationReason] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);

  // Check if AI is enabled and auto-load recommendations
  useEffect(() => {
    let mounted = true;
    
    const initializeAI = async () => {
      const enabled = aiRecommendationService.isEnabled();
      setIsAIEnabled(enabled);

      if (enabled && mounted && user?.id) {
        // Only load if user is logged in
        checkHealth();
        loadPersonalizedRecommendations();
      } else if (enabled && mounted && !user?.id) {
        // User not loaded yet, keep loading state
        console.log('[AI] Waiting for user to load...');
      } else {
        setLoading(false);
      }
    };

    initializeAI();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [user?.id]); // Re-run when user ID becomes available

  // Check AI service health
  const checkHealth = async () => {
    try {
      const health = await aiRecommendationService.checkHealth();
      setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
    } catch {
      setHealthStatus('unhealthy');
    }
  };

  /**
   * Load personalized recommendations based on user's playlists
   * This is the primary way to get recommendations - automatic like YouTube
   */
  const loadPersonalizedRecommendations = async () => {
    setLoading(true);
    setError(null);
    setShowSearch(false); // Hide search when showing personalized feed

    try {
      // Get user's playlists using the same service as the playlists page
      if (!user?.id) {
        console.error('[AI ERROR] User not logged in or user.id is missing');
        throw new Error('User not authenticated');
      }
      
      console.log('[AI] Fetching playlists for user:', user.id);
      const playlists = await playlistService.getPlaylists(user.id);
      
      console.log('[AI] Number of playlists found:', playlists.length);
      if (playlists.length > 0) {
        console.log('[AI] Playlist titles:', playlists.map((p: any) => p.title || p.name || 'Untitled'));
        console.log('[AI] First playlist:', playlists[0]);
      } else {
        console.info('[AI] No playlists yet - showing general educational content for new users');
      }

      let baseQuery = '';
      let reason = '';

      if (playlists && playlists.length > 0) {
        const recentPlaylist = playlists.sort((a: any, b: any) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];

        if (recentPlaylist.videos && recentPlaylist.videos.length > 0) {
          const recentVideo = recentPlaylist.videos[0];
          baseQuery = recentVideo.title || recentPlaylist.title;
          reason = `Because you're watching: ${recentPlaylist.title}`;
        } else {
          baseQuery = recentPlaylist.title;
          reason = `Based on your playlist: ${recentPlaylist.title}`;
        }
      } else {
        // New user with no playlists - show popular educational content
        baseQuery = 'educational tutorials and learning content';
        reason = 'Popular educational content - Start creating playlists to get personalized recommendations!';
      }

      setRecommendationReason(reason);

      console.log('===========================================');
      console.log('🎯 AI QUERY GENERATED FROM YOUR PLAYLISTS:');
      console.log('Query:', baseQuery);
      console.log('Reason:', reason);
      console.log('Most Recent Playlist:', playlists.length > 0 ? playlists[0].title : 'None');
      console.log('===========================================');

      const response = await aiRecommendationService.getRecommendations({
        title: baseQuery,
        topN: 12,
      });

      console.log('✅ API Response:', response.count, 'videos');
      console.log('Top 3 results:', response.recommendations.slice(0, 3).map(v => v.title));

      setRecommendations(response.recommendations);
    } catch (err: any) {
      // Ignore cancellation errors (expected when component unmounts or user navigates)
      if (err.name === 'AbortError' || err.message?.includes('cancelled') || err.message?.includes('aborted')) {
        console.log('[AI] Request cancelled - likely component unmounted or user navigated');
        return; // Don't show error, don't update state
      }
      
      console.error('Failed to load recommendations:', err);
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual search (secondary feature)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setRecommendationReason(''); // Clear auto-recommendation reason

    try {
      const response = await aiRecommendationService.getRecommendations({
        title: searchQuery,
        topN: 12,
      });

      setRecommendations(response.recommendations);
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Quick discovery buttons
  const quickDiscoveryTopics = [
    { label: 'Machine Learning', query: 'Machine Learning and AI fundamentals' },
    { label: 'Web Development', query: 'Modern web development with React and Next.js' },
    { label: 'Data Science', query: 'Data science and analytics with Python' },
    { label: 'DevOps', query: 'DevOps, Docker, and Kubernetes' },
    { label: 'Design', query: 'UI/UX design and Figma tutorials' },
    { label: 'Business', query: 'Entrepreneurship and business strategies' },
  ];

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  const handleVideoClick = (video: AIVideoRecommendation) => {
    // Open YouTube video in new tab
    window.open(video.youtubeUrl, '_blank');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  if (!isAIEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              AI Features Not Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The AI recommendation service is not enabled. Please configure the API endpoints in your environment variables.
            </p>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <p className="font-mono">NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS=true</p>
              <p className="font-mono">NEXT_PUBLIC_AI_RECOMMENDATION_API=...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div
            className="p-3 rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
            }}
          >
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Your Personalized Feed
          </h1>
        </div>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {recommendationReason || 'AI-powered recommendations based on your learning journey'}
        </p>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={loadPersonalizedRecommendations}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Feed
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4 mr-2" />
            {showSearch ? 'Hide Search' : 'Search Instead'}
          </Button>
        </div>

        {/* Health Status */}
        {healthStatus === 'checking' && (
          <Badge variant="outline" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking AI service...
          </Badge>
        )}
        {healthStatus === 'healthy' && (
          <Badge variant="outline" className="text-xs border-green-500 text-green-500">
            <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            AI Service Online
          </Badge>
        )}
        {healthStatus === 'unhealthy' && (
          <Badge variant="outline" className="text-xs border-red-500 text-red-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            AI Service Unavailable
          </Badge>
        )}
      </motion.div>

      {/* Search Bar (Optional - Secondary Feature) */}
      {showSearch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search for Specific Topics
              </CardTitle>
              <CardDescription>
                Or manually search for any topic, skill, or interest
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Machine Learning with Python"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim() || healthStatus !== 'healthy'}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Discover
                  </>
                )}
              </Button>
            </div>

            {/* Quick Discovery */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Quick Discovery:</p>
              <div className="flex flex-wrap gap-2">
                {quickDiscoveryTopics.map((topic) => (
                  <Button
                    key={topic.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSearch(topic.query)}
                    disabled={loading}
                  >
                    {topic.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Finding the best matches using AI...</p>
          </div>
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && recommendations.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {recommendationReason || `Results for "${searchQuery}"`}
            </h2>
            <Badge variant="secondary">
              {recommendations.length} videos
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((video, index) => (
              <motion.div
                key={video.video_id}
                variants={itemVariants}
              >
                <Card
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleVideoClick(video)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>

                    {/* Similarity Score Badge */}
                    {video.similarityScore && video.similarityScore > 0 && (
                      <div className="absolute top-2 left-2 bg-purple-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {Math.round(video.similarityScore * 100)}% match
                      </div>
                    )}

                    {/* Rank Badge */}
                    <div className="absolute top-2 right-2 bg-black/80 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="p-4 space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>

                    {/* Channel */}
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {video.channelName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {video.channelName}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {(video.viewCount / 1000).toFixed(1)}K views
                      </div>
                      {video.uploadDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.uploadDate}
                        </div>
                      )}
                    </div>

                    {/* Genre Badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {video.genre}
                      </Badge>
                      {video.qualityScore > 0.8 && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                          High Quality
                        </Badge>
                      )}
                    </div>

                    {/* Description Preview */}
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && searchQuery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No videos found</h3>
          <p className="text-muted-foreground mb-4">
            Try a different search term or explore one of the quick discovery topics above
          </p>
        </motion.div>
      )}

      {/* Getting Started */}
      {!searchQuery && !loading && recommendations.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <h4 className="font-semibold">Enter Your Interest</h4>
                  <p className="text-sm text-muted-foreground">
                    Type any topic, skill, or learning goal you're interested in
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">2</span>
                  </div>
                  <h4 className="font-semibold">AI Analyzes Semantically</h4>
                  <p className="text-sm text-muted-foreground">
                    Our AI understands the meaning, not just keywords, finding truly relevant content
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">3</span>
                  </div>
                  <h4 className="font-semibold">Get Smart Recommendations</h4>
                  <p className="text-sm text-muted-foreground">
                    Discover high-quality educational videos ranked by relevance and similarity
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Powered by AI semantic search • {' '}
                  <span className="text-primary">18,000+ educational videos</span> • {' '}
                  Sub-second response times
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
