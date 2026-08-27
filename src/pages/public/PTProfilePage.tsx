import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PTPhotoGallery } from '@/components/pt/PTPhotoGallery';
import { PTAvailabilityCalendar } from '@/components/pt/PTAvailabilityCalendar';
import { PTReviewsSection } from '@/components/pt/PTReviewsSection';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Users,
  Award,
  Video,
  UserPlus,
  Check,
  Loader2,
  Euro,
  Sparkles,
  Target,
  GraduationCap,
  MessageSquare
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
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, role, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const userId = paramUserId || user?.id;
  const isOwnPreview = !!user?.id && userId === user.id;

  // Fetch PT profile
  const { data: ptData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['pt-public-profile', userId, isOwnPreview],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const { data: ptProfile, error: ptError } = await supabase
        .from('pt_profiles')
        .select('*, gallery_photos')
        .eq('user_id', userId)
        .maybeSingle();

      if (ptError) throw ptError;
      if (!ptProfile) return null;
      if (!ptProfile.is_discoverable && !isOwnPreview) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      return {
        pt: ptProfile as PTProfile & { gallery_photos?: string[] },
        profile: profile as Profile,
      };
    },
    enabled: !!userId,
  });

  // Fetch reviews with profiles
  const { data: reviews = [] } = useQuery({
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
        .limit(20);

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

      const { data: atletaProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const atletaName = atletaProfile 
        ? `${atletaProfile.first_name || ''} ${atletaProfile.last_name || ''}`.trim() || 'Un atleta'
        : 'Un atleta';

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

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl py-8 space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
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
            <Button onClick={() => navigate(isOwnPreview ? '/pt/app/profile' : '/pts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isOwnPreview ? 'Torna al tuo profilo' : 'Torna alla ricerca'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pt, profile } = ptData;
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Personal Trainer';
  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`;

  const canRequestConnection = isAuthenticated && role === 'atleta' && !existingConnection;
  const hasPendingRequest = existingConnection?.status === 'pending';
  const isConnected = existingConnection?.status === 'active';

  // Gallery photos from pt_profiles
  const galleryPhotos = pt.gallery_photos || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="container max-w-5xl py-8 space-y-6">
          {/* Back navigation */}
          <Link 
            to={isOwnPreview ? '/pt/app/profile' : '/pts'} 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isOwnPreview ? 'Torna al tuo profilo' : 'Torna alla ricerca'}
          </Link>

          {/* Profile header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start gap-6"
          >
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
                
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {pt.rating_avg && pt.rating_avg > 0 && (
                    <span className="flex items-center gap-1 text-foreground font-medium">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      {pt.rating_avg.toFixed(1)}
                      <span className="text-muted-foreground font-normal">
                        ({pt.review_count} recensioni)
                      </span>
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
                      {pt.experience_years} anni di esperienza
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {pt.offers_online && (
                  <Badge className="gap-1 bg-info/10 text-info border-info/30">
                    <Video className="h-3 w-3" />
                    Online
                  </Badge>
                )}
                {pt.offers_in_person && (
                  <Badge className="gap-1 bg-success/10 text-success border-success/30">
                    <Users className="h-3 w-3" />
                    In presenza
                  </Badge>
                )}
                {pt.specializations?.slice(0, 3).map((spec) => (
                  <Badge key={spec} variant="secondary" className="capitalize">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <ConnectionButton
                isConnected={isConnected}
                hasPendingRequest={hasPendingRequest}
                canRequestConnection={canRequestConnection}
                isAuthenticated={isAuthenticated}
                role={role}
                isPending={requestConnectionMutation.isPending}
                onRequest={() => requestConnectionMutation.mutate()}
                onLogin={() => navigate('/auth')}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo Gallery */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <PTPhotoGallery photos={galleryPhotos} ptName={fullName} />
                </CardContent>
              </Card>
            </motion.section>

            {/* Bio */}
            {pt.bio && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Chi sono
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{pt.bio}</p>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Method description */}
            {pt.method_description && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Il mio metodo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{pt.method_description}</p>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Specializations */}
            {pt.specializations && pt.specializations.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Specializzazioni</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {pt.specializations.map((spec) => (
                        <Badge key={spec} variant="outline" className="capitalize py-1.5 px-3">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Certifications */}
            {pt.certifications && pt.certifications.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Certificazioni
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {pt.certifications.map((cert) => (
                        <li key={cert} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <Award className="h-4 w-4 text-success flex-shrink-0" />
                          <span className="text-sm">{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Availability Calendar */}
            {availability.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <PTAvailabilityCalendar availability={availability} />
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Reviews */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Recensioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PTReviewsSection 
                    reviews={reviews as any} 
                    averageRating={pt.rating_avg} 
                    totalReviews={pt.review_count} 
                  />
                </CardContent>
              </Card>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="sticky top-6 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Tariffa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 bg-muted/50 rounded-lg">
                    {pt.price_min && pt.price_max ? (
                      <div>
                        <span className="text-3xl font-bold text-foreground">
                          €{pt.price_min} - €{pt.price_max}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">a sessione</p>
                      </div>
                    ) : pt.hourly_rate ? (
                      <div>
                        <span className="text-3xl font-bold text-foreground">
                          €{pt.hourly_rate}
                        </span>
                        <span className="text-lg text-muted-foreground">/ora</span>
                      </div>
                    ) : (
                      <span className="text-lg text-muted-foreground">Su richiesta</span>
                    )}
                  </div>

                  <Separator />

                  {/* Mobile CTA */}
                  <div className="md:hidden">
                    <ConnectionButton
                      isConnected={isConnected}
                      hasPendingRequest={hasPendingRequest}
                      canRequestConnection={canRequestConnection}
                      isAuthenticated={isAuthenticated}
                      role={role}
                      isPending={requestConnectionMutation.isPending}
                      onRequest={() => requestConnectionMutation.mutate()}
                      onLogin={() => navigate('/auth')}
                      fullWidth
                    />
                  </div>

                  {/* Desktop - show in sidebar */}
                  <div className="hidden md:block">
                    <ConnectionButton
                      isConnected={isConnected}
                      hasPendingRequest={hasPendingRequest}
                      canRequestConnection={canRequestConnection}
                      isAuthenticated={isAuthenticated}
                      role={role}
                      isPending={requestConnectionMutation.isPending}
                      onRequest={() => requestConnectionMutation.mutate()}
                      onLogin={() => navigate('/auth')}
                      fullWidth
                    />
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    La connessione è gratuita. Il PT deciderà se accettarti.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {pt.experience_years || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Anni exp.</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {pt.review_count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Recensioni</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {pt.certifications?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Certificazioni</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {pt.specializations?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Specializzazioni</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Connection button component
interface ConnectionButtonProps {
  isConnected: boolean;
  hasPendingRequest: boolean;
  canRequestConnection: boolean;
  isAuthenticated: boolean;
  role: string | null;
  isPending: boolean;
  onRequest: () => void;
  onLogin: () => void;
  fullWidth?: boolean;
}

function ConnectionButton({
  isConnected,
  hasPendingRequest,
  canRequestConnection,
  isAuthenticated,
  role,
  isPending,
  onRequest,
  onLogin,
  fullWidth = false,
}: ConnectionButtonProps) {
  const buttonClass = fullWidth ? 'w-full' : '';

  if (isConnected) {
    return (
      <Button className={buttonClass} variant="outline" disabled>
        <Check className="h-4 w-4 mr-2" />
        Già connesso
      </Button>
    );
  }

  if (hasPendingRequest) {
    return (
      <Button className={buttonClass} variant="secondary" disabled>
        <Clock className="h-4 w-4 mr-2" />
        Richiesta inviata
      </Button>
    );
  }

  if (canRequestConnection) {
    return (
      <Button 
        className={buttonClass}
        onClick={onRequest}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        Richiedi connessione
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button className={buttonClass} onClick={onLogin}>
        <UserPlus className="h-4 w-4 mr-2" />
        Accedi per connetterti
      </Button>
    );
  }

  if (role !== 'atleta') {
    return (
      <Button className={buttonClass} variant="outline" disabled>
        Solo per atleti
      </Button>
    );
  }

  return null;
}

export default PTProfilePage;
