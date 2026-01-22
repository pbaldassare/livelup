import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, Send, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// =====================================================
// PT REVIEW FORM - Form per lasciare recensione al PT
// =====================================================

interface PTReviewFormProps {
  ptUserId: string;
  ptName: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function PTReviewForm({ ptUserId, ptName, onSuccess, trigger }: PTReviewFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Devi essere autenticato');
      if (rating === 0) throw new Error('Seleziona una valutazione');

      const { data, error } = await supabase
        .from('pt_reviews')
        .insert({
          pt_user_id: ptUserId,
          atleta_user_id: user.id,
          rating,
          comment: comment.trim() || null,
          is_verified: true, // Verified because they completed a workout
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Hai già lasciato una recensione per questo PT');
        }
        throw error;
      }

      // Create notification for PT
      await supabase.from('notifications').insert({
        user_id: ptUserId,
        type: 'review',
        title: 'Nuova recensione ricevuta!',
        body: `Hai ricevuto una recensione con ${rating} stelle.`,
        data: { review_id: data.id, rating },
        action_url: '/pt/app/profile',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-reviews', ptUserId] });
      queryClient.invalidateQueries({ queryKey: ['pt-profile', ptUserId] });
      toast.success('Grazie per la tua recensione!');
      setIsOpen(false);
      setRating(0);
      setComment('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const displayRating = hoveredRating || rating;

  const ratingLabels = [
    '',
    'Pessimo',
    'Scarso',
    'Nella media',
    'Buono',
    'Eccellente'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Lascia una recensione
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recensisci {ptName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star rating */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">
              Come valuti la tua esperienza?
            </p>
            
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(star)}
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
            <label className="text-sm font-medium">
              Racconta la tua esperienza (opzionale)
            </label>
            <Textarea
              placeholder="Cosa ti è piaciuto? Cosa potrebbe migliorare?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Submit button */}
          <Button
            onClick={() => submitReviewMutation.mutate()}
            disabled={rating === 0 || submitReviewMutation.isPending}
            className="w-full"
          >
            {submitReviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Invia recensione
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PTReviewForm;
