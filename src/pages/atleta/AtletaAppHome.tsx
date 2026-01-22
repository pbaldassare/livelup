import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Dumbbell, TrendingUp, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// =====================================================
// ATLETA APP HOME - Shell (Mobile/PWA)
// Solo per ruolo: atleta
// =====================================================

export function AtletaAppHome() {
  const { user } = useAuth();

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Welcome header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground">Ciao,</p>
        <h1 className="text-2xl font-bold">Atleta</h1>
      </div>

      {/* Connection status card */}
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

      {/* Today's workout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Allenamento di oggi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Shell - Workout da implementare
          </div>
        </CardContent>
      </Card>

      {/* Progress summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            I tuoi progressi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Shell - Grafici progressi da implementare
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Azioni rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Inizia Workout</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Calendario</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prossimi allenamenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Shell - Programma settimanale da implementare
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AtletaAppHome;
