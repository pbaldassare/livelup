import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { usePTAppStats } from '@/hooks/usePTAppStats';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Dumbbell, 
  MessageSquare, 
  Calendar,
  Bell,
  ChevronRight,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT APP HOME - Dashboard Mobile/PWA
// Solo per ruolo: pt (app)
// =====================================================

export function PTAppHome() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = usePTAppStats();

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

  // Fetch today's events
  const { data: todayEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['pt-today-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, event_type, atleta_user_id')
        .eq('pt_user_id', user.id)
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .eq('is_cancelled', false)
        .order('start_datetime', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch pending requests for alert
  const { data: pendingRequests } = useQuery({
    queryKey: ['pt-pending-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, atleta_user_id, created_at')
        .eq('pt_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Fetch profiles
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', req.atleta_user_id)
            .single();
          return { ...req, profile };
        })
      );

      return requestsWithProfiles;
    },
    enabled: !!user?.id,
  });

  const firstName = profile?.first_name || 'Coach';

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Welcome header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground">Ciao,</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
      </div>

      {/* Pending requests alert */}
      {pendingRequests && pendingRequests.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Nuove richieste</p>
                <p className="text-sm text-muted-foreground">
                  Hai {pendingRequests.length} richieste di connessione in attesa
                </p>
              </div>
              <Button size="sm" asChild>
                <Link to="/pt/app/athletes">Vedi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/pt/app/athletes">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.activeAthletes || 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Atleti</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/pt/app/calendar">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.todayEvents || 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Oggi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's schedule */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Appuntamenti di oggi</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pt/app/calendar">
                Tutti
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : todayEvents && todayEvents.length > 0 ? (
            <div className="space-y-2">
              {todayEvents.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.start_datetime), 'HH:mm', { locale: it })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              Nessun appuntamento per oggi
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Azioni rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/pt/app/workouts">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Schede</span>
                {stats?.pendingRequests ? (
                  <Badge variant="secondary" className="text-xs">
                    Gestisci via web
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          </Link>
          <Link to="/pt/app/chat">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors relative">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Messaggi</span>
                {stats?.unreadMessages ? (
                  <Badge variant="default" className="absolute -top-1 -right-1">
                    {stats.unreadMessages}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent messages placeholder - could expand later */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Messaggi recenti</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pt/app/chat">
                Tutti
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
            {stats?.unreadMessages 
              ? `${stats.unreadMessages} messaggi non letti`
              : 'Nessun messaggio recente'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PTAppHome;
