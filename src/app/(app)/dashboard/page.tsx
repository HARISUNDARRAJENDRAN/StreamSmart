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
import { implicitTracker } from '@/services/implicitTrackingService';

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

  // Initialize implicit tracking
  useEffect(() => {
    if (user) {
      implicitTracker.setUserId(user.id);
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
      id: "history-civics",
      title: "History & Civics",
      description: "Past events and government systems",
      icon: Globe,
      gradient: "from-amber-500/20 to-yellow-500/20",
      borderColor: "border-amber-500/30",
      iconColor: "text-amber-500",
      count: "5+ courses"
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
      id: "startup-ecosystem",
      title: "Startups & Ecosystem",
      description: "Venture capital and startup news",
      icon: Rocket,
      gradient: "from-orange-500/20 to-red-500/20",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-500",
      count: "Latest stories"
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
      id: "science-experiments",
      title: "Science Experiments",
      description: "Hands-on learning through discovery",
      icon: Beaker,
      gradient: "from-teal-500/20 to-green-500/20",
      borderColor: "border-teal-500/30",
      iconColor: "text-teal-500",
      count: "Interactive demos"
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
    {
      id: "electronics-arduino",
      title: "Electronics & Arduino",
      description: "Circuit building and microcontrollers",
      icon: Wrench,
      gradient: "from-green-500/20 to-teal-500/20",
      borderColor: "border-green-500/30",
      iconColor: "text-green-500",
      count: "Maker projects"
    },
    {
      id: "diy-projects",
      title: "DIY Projects",
      description: "Creative making and building",
      icon: Settings,
      gradient: "from-orange-500/20 to-yellow-500/20",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-500",
      count: "Step-by-step guides"
    }
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
    {
      id: "sustainable-living",
      title: "Sustainable Living",
      description: "Eco-friendly lifestyle choices",
      icon: Leaf,
      gradient: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-500/30",
      iconColor: "text-green-500",
      count: "Green living tips"
    }
  ];

  // Personalized
  const personalizedGenres = [
    {
      id: "trending-now",
      title: "Trending Now",
      description: "What's popular in learning today",
      icon: TrendingUp,
      gradient: "from-violet-500/20 to-purple-500/20",
      borderColor: "border-violet-500/30",
      iconColor: "text-violet-500",
      count: "Hot topics"
    },
    {
      id: "recommended-for-you",
      title: "Recommended For You",
      description: "Curated based on your interests",
      icon: Sparkles,
      gradient: "from-amber-500/20 to-orange-500/20",
      borderColor: "border-amber-500/30",
      iconColor: "text-amber-500",
      count: "Personalized"
    },
    {
      id: "based-on-interests",
      title: "Based on Your Interests",
      description: "More content you'll love",
      icon: Heart,
      gradient: "from-rose-500/20 to-pink-500/20",
      borderColor: "border-rose-500/30",
      iconColor: "text-rose-500",
      count: "Tailored picks"
    }
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
      ...lifestyleGenres,
      ...personalizedGenres
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

  // Reusable genre section renderer
  const renderGenreSection = (
    sectionTitle: string,
    genres: any[],
    iconComponent: any,
    showExploreAll = true
  ) => (
    <motion.section variants={fadeInUp} className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          {iconComponent && iconComponent}
          {sectionTitle}
        </h2>
        {showExploreAll && (
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            Explore All <ChevronRightIcon className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="w-full max-w-full">
        <div className="relative bg-card/50 rounded-lg p-4 border border-border/50 group overflow-hidden">
          <div className="genre-scroll-container" style={{ maxWidth: '100%' }}>
            <div className="genre-cards-wrapper">
              {genres.map((genre, index) => {
                const IconComponent = genre.icon;
                return (
                  <motion.div
                    key={genre.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex-shrink-0"
                    style={{ width: '280px' }}
                  >
                    <Card 
                      className={`w-full h-44 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${genre.borderColor} bg-gradient-to-br ${genre.gradient} backdrop-blur-sm group/card`}
                      onClick={() => handleGenreClick(genre.id)}
                    >
                      <CardContent className="p-4 h-full flex flex-col justify-between relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="absolute top-2 right-2 transform rotate-12">
                            <IconComponent className="h-20 w-20" />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`p-2 rounded-lg bg-background/80 backdrop-blur-sm ${genre.iconColor} transition-transform duration-300 group-hover/card:scale-110`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <Badge variant="secondary" className="bg-background/60 backdrop-blur-sm text-xs">
                              {genre.count}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="font-bold text-base leading-tight group-hover/card:text-primary transition-colors">
                              {genre.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {genre.description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                        
                        {/* Bottom Action */}
                        <div className="relative z-10 flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CirclePlay className="h-3 w-3" />
                            <span>Start Learning</span>
                          </div>
                          <ChevronRightIcon className="h-3 w-3 text-primary opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Scroll Indicators */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-border/50">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-border/50">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
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
        <Link href="/login">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Sign In to Continue
          </Button>
        </Link>
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
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8 w-full max-w-full overflow-x-hidden"
    >
      {/* Welcome Header */}
      <motion.section variants={fadeInUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent p-8 text-primary-foreground">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white/20">
                <AvatarImage src={user?.avatarUrl || "https://placehold.co/100x100.png"} alt={user?.name} />
                <AvatarFallback className="bg-white/20 text-white font-semibold">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Learner'}! 👋</h1>
                <p className="text-lg text-primary-foreground/80">Ready to continue your learning journey?</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-300" />
                <span>{userStats?.currentStreak || 0} day streak</span>
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4 text-blue-300" />
                <span>{userStats?.totalLearningTime || '0h 0m'} total</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUpIcon className="h-4 w-4 text-green-300" />
                <span>{userStats?.overallProgress || 0}% complete</span>
              </div>
            </div>
          </div>
          <Link href="/playlists/create">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg transition-all duration-300 hover:scale-105">
              <PlusCircleIcon className="mr-2 h-5 w-5" />
              Create New Playlist
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Skill-Based Genres Section - Netflix Style */}
      <motion.section variants={fadeInUp} className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ZapIcon className="h-6 w-6 text-primary" />
            Skill-Based Genres
          </h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            Explore All <ChevronRightIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
        
        {/* Large Horizontal Container for All Genre Cards */}
        <div className="w-full max-w-full">
          <div className="relative bg-card/50 rounded-lg p-4 border border-border/50 group overflow-hidden">
            <div className="genre-scroll-container" style={{ maxWidth: '100%' }}>
              <div className="genre-cards-wrapper">
                {skillBasedGenres.map((genre, index) => {
                  const IconComponent = genre.icon;
                  return (
                    <motion.div
                      key={genre.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex-shrink-0"
                      style={{ width: '280px' }}
                    >
                      <Card 
                        className={`w-full h-44 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${genre.borderColor} bg-gradient-to-br ${genre.gradient} backdrop-blur-sm group/card`}
                        onClick={() => handleGenreClick(genre.id)}
                      >
                        <CardContent className="p-4 h-full flex flex-col justify-between relative overflow-hidden">
                          {/* Background Pattern */}
                          <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-2 right-2 transform rotate-12">
                              <IconComponent className="h-20 w-20" />
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-2">
                              <div className={`p-2 rounded-lg bg-background/80 backdrop-blur-sm ${genre.iconColor} transition-transform duration-300 group-hover/card:scale-110`}>
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <Badge variant="secondary" className="bg-background/60 backdrop-blur-sm text-xs">
                                {genre.count}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1">
                              <h3 className="font-bold text-base leading-tight group-hover/card:text-primary transition-colors">
                                {genre.title}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {genre.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* Hover Effect */}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                          
                          {/* Bottom Action */}
                          <div className="relative z-10 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CirclePlay className="h-3 w-3" />
                              <span>Start Learning</span>
                            </div>
                            <ChevronRightIcon className="h-3 w-3 text-primary opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            
            {/* Scroll Indicators */}
            <div className="absolute top-1/2 -translate-y-1/2 left-2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-border/50">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-border/50">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Academic Genres */}
      {renderGenreSection(
        "Academic Subjects",
        academicGenres,
        <GraduationCap className="h-6 w-6 text-primary" />
      )}

      {/* Career & Professional Development */}
      {renderGenreSection(
        "Career & Professional Development",
        careerGenres,
        <Briefcase className="h-6 w-6 text-primary" />
      )}

      {/* Tech News & Trends */}
      {renderGenreSection(
        "Tech News & Trends",
        techTrendsGenres,
        <Newspaper className="h-6 w-6 text-primary" />
      )}

      {/* Mind-expanding & Curiosity */}
      {renderGenreSection(
        "Mind-Expanding & Curiosity",
        curiosityGenres,
        <Lightbulb className="h-6 w-6 text-primary" />
      )}

      {/* DIY & Hands-on */}
      {renderGenreSection(
        "DIY & Hands-on Learning",
        diyGenres,
        <Wrench className="h-6 w-6 text-primary" />
      )}

      {/* Lifestyle */}
      {renderGenreSection(
        "Lifestyle & Wellness",
        lifestyleGenres,
        <Heart className="h-6 w-6 text-primary" />
      )}

      {/* Personalized */}
      {renderGenreSection(
        "Personalized for You",
        personalizedGenres,
        <Sparkles className="h-6 w-6 text-primary" />
      )}

      {/* Stats Overview */}
      <motion.section variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Playlists</p>
                <p className="text-3xl font-bold text-blue-600">{userStats?.totalPlaylists || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpenCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Videos Completed</p>
                <p className="text-3xl font-bold text-green-600">{userStats?.totalVideosCompleted || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CircleCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Streak</p>
                <p className="text-3xl font-bold text-orange-600">{userStats?.currentStreak || 0} days</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
                <p className="text-3xl font-bold text-purple-600">{userStats?.overallProgress || 0}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Continue Learning */}
          <motion.section variants={fadeInUp}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <CirclePlay className="h-6 w-6 text-primary" />
                Continue Learning
              </h2>
              <Link href="/playlists">
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  View All <ChevronRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {playlists.map((playlist) => {
                  const playlistProgress = playlist.videos.length > 0 
                    ? playlist.videos.reduce((acc, vid) => acc + (vid.completionStatus || 0), 0) / playlist.videos.length
                    : 0;
                  
                  return (
                    <motion.div
                      key={playlist.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
                        <Link href={`/playlists/${playlist.id}`}>
                          <div className="relative">
                            <Image 
                              src={playlist.videos[0]?.thumbnail || `https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,15))}`}
                              alt={playlist.title} 
                              width={400} 
                              height={240} 
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Progress value={playlistProgress} className="h-2" />
                              <p className="text-white text-sm mt-2">{Math.round(playlistProgress)}% complete</p>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                              {playlist.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {playlist.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{playlist.videos.length} videos</span>
                              {playlist.aiRecommended && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">
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
              <Card className="text-center p-12 border-dashed border-2">
                <BookOpenCheckIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start your learning journey by creating your first playlist or let our AI suggest content for you.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/playlists/create">
                    <Button className="w-full sm:w-auto">
                      <PlusCircleIcon className="mr-2 h-4 w-4" />
                      Create Playlist
                    </Button>
                  </Link>
                  <Link href="/playlists">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ZapIcon className="mr-2 h-4 w-4" />
                      Explore AI Suggestions
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </motion.section>

          {/* AI Recommendations */}
          <motion.section variants={fadeInUp}>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <BrainIcon className="h-6 w-6 text-primary" />
              Recommended for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations
                .filter(rec => !getUserFeedbackForItem(rec.id).notInterested)
                .map((rec, index) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  userFeedback={getUserFeedbackForItem(rec.id)}
                  onRating={(rating) => handleRating(rec.id, rating)}
                  onThumbsRating={(rating) => handleThumbsRating(rec.id, rating)}
                  onWatchlistToggle={() => handleWatchlistToggle(rec.id)}
                  onNotInterested={() => handleNotInterested(rec.id)}
                  onWriteReview={() => handleWriteReview(rec.id)}
                  onPlay={() => window.open(rec.url, '_blank')}
                  recommendationContext={{
                    source: 'dashboard',
                    algorithm: 'content_based',
                    position: index + 1
                  }}
                  ratingType="stars"
                />
              ))}
            </div>
          </motion.section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Achievements */}
          <motion.section variants={fadeInUp}>
            <AchievementsSystem maxDisplay={4} />
          </motion.section>

          {/* Recent Activity */}
          <motion.section variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userStats?.recentActivity && userStats.recentActivity.length > 0 ? (
                  userStats.recentActivity.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start gap-3">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5 text-green-500" />
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
