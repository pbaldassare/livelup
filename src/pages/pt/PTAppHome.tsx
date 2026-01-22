import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users, Dumbbell, MessageSquare, Calendar } from 'lucide-react';

// =====================================================
// PT APP HOME - Shell (Mobile/PWA)
// Solo per ruolo: pt (app)
// =====================================================

export function PTAppHome() {
  const { user } = useAuth();

  return (
    <div className="p-4 space-y-6 animate-in">
      {/* Welcome header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground">Ciao,</p>
        <h1 className="text-2xl font-bold">Personal Trainer</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Atleti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Oggi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appuntamenti di oggi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Shell - Calendario da implementare
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
              <span className="text-sm font-medium">Nuovo Workout</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Messaggi</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent messages placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Messaggi recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Shell - Chat da implementare
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PTAppHome;
