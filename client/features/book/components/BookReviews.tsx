import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BookReview {
  id: string;
  userId: string;
  userName?: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BookReviewsProps {
  reviews: BookReview[];
  userReview: BookReview | null;
  isLoggedIn: boolean;
  loading: boolean;
  isSubmitting: boolean;
  isEditingReview: boolean;
  rating: number;
  reviewText: string;
  onRatingChange: (rating: number) => void;
  onReviewTextChange: (text: string) => void;
  onSubmitReview: () => void;
  onEditReview: () => void;
  onDeleteReview: (reviewId: string) => void;
  onLoginClick: () => void;
}

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          disabled={disabled}
          className="disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  isUserReview = false,
  onEdit,
  onDelete,
}: {
  review: BookReview;
  isUserReview?: boolean;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userName || 'user'}`}
              />
              <AvatarFallback>
                {review.userName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{review.userName || 'Anonymous'}</p>
              {review.createdAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {isUserReview && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(review.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-4 w-4',
                i < review.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              )}
            />
          ))}
          <span className="text-sm font-medium">{review.rating}/5</span>
        </div>
      </CardHeader>

      {review.comment && (
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {review.comment}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export function BookReviews({
  reviews,
  userReview,
  isLoggedIn,
  loading,
  isSubmitting,
  isEditingReview,
  rating,
  reviewText,
  onRatingChange,
  onReviewTextChange,
  onSubmitReview,
  onEditReview,
  onDeleteReview,
  onLoginClick,
}: BookReviewsProps) {
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Reviews Header with Average */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reviews</h2>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-4 w-4',
                    i < Math.round(Number(averageRating))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                />
              ))}
            </div>
            <span className="text-lg font-semibold">{averageRating}/5</span>
            <span className="text-sm text-muted-foreground">
              ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Review Form */}
      {isLoggedIn ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isEditingReview ? 'Edit Your Review' : 'Write a Review'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <StarRating value={rating} onChange={onRatingChange} disabled={isSubmitting} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Comment (Optional)</label>
              <Textarea
                placeholder="Share your thoughts about this book..."
                value={reviewText}
                onChange={(e) => onReviewTextChange(e.target.value)}
                disabled={isSubmitting}
                className="min-h-24"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onSubmitReview}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? 'Submitting...' : isEditingReview ? 'Update Review' : 'Post Review'}
              </Button>
              {isEditingReview && (
                <Button variant="outline" onClick={onEditReview} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-3">Sign in to share your review</p>
              <Button onClick={onLoginClick}>Sign In</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {userReview ? 'Your Review' : 'Community Reviews'}
        </h3>

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!loading && userReview && (
          <ReviewCard
            review={userReview}
            isUserReview={true}
            onEdit={onEditReview}
            onDelete={onDeleteReview}
          />
        )}

        <div className="space-y-4">
          {reviews
            .filter((r) => !userReview || r.id !== userReview.id)
            .map((review) => (
              <ReviewCard key={review.id} review={review} onEdit={() => {}} onDelete={onDeleteReview} />
            ))}
        </div>

        {!loading && reviews.length === 0 && !userReview && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No reviews yet. Be the first to review this book!</p>
          </div>
        )}
      </div>
    </div>
  );
}
