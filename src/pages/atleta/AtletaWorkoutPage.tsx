import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AtletaWorkoutList } from '@/components/app/AtletaWorkoutList';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { 
  Lock,
  PlayCircle,
  Flame
} from 'lucide-react';

// =====================================================
// ATLETA WORKOUT PAGE - Allenamenti (Mobile)
// Dark theme with app-* design system
// =====================================================

export function AtletaWorkoutPage() {
  const { user } = useAuth();
  const { ptName, canAccessWorkouts } = useAtletaStatus();

  // Solo l'allenamento di oggi serve qui per l'highlight in cima
  const { data: todayWorkout } = useQuery({
    queryKey: ['atleta-today-workout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          title,
          description,
          status,
          scheduled_date,
          workout_exercises ( id )
        `)
        .eq('atleta_user_id', user.id)
        .eq('status', 'attivo')
        .gte('scheduled_date', start.toISOString().slice(0, 10))
        .lt('scheduled_date', end.toISOString().slice(0, 10))
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && canAccessWorkouts,
  });

  // Feature locked state
  if (!canAccessWorkouts) {
    return (
      <div className="p-4 space-y-6 bg-app-background min-h-screen">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-app-foreground">I miei allenamenti</h1>
        </div>

        <Card className="border-dashed bg-app-card border-app-border">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h3 className="font-semibold text-app-foreground mb-2">Funzione bloccata</h3>
            <p className="text-sm text-app-muted-foreground mb-4">
              Collegati con un Personal Trainer per ricevere schede di allenamento personalizzate
            </p>
            <Button className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90" asChild>
              <Link to="/app/discover">Trova un PT</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-4 bg-app-background min-h-screen" data-tour="workout-page">
      {/* Header */}
      <div className="p-4 space-y-1">
        <h1 className="text-2xl font-bold text-app-foreground">I miei allenamenti</h1>
        {ptName && (
          <p className="text-sm text-app-muted-foreground">
            Con {ptName}
          </p>
        )}
      </div>

      {/* Today's workout highlight */}
      {todayWorkout && (
        <div className="px-4 mb-4">
          <Card className="bg-app-accent/10 border-app-accent/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="gap-1 bg-app-accent text-app-accent-foreground border-0">
                  <Flame className="h-3 w-3" />
                  Oggi
                </Badge>
                <Badge className="bg-app-muted text-app-muted-foreground border-app-border">
                  {todayWorkout.workout_exercises?.length || 0} esercizi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <h2 className="text-lg font-bold text-app-foreground">{todayWorkout.title}</h2>
              {todayWorkout.description && (
                <p className="text-sm text-app-muted-foreground line-clamp-2">
                  {todayWorkout.description}
                </p>
              )}
              <Button className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90" asChild>
                <Link to={`/app/workout/${todayWorkout.id}`}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Inizia allenamento
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Programma / Completati + lista */}
      <div className="px-4">
        <AtletaWorkoutList />
      </div>
    </div>
  );
}

export default AtletaWorkoutPage;
