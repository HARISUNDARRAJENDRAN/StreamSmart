'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  User, 
  RefreshCw, 
  Play,
  ThumbsUp,
  Eye,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { bertRecommendationService, VideoRecommendation } from '@/services/bertRecommendationService';

interface BertGenreRecommendationsProps {
  genre: string;
  userId?: string;
  className?: string;
}

const BertGenreRecommendations: React.FC<BertGenreRecommendationsProps> = ({ 
  genre,
  userId = 'guest',
  className = '' 
}) => {
  const [recommendations, setRecommendations] = useState<VideoRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  // Initialize system and load recommendations
  useEffect(() => {
    initializeAndLoadRecommendations();
  }, [genre, userId]);

  const initializeAndLoadRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if system is initialized
      const statsResponse = await bertRecommendationService.getSystemStats();
      
      if (!statsResponse.success) {
        // Try to initialize the system
        const initResponse = await bertRecommendationService.initializeSystem();
        if (!initResponse.success) {
          setError('Failed to initialize BERT recommendation system');
          return;
        }
      }

      setInitialized(true);
      await loadRecommendations();
    } catch (err) {
      setError(`System error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await bertRecommendationService.getGenreBasedRecommendations({
        genre,
        top_n: 50,
        user_id: userId
      });

      if (response.success) {
        setRecommendations(response.recommendations);
      } else {
        setError(response.message || 'Failed to load recommendations');
      }
    } catch (err) {
      setError(`Failed to load recommendations: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleVideoClick = async (video: VideoRecommendation) => {
    // Log viewing activity
    if (userId && userId !== 'guest') {
      await bertRecommendationService.logUserViewing(
        userId,
        video.title,
        video.genre
      );
    }

    // Open YouTube video in new tab
    const youtubeUrl = `https://youtube.com/watch?v=${extractVideoId(video.thumbnail_link)}`;
    window.open(youtubeUrl, '_blank');
  };

  const extractVideoId = (thumbnailUrl: string): string => {
    // Extract video ID from thumbnail URL or try different patterns
    let match = thumbnailUrl.match(/\/vi\/([^\/]+)\//);
    if (!match) {
      match = thumbnailUrl.match(/watch\?v=([^&]+)/);
    }
    if (!match) {
      match = thumbnailUrl.match(/youtu\.be\/([^?]+)/);
    }
    return match ? match[1] : '';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (!initialized && loading) {
    return (
      <div className={`p-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Brain className="animate-spin" size={20} />
              <span className="text-sm">Initializing AI recommendations...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <Alert>
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show anything if no recommendations
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg text-white">
            <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md">
              <Brain className="text-white" size={16} />
            </div>
            <span>AI-Powered Recommendations</span>
            <Badge variant="secondary" className="ml-auto bg-blue-600 text-white hover:bg-blue-700">
              <Sparkles size={12} className="mr-1" />
              BERT
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((video, index) => (
          <Card 
            key={index} 
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
            onClick={() => handleVideoClick(video)}
          >
            <div className="aspect-video relative overflow-hidden rounded-t-lg">
              <img
                src={video.thumbnail_url || '/placeholder-video.jpg'}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-video.jpg';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={40} />
              </div>
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                  AI Pick
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {video.title}
              </h3>
              
                              <p className="text-xs text-gray-600 mb-3 flex items-center">
                  <span className="truncate">{video.channel_name}</span>
                </p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-gray-500">
                    <ThumbsUp size={12} className="mr-1" />
                    {formatNumber(video.likes)}
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Eye size={12} className="mr-1" />
                    Views
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <ExternalLink size={12} className="text-gray-400" />
                  <span className="text-gray-400">YouTube</span>
                </div>
              </div>
              
              {video.similarity && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">AI Match Score</span>
                    <Badge variant="outline" className="text-xs">
                      {(video.similarity * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadRecommendations}
          disabled={loading}
          className="text-xs"
        >
          {loading ? (
            <>
              <RefreshCw className="animate-spin mr-1" size={12} />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1" size={12} />
              Refresh AI Picks
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BertGenreRecommendations; 