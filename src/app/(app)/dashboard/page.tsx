'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  PlusCircleIcon, 
  BookOpenCheckIcon, 
  ZapIcon, 
  TrendingUpIcon, 
  ClockIcon, 
  CirclePlay, 
  AwardIcon, 
  StarIcon, 
  Flame, 
  CalendarIcon,
  TargetIcon,
  BrainIcon,
  UsersIcon,
  ChevronRightIcon,
  Trophy,
  Bookmark,
  CircleCheck,
  Code2,
  BarChart3,
  Palette,
  Megaphone,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  PenTool,
  Mic,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Newspaper,
  Lightbulb,
  Wrench,
  Heart,
  Settings,
  Sparkles,
  Calculator,
  Microscope,
  Atom,
  Globe,
  Languages,
  FileText,
  MessageSquare,
  Rocket,
  Shield,
  Cpu,
  Beaker,
  Dumbbell,
  Leaf
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Playlist } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';
import { WeeklyGoalSettings } from '@/components/dashboard/weekly-goal-settings';
import { AchievementsSystem } from '@/components/achievements/achievements-system';
import { feedbackService } from '@/services/feedbackService';
import { RecommendationCard } from '@/components/feedback/RecommendationCard';
import { ReviewDialog, type ReviewData } from '@/components/feedback/ReviewDialog';
import { useToast } from "@/hooks/use-toast";
// Note: Implicit tracking service removed - will be implemented in new recommendation system

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userFeedbackMap, setUserFeedbackMap] = useState<Record<string, any>>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const { user, userStats, isAuthenticated, recordActivity } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // Note: User tracking will be implemented in new recommendation system
  useEffect(() => {
    if (user) {
      console.log('User ID available for tracking:', user.id);
    }
  }, [user]);

  useEffect(() => {
    const loadPlaylists = async () => {
      if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    try {
        const userPlaylists = await playlistService.getPlaylists(user.id);
        
        const processedPlaylists = userPlaylists.slice(0, 3).map((p: any) => ({
          ...p,
          id: p._id, // MongoDB uses _id
          createdAt: new Date(p.createdAt),
          lastModified: new Date(p.updatedAt || p.createdAt),
          videos: p.videos || [],
          tags: p.tags || [],
          userId: p.userId,
          overallProgress: p.overallProgress || 0,
        }));
        
        setPlaylists(processedPlaylists);
    } catch (error) {
      console.error("Error loading playlists:", error);
    }
    setIsLoading(false);
    };

    loadPlaylists();
  }, [user, isAuthenticated]);

  // Load user feedback for recommendations
  useEffect(() => {
    const loadUserFeedback = async () => {
      if (!user) return;

      try {
        const result = await feedbackService.getUserFeedback(user.id);
        if (result.success) {
          // Create a map for quick lookup
          const feedbackMap: Record<string, any> = {};
          result.feedback.forEach((feedback: any) => {
            if (!feedbackMap[feedback.itemId]) {
              feedbackMap[feedback.itemId] = {};
            }
            feedbackMap[feedback.itemId][feedback.feedbackType] = feedback;
          });
          setUserFeedbackMap(feedbackMap);
        }
      } catch (error) {
        console.error("Error loading user feedback:", error);
      }
    };

    loadUserFeedback();
  }, [user]);

  // Enhanced recommendations with more variety
  const recommendations = [
    {
      id: "rec-1",
      title: "Advanced React Patterns",
      description: "Based on your React learning progress",
      thumbnail: "https://i.ytimg.com/vi/BcVAq3YFiuc/hqdefault.jpg",
      duration: "45 min",
      difficulty: "Advanced",
      creator: "Kent C. Dodds",
      url: "https://youtube.com/watch?v=BcVAq3YFiuc"
    },
    {
      id: "rec-2", 
      title: "TypeScript for Beginners",
      description: "Next step in your learning journey",
      thumbnail: "https://i.ytimg.com/vi/BwuLxPH8IDs/hqdefault.jpg",
      duration: "2h 15min",
      difficulty: "Beginner",
      creator: "Traversy Media",
      url: "https://youtube.com/watch?v=BwuLxPH8IDs"
    },
    {
      id: "rec-3",
      title: "Node.js Authentication",
      description: "Complete authentication system tutorial",
      thumbnail: "https://i.ytimg.com/vi/7nafaH9SddU/hqdefault.jpg",
      duration: "1h 30min",
      difficulty: "Intermediate", 
      creator: "Dev Ed",
      url: "https://youtube.com/watch?v=7nafaH9SddU"
    },
    {
      id: "rec-4",
      title: "Database Design Fundamentals",
      description: "Based on your backend learning interest",
      thumbnail: "https://i.ytimg.com/vi/ztHopE5Wnpc/hqdefault.jpg",
      duration: "55 min",
      difficulty: "Intermediate",
      creator: "freeCodeCamp",
      url: "https://youtube.com/watch?v=ztHopE5Wnpc"
    }
  ];

  const handleRating = async (recommendationId: string, rating: number) => {
    if (!user) return;

    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const result = await feedbackService.submitFeedback({
      userId: user.id,
      itemId: recommendationId,
      itemType: 'recommendation',
      feedbackType: 'rating',
      rating,
      recommendationContext: {
        source: 'dashboard',
        algorithm: 'content_based',
        position: recommendations.findIndex(r => r.id === recommendationId) + 1
      }
    });

    if (result.success) {
      // Update local feedback map
      setUserFeedbackMap(prev => ({
        ...prev,
        [recommendationId]: {
          ...prev[recommendationId],
          rating: result.feedback
        }
      }));

      toast({
        title: "Rating Submitted",
        description: `You rated "${recommendation.title}" ${rating} stars.`,
      });

      // Record activity
      recordActivity({
        action: `Rated "${recommendation.title}"`,
        item: recommendation.title,
        type: 'completed'
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleThumbsRating = async (recommendationId: string, rating: number) => {
    if (!user) return;

    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const feedbackType = rating === 1 ? 'thumbs_up' : 'thumbs_down';

    const result = await feedbackService.submitFeedback({
      userId: user.id,
      itemId: recommendationId,
      itemType: 'recommendation',
      feedbackType,
      rating,
      recommendationContext: {
        source: 'dashboard',
        algorithm: 'content_based',
        position: recommendations.findIndex(r => r.id === recommendationId) + 1
      }
    });

    if (result.success) {
      setUserFeedbackMap(prev => ({
        ...prev,
        [recommendationId]: {
          ...prev[recommendationId],
          [feedbackType]: result.feedback
        }
      }));

      toast({
        title: "Feedback Submitted",
        description: `Thank you for your feedback on "${recommendation.title}".`,
      });
    } else {
      toast({
        title: "Error", 
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWatchlistToggle = async (recommendationId: string) => {
    if (!user) return;

    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const isInWatchlist = await feedbackService.isInWatchlist(user.id, recommendationId);

    if (isInWatchlist) {
      // Remove from watchlist logic would require getting the watchlist ID first
      toast({
        title: "Info",
        description: "Watchlist removal functionality needs watchlist ID. Please manage from watchlist page.",
      });
    } else {
      // Extract the real YouTube video ID from the URL
      const extractYouTubeVideoId = (url: string): string | null => {
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
      };

      const youtubeVideoId = extractYouTubeVideoId(recommendation.url);
      const finalItemId = youtubeVideoId || recommendationId; // Fallback to recommendationId if extraction fails

      console.log('🎯 [handleWatchlistToggle] Extracted video ID:', youtubeVideoId, 'from URL:', recommendation.url);
      console.log('🎯 [handleWatchlistToggle] Using itemId:', finalItemId);

      const result = await feedbackService.addToWatchlist({
        userId: user.id,
        itemId: finalItemId, // Use the real YouTube video ID
        itemType: 'video',
        itemDetails: {
          title: recommendation.title,
          thumbnail: recommendation.thumbnail,
          duration: recommendation.duration,
          description: `${recommendation.description}\n\nOriginal URL: ${recommendation.url}`, // Store the URL in description
          creator: recommendation.creator
        },
        addedFrom: 'dashboard_recommendations'
      });

      if (result.success) {
        toast({
          title: "Added to Watchlist",
          description: `"${recommendation.title}" has been added to your watchlist.`,
        });

        recordActivity({
          action: `Added "${recommendation.title}" to watchlist`,
          item: recommendation.title,
          type: 'created'
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add to watchlist.",
          variant: "destructive"
        });
      }
    }
  };

  const handleNotInterested = async (recommendationId: string) => {
    if (!user) return;

    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const result = await feedbackService.submitFeedback({
      userId: user.id,
      itemId: recommendationId,
      itemType: 'recommendation',
      feedbackType: 'not_interested',
      recommendationContext: {
        source: 'dashboard',
        algorithm: 'content_based', 
        position: recommendations.findIndex(r => r.id === recommendationId) + 1
      }
    });

    if (result.success) {
      setUserFeedbackMap(prev => ({
        ...prev,
        [recommendationId]: {
          ...prev[recommendationId],
          not_interested: result.feedback
        }
      }));

      toast({
        title: "Feedback Recorded",
        description: `We won't show similar content like "${recommendation.title}".`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to record feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWriteReview = (recommendationId: string) => {
    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (recommendation) {
      setSelectedRecommendation(recommendation);
      setReviewDialogOpen(true);
    }
  };

  const handleReviewSubmit = async (reviewData: ReviewData) => {
    if (!user || !selectedRecommendation) return;

    const result = await feedbackService.submitFeedback({
      userId: user.id,
      itemId: selectedRecommendation.id,
      itemType: 'recommendation',
      feedbackType: 'review',
      rating: reviewData.rating,
      reviewTitle: reviewData.reviewTitle,
      reviewText: reviewData.reviewText,
      recommendationContext: {
        source: 'dashboard',
        algorithm: 'content_based',
        position: recommendations.findIndex(r => r.id === selectedRecommendation.id) + 1
      }
    });

    if (result.success) {
      setUserFeedbackMap(prev => ({
        ...prev,
        [selectedRecommendation.id]: {
          ...prev[selectedRecommendation.id],
          review: result.feedback
        }
      }));

      toast({
        title: "Review Submitted",
        description: `Thank you for reviewing "${selectedRecommendation.title}".`,
      });

      recordActivity({
        action: `Reviewed "${selectedRecommendation.title}"`,
        item: selectedRecommendation.title,
        type: 'completed'
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
      throw new Error(result.error);
    }
  };

  const getUserFeedbackForItem = (itemId: string) => {
    const feedback = userFeedbackMap[itemId] || {};
    return {
      rating: feedback.rating?.rating,
      thumbsRating: feedback.thumbs_up?.rating ?? (feedback.thumbs_down?.rating === 0 ? 0 : null),
      inWatchlist: false, // Would need to check watchlist separately
      notInterested: !!feedback.not_interested,
      hasReview: !!feedback.review
    };
  };

  // Skill-Based Genres Data with actual videos
  const skillBasedGenres = [
    {
      id: "coding-programming",
      title: "Coding & Programming",
      description: "Master programming languages and development skills",
      icon: Code2,
      gradient: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
      count: "120+ videos",
      videos: [
        {
          id: "prog-1",
          title: "JavaScript Fundamentals Complete Course",
          thumbnail: "https://i.ytimg.com/vi/PkZNo7MFNFg/hqdefault.jpg",
          duration: "3h 26min",
          creator: "freeCodeCamp",
          url: "https://youtube.com/watch?v=PkZNo7MFNFg"
        },
        {
          id: "prog-2", 
          title: "React.js Full Course 2024",
          thumbnail: "https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg",
          duration: "11h 55min",
          creator: "Dave Gray",
          url: "https://youtube.com/watch?v=bMknfKXIFA8"
        },
        {
          id: "prog-3",
          title: "Python for Beginners - Full Course",
          thumbnail: "https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg",
          duration: "4h 26min",
          creator: "freeCodeCamp",
          url: "https://youtube.com/watch?v=rfscVS0vtbw"
        },
        {
          id: "prog-4",
          title: "Node.js and Express.js Full Course",
          thumbnail: "https://i.ytimg.com/vi/Oe421EPjeBE/hqdefault.jpg",
          duration: "8h 16min",
          creator: "freeCodeCamp",
          url: "https://youtube.com/watch?v=Oe421EPjeBE"
        }
      ]
    },
    {
      id: "data-science-ai",
      title: "Data Science & AI/ML",
      description: "Learn data analysis, machine learning, and AI",
      icon: BarChart3,
      gradient: "from-purple-500/20 to-violet-500/20",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-500",
      count: "85+ videos",
      videos: [
        {
          id: "ds-1",
          title: "Machine Learning Course - Building 12 AI Projects",
          thumbnail: "https://i.ytimg.com/vi/tPYj3fFJGjk/hqdefault.jpg",
          duration: "12h 45min",
          creator: "freeCodeCamp",
          url: "https://youtube.com/watch?v=tPYj3fFJGjk"
        },
        {
          id: "ds-2",
          title: "Data Analysis with Python Full Course",
          thumbnail: "https://i.ytimg.com/vi/r-uOLxNrNk8/hqdefault.jpg",
          duration: "10h 54min",
          creator: "freeCodeCamp",
          url: "https://youtube.com/watch?v=r-uOLxNrNk8"
        },
        {
          id: "ds-3",
          title: "TensorFlow 2.0 Complete Course",
          thumbnail: "https://i.ytimg.com/vi/tPYj3fFJGjk/hqdefault.jpg",
          duration: "7h 2min",
          creator: "TensorFlow",
          url: "https://youtube.com/watch?v=tPYj3fFJGjk"
        }
      ]
    },
    {
      id: "design",
      title: "Design (UI/UX, Graphic, Product)",
      description: "Creative design skills and visual thinking",
      icon: Palette,
      gradient: "from-pink-500/20 to-rose-500/20",
      borderColor: "border-pink-500/30",
      iconColor: "text-pink-500",
      count: "95+ videos",
      videos: [
        {
          id: "design-1",
          title: "UI/UX Design Tutorial - Complete Course",
          thumbnail: "https://i.ytimg.com/vi/c9Wg6Cb_YlU/hqdefault.jpg",
          duration: "2h 45min",
          creator: "DesignCourse",
          url: "https://youtube.com/watch?v=c9Wg6Cb_YlU"
        },
        {
          id: "design-2",
          title: "Figma UI Design Tutorial - Complete Course",
          thumbnail: "https://i.ytimg.com/vi/jwCmIBJ8Jtc/hqdefault.jpg",
          duration: "3h 22min",
          creator: "freeCodeCamp",
          url: "https://youtube.com/watch?v=jwCmIBJ8Jtc"
        },
        {
          id: "design-3",
          title: "Adobe Photoshop Complete Course",
          thumbnail: "https://i.ytimg.com/vi/IyR_uYsRdPs/hqdefault.jpg",
          duration: "5h 30min",
          creator: "Photoshop Training",
          url: "https://youtube.com/watch?v=IyR_uYsRdPs"
        }
      ]
    },
    {
      id: "digital-marketing",
      title: "Digital Marketing",
      description: "Master online marketing and growth strategies",
      icon: Megaphone,
      gradient: "from-orange-500/20 to-yellow-500/20",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-500",
      count: "70+ videos",
      videos: [
        {
          id: "marketing-1",
          title: "Digital Marketing Course 2024",
          thumbnail: "https://i.ytimg.com/vi/nU-IIXBWlS4/hqdefault.jpg",
          duration: "4h 15min",
          creator: "Simplilearn",
          url: "https://youtube.com/watch?v=nU-IIXBWlS4"
        },
        {
          id: "marketing-2",
          title: "Google Ads Complete Tutorial",
          thumbnail: "https://i.ytimg.com/vi/EhhXEOk8kR0/hqdefault.jpg",
          duration: "2h 30min",
          creator: "Google Skillshop",
          url: "https://youtube.com/watch?v=EhhXEOk8kR0"
        },
        {
          id: "marketing-3",
          title: "Social Media Marketing Strategy",
          thumbnail: "https://i.ytimg.com/vi/ZNbd9pkJSLQ/hqdefault.jpg",
          duration: "1h 45min",
          creator: "HubSpot",
          url: "https://youtube.com/watch?v=ZNbd9pkJSLQ"
        }
      ]
    },
    {
      id: "productivity",
      title: "Productivity & Time Management",
      description: "Optimize your workflow and manage time effectively",
      icon: Clock,
      gradient: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-500/30",
      iconColor: "text-green-500",
      count: "45+ videos",
      videos: [
        {
          id: "prod-1",
          title: "Time Management Mastery Course",
          thumbnail: "https://i.ytimg.com/vi/FOXM-7L9ol0/hqdefault.jpg",
          duration: "1h 20min",
          creator: "Thomas Frank",
          url: "https://youtube.com/watch?v=FOXM-7L9ol0"
        },
        {
          id: "prod-2",
          title: "Getting Things Done (GTD) System",
          thumbnail: "https://i.ytimg.com/vi/gCswMsONkwY/hqdefault.jpg",
          duration: "45min",
          creator: "David Allen",
          url: "https://youtube.com/watch?v=gCswMsONkwY"
        }
      ]
    },
    {
      id: "financial-literacy",
      title: "Financial Literacy & Investing",
      description: "Build wealth and understand personal finance",
      icon: DollarSign,
      gradient: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-500",
      count: "60+ videos",
      videos: [
        {
          id: "finance-1",
          title: "Personal Finance for Beginners",
          thumbnail: "https://i.ytimg.com/vi/HQzoZfc3GwQ/hqdefault.jpg",
          duration: "2h 15min",
          creator: "Ben Felix",
          url: "https://youtube.com/watch?v=HQzoZfc3GwQ"
        },
        {
          id: "finance-2",
          title: "Stock Market Investing for Beginners",
          thumbnail: "https://i.ytimg.com/vi/Jdgq4LS_TyI/hqdefault.jpg",
          duration: "1h 55min",
          creator: "Investing Simplified",
          url: "https://youtube.com/watch?v=Jdgq4LS_TyI"
        }
      ]
    },
    {
      id: "soft-skills",
      title: "Soft Skills (Communication, Leadership)",
      description: "Develop interpersonal and leadership abilities",
      icon: Users,
      gradient: "from-indigo-500/20 to-blue-500/20",
      borderColor: "border-indigo-500/30",
      iconColor: "text-indigo-500",
      count: "55+ videos",
      videos: [
        {
          id: "soft-1",
          title: "Communication Skills Training",
          thumbnail: "https://i.ytimg.com/vi/HAnw168huqA/hqdefault.jpg",
          duration: "1h 30min",
          creator: "Stanford Graduate School",
          url: "https://youtube.com/watch?v=HAnw168huqA"
        },
        {
          id: "soft-2",
          title: "Leadership Skills Development",
          thumbnail: "https://i.ytimg.com/vi/xlUDQjYlS44/hqdefault.jpg",
          duration: "2h 10min",
          creator: "Harvard Business Review",
          url: "https://youtube.com/watch?v=xlUDQjYlS44"
        }
      ]
    },
    {
      id: "entrepreneurship",
      title: "Entrepreneurship & Startups",
      description: "Launch and grow your own business",
      icon: TrendingUp,
      gradient: "from-violet-500/20 to-purple-500/20",
      borderColor: "border-violet-500/30",
      iconColor: "text-violet-500",
      count: "40+ videos",
      videos: [
        {
          id: "entre-1",
          title: "How to Start a Startup - Complete Course",
          thumbnail: "https://i.ytimg.com/vi/CBYhVcO4WgI/hqdefault.jpg",
          duration: "3h 45min",
          creator: "Y Combinator",
          url: "https://youtube.com/watch?v=CBYhVcO4WgI"
        },
        {
          id: "entre-2",
          title: "Business Plan Creation Guide",
          thumbnail: "https://i.ytimg.com/vi/bfB4pMC8tM0/hqdefault.jpg",
          duration: "1h 15min",
          creator: "Entrepreneur",
          url: "https://youtube.com/watch?v=bfB4pMC8tM0"
        }
      ]
    },
    {
      id: "writing-content",
      title: "Writing & Content Creation",
      description: "Craft compelling content and improve writing",
      icon: PenTool,
      gradient: "from-cyan-500/20 to-blue-500/20",
      borderColor: "border-cyan-500/30",
      iconColor: "text-cyan-500",
      count: "65+ videos",
      videos: [
        {
          id: "writing-1",
          title: "Content Writing Masterclass",
          thumbnail: "https://i.ytimg.com/vi/UnVb0qnHbDc/hqdefault.jpg",
          duration: "2h 30min",
          creator: "HubSpot Academy",
          url: "https://youtube.com/watch?v=UnVb0qnHbDc"
        },
        {
          id: "writing-2",
          title: "Creative Writing Techniques",
          thumbnail: "https://i.ytimg.com/vi/bCqZXtODbNw/hqdefault.jpg",
          duration: "1h 45min",
          creator: "MasterClass",
          url: "https://youtube.com/watch?v=bCqZXtODbNw"
        }
      ]
    },
    {
      id: "public-speaking",
      title: "Public Speaking",
      description: "Build confidence and speaking skills",
      icon: Mic,
      gradient: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/30",
      iconColor: "text-red-500",
      count: "30+ videos",
      videos: [
        {
          id: "speak-1",
          title: "Public Speaking Masterclass",
          thumbnail: "https://i.ytimg.com/vi/AykYRO5d_lI/hqdefault.jpg",
          duration: "1h 20min",
          creator: "TED-Ed",
          url: "https://youtube.com/watch?v=AykYRO5d_lI"
        },
        {
          id: "speak-2",
          title: "Overcome Fear of Public Speaking",
          thumbnail: "https://i.ytimg.com/vi/TF2p3G3n7X4/hqdefault.jpg",
          duration: "55min",
          creator: "Toastmasters",
          url: "https://youtube.com/watch?v=TF2p3G3n7X4"
        }
      ]
    }
  ];

  // Academic Genres
  const academicGenres = [
    {
      id: "mathematics",
      title: "Mathematics",
      description: "From algebra to calculus and beyond",
      icon: Calculator,
      gradient: "from-indigo-500/20 to-purple-500/20",
      borderColor: "border-indigo-500/30",
      iconColor: "text-indigo-500",
      count: "8+ courses"
    },
    {
      id: "physics",
      title: "Physics",
      description: "Understanding the universe through science",
      icon: Atom,
      gradient: "from-blue-500/20 to-teal-500/20",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
      count: "6+ courses"
    },
    {
      id: "biology",
      title: "Biology",
      description: "Life sciences and biological systems",
      icon: Microscope,
      gradient: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-500/30",
      iconColor: "text-green-500",
      count: "8+ courses"
    },
    {
      id: "chemistry",
      title: "Chemistry",
      description: "Molecular science and reactions",
      icon: Beaker,
      gradient: "from-orange-500/20 to-red-500/20",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-500",
      count: "4+ courses"
    },

    {
      id: "language-learning",
      title: "Language Learning",
      description: "Master new languages and communication",
      icon: Languages,
      gradient: "from-rose-500/20 to-pink-500/20",
      borderColor: "border-rose-500/30",
      iconColor: "text-rose-500",
      count: "8+ courses"
    }
  ];

  // Career & Professional Development
  const careerGenres = [
    {
      id: "resume-job-hunting",
      title: "Resume & Job Hunting",
      description: "Land your dream job with confidence",
      icon: FileText,
      gradient: "from-slate-500/20 to-gray-500/20",
      borderColor: "border-slate-500/30",
      iconColor: "text-slate-500",
      count: "8+ guides"
    },
    {
      id: "interview-prep",
      title: "Interview Preparation",
      description: "Ace your interviews with proven strategies",
      icon: MessageSquare,
      gradient: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
      count: "4+ courses"
    },
    {
      id: "freelancing-remote",
      title: "Freelancing & Remote Work",
      description: "Build a successful remote career",
      icon: Briefcase,
      gradient: "from-purple-500/20 to-violet-500/20",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-500",
      count: "6+ courses"
    },
    {
      id: "certifications",
      title: "Certifications",
      description: "AWS, Azure, PMP and more",
      icon: GraduationCap,
      gradient: "from-green-500/20 to-teal-500/20",
      borderColor: "border-green-500/30",
      iconColor: "text-green-500",
      count: "12+ prep courses"
    }
  ];

  // Tech News & Trends
  const techTrendsGenres = [
    {
      id: "tech-news",
      title: "Tech News & Product Launches",
      description: "Stay updated with latest technology",
      icon: Newspaper,
      gradient: "from-blue-500/20 to-indigo-500/20",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
      count: "Daily updates"
    },
    {
      id: "ai-innovation",
      title: "AI & Innovation",
      description: "Cutting-edge AI developments",
      icon: Cpu,
      gradient: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-500",
      count: "Weekly insights"
    },

    {
      id: "cybersecurity",
      title: "Cybersecurity",
      description: "Digital security and privacy trends",
      icon: Shield,
      gradient: "from-red-500/20 to-pink-500/20",
      borderColor: "border-red-500/30",
      iconColor: "text-red-500",
      count: "Security updates"
    }
  ];

  // Mind-expanding & Curiosity
  const curiosityGenres = [
    {
      id: "trivia-facts",
      title: "Did You Know / Trivia",
      description: "Amazing facts and surprising truths",
      icon: Lightbulb,
      gradient: "from-yellow-500/20 to-orange-500/20",
      borderColor: "border-yellow-500/30",
      iconColor: "text-yellow-500",
      count: "8+ collections"
    },

    {
      id: "psychology",
      title: "Psychology",
      description: "Understanding human behavior and mind",
      icon: BrainIcon,
      gradient: "from-violet-500/20 to-purple-500/20",
      borderColor: "border-violet-500/30",
      iconColor: "text-violet-500",
      count: "Mind explorations"
    },
    {
      id: "philosophy",
      title: "Philosophy",
      description: "Deep questions about existence and meaning",
      icon: Lightbulb,
      gradient: "from-indigo-500/20 to-blue-500/20",
      borderColor: "border-indigo-500/30",
      iconColor: "text-indigo-500",
      count: "Thought-provoking"
    }
  ];

  // DIY & Hands-on
  const diyGenres = [
    {
      id: "robotics-iot",
      title: "Robotics & IoT",
      description: "Build connected devices and robots",
      icon: Cpu,
      gradient: "from-cyan-500/20 to-blue-500/20",
      borderColor: "border-cyan-500/30",
      iconColor: "text-cyan-500",
      count: "Project tutorials"
    },


  ];

  // Lifestyle
  const lifestyleGenres = [
    {
      id: "health-fitness",
      title: "Health & Fitness",
      description: "Physical wellness and exercise",
      icon: Dumbbell,
      gradient: "from-red-500/20 to-pink-500/20",
      borderColor: "border-red-500/30",
      iconColor: "text-red-500",
      count: "8+ workout plans"
    },
    {
      id: "mental-wellness",
      title: "Mental Health & Wellness",
      description: "Mindfulness and emotional well-being",
      icon: Heart,
      gradient: "from-pink-500/20 to-rose-500/20",
      borderColor: "border-pink-500/30",
      iconColor: "text-pink-500",
      count: "Wellness guides"
    },

  ];



  const handleGenreClick = (genreId: string) => {
    // Find genre across all categories
    const allGenres = [
      ...skillBasedGenres,
      ...academicGenres,
      ...careerGenres,
      ...techTrendsGenres,
      ...curiosityGenres,
      ...diyGenres,
      ...lifestyleGenres
    ];
    
    const selectedGenre = allGenres.find(g => g.id === genreId);
    
    if (selectedGenre) {
      // Navigate to genre-specific page
      router.push(`/genre/${genreId}`);
      
      recordActivity({
        action: `Explored ${selectedGenre.title} genre`,
        item: selectedGenre.title || 'Genre',
        type: 'started'
      });
    }
  };

  // Category-specific background images using Unsplash
  const getCategoryBackgroundImage = (genreId: string) => {
    const imageMap: Record<string, string> = {
      // Skill-Based Genres
      'coding-programming': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=320&h=224&fit=crop&auto=format&q=80',
      'data-science-ai': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=320&h=224&fit=crop&auto=format&q=80',
      'design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=320&h=224&fit=crop&auto=format&q=80',
      'digital-marketing': 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=320&h=224&fit=crop&auto=format&q=80',
      'productivity': 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=320&h=224&fit=crop&auto=format&q=80',
      'financial-literacy': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=320&h=224&fit=crop&auto=format&q=80',
      'soft-skills': 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=320&h=224&fit=crop&auto=format&q=80',
      'entrepreneurship': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&h=224&fit=crop&auto=format&q=80',
      'writing-content': 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=320&h=224&fit=crop&auto=format&q=80',
      'public-speaking': 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=320&h=224&fit=crop&auto=format&q=80',

      // Academic Genres
      'mathematics': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=320&h=224&fit=crop&auto=format&q=80',
      'physics': 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=320&h=224&fit=crop&auto=format&q=80',
      'biology': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=320&h=224&fit=crop&auto=format&q=80',
      'chemistry': 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=320&h=224&fit=crop&auto=format&q=80',

      'language-learning': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=320&h=224&fit=crop&auto=format&q=80',

      // Career & Professional
      'resume-job-hunting': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=320&h=224&fit=crop&auto=format&q=80',
      'interview-prep': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=320&h=224&fit=crop&auto=format&q=80',
      'freelancing-remote': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=320&h=224&fit=crop&auto=format&q=80',
      'certifications': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=320&h=224&fit=crop&auto=format&q=80',

      // Tech News & Trends
      'tech-news': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=320&h=224&fit=crop&auto=format&q=80',
      'ai-innovation': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=320&h=224&fit=crop&auto=format&q=80',

      'cybersecurity': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=320&h=224&fit=crop&auto=format&q=80',

      // Mind-expanding & Curiosity
      'trivia-facts': 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=320&h=224&fit=crop&auto=format&q=80',

      'psychology': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=320&h=224&fit=crop&auto=format&q=80',
      'philosophy': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=320&h=224&fit=crop&auto=format&q=80',

      // DIY & Hands-on
      'robotics-iot': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=320&h=224&fit=crop&auto=format&q=80',



      // Lifestyle & Wellness
      'health-fitness': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=320&h=224&fit=crop&auto=format&q=80',
      'mental-wellness': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=224&fit=crop&auto=format&q=80',

    };

    // Return specific image for the genre, or fallback to a default tech image
    return imageMap[genreId] || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=320&h=224&fit=crop&auto=format&q=80';
  };

  // Netflix-style genre section renderer
  const renderGenreSection = (
    sectionTitle: string,
    genres: any[],
    iconComponent: any,
    showExploreAll = true
  ) => (
    <motion.section key={sectionTitle} variants={fadeInUp} className="space-y-6 w-full">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-4xl font-bold text-white flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-[#D90429] rounded-xl">
            {iconComponent}
          </div>
          {sectionTitle}
        </h2>
        {showExploreAll && (
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white text-sm font-medium hover:bg-white/10"
          >
            See All <ChevronRightIcon className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-4" style={{ scrollBehavior: 'smooth' }}>
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {genres.map((genre, index) => {
              const IconComponent = genre.icon;
              return (
                <motion.div
                  key={genre.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-shrink-0"
                  style={{ width: '320px' }}
                >
                  <Card 
                    className="w-full h-56 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-[#D90429]/50 group/card relative overflow-hidden shadow-xl hover:shadow-[#D90429]/20"
                    onClick={() => handleGenreClick(genre.id)}
                  >
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-15 group-hover/card:opacity-25 transition-opacity duration-500"
                      style={{
                        backgroundImage: `url('${getCategoryBackgroundImage(genre.id)}')`
                      }}
                    />
                    
                    {/* Subtle Pattern Overlay */}
                    <div className="absolute inset-0 opacity-5 group-hover/card:opacity-10 transition-opacity duration-300" 
                         style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)' }} />
                    
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
                    
                    <CardContent className="p-5 h-full flex flex-col relative z-10">
                      {/* Top Section */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-[#D90429] p-2.5 rounded-xl group-hover/card:bg-[#C80021] transition-colors shadow-lg">
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <Badge className="bg-[#D90429]/20 text-[#D90429] border-[#D90429]/30 font-medium backdrop-blur-sm text-xs">
                          {genre.count} Videos
                        </Badge>
                      </div>
                      
                      {/* Content Section - Takes up most space */}
                      <div className="flex-1 flex flex-col justify-between min-h-0">
                        <div className="space-y-2">
                          <h3 className="font-bold text-xl text-white leading-tight group-hover/card:text-[#D90429] transition-colors drop-shadow-lg line-clamp-2">
                            {genre.title}
                          </h3>
                          <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                            {genre.description}
                          </p>
                        </div>
                        
                        {/* Action Button - Always at bottom */}
                        <div className="flex items-center justify-between pt-3 mt-auto">
                          <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <CirclePlay className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">Start Learning</span>
                          </div>
                          <div className="opacity-0 group-hover/card:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/card:translate-x-0 flex-shrink-0">
                            <div className="bg-white text-black p-1.5 rounded-full shadow-lg">
                              <ChevronRightIcon className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#D90429]/20 via-transparent to-[#D90429]/20" />
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#D90429]" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Netflix-style Scroll Arrows */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-4 bg-black/80 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl border border-gray-700 cursor-pointer hover:bg-black/90">
          <ChevronLeft className="h-6 w-6 text-white" />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-4 bg-black/80 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl border border-gray-700 cursor-pointer hover:bg-black/90">
          <ChevronRight className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.section>
  );

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <h2 className="text-2xl font-bold mb-4">Welcome to StreamSmart!</h2>
        <p className="text-muted-foreground mb-6">Please sign in to access your dashboard.</p>
        <Button 
          size="lg" 
          className="bg-[#D90429] hover:bg-[#C80021] text-white"
          onClick={() => window.location.href = '/login'}
        >
          Sign In to Continue
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-12 bg-black min-h-screen"
    >
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      {/* Netflix-Style Hero Section */}
      <motion.div 
        variants={fadeInUp}
        className="relative overflow-hidden rounded-3xl h-[70vh] flex items-end"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.6) 100%),
            linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 0.1) 100%),
            url('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Hero Content */}
        <div className="relative z-10 p-12 max-w-2xl">
          {/* Netflix-style badge */}
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold tracking-wider">
              FEATURED
            </div>
            <Badge className="bg-purple-200 text-purple-800 font-semibold">
              🔥 Trending
            </Badge>
            <div className="text-purple-300 font-semibold text-sm">97% Match</div>
          </div>

          {/* Title */}
          <h1 className="text-6xl font-black text-white mb-4 drop-shadow-2xl">
            Master React in 2024
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-200 mb-6 max-w-lg leading-relaxed drop-shadow-lg">
            Complete React development course covering hooks, context, performance optimization, and modern patterns. Build real-world projects and master the most in-demand frontend framework.
          </p>

          {/* Video Info */}
          <div className="flex items-center gap-6 mb-8 text-gray-300">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              <span>4h 23min</span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              <span>2.1M students</span>
            </div>
            <div className="flex items-center gap-2">
              <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span>4.8 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-black/50 text-green-400 border-green-400">
                Advanced
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Button 
              size="lg"
              className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-4 rounded-lg text-lg flex items-center gap-3 shadow-2xl"
              onClick={() => window.open('https://youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
            >
              <CirclePlay className="h-6 w-6" />
              Start Learning
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="bg-black/60 text-white border-gray-400 hover:bg-black/80 font-semibold px-8 py-4 rounded-lg text-lg flex items-center gap-3 backdrop-blur-sm"
            >
              <Bookmark className="h-5 w-5" />
              Add to Playlist
            </Button>
          </div>
        </div>

        {/* Floating User Stats */}
        <div className="absolute top-8 right-8 bg-black/80 backdrop-blur-md rounded-2xl p-6 border border-[#D90429]/30">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-12 w-12 border-2 border-[#D90429]">
              <AvatarImage 
                src={user?.avatarUrl || "https://placehold.co/100x100.png"} 
                alt={user?.name || "User Avatar"} 
              />
              <AvatarFallback className="bg-[#D90429] text-white font-bold">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold">{user?.name || 'Learner'}</p>
              <p className="text-gray-400 text-sm">Level {Math.floor((userStats?.overallProgress || 0) / 10) + 1}</p>
            </div>
          </div>
          
          {/* Mini Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#D90429]">{userStats?.currentStreak || 0}</p>
              <p className="text-xs text-gray-400">Day Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#D90429]">{userStats?.totalPlaylists || 0}</p>
              <p className="text-xs text-gray-400">Playlists</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Skill-Based Genres */}
      {renderGenreSection(
        "Skill-Based Genres",
        skillBasedGenres,
        <ZapIcon className="h-6 w-6 text-white" />
      )}

      {/* Academic Genres */}
      {renderGenreSection(
        "Academic Subjects",
        academicGenres,
        <GraduationCap className="h-6 w-6 text-white" />
      )}

      {/* Career & Professional Development */}
      {renderGenreSection(
        "Career & Professional Development",
        careerGenres,
        <Briefcase className="h-6 w-6 text-white" />
      )}

      {/* Tech News & Trends */}
      {renderGenreSection(
        "Tech News & Trends",
        techTrendsGenres,
        <Newspaper className="h-6 w-6 text-white" />
      )}

      {/* Mind-expanding & Curiosity */}
      {renderGenreSection(
        "Mind-Expanding & Curiosity",
        curiosityGenres,
        <Lightbulb className="h-6 w-6 text-white" />
      )}

      {/* DIY & Hands-on */}
      {renderGenreSection(
        "DIY & Hands-on Learning",
        diyGenres,
        <Wrench className="h-6 w-6 text-white" />
      )}

      {/* Lifestyle */}
      {renderGenreSection(
        "Lifestyle & Wellness",
        lifestyleGenres,
        <Heart className="h-6 w-6 text-white" />
      )}



      {/* Netflix-Style Quick Stats Bar */}
      <motion.section variants={fadeInUp} className="px-4">
        <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#D90429]">{userStats?.totalPlaylists || 0}</p>
              <p className="text-sm text-gray-400">Playlists</p>
            </div>
            <div className="w-px h-12 bg-gray-700"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{userStats?.totalVideosCompleted || 0}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
            <div className="w-px h-12 bg-gray-700"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{userStats?.currentStreak || 0}</p>
              <p className="text-sm text-gray-400">Day Streak</p>
            </div>
            <div className="w-px h-12 bg-gray-700"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{userStats?.overallProgress || 0}%</p>
              <p className="text-sm text-gray-400">Progress</p>
            </div>
          </div>
          
          <Link href="/playlists/create">
            <Button className="bg-[#D90429] hover:bg-[#C80021] text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2">
              <PlusCircleIcon className="h-5 w-5" />
              Create Playlist
            </Button>
          </Link>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Continue Learning */}
          <motion.section variants={fadeInUp}>
            <div className="flex items-center justify-between mb-8 px-4">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <CirclePlay className="h-8 w-8 text-[#D90429]" />
                Continue Learning
              </h2>
              <Link href="/playlists">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">
                  View All <ChevronRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {playlists.length > 0 ? (
              <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 px-4">
                {playlists.map((playlist) => {
                  const playlistProgress = playlist.videos.length > 0 
                    ? playlist.videos.reduce((acc, vid) => acc + (vid.completionStatus || 0), 0) / playlist.videos.length
                    : 0;
                  
                  return (
                    <motion.div
                      key={playlist.id}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                      style={{ width: '400px' }}
                    >
                      <Card className="overflow-hidden hover:shadow-2xl hover:shadow-[#D90429]/20 transition-all duration-300 group bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-[#D90429]/50">
                        <Link href={`/playlists/${playlist.id}`}>
                          <div className="relative">
                            <Image 
                              src={playlist.videos[0]?.thumbnail || `https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,15))}`}
                              alt={playlist.title} 
                              width={400} 
                              height={240} 
                              className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            
                            {/* Progress Bar - Always Visible */}
                            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-800">
                              <div 
                                className="h-full bg-[#D90429] transition-all duration-300"
                                style={{ width: `${playlistProgress}%` }}
                              />
                            </div>
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <div className="text-center text-white">
                                <CirclePlay className="h-16 w-16 mx-auto mb-2 opacity-80" />
                                <p className="text-lg font-semibold">{Math.round(playlistProgress)}% Complete</p>
                              </div>
                            </div>
                          </div>
                          
                          <CardContent className="p-6 bg-gradient-to-t from-black to-gray-900">
                            <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#D90429] transition-colors">
                              {playlist.title}
                            </h3>
                            <p className="text-sm text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                              {playlist.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span>{playlist.videos.length} videos</span>
                              </div>
                              {playlist.aiRecommended && (
                                <Badge className="bg-[#D90429]/20 text-[#D90429] border-[#D90429]/30">
                                  <ZapIcon className="w-3 h-3 mr-1" />
                                  AI Curated
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center p-12 bg-gradient-to-br from-gray-900 to-black border border-gray-800 mx-4">
                <BookOpenCheckIcon className="mx-auto h-20 w-20 text-[#D90429]/50 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">Ready to Start Learning?</h3>
                <p className="text-gray-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                  Create your first playlist or explore our AI-curated content to begin your learning adventure.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/playlists/create">
                    <Button className="w-full sm:w-auto bg-[#D90429] hover:bg-[#C80021] text-white font-semibold px-8 py-3 text-lg">
                      <PlusCircleIcon className="mr-2 h-5 w-5" />
                      Create First Playlist
                    </Button>
                  </Link>
                  <Link href="/playlists">
                    <Button variant="outline" className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-semibold px-8 py-3 text-lg">
                      <ZapIcon className="mr-2 h-5 w-5" />
                      Explore AI Suggestions
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </motion.section>


        </div>

        {/* Netflix-Style Sidebar */}
        <div className="space-y-8 bg-gradient-to-b from-gray-900 to-black rounded-2xl p-6 border border-gray-800">
          {/* Achievements */}
          <motion.section variants={fadeInUp}>
            <AchievementsSystem maxDisplay={4} />
          </motion.section>

          {/* Recent Activity */}
          <motion.section variants={fadeInUp}>
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CalendarIcon className="h-5 w-5 text-[#D90429]" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userStats?.recentActivity && userStats.recentActivity.length > 0 ? (
                  userStats.recentActivity.map((activity, index) => (
                    <div key={activity.id || `activity-${index}`} className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-accent/50 mt-0.5">
                        {activity.type === 'completed' && <CircleCheck className="h-4 w-4 text-green-500" />}
                        {activity.type === 'started' && <CirclePlay className="h-4 w-4 text-blue-500" />}
                        {activity.type === 'quiz' && <AwardIcon className="h-4 w-4 text-yellow-500" />}
                        {activity.type === 'created' && <PlusCircleIcon className="h-4 w-4 text-purple-500" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action}</span>{' '}
                          <span className="text-muted-foreground">{activity.item}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity yet. Start learning to see your progress here!
                  </p>
                )}
                <Button variant="outline" className="w-full mt-4">
                  View Activity Log
                </Button>
              </CardContent>
            </Card>
          </motion.section>

          {/* Learning Goals */}
          <motion.section variants={fadeInUp}>
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5 text-[#D90429]" />
                  Weekly Goal
                  </span>
                  <WeeklyGoalSettings />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Videos watched this week</span>
                    <span className="font-medium">
                      {userStats?.weeklyGoal.completed || 0} / {userStats?.weeklyGoal.target || 15}
                    </span>
                  </div>
                  <Progress value={userStats?.weeklyGoal.progress || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {userStats?.weeklyGoal.target ? 
                      `${Math.max(0, userStats.weeklyGoal.target - userStats.weeklyGoal.completed)} more videos to reach your weekly goal! 🎯` :
                      'Set a weekly goal to track your progress! 🎯'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>

      {/* Review Dialog */}
      <ReviewDialog
        isOpen={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setSelectedRecommendation(null);
        }}
        onSubmit={handleReviewSubmit}
        item={selectedRecommendation ? {
          id: selectedRecommendation.id,
          title: selectedRecommendation.title,
          type: 'video' as const
        } : { id: '', title: '', type: 'video' as const }}
        existingReview={selectedRecommendation ? 
          userFeedbackMap[selectedRecommendation.id]?.review ? {
            rating: userFeedbackMap[selectedRecommendation.id].review.rating,
            title: userFeedbackMap[selectedRecommendation.id].review.reviewTitle,
            text: userFeedbackMap[selectedRecommendation.id].review.reviewText
          } : undefined : undefined
        }
      />
    </motion.div>
  );
}
