import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Users,
  Award,
  MessageSquare,
  Calendar,
  Video,
  UserPlus,
  Check,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// PT PROFILE PAGE - Profilo pubblico PT
// Accessibile a tutti, bottone connessione per atleti autenticati
// =====================================================

interface PTProfile {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  experience_years: number | null;
  hourly_rate: number | null;
  price_min: number | null;
  price_max: number | null;
  location_city: string | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  rating_avg: number | null;
  review_count: number | null;
  max_athletes: number | null;
  method_description: string | null;
}

interface Profile {
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
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function PTProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, role, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch PT profile
  const { data: ptData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['pt-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const { data: ptProfile, error: ptError } = await supabase
        .from('pt_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_discoverable', true)
        .single();

      if (ptError) throw ptError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      return {
        pt: ptProfile as PTProfile,
        profile: profile as Profile,
      };
    },
    enabled: !!userId,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['pt-reviews', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('pt_reviews')
        .select('id, rating, comment, created_at, atleta_user_id')
        .eq('pt_user_id', userId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Review[];
    },
    enabled: !!userId,
  });

  // Fetch availability
  const { data: availability = [] } = useQuery({
    queryKey: ['pt-availability', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('pt_availability')
        .select('id, day_of_week, start_time, end_time, is_available')
        .eq('pt_user_id', userId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!userId,
  });

  // Check existing connection
  const { data: existingConnection } = useQuery({
    queryKey: ['connection-status', userId, user?.id],
    queryFn: async () => {
      if (!user?.id || !userId) return null;

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, status')
        .eq('pt_user_id', userId)
        .eq('atleta_user_id', user.id)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId && role === 'atleta',
  });

  // Request connection mutation
  const requestConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !userId) throw new Error('Non autorizzato');

      // Insert connection request
      const { data: connection, error: connError } = await supabase
        .from('pt_atleta_connections')
        .insert({
          pt_user_id: userId,
          atleta_user_id: user.id,
          requested_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (connError) {
        if (connError.code === '23505') {
          throw new Error('Esiste già una richiesta di connessione.');
        }
        throw connError;
      }

      // Get athlete name for notification
      const { data: atletaProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const atletaName = atletaProfile 
        ? `${atletaProfile.first_name || ''} ${atletaProfile.last_name || ''}`.trim() || 'Un atleta'
        : 'Un atleta';

      // Create notification for PT
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'connection_request',
        title: 'Nuova richiesta di connessione',
        body: `${atletaName} vuole connettersi con te come Personal Trainer.`,
        action_url: '/pt/athletes',
        data: { connection_id: connection.id, atleta_user_id: user.id },
      });

      return connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-status', userId, user?.id] });
      toast.success('Richiesta inviata! Il Personal Trainer riceverà una notifica.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!ptData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">Profilo non trovato o non disponibile.</p>
            <Button onClick={() => navigate('/pts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla ricerca
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pt, profile } = ptData;
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Personal Trainer';

  const canRequestConnection = isAuthenticated && role === 'atleta' && !existingConnection;
  const hasPendingRequest = existingConnection?.status === 'pending';
  const isConnected = existingConnection?.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Back navigation */}
        <Link to="/pts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla ricerca
        </Link>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Profile header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-role-pt/10 text-role-pt text-2xl font-bold">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold">{fullName}</h1>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      {pt.rating_avg && pt.rating_avg > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          {pt.rating_avg.toFixed(1)} ({pt.review_count} recensioni)
                        </span>
                      )}
                      {pt.location_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {pt.location_city}
                        </span>
                      )}
                      {pt.experience_years && pt.experience_years > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {pt.experience_years} anni esperienza
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {pt.offers_online && (
                        <Badge variant="secondary" className="gap-1">
                          <Video className="h-3 w-3" />
                          Online
                        </Badge>
                      )}
                      {pt.offers_in_person && (
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          In presenza
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio */}
            {pt.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chi sono</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{pt.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Method description */}
            {pt.method_description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Il mio metodo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{pt.method_description}</p>
                </CardContent>
              </Card>
            )}

            {/* Specializations */}
            {pt.specializations && pt.specializations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specializzazioni</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {pt.specializations.map((spec) => (
                      <Badge key={spec} variant="outline" className="capitalize">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {pt.certifications && pt.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-role-pt" />
                    Certificazioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {pt.certifications.map((cert) => (
                      <li key={cert} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recensioni ({pt.review_count || reviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price & CTA */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Tariffa</CardTitle>
                <CardDescription>
                  {pt.price_min && pt.price_max ? (
                    <span className="text-2xl font-bold text-foreground">
                      €{pt.price_min} - €{pt.price_max}
                    </span>
                  ) : pt.hourly_rate ? (
                    <span className="text-2xl font-bold text-foreground">
                      €{pt.hourly_rate}/ora
                    </span>
                  ) : (
                    <span className="text-lg text-muted-foreground">Su richiesta</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnected ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    Già connesso
                  </Button>
                ) : hasPendingRequest ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Clock className="h-4 w-4 mr-2" />
                    Richiesta inviata
                  </Button>
                ) : canRequestConnection ? (
                  <Button 
                    className="w-full" 
                    onClick={() => requestConnectionMutation.mutate()}
                    disabled={requestConnectionMutation.isPending}
                  >
                    {requestConnectionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Richiedi connessione
                  </Button>
                ) : !isAuthenticated ? (
                  <Button className="w-full" onClick={() => navigate('/auth')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Accedi per connetterti
                  </Button>
                ) : role !== 'atleta' ? (
                  <Button className="w-full" variant="outline" disabled>
                    Solo per atleti
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {/* Availability */}
            {availability.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Disponibilità
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {availability.map((slot) => (
                      <div key={slot.id} className="flex justify-between text-sm">
                        <span className="font-medium">{dayNames[slot.day_of_week]}</span>
                        <span className="text-muted-foreground">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PTProfilePage;