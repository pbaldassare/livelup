import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Star, MessageSquare, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// PT REVIEWS SECTION - Sezione recensioni con statistiche
// =====================================================

interface ReviewProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  atleta_user_id: string;
  profiles?: ReviewProfile;
}

interface PTReviewsSectionProps {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
}

export function PTReviewsSection({ reviews, averageRating, totalReviews }: PTReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  
  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100 
      : 0,
  }));

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i < rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Nessuna recensione ancora.</p>
        <p className="text-sm">Sii il primo a lasciare un feedback!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/30 rounded-xl">
        {/* Average rating */}
        <div className="flex flex-col items-center justify-center md:pr-6 md:border-r border-border">
          <div className="text-5xl font-bold text-foreground">
            {(averageRating || 0).toFixed(1)}
          </div>
          {renderStars(Math.round(averageRating || 0), 'lg')}
          <p className="text-sm text-muted-foreground mt-1">
            {totalReviews || reviews.length} recensioni
          </p>
        </div>

        {/* Rating distribution */}
        <div className="flex-1 space-y-2">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-4">{rating}</span>
              <Star className="h-3 w-3 fill-warning text-warning" />
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        <AnimatePresence>
          {displayedReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-card border border-border"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {(review.profiles?.first_name?.[0] || 'A')}
                    {(review.profiles?.last_name?.[0] || '')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {review.profiles?.first_name || 'Atleta'} {review.profiles?.last_name?.[0]}.
                    </p>
                    <time className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), 'd MMM yyyy', { locale: it })}
                    </time>
                  </div>
                  {renderStars(review.rating)}
                </div>
              </div>

              {/* Comment */}
              {review.comment && (
                <div className="relative pl-4 border-l-2 border-primary/30">
                  <Quote className="absolute -left-2.5 -top-1 h-4 w-4 text-primary/50 bg-card" />
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more button */}
      {reviews.length > 3 && (
        <Button
          variant="ghost"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Mostra meno
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Mostra tutte ({reviews.length} recensioni)
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default PTReviewsSection;
