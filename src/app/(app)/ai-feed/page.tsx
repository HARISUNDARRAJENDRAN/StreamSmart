'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, Loader2, Play, Clock, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { aiRecommendationService, type AIVideoRecommendation } from '@/services/aiRecommendationService';
import { playlistService } from '@/services/playlistService';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function AIFeedPage() {
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
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-semibold text-black">AI Features Not Enabled</h2>
          </div>
          <p className="text-black/60 mb-6 leading-relaxed">
            The AI recommendation service is not enabled. Please configure the API endpoints in your environment variables.
          </p>
          <div className="text-xs text-black/60 bg-black/5 p-4 rounded-xl font-mono space-y-1">
            <p>NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS=true</p>
            <p>NEXT_PUBLIC_AI_RECOMMENDATION_API=...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-6 md:py-12">
      <div className="container mx-auto px-4 md:px-6 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <h1 className="text-[32px] md:text-[58px] font-semibold leading-[36px] md:leading-[64px] tracking-[-0.04em] text-black mb-2 md:mb-3">
            Your Personalized Feed
          </h1>
          
          <p className="text-[14px] md:text-[18px] text-black/60 max-w-2xl">
            {recommendationReason || 'Discover videos tailored to your learning interests'}
          </p>
          
        </motion.div>

        {/* Search Section */}
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 md:mb-12"
          >
            <div className="bg-white rounded-[16px] md:rounded-[32px] border border-black/5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.15)] md:shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] p-4 md:p-8">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <Search className="h-5 w-5 md:h-6 md:w-6 text-black" />
                <h2 className="text-lg md:text-2xl font-semibold text-black">Search for Specific Topics</h2>
              </div>
              <p className="text-sm md:text-base text-black/60 mb-4 md:mb-6">Manually search for any topic, skill, or interest</p>
              
              <div className="flex flex-col md:flex-row gap-3 mb-4 md:mb-6">
                <Input
                  placeholder="e.g., Machine Learning with Python"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 h-11 md:h-12 rounded-xl border-black/10 focus-visible:ring-black text-sm md:text-base"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading || !searchQuery.trim() || healthStatus !== 'healthy'}
                  className="px-4 md:px-6 h-11 md:h-12 rounded-xl bg-black text-white hover:bg-black/90 text-sm md:text-base"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Discover
                    </>
                  )}
                </Button>
              </div>

              <div>
                <p className="text-sm text-black/60 mb-3">Quick Discovery:</p>
                <div className="flex flex-wrap gap-2">
                  {quickDiscoveryTopics.map((topic) => (
                    <button
                      key={topic.label}
                      onClick={() => handleQuickSearch(topic.query)}
                      disabled={loading}
                      className="px-4 py-2 rounded-full bg-white border border-black/10 text-sm font-medium text-black/80 hover:bg-black/5 hover:text-black transition-all disabled:opacity-50"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-[24px] p-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-black mb-4" />
              <p className="text-black/60">Finding the best matches using AI...</p>
            </div>
          </div>
        )}

        {/* Recommendations Grid */}
        {!loading && recommendations.length > 0 && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[28px] font-semibold text-black">Recommended for You</h2>
              </div>
              <span className="text-sm text-black/60 font-medium">{recommendations.length} videos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {recommendations.map((video, index) => (
                <motion.div key={video.video_id} variants={itemVariants}>
                  <div
                    onClick={() => handleVideoClick(video)}
                    className="group bg-white rounded-[12px] md:rounded-[24px] border border-black/5 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] md:hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 md:hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="relative aspect-video bg-black/5">
                      {video.thumbnailUrl ? (
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-12 w-12 text-black/40" />
                        </div>
                      )}
                      
                      <div className="absolute bottom-3 right-3 bg-black/85 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                        {video.duration}
                      </div>

                      {video.similarityScore && video.similarityScore > 0 && (
                        <div className="absolute top-3 left-3 bg-black text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium shadow-md">
                          <Sparkles className="h-3 w-3" />
                          {Math.round(video.similarityScore * 100)}% match
                        </div>
                      )}

                      <div className="absolute top-3 right-3 bg-black/85 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-md">
                        {index + 1}
                      </div>
                    </div>

                    <div className="p-3 md:p-5 space-y-2 md:space-y-3">
                      <h3 className="font-semibold text-[14px] md:text-[16px] leading-[20px] md:leading-[22px] text-black line-clamp-2 group-hover:text-black/70 transition-colors">
                        {video.title}
                      </h3>

                      <div className="text-xs md:text-sm text-black/60 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-xs font-bold text-white">
                          {video.channelName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{video.channelName}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-black/50 font-medium">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {(video.viewCount / 1000).toFixed(1)}K
                        </div>
                        {video.uploadDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {video.uploadDate}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium">
                          {video.genre}
                        </span>
                        {video.qualityScore > 0.8 && (
                          <span className="text-xs px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 font-medium">
                            ⭐ Quality
                          </span>
                        )}
                      </div>

                      {video.description && (
                        <p className="text-xs text-black/50 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && recommendations.length === 0 && searchQuery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-black/40" />
            </div>
            <h3 className="text-2xl font-semibold text-black mb-2">No videos found</h3>
            <p className="text-black/60">
              Try a different search term or explore one of the quick discovery topics
            </p>
          </motion.div>
        )}

        {/* Getting Started */}
        {!searchQuery && !loading && recommendations.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="bg-white rounded-[32px] border border-black/5 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] p-10">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="h-6 w-6 text-black" />
                <h2 className="text-2xl font-semibold text-black">How It Works</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mb-4 text-xl font-bold">
                    1
                  </div>
                  <h4 className="font-semibold text-black mb-2">Enter Your Interest</h4>
                  <p className="text-sm text-black/60">
                    Type any topic, skill, or learning goal you're interested in
                  </p>
                </div>

                <div>
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mb-4 text-xl font-bold">
                    2
                  </div>
                  <h4 className="font-semibold text-black mb-2">AI Analyzes Semantically</h4>
                  <p className="text-sm text-black/60">
                    Our AI understands the meaning, not just keywords, finding truly relevant content
                  </p>
                </div>

                <div>
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mb-4 text-xl font-bold">
                    3
                  </div>
                  <h4 className="font-semibold text-black mb-2">Get Smart Recommendations</h4>
                  <p className="text-sm text-black/60">
                    Discover high-quality educational videos ranked by relevance and similarity
                  </p>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-black/5">
                <p className="text-sm text-black/60 text-center">
                  Powered by AI semantic search • <span className="text-black font-semibold">18,000+ educational videos</span> • Sub-second response times
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
