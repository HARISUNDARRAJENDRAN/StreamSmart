'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/feedback/StarRating';
import { ThumbsRating } from '@/components/feedback/ThumbsRating';
import { ReviewDialog, type ReviewData } from '@/components/feedback/ReviewDialog';
import { 
  Heart, 
  MessageSquare, 
  X,
  Star,
  ThumbsUp
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { feedbackService } from '@/services/feedbackService';
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  youtubeURL: string;
  thumbnail: string;
  duration: string;
  completionStatus: number;
  summary?: string;
}

interface VideoFeedbackProps {
  video: Video;
  playlistId: string;
  className?: string;
}

export function VideoFeedback({ video, playlistId, className }: VideoFeedbackProps) {
  const [userFeedback, setUserFeedback] = useState<any>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (user && video.id) {
      loadUserFeedback();
    }
  }, [user, video.id]);

  const loadUserFeedback = async () => {
    if (!user) return;

    try {
      const result = await feedbackService.getUserFeedback(user.id, video.id);
      if (result.success) {
        // Create feedback map for this video
        const feedbackMap: Record<string, any> = {};
        result.feedback.forEach((feedback: any) => {
          feedbackMap[feedback.feedbackType] = feedback;
        });
        setUserFeedback(feedbackMap);
      }
    } catch (error) {
      console.error("Error loading video feedback:", error);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await feedbackService.submitFeedback({
        userId: user.id,
        itemId: video.id,
        itemType: 'video',
        feedbackType: 'rating',
        rating,
        recommendationContext: {
          source: 'playlist_detail',
          algorithm: 'user_selected',
          position: 0
        }
      });

      if (result.success) {
        setUserFeedback(prev => ({
          ...prev,
          rating: result.feedback
        }));

        toast({
          title: "Rating Submitted",
          description: `You rated "${video.title}" ${rating} stars.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit rating. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
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
        itemId: video.id,
        itemType: 'video',
        feedbackType,
        rating,
        recommendationContext: {
          source: 'playlist_detail',
          algorithm: 'user_selected',
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
          description: `Thank you for your feedback on "${video.title}".`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit feedback. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting thumbs rating:', error);
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
      itemId: video.id,
      itemType: 'video',
      feedbackType: 'review',
      rating: reviewData.rating,
      reviewTitle: reviewData.reviewTitle,
      reviewText: reviewData.reviewText,
      recommendationContext: {
        source: 'playlist_detail',
        algorithm: 'user_selected',
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
        description: `Thank you for reviewing "${video.title}".`,
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

  const handleNotInterested = async () => {
    if (!user) return;

    try {
      const result = await feedbackService.submitFeedback({
        userId: user.id,
        itemId: video.id,
        itemType: 'video',
        feedbackType: 'not_interested',
        recommendationContext: {
          source: 'playlist_detail',
          algorithm: 'user_selected',
          position: 0
        }
      });

      if (result.success) {
        setUserFeedback(prev => ({
          ...prev,
          not_interested: result.feedback
        }));

        toast({
          title: "Feedback Recorded",
          description: `Marked "${video.title}" as not interested.`,
        });
      }
    } catch (error) {
      console.error('Error submitting not interested feedback:', error);
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

  const isNotInterested = () => {
    return !!userFeedback.not_interested;
  };

  if (!user) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Rate Your Experience
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Overall Rating</label>
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
            {hasReview() ? 'Edit Review' : 'Write Review'}
          </Button>

          {/* Not Interested Button */}
          {!isNotInterested() && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleNotInterested}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Not Interested
            </Button>
          )}

          {/* Status Badges */}
          {isNotInterested() && (
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              Not Interested
            </Badge>
          )}
        </div>

        {/* Feedback Summary */}
        {(getCurrentRating() > 0 || hasReview()) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Your feedback helps improve the learning experience for everyone! 
              {getCurrentRating() > 0 && ` You rated this ${getCurrentRating()} stars.`}
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
          id: video.id,
          title: video.title,
          type: 'video' as const
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