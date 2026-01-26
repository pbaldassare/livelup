import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Star, 
  MessageSquare, 
  Reply, 
  Check, 
  X,
  Clock,
  Quote,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// =====================================================
// PT REVIEWS MANAGER - Gestione risposte alle recensioni
// =====================================================

interface ReviewWithProfile {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  atleta_user_id: string;
  pt_response: string | null;
  pt_response_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function PTReviewsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<ReviewWithProfile | null>(null);
  const [responseText, setResponseText] = useState('');

  // Fetch reviews for this PT
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['pt-reviews-manage', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('pt_reviews')
        .select('id, rating, comment, created_at, atleta_user_id, pt_response, pt_response_at')
        .eq('pt_user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Then fetch profiles for each athlete
      const atletaIds = [...new Set(reviewsData.map(r => r.atleta_user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', atletaIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      return reviewsData.map(review => ({
        ...review,
        profiles: profilesMap.get(review.atleta_user_id) || null,
      })) as ReviewWithProfile[];
    },
    enabled: !!user?.id,
  });

  // Submit response mutation
  const respondMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const { error } = await supabase
        .from('pt_reviews')
        .update({
          pt_response: response.trim(),
          pt_response_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('pt_user_id', user?.id);

      if (error) throw error;

      // Notify athlete about PT response
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        await supabase.from('notifications').insert({
          user_id: review.atleta_user_id,
          type: 'review_response',
          title: 'Il PT ha risposto alla tua recensione',
          body: 'La tua recensione ha ricevuto una risposta.',
          data: { review_id: reviewId },
          action_url: `/pts/${user?.id}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-reviews-manage', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-reviews', user?.id] });
      toast.success('Risposta pubblicata con successo');
      setReplyingTo(null);
      setResponseText('');
    },
    onError: () => {
      toast.error('Errore durante la pubblicazione della risposta');
    },
  });

  // Delete response mutation
  const deleteResponseMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('pt_reviews')
        .update({
          pt_response: null,
          pt_response_at: null,
        })
        .eq('id', reviewId)
        .eq('pt_user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-reviews-manage', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-reviews', user?.id] });
      toast.success('Risposta eliminata');
    },
    onError: () => {
      toast.error('Errore durante l\'eliminazione');
    },
  });

  const openReplyDialog = (review: ReviewWithProfile) => {
    setReplyingTo(review);
    setResponseText(review.pt_response || '');
  };

  const handleSubmitResponse = () => {
    if (!replyingTo || !responseText.trim()) return;
    respondMutation.mutate({ reviewId: replyingTo.id, response: responseText });
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );

  const pendingReviews = reviews.filter(r => !r.pt_response);
  const answeredReviews = reviews.filter(r => r.pt_response);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Le tue recensioni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Le tue recensioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessuna recensione ancora</p>
            <p className="text-sm">Le recensioni degli atleti appariranno qui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Le tue recensioni
          </CardTitle>
          <CardDescription>
            Gestisci e rispondi alle recensioni degli atleti
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{reviews.length}</p>
              <p className="text-xs text-muted-foreground">Totali</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{pendingReviews.length}</p>
              <p className="text-xs text-muted-foreground">Da rispondere</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{answeredReviews.length}</p>
              <p className="text-xs text-muted-foreground">Con risposta</p>
            </div>
          </div>

          {/* Pending reviews */}
          {pendingReviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                In attesa di risposta ({pendingReviews.length})
              </h3>
              <AnimatePresence>
                {pendingReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    renderStars={renderStars}
                    onReply={() => openReplyDialog(review)}
                    isPending
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Answered reviews */}
          {answeredReviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Con risposta ({answeredReviews.length})
              </h3>
              <AnimatePresence>
                {answeredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    renderStars={renderStars}
                    onReply={() => openReplyDialog(review)}
                    onDeleteResponse={() => deleteResponseMutation.mutate(review.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {replyingTo?.pt_response ? 'Modifica risposta' : 'Rispondi alla recensione'}
            </DialogTitle>
          </DialogHeader>

          {replyingTo && (
            <div className="space-y-4">
              {/* Original review */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={replyingTo.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {replyingTo.profiles?.first_name?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {replyingTo.profiles?.first_name || 'Atleta'} {replyingTo.profiles?.last_name?.[0]}.
                    </p>
                    {renderStars(replyingTo.rating)}
                  </div>
                </div>
                {replyingTo.comment && (
                  <p className="text-sm text-muted-foreground italic">
                    "{replyingTo.comment}"
                  </p>
                )}
              </div>

              {/* Response input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">La tua risposta</label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Scrivi una risposta professionale e cortese..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {responseText.length}/500 caratteri
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingTo(null)}>
              Annulla
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={!responseText.trim() || respondMutation.isPending}
            >
              {respondMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Reply className="h-4 w-4 mr-2" />
              )}
              Pubblica risposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Individual review card component
function ReviewCard({
  review,
  renderStars,
  onReply,
  onDeleteResponse,
  isPending,
}: {
  review: ReviewWithProfile;
  renderStars: (rating: number) => React.ReactNode;
  onReply: () => void;
  onDeleteResponse?: () => void;
  isPending?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-4 rounded-lg border",
        isPending ? "border-warning/30 bg-warning/5" : "border-border bg-card"
      )}
    >
      {/* Review header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {review.profiles?.first_name?.[0] || 'A'}
            {review.profiles?.last_name?.[0] || ''}
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
        <p className="text-sm text-muted-foreground mb-3 pl-13">
          "{review.comment}"
        </p>
      )}

      {/* PT Response */}
      {review.pt_response && (
        <div className="mt-3 ml-6 p-3 bg-primary/5 border-l-2 border-primary rounded-r-lg">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              <Reply className="h-3 w-3 mr-1" />
              La tua risposta
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(review.pt_response_at!), 'd MMM yyyy', { locale: it })}
            </span>
          </div>
          <p className="text-sm">{review.pt_response}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Button 
          size="sm" 
          variant={isPending ? "default" : "outline"}
          onClick={onReply}
        >
          <Reply className="h-3 w-3 mr-1" />
          {review.pt_response ? 'Modifica' : 'Rispondi'}
        </Button>
        {review.pt_response && onDeleteResponse && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDeleteResponse}
          >
            <X className="h-3 w-3 mr-1" />
            Elimina risposta
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default PTReviewsManager;
