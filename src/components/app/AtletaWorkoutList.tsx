import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import {
  Dumbbell,
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA WORKOUT LIST
// Tabs Programma / Completati + lista allenamenti.
// Riusato in AtletaWorkoutPage e sotto il calendario in
// AtletaProgrammaPage.
// =====================================================

const STATUS_CONFIG = {
  attivo: { label: 'Attivo', icon: PlayCircle },
  completato: { label: 'Completato', icon: CheckCircle2 },
  saltato: { label: 'Saltato', icon: Clock },
};

export function AtletaWorkoutList() {
  const { user } = useAuth();
  const { canAccessWorkouts } = useAtletaStatus();
  const [activeTab, setActiveTab] = useState('today');

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['atleta-workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          title,
          description,
          status,
          scheduled_date,
          due_date,
          completed_at,
          notes_pt,
          pt_user_id,
          workout_exercises (
            id,
            exercise_id,
            prescribed_sets,
            prescribed_reps_min,
            prescribed_reps_max,
            exercises:exercise_id (
              name,
              category
            )
          )
        `)
        .eq('atleta_user_id', user.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && canAccessWorkouts,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingWorkouts =
    workouts?.filter((w) => {
      if (!w.scheduled_date || w.status !== 'attivo') return false;
      const scheduled = new Date(w.scheduled_date);
      scheduled.setHours(0, 0, 0, 0);
      return scheduled.getTime() >= today.getTime();
    }) || [];

  const completedWorkouts = workouts?.filter((w) => w.status === 'completato') || [];

  if (!canAccessWorkouts) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full bg-app-muted border border-app-border">
        <TabsTrigger
          value="today"
          className="flex-1 text-app-muted-foreground data-[state=active]:bg-app-card data-[state=active]:text-app-foreground"
        >
          Programma
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className="flex-1 text-app-muted-foreground data-[state=active]:bg-app-card data-[state=active]:text-app-foreground"
        >
          Completati
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="mt-4 space-y-3">
        {isLoading ? (
          <ListSkeleton count={3} type="workout" />
        ) : upcomingWorkouts.length > 0 ? (
          upcomingWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))
        ) : (
          <Card className="border-dashed bg-app-card/50 border-app-border">
            <CardContent className="p-6 text-center">
              <Dumbbell className="h-8 w-8 mx-auto text-app-muted-foreground mb-2" />
              <p className="text-sm text-app-muted-foreground">
                Nessun allenamento programmato
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="completed" className="mt-4 space-y-3">
        {isLoading ? (
          <ListSkeleton count={3} type="workout" />
        ) : completedWorkouts.length > 0 ? (
          completedWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))
        ) : (
          <Card className="border-dashed bg-app-card/50 border-app-border">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-app-muted-foreground mb-2" />
              <p className="text-sm text-app-muted-foreground">
                Nessun allenamento completato
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

function WorkoutCard({ workout }: { workout: any }) {
  const statusConfig =
    STATUS_CONFIG[workout.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.attivo;
  const StatusIcon = statusConfig.icon;
  const isCompleted = workout.status === 'completato';

  return (
    <Link to={`/app/workout/${workout.id}`}>
      <Card className="bg-app-card border-app-border hover:bg-app-muted transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                isCompleted ? 'bg-success/20' : 'bg-app-accent/20',
              )}
            >
              <StatusIcon
                className={cn('h-5 w-5', isCompleted ? 'text-success' : 'text-app-accent')}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-app-foreground truncate">{workout.title}</h3>
                <ChevronRight className="h-5 w-5 text-app-muted-foreground flex-shrink-0" />
              </div>

              <div className="flex items-center gap-3 text-sm text-app-muted-foreground mt-1">
                {workout.scheduled_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(workout.scheduled_date), 'd MMM', { locale: it })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {workout.workout_exercises?.length || 0} esercizi
                </span>
              </div>

              <Badge className="mt-2 text-xs bg-app-muted border-app-border text-app-muted-foreground">
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default AtletaWorkoutList;
