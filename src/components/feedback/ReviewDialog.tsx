'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { Loader2 } from 'lucide-react';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: ReviewData) => Promise<void>;
  item: {
    id: string;
    title: string;
    type: 'video' | 'playlist';
  };
  existingReview?: {
    rating: number;
    title: string;
    text: string;
  };
}

export interface ReviewData {
  rating: number;
  reviewTitle: string;
  reviewText: string;
}

export function ReviewDialog({
  isOpen,
  onClose,
  onSubmit,
  item,
  existingReview
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form with existing review data
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewTitle(existingReview.title);
      setReviewText(existingReview.text);
    } else {
      // Reset form for new review
      setRating(0);
      setReviewTitle('');
      setReviewText('');
    }
    setErrors({});
  }, [existingReview, isOpen]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (reviewTitle.trim().length < 3) {
      newErrors.reviewTitle = 'Review title must be at least 3 characters';
    }

    if (reviewTitle.trim().length > 100) {
      newErrors.reviewTitle = 'Review title must be less than 100 characters';
    }

    if (reviewText.trim().length < 10) {
      newErrors.reviewText = 'Review must be at least 10 characters';
    }

    if (reviewText.trim().length > 1000) {
      newErrors.reviewText = 'Review must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        reviewTitle: reviewTitle.trim(),
        reviewText: reviewText.trim()
      });
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      setErrors({ submit: 'Failed to submit review. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? 'Edit Review' : 'Write a Review'}
          </DialogTitle>
          <DialogDescription>
            Share your thoughts about "{item.title}" to help others learn better.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rating */}
          <div>
            <Label className="text-sm font-medium">
              Overall Rating <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size="md"
                showLabel
              />
            </div>
            {errors.rating && (
              <p className="text-sm text-red-500 mt-1">{errors.rating}</p>
            )}
          </div>

          {/* Review Title */}
          <div>
            <Label htmlFor="reviewTitle" className="text-sm font-medium">
              Review Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reviewTitle"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Summarize your experience..."
              className="mt-1"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewTitle.length}/100 characters
            </p>
            {errors.reviewTitle && (
              <p className="text-sm text-red-500 mt-1">{errors.reviewTitle}</p>
            )}
          </div>

          {/* Review Text */}
          <div>
            <Label htmlFor="reviewText" className="text-sm font-medium">
              Your Review <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your detailed thoughts, what you learned, and how helpful this content was..."
              className="mt-1 min-h-[100px]"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewText.length}/1000 characters
            </p>
            {errors.reviewText && (
              <p className="text-sm text-red-500 mt-1">{errors.reviewText}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {existingReview ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              existingReview ? 'Update Review' : 'Submit Review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 