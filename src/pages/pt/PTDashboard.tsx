import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Dumbbell, Calendar, CreditCard } from 'lucide-react';

// =====================================================
// PT DASHBOARD - Shell
// Solo per ruolo: pt (web dashboard)
// =====================================================

export function PTDashboard() {
  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Personal Trainer</h2>
        <p className="text-muted-foreground">
          Gestisci i tuoi atleti, allenamenti e appuntamenti
        </p>
      </div>

      {/* Stats grid - Shell */}
      <div className="dashboard-grid">
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">I Miei Atleti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Shell - Dati da implementare
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Allenamenti Creati</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Programmi attivi
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Appuntamenti Oggi</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Sessioni programmate
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entrate Mese</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ --</div>
            <p className="text-xs text-muted-foreground">
              Pagamenti ricevuti
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Richieste di collegamento</CardTitle>
            <CardDescription>
              Atleti che vogliono allenarsi con te
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Shell - Lista richieste da implementare
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimi appuntamenti</CardTitle>
            <CardDescription>
              Le tue sessioni di oggi e domani
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Shell - Calendario da implementare
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PTDashboard;
