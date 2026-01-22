import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePTConnectionRequests, type ConnectionRequest } from '@/hooks/usePTConnectionRequests';
import { Check, X, UserPlus, Clock, Target, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT CONNECTION REQUESTS - Richieste pendenti
// Design: dark theme + lime accent
// =====================================================

interface PTConnectionRequestsProps {
  maxItems?: number;
  showEmpty?: boolean;
}

export function PTConnectionRequests({ maxItems = 5, showEmpty = true }: PTConnectionRequestsProps) {
  const {
    pendingRequests,
    pendingCount,
    isLoading,
    acceptRequest,
    rejectRequest,
    isAccepting,
    isRejecting,
  } = usePTConnectionRequests();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const displayedRequests = maxItems ? pendingRequests.slice(0, maxItems) : pendingRequests;

  const handleAccept = (request: ConnectionRequest) => {
    setProcessingId(request.id);
    acceptRequest(request, {
      onSettled: () => setProcessingId(null),
    });
  };

  const handleReject = (request: ConnectionRequest) => {
    setProcessingId(request.id);
    rejectRequest(request, {
      onSettled: () => setProcessingId(null),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-app-card border-app-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full bg-app-muted" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-app-muted" />
                  <Skeleton className="h-3 w-24 bg-app-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <Card className="bg-app-card border-app-border">
        <CardContent className="p-6 text-center">
          <UserPlus className="h-8 w-8 mx-auto text-app-muted-foreground mb-2" />
          <p className="text-app-muted-foreground text-sm">
            Nessuna richiesta in attesa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-app-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-app-accent" />
          Richieste pendenti
          <Badge className="bg-app-accent text-app-accent-foreground ml-1">
            {pendingCount}
          </Badge>
        </h3>
      </div>

      {/* Requests list */}
      <AnimatePresence mode="popLayout">
        {displayedRequests.map((request, index) => {
          const name = request.profiles
            ? `${request.profiles.first_name || ''} ${request.profiles.last_name || ''}`.trim() || 'Atleta'
            : 'Atleta';
          const initials = request.profiles
            ? `${request.profiles.first_name?.[0] || ''}${request.profiles.last_name?.[0] || ''}`
            : 'A';
          const level = request.atleta_profiles?.level || request.atleta_profiles?.fitness_level;
          const goals = request.atleta_profiles?.goals?.slice(0, 2) || [];
          const isProcessing = processingId === request.id;

          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-app-card border-app-border overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 border-2 border-app-accent">
                      <AvatarImage src={request.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-app-muted text-app-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-app-foreground truncate">
                          {name}
                        </h4>
                        {level && (
                          <Badge variant="secondary" className="text-xs bg-app-muted text-app-foreground">
                            {level}
                          </Badge>
                        )}
                      </div>

                      {/* Time */}
                      <p className="text-xs text-app-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(request.created_at), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </p>

                      {/* Goals */}
                      {goals.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Target className="h-3 w-3 text-app-muted-foreground" />
                          <span className="text-xs text-app-muted-foreground truncate">
                            {goals.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleReject(request)}
                        disabled={isProcessing}
                      >
                        {isProcessing && isRejecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
                        onClick={() => handleAccept(request)}
                        disabled={isProcessing}
                      >
                        {isProcessing && isAccepting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Show more indicator */}
      {pendingCount > maxItems && (
        <p className="text-center text-sm text-app-muted-foreground">
          +{pendingCount - maxItems} altre richieste
        </p>
      )}
    </div>
  );
}

export default PTConnectionRequests;
