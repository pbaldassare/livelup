import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Edit2, Trash2, Loader2, Save, X, AlertTriangle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';

// =====================================================
// ATLETA REVIEWS HISTORY - Storico recensioni atleta
// =====================================================

interface Review {
  id: string;
  pt_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  pt_profile?: {
    user_id: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
  };
}

interface EditingReview {
  id: string;
  rating: number;
  comment: string;
}

export function AtletaReviewsHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [editingReview, setEditingReview] = useState<EditingReview | null>(null);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Fetch atleta's reviews with PT info
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ['atleta-reviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('pt_reviews')
        .select('*')
        .eq('atleta_user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Then get PT profiles for each review
      const ptUserIds = [...new Set(reviewsData.map(r => r.pt_user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', ptUserIds);

      // Combine data
      return reviewsData.map(review => ({
        ...review,
        pt_profile: {
          user_id: review.pt_user_id,
          profiles: profiles?.find(p => p.user_id === review.pt_user_id) || null,
        },
      })) as Review[];
    },
    enabled: !!user?.id,
  });

  // Update review mutation
  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, rating, comment }: { id: string; rating: number; comment: string }) => {
      const { error } = await supabase
        .from('pt_reviews')
        .update({
          rating,
          comment: comment.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('atleta_user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atleta-reviews'] });
      toast.success('Recensione aggiornata');
      setEditingReview(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('pt_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('atleta_user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atleta-reviews'] });
      toast.success('Recensione eliminata');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleStartEdit = (review: Review) => {
    setEditingReview({
      id: review.id,
      rating: review.rating,
      comment: review.comment || '',
    });
    setHoveredRating(0);
  };

  const handleSaveEdit = () => {
    if (!editingReview) return;
    updateReviewMutation.mutate(editingReview);
  };

  const displayRating = hoveredRating || editingReview?.rating || 0;

  const ratingLabels = ['', 'Pessimo', 'Scarso', 'Nella media', 'Buono', 'Eccellente'];

  const getPTName = (review: Review) => {
    const profile = review.pt_profile?.profiles;
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return 'Personal Trainer';
  };

  const getPTInitials = (review: Review) => {
    const profile = review.pt_profile?.profiles;
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
    }
    return 'PT';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Errore nel caricamento"
        description="Non è stato possibile caricare le tue recensioni"
      />
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Nessuna recensione"
        description="Non hai ancora lasciato recensioni ai tuoi Personal Trainer"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-app-foreground mb-4">Le tue recensioni</h2>
      
      <AnimatePresence>
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-app-card border-app-border overflow-hidden">
              <CardContent className="p-4">
                {/* PT Info Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={review.pt_profile?.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getPTInitials(review)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-app-foreground">{getPTName(review)}</p>
                      <p className="text-xs text-app-muted-foreground">
                        {format(new Date(review.created_at), "d MMMM yyyy", { locale: it })}
                        {review.updated_at !== review.created_at && ' (modificata)'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-app-muted-foreground hover:text-primary"
                      onClick={() => handleStartEdit(review)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-app-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-app-card border-app-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-app-foreground">
                            Eliminare recensione?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-app-muted-foreground">
                            Questa azione non può essere annullata. La recensione verrà rimossa definitivamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-app-muted text-app-foreground border-app-border">
                            Annulla
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteReviewMutation.mutate(review.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteReviewMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Elimina'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Rating stars */}
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= review.rating
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                  {review.is_verified && (
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      Verificata
                    </span>
                  )}
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-app-muted-foreground text-sm leading-relaxed">
                    "{review.comment}"
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Edit Dialog */}
      <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
        <DialogContent className="sm:max-w-md bg-app-card border-app-border">
          <DialogHeader>
            <DialogTitle className="text-app-foreground">Modifica recensione</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Star rating */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-center text-app-foreground">
                Valutazione
              </p>
              
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setEditingReview(prev => prev ? { ...prev, rating: star } : null)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        star <= displayRating
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </motion.button>
                ))}
              </div>

              {displayRating > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm font-medium text-primary"
                >
                  {ratingLabels[displayRating]}
                </motion.p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-app-foreground">
                Commento (opzionale)
              </label>
              <Textarea
                placeholder="Modifica il tuo commento..."
                value={editingReview?.comment || ''}
                onChange={(e) => setEditingReview(prev => prev ? { ...prev, comment: e.target.value } : null)}
                rows={4}
                maxLength={500}
                className="bg-app-muted border-app-border text-app-foreground"
              />
              <p className="text-xs text-app-muted-foreground text-right">
                {editingReview?.comment.length || 0}/500
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-app-muted border-app-border text-app-foreground"
                onClick={() => setEditingReview(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={!editingReview?.rating || updateReviewMutation.isPending}
              >
                {updateReviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AtletaReviewsHistory;
