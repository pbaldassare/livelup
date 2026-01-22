import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dumbbell, 
  TrendingUp, 
  Search, 
  Calendar,
  Star,
  MessageSquare,
  Clock,
  ChevronRight,
  PlayCircle,
  Lock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// ATLETA APP HOME - Dashboard Mobile/PWA
// Solo per ruolo: atleta
// =====================================================

export function AtletaAppHome() {
  const { user } = useAuth();
  const { 
    status, 
    connection, 
    ptName, 
    isLoading: statusLoading,
    isConnected,
    hasPendingRequest,
    canAccessWorkouts 
  } = useAtletaStatus();

  // Fetch profile for name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch today's workout (if connected)
  const { data: todayWorkout, isLoading: workoutLoading } = useQuery({
    queryKey: ['atleta-today-workout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, description, status, scheduled_date')
        .eq('atleta_user_id', user.id)
        .eq('scheduled_date', today)
        .eq('status', 'attivo')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && isConnected,
  });

  // Fetch recent progress
  const { data: latestProgress } = useQuery({
    queryKey: ['atleta-latest-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('progress_tracking')
        .select('weight_kg, mood_level, energy_level, tracked_date')
        .eq('atleta_user_id', user.id)
        .order('tracked_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const firstName = profile?.first_name || 'Atleta';

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Welcome header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground">Ciao,</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
      </div>

      {/* Connection status card */}
      {statusLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isConnected && connection ? (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={connection.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {(connection.profiles?.first_name?.[0] || '') + (connection.profiles?.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Il tuo PT</p>
                <p className="font-semibold">{ptName}</p>
                {connection.pt_profiles?.rating_avg && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {connection.pt_profiles.rating_avg.toFixed(1)}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/chat`}>
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : hasPendingRequest ? (
        <Card className="bg-gradient-to-br from-muted to-muted/50 border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stato</p>
                  <p className="font-semibold">Richiesta in attesa</p>
                </div>
              </div>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stato</p>
                <p className="font-semibold">Non collegato a un PT</p>
              </div>
              <Button asChild size="sm">
                <Link to="/app/discover">
                  <Search className="mr-2 h-4 w-4" />
                  Trova PT
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's workout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Allenamento di oggi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canAccessWorkouts ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              <Lock className="h-4 w-4 mr-2" />
              Collegati con un PT per ricevere schede
            </div>
          ) : workoutLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : todayWorkout ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">{todayWorkout.title}</p>
                {todayWorkout.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {todayWorkout.description}
                  </p>
                )}
              </div>
              <Button className="w-full" asChild>
                <Link to={`/app/workout/${todayWorkout.id}`}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Inizia allenamento
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              Nessun allenamento per oggi
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              I tuoi progressi
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/progress">
                Vedi
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {latestProgress ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold">{latestProgress.weight_kg || '--'}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{latestProgress.mood_level || '--'}</p>
                <p className="text-xs text-muted-foreground">umore</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{latestProgress.energy_level || '--'}</p>
                <p className="text-xs text-muted-foreground">energia</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/progress">Registra il primo check-in</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Azioni rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to={canAccessWorkouts ? "/app/workout" : "/app/discover"}>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">
                  {canAccessWorkouts ? 'Workout' : 'Trova PT'}
                </span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/app/progress">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Progressi</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Upcoming workouts */}
      {canAccessWorkouts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Prossimi allenamenti</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/workout">
                  Tutti
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
              Visualizza il tuo programma
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AtletaAppHome;
