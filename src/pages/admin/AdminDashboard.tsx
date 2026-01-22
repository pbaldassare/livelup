import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCog, Activity, TrendingUp } from 'lucide-react';

// =====================================================
// ADMIN DASHBOARD - Shell
// Solo per ruolo: admin
// =====================================================

export function AdminDashboard() {
  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Amministratore</h2>
        <p className="text-muted-foreground">
          Panoramica del sistema e gestione piattaforma
        </p>
      </div>

      {/* Stats grid - Shell */}
      <div className="dashboard-grid">
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
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
            <CardTitle className="text-sm font-medium">Personal Trainers</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Attivi / In attesa
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atleti</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Collegati / Non collegati
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connessioni</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              PT-Atleta attive
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>PT in attesa di approvazione</CardTitle>
            <CardDescription>
              Nuove registrazioni da verificare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Shell - Lista da implementare
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attività recente</CardTitle>
            <CardDescription>
              Ultime azioni nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Shell - Audit log da implementare
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;
