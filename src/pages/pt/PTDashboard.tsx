import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Dumbbell, Calendar, CreditCard, Clock, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { usePTStats } from '@/hooks/usePTStats';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Link } from 'react-router-dom';

// =====================================================
// PT DASHBOARD - Home con statistiche reali
// Solo per ruolo: pt (web dashboard)
// =====================================================

export function PTDashboard() {
  const { data: stats, isLoading, error } = usePTStats();

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Personal Trainer</h2>
          <p className="text-muted-foreground">
            Gestisci i tuoi atleti, allenamenti e appuntamenti
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
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
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Errore nel caricamento delle statistiche</p>
          </CardContent>
        </Card>
      ) : (
        <div className="dashboard-grid">
          <StatsCard
            title="I Miei Atleti"
            value={stats?.active_athletes ?? 0}
            description={stats?.pending_requests ? `${stats.pending_requests} richieste pendenti` : 'Atleti attivi'}
            icon={Users}
          />

          <StatsCard
            title="Allenamenti Creati"
            value={stats?.total_workouts ?? 0}
            description={`${stats?.completed_workouts ?? 0} completati`}
            icon={Dumbbell}
          />

          <StatsCard
            title="Appuntamenti"
            value={stats?.upcoming_events ?? 0}
            description="Nei prossimi 7 giorni"
            icon={Calendar}
          />

          <StatsCard
            title="Messaggi"
            value={stats?.unread_messages ?? 0}
            description="Non letti"
            icon={MessageSquare}
          />
        </div>
      )}

      {/* Quick Actions and Requests */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Richieste di collegamento</CardTitle>
              <CardDescription>
                Atleti che vogliono allenarsi con te
              </CardDescription>
            </div>
            {stats?.pending_requests && stats.pending_requests > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning text-warning-foreground text-xs font-medium">
                {stats.pending_requests}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {stats?.pending_requests && stats.pending_requests > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Hai {stats.pending_requests} richieste in attesa di approvazione
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/pt/athletes">
                    Gestisci Richieste
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nessuna richiesta pendente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Prossimi appuntamenti</CardTitle>
              <CardDescription>
                Le tue sessioni in programma
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.upcoming_events && stats.upcoming_events > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Hai {stats.upcoming_events} eventi programmati questa settimana
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/pt/calendar">
                    Vedi Calendario
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nessun evento in programma</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni rapide</CardTitle>
          <CardDescription>Accedi velocemente alle funzionalità principali</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link to="/pt/athletes">
                <Users className="h-5 w-5" />
                <span>Gestisci Atleti</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link to="/pt/workouts">
                <Dumbbell className="h-5 w-5" />
                <span>Crea Allenamento</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link to="/pt/messages">
                <MessageSquare className="h-5 w-5" />
                <span>Messaggi</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link to="/pt/settings">
                <CreditCard className="h-5 w-5" />
                <span>Profilo Pubblico</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PTDashboard;
