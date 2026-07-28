import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { requestConnection, terminateConnection } from '@/lib/api/connections';
import { PTPackagesSection } from '@/components/atleta/PTPackagesSection';
import { FollowStarButton } from '@/components/app/FollowStarButton';
import { toast } from 'sonner';
import { buildCoachFullName, getCoachInitials } from '@/lib/coachName';
import { 
  ArrowLeft,
  Star, 
  MapPin, 
  Euro, 
  Wifi, 
  Users,
  Award,
  Clock,
  Calendar,
  Send,
  Loader2,
  MessageCircle,
  Unlink,
} from 'lucide-react';

// =====================================================
// ATLETA PT PROFILE PAGE - Dettaglio PT (Mobile)
// =====================================================

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export function AtletaPTProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, refetch: refetchStatus } = useAtletaStatus();
  const queryClient = useQueryClient();

  // Fetch PT profile
  const { data: pt, isLoading } = useQuery({
    queryKey: ['pt-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: ptData, error } = await supabase
        .from('pt_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, email')
        .eq('user_id', userId)
        .single();

      return { ...ptData, profiles: profile };
    },
    enabled: !!userId,
  });

  // Fetch PT availability
  const { data: availability } = useQuery({
    queryKey: ['pt-availability', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('pt_availability')
        .select('*')
        .eq('pt_user_id', userId)
        .eq('is_available', true)
        .order('day_of_week');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch PT reviews with responses
  const { data: reviews } = useQuery({
    queryKey: ['pt-reviews', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fetch reviews with pt_response fields
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('pt_reviews')
        .select('id, rating, comment, created_at, atleta_user_id, pt_response, pt_response_at')
        .eq('pt_user_id', userId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Fetch profiles for athletes
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
      }));
    },
    enabled: !!userId,
  });

  // Check if already requested this PT
  const { data: existingRequest } = useQuery({
    queryKey: ['connection-request', user?.id, userId],
    queryFn: async () => {
      if (!user?.id || !userId) return null;

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, status')
        .eq('atleta_user_id', user.id)
        .eq('pt_user_id', userId)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId,
  });

  // Request connection mutation
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !userId) throw new Error('Utente non autenticato');

      const result = await requestConnection({
        ptUserId: userId,
        atletaUserId: user.id,
        requestedBy: user.id,
        origin: 'ricerca',
      });

      // Send notification to PT
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'connection_request',
        title: 'Nuova richiesta di connessione',
        body: 'Un atleta vuole collegarsi con te',
        action_url: '/pt/athletes',
      });

      return result;
    },
    onSuccess: () => {
      toast.success('Richiesta inviata!');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['connection-request', user?.id, userId] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      if (!existingRequest?.id || existingRequest.status !== 'active') {
        throw new Error('Nessuna connessione attiva con questo PT');
      }
      return terminateConnection(existingRequest.id);
    },
    onSuccess: () => {
      toast.success('Connessione terminata');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['atleta-connection'] });
      queryClient.invalidateQueries({ queryKey: ['connection-request', user?.id, userId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isPendingThisPT = existingRequest?.status === 'pending';
  const isConnectedToThisPT = existingRequest?.status === 'active';
  const ptDisplayName = buildCoachFullName(pt?.profiles?.first_name, pt?.profiles?.last_name);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 bg-app-background min-h-screen">
        <Skeleton className="h-32 w-full rounded-xl bg-app-muted" />
        <Skeleton className="h-24 w-full bg-app-muted" />
        <Skeleton className="h-24 w-full bg-app-muted" />
      </div>
    );
  }

  if (!pt) {
    return (
      <div className="p-4 text-center py-12 bg-app-background min-h-screen">
        <h2 className="text-xl font-bold mb-2 text-app-foreground">PT non trovato</h2>
        <Button onClick={() => navigate(-1)} className="bg-app-accent text-app-accent-foreground">
          Torna indietro
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-app-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-app-card border-b border-app-border p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-app-foreground" />
        </button>
        {!isConnectedToThisPT && userId && (
          <FollowStarButton targetType="pt" targetId={userId} withLabel />
        )}
      </div>

      {/* Profile header */}
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-app-border">
            <AvatarImage src={pt.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-app-muted text-app-foreground">
              {getCoachInitials(pt.profiles?.first_name, pt.profiles?.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-app-foreground">
              {buildCoachFullName(pt.profiles?.first_name, pt.profiles?.last_name) ?? (
                <span className="italic text-app-muted-foreground">Profilo incompleto</span>
              )}
            </h1>
            
            {pt.rating_avg && pt.rating_avg > 0 && (
              <div className="flex items-center gap-1 text-sm mt-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-medium text-app-foreground">{pt.rating_avg.toFixed(1)}</span>
                <span className="text-app-muted-foreground">({pt.review_count} recensioni)</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-app-muted-foreground">
              {pt.location_city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {pt.location_city}
                </span>
              )}
              {pt.experience_years && (
                <span className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {pt.experience_years} anni exp.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price & Modality */}
        <div className="flex gap-2">
          {pt.hourly_rate && (
            <Badge className="gap-1 bg-app-muted border border-app-border text-app-foreground">
              <Euro className="h-3 w-3" />
              {pt.hourly_rate}/ora
            </Badge>
          )}
          {pt.offers_online && (
            <Badge className="gap-1 bg-app-muted border border-app-border text-app-foreground">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          )}
          {pt.offers_in_person && (
            <Badge className="gap-1 bg-app-muted border border-app-border text-app-foreground">
              <Users className="h-3 w-3" />
              In presenza
            </Badge>
          )}
        </div>

        {/* Specializations */}
        {pt.specializations && pt.specializations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pt.specializations.map((spec: string, i: number) => (
              <Badge key={i} variant="outline" className="border-app-border text-app-muted-foreground">
                {spec}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-app-border" />

      {/* Bio */}
      {pt.bio && (
        <Card className="m-4 bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-app-foreground">Chi sono</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-app-muted-foreground whitespace-pre-wrap">
              {pt.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Method */}
      {pt.method_description && (
        <Card className="mx-4 mb-4 bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-app-foreground">Il mio metodo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-app-muted-foreground whitespace-pre-wrap">
              {pt.method_description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {pt.certifications && pt.certifications.length > 0 && (
        <Card className="mx-4 mb-4 bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
              <Award className="h-4 w-4 text-app-accent" />
              Certificazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pt.certifications.map((cert: string, i: number) => (
                <Badge key={i} className="bg-app-muted border border-app-border text-app-foreground">
                  {cert}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability */}
      {availability && availability.length > 0 && (
        <Card className="mx-4 mb-4 bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
              <Calendar className="h-4 w-4 text-app-accent" />
              Disponibilità
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {availability.map((slot: any) => (
                <div key={slot.id} className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3 text-app-muted-foreground" />
                  <span className="font-medium text-app-foreground">{DAYS[slot.day_of_week]}:</span>
                  <span className="text-app-muted-foreground">
                    {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <Card className="mx-4 mb-4 bg-app-card border-app-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
              <Star className="h-4 w-4 text-app-accent" />
              Recensioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={review.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-app-muted text-app-foreground text-sm">
                      {(review.profiles?.first_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-app-foreground">
                      {review.profiles?.first_name} {review.profiles?.last_name?.[0]}.
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-app-muted-foreground">{review.comment}</p>
                )}
                <Separator className="bg-app-border" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* PT Packages Section */}
      {userId && (
        <PTPackagesSection ptUserId={userId} isConnected={isConnectedToThisPT} />
      )}

      {/* Fixed CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-app-card border-t border-app-border safe-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          {isConnectedToThisPT ? (
            <>
              <Button 
                className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 font-semibold"
                onClick={() => navigate(`/app/chat/${userId}`)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Scrivi al tuo coach
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-app-border text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    disabled={terminateMutation.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Termina connessione
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-app-card border-app-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-app-foreground">
                      Terminare la connessione?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-app-muted-foreground">
                      Perderai il collegamento con questo Personal Trainer
                      {ptDisplayName ? ` (${ptDisplayName})` : ''} e l&apos;accesso a schede di
                      allenamento e chat con lui.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-app-muted text-app-foreground border-app-border">
                      Annulla
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => terminateMutation.mutate()}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      Termina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : isPendingThisPT ? (
            <Button className="w-full bg-app-muted text-app-muted-foreground" disabled>
              <Clock className="h-4 w-4 mr-2" />
              Richiesta in attesa
            </Button>
          ) : isConnected ? (
            <Button className="w-full bg-app-muted text-app-muted-foreground" disabled>
              Sei già collegato a un altro PT
            </Button>
          ) : !user ? (
            <Button className="w-full bg-app-accent text-app-accent-foreground" asChild>
              <a href="/auth">Accedi per richiedere connessione</a>
            </Button>
          ) : (
            <Button 
              className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90" 
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Richiedi connessione
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AtletaPTProfilePage;
