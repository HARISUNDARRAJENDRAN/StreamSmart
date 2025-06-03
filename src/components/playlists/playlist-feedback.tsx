'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/feedback/StarRating';
import { ThumbsRating } from '@/components/feedback/ThumbsRating';
import { ReviewDialog, type ReviewData } from '@/components/feedback/ReviewDialog';
import { 
  MessageSquare, 
  X,
  Star,
  BookOpen,
  Users
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { feedbackService } from '@/services/feedbackService';
import { useToast } from "@/hooks/use-toast";

interface Playlist {
  id: string;
  title: string;
  description?: string;
  videos: any[];
}

interface PlaylistFeedbackProps {
  playlist: Playlist;
  className?: string;
}

export function PlaylistFeedback({ playlist, className }: PlaylistFeedbackProps) {
  const [userFeedback, setUserFeedback] = useState<any>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (user && playlist.id) {
      loadUserFeedback();
    }
  }, [user, playlist.id]);

  const loadUserFeedback = async () => {
    if (!user) return;

    try {
      const result = await feedbackService.getUserFeedback(user.id, playlist.id);
      if (result.success) {
        // Create feedback map for this playlist
        const feedbackMap: Record<string, any> = {};
        result.feedback.forEach((feedback: any) => {
          feedbackMap[feedback.feedbackType] = feedback;
        });
        setUserFeedback(feedbackMap);
      }
    } catch (error) {
      console.error("Error loading playlist feedback:", error);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await feedbackService.submitFeedback({
        userId: user.id,
        itemId: playlist.id,
        itemType: 'playlist',
        feedbackType: 'rating',
        rating,
        recommendationContext: {
          source: 'playlist_detail',
          algorithm: 'user_created',
          position: 0
        }
      });

      if (result.success) {
        setUserFeedback(prev => ({
          ...prev,
          rating: result.feedback
        }));

        toast({
          title: "Playlist Rated",
          description: `You rated "${playlist.title}" ${rating} stars.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit rating. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting playlist rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleThumbsRating = async (rating: number) => {
    if (!user) return;

    const feedbackType = rating === 1 ? 'thumbs_up' : 'thumbs_down';

    setIsLoading(true);
    try {
      const result = await feedbackService.submitFeedback({
        userId: user.id,
        itemId: playlist.id,
        itemType: 'playlist',
        feedbackType,
        rating,
        recommendationContext: {
          source: 'playlist_detail',
          algorithm: 'user_created',
          position: 0
        }
      });

      if (result.success) {
        setUserFeedback(prev => ({
          ...prev,
          [feedbackType]: result.feedback
        }));

        toast({
          title: "Feedback Submitted",
          description: `Thank you for your feedback on "${playlist.title}".`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit feedback. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting playlist thumbs rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async (reviewData: ReviewData) => {
    if (!user) return;

    const result = await feedbackService.submitFeedback({
      userId: user.id,
      itemId: playlist.id,
      itemType: 'playlist',
      feedbackType: 'review',
      rating: reviewData.rating,
      reviewTitle: reviewData.reviewTitle,
      reviewText: reviewData.reviewText,
      recommendationContext: {
        source: 'playlist_detail',
        algorithm: 'user_created',
        position: 0
      }
    });

    if (result.success) {
      setUserFeedback(prev => ({
        ...prev,
        review: result.feedback
      }));

      toast({
        title: "Review Submitted",
        description: `Thank you for reviewing "${playlist.title}".`,
      });

      await loadUserFeedback(); // Refresh feedback data
    } else {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
      throw new Error(result.error);
    }
  };

  const getCurrentRating = () => {
    return userFeedback.rating?.rating || 0;
  };

  const getCurrentThumbsRating = () => {
    if (userFeedback.thumbs_up?.rating === 1) return 1;
    if (userFeedback.thumbs_down?.rating === 0) return 0;
    return null;
  };

  const hasReview = () => {
    return !!userFeedback.review;
  };

  if (!user) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Rate This Playlist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playlist Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium">{playlist.title}</h4>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Users className="h-4 w-4" />
            {playlist.videos.length} videos in this playlist
          </p>
        </div>

        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Overall Playlist Rating</label>
          <StarRating
            rating={getCurrentRating()}
            onRatingChange={handleRating}
            size="md"
            showLabel
          />
        </div>

        {/* Thumbs Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Quick Feedback</label>
          <ThumbsRating
            rating={getCurrentThumbsRating()}
            onRatingChange={handleThumbsRating}
            size="md"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* Review Button */}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setReviewDialogOpen(true)}
            disabled={isLoading}
            className={hasReview() ? "border-blue-500 text-blue-600" : ""}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            {hasReview() ? 'Edit Playlist Review' : 'Review Playlist'}
          </Button>
        </div>

        {/* Feedback Summary */}
        {(getCurrentRating() > 0 || hasReview()) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Your feedback helps improve the playlist experience! 
              {getCurrentRating() > 0 && ` You rated this playlist ${getCurrentRating()} stars.`}
              {hasReview() && " You've also written a detailed review."}
            </p>
          </div>
        )}
      </CardContent>

      {/* Review Dialog */}
      <ReviewDialog
        isOpen={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        onSubmit={handleReviewSubmit}
        item={{
          id: playlist.id,
          title: playlist.title,
          type: 'playlist' as const
        }}
        existingReview={hasReview() ? {
          rating: userFeedback.review.rating,
          title: userFeedback.review.reviewTitle,
          text: userFeedback.review.reviewText
        } : undefined}
      />
    </Card>
  );
} 