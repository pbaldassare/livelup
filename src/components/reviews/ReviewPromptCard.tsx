import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, X } from 'lucide-react';
import { PTReviewForm } from './PTReviewForm';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// =====================================================
// REVIEW PROMPT CARD - Promemoria per lasciare recensione
// Mostra solo se l'atleta può lasciare una recensione
// =====================================================

interface ReviewPromptCardProps {
  ptUserId: string;
  ptName: string;
  className?: string;
}

export function ReviewPromptCard({ ptUserId, ptName, className }: ReviewPromptCardProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if atleta can review
  const { data: canReview } = useQuery({
    queryKey: ['can-review', user?.id, ptUserId],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .rpc('can_atleta_review_pt', {
          _atleta_user_id: user.id,
          _pt_user_id: ptUserId
        });

      if (error) {
        console.error('Error checking review eligibility:', error);
        return false;
      }

      return data;
    },
    enabled: !!user?.id && !!ptUserId,
  });

  if (!canReview || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={className}
      >
        <Card className="border-warning/30 bg-warning/5 relative overflow-hidden">
          {/* Decorative stars */}
          <div className="absolute -right-4 -top-4 opacity-10">
            <Star className="h-24 w-24 fill-warning text-warning" />
          </div>
          
          <CardContent className="pt-6 relative">
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Star className="h-6 w-6 text-warning fill-warning" />
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold">Lascia una recensione!</h3>
                  <p className="text-sm text-muted-foreground">
                    Hai completato allenamenti con {ptName}. Condividi la tua esperienza per aiutare altri atleti.
                  </p>
                </div>

                <PTReviewForm
                  ptUserId={ptUserId}
                  ptName={ptName}
                  onSuccess={() => setIsDismissed(true)}
                  trigger={
                    <Button size="sm" variant="default" className="gap-2">
                      <Star className="h-4 w-4" />
                      Scrivi recensione
                    </Button>
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export default ReviewPromptCard;
