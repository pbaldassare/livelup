import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GridSkeleton } from '@/components/skeletons';
import { usePTStats } from '@/hooks/usePTStats';
import { KPICard, KPICardColored } from '@/components/dashboard/KPICard';
import { SectionCard, InfoSection } from '@/components/dashboard/SectionCard';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { PTAnalyticsCharts } from '@/components/dashboard/PTAnalyticsCharts';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Dumbbell, 
  Calendar, 
  CreditCard, 
  Clock, 
  MessageSquare, 
  ArrowRight, 
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  User,
  Copy,
  Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT DASHBOARD - Home con statistiche
// Design: KPI cards, sezioni con bordo colorato
// =====================================================

export function PTDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats, isLoading } = usePTStats();

  // Fetch profile for welcome message
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

  // Fetch pending connection requests
  const { data: pendingRequests } = useQuery({
    queryKey: ['pt-pending-requests-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_atleta_connections')
        .select('id, atleta_user_id, created_at')
        .eq('pt_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch profiles
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', req.atleta_user_id)
            .single();
          return { ...req, profile };
        })
      );

      return requestsWithProfiles;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['pt-upcoming-events-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, event_type')
        .eq('pt_user_id', user.id)
        .eq('is_cancelled', false)
        .gte('start_datetime', today)
        .order('start_datetime', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const firstName = profile?.first_name || 'Coach';

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <DashboardPageHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title={`Dashboard Personal Trainer`}
        subtitle={`Benvenuto, ${firstName} • ${user?.email}`}
        badges={
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {stats?.active_athletes || 0} atleti
            </Badge>
            {(stats?.pending_requests ?? 0) > 0 && (
              <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20">
                {stats?.pending_requests} richieste
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/pt/athletes">
                <Users className="h-4 w-4 mr-2" />
                Atleti
              </Link>
            </Button>
            <Button asChild>
              <Link to="/pt/workouts">
                <Dumbbell className="h-4 w-4 mr-2" />
                Nuovo Allenamento
              </Link>
            </Button>
          </div>
        }
      />

      {/* Primary KPI Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <GridSkeleton count={4} type="kpi" columns={4} />
        ) : (
          <>
            <KPICard
              title="I Miei Atleti"
              value={stats?.active_athletes ?? 0}
              subtitle="Atleti attivi"
              icon={Users}
              iconColor="primary"
              onClick={() => navigate('/pt/athletes')}
            />
            <KPICard
              title="Allenamenti Creati"
              value={stats?.total_workouts ?? 0}
              subtitle={`${stats?.completed_workouts ?? 0} completati`}
              icon={Dumbbell}
              iconColor="success"
            />
            <KPICard
              title="Appuntamenti"
              value={stats?.upcoming_events ?? 0}
              subtitle="Prossimi 7 giorni"
              icon={Calendar}
              iconColor="info"
              onClick={() => navigate('/pt/calendar')}
            />
            <KPICard
              title="Messaggi"
              value={stats?.unread_messages ?? 0}
              subtitle="Non letti"
              icon={MessageSquare}
              iconColor="warning"
              onClick={() => navigate('/pt/messages')}
            />
          </>
        )}
      </div>

      {/* Dashboard KPI Section */}
      <SectionCard
        title="Dashboard KPI"
        subtitle="Panoramica delle performance"
        icon={BarChart3}
        iconColor="primary"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICardColored
            title="Tasso Completamento"
            value={stats?.total_workouts ? `${Math.round((stats.completed_workouts / stats.total_workouts) * 100)}%` : '0%'}
            subtitle="Workout completati"
            icon={TrendingUp}
            color="blue"
          />
           <KPICardColored
            title="Richieste Pendenti"
            value={stats?.pending_requests ?? 0}
            subtitle="Da approvare"
            icon={Clock}
            color="yellow"
            onClick={() => navigate('/pt/athletes?tab=pending')}
          />
          <KPICardColored
            title="Crescita Atleti"
            value={`+${stats?.active_athletes ?? 0}`}
            subtitle="Atleti questo mese"
            icon={Users}
            color="green"
            onClick={() => navigate('/pt/athletes')}
          />
          <KPICardColored
            title="Atleti"
            value={stats?.active_athletes ?? 0}
            subtitle="Collegati"
            icon={CheckCircle2}
            color="purple"
            onClick={() => navigate('/pt/athletes')}
          />
        </div>
      </SectionCard>

      {/* Two columns section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Requests */}
        <InfoSection
          title="Richieste di collegamento"
          icon={AlertCircle}
          iconColor="yellow"
          action={
            pendingRequests && pendingRequests.length > 0 ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/pt/athletes">
                  Gestisci
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null
          }
        >
          {pendingRequests && pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div 
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {req.profile?.first_name} {req.profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {req.profile?.email}
                      </p>
                    </div>
                  </div>
                  <DashboardStatusBadge status="pending" size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Nessuna richiesta pendente</p>
            </div>
          )}
        </InfoSection>

        {/* Upcoming Events */}
        <InfoSection
          title="Prossimi appuntamenti"
          icon={Calendar}
          iconColor="blue"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/pt/calendar">
                Calendario
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info/10 text-info">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_datetime), "d MMM 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Nessun evento in programma</p>
            </div>
          )}
        </InfoSection>
      </div>

      {/* Referral Link Section */}
      <SectionCard
        title="Link di iscrizione"
        subtitle="Condividi questo link con i tuoi clienti per farli registrare e collegarsi direttamente a te"
        icon={Link2}
        iconColor="primary"
      >
        <div className="flex items-center gap-3">
          <Input
            readOnly
            value={`${window.location.origin}/auth?mode=signup&ref=${user?.id || ''}`}
            className="font-mono text-sm bg-muted"
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/auth?mode=signup&ref=${user?.id || ''}`);
              toast.success('Link copiato negli appunti!');
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copia
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Quando un atleta si registra con questo link, riceverai automaticamente una richiesta di collegamento.
        </p>
      </SectionCard>

      {/* Analytics Charts */}
      <PTAnalyticsCharts />

      {/* Quick Actions */}
      <SectionCard
        title="Azioni rapide"
        subtitle="Accedi velocemente alle funzionalità principali"
        icon={Dumbbell}
        iconColor="green"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 justify-start">
            <Link to="/pt/athletes">
              <Users className="h-5 w-5 text-primary" />
              <span>Gestisci Atleti</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 justify-start">
            <Link to="/pt/workouts">
              <Dumbbell className="h-5 w-5 text-success" />
              <span>Crea Allenamento</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 justify-start">
            <Link to="/pt/messages">
              <MessageSquare className="h-5 w-5 text-info" />
              <span>Messaggi</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 justify-start">
            <Link to="/pt/settings">
              <CreditCard className="h-5 w-5 text-warning" />
              <span>Profilo Pubblico</span>
            </Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

export default PTDashboard;
