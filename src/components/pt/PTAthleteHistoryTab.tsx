import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Dumbbell, History, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// PT ATHLETE HISTORY TAB
// Lista degli allenamenti completati con dettaglio log per serie.
// Evidenzia in rosso le serie marcate non completate (proxy "ko").
// =====================================================

interface Props {
  atletaUserId: string;
  ptUserId: string;
}

type Workout = {
  id: string;
  title: string;
  completed_at: string | null;
  created_at: string;
  workout_exercises: Array<{
    id: string;
    order_index: number;
    prescribed_sets: number;
    prescribed_reps_min: number | null;
    prescribed_reps_max: number | null;
    prescribed_weight: number | null;
    exercises: { name: string } | null;
  }>;
};

type LogRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  is_completed: boolean;
  notes: string | null;
};

function formatReps(min: number | null, max: number | null): string {
  if (min != null && max != null && max !== min) return `${min}-${max}`;
  return `${min ?? max ?? '-'}`;
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const [open, setOpen] = useState(false);
  const exerciseIds = workout.workout_exercises.map((e) => e.id);

  const { data: logs = [] } = useQuery({
    queryKey: ['pt-history-logs', workout.id],
    queryFn: async () => {
      if (exerciseIds.length === 0) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exerciseIds);
      if (error) throw error;
      return (data || []) as LogRow[];
    },
    enabled: open,
  });

  const logsByExercise = logs.reduce<Record<string, LogRow[]>>((acc, l) => {
    (acc[l.workout_exercise_id] ||= []).push(l);
    return acc;
  }, {});

  const dateLabel = workout.completed_at
    ? format(new Date(workout.completed_at), 'dd MMM yyyy', { locale: it })
    : format(new Date(workout.created_at), 'dd MMM yyyy', { locale: it });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{workout.title}</p>
                <p className="text-xs text-muted-foreground">
                  {dateLabel} · {workout.workout_exercises.length} esercizi
                </p>
              </div>
            </div>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            {workout.workout_exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map((ex) => {
                const exLogs = (logsByExercise[ex.id] || []).sort(
                  (a, b) => a.set_number - b.set_number,
                );
                const prescribedReps = formatReps(ex.prescribed_reps_min, ex.prescribed_reps_max);
                return (
                  <div key={ex.id} className="space-y-1.5">
                    <p className="text-sm font-medium">{ex.exercises?.name ?? 'Esercizio'}</p>
                    {exLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Nessun log registrato
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {exLogs.map((log) => {
                          const ko = !log.is_completed;
                          const repsDelta =
                            log.reps_completed != null &&
                            ((ex.prescribed_reps_min != null &&
                              log.reps_completed < ex.prescribed_reps_min) ||
                              (ex.prescribed_reps_max != null &&
                                log.reps_completed > ex.prescribed_reps_max));
                          const weightDelta =
                            log.weight_used != null &&
                            ex.prescribed_weight != null &&
                            Number(log.weight_used) !== Number(ex.prescribed_weight);
                          return (
                            <div
                              key={log.id}
                              className={cn(
                                'flex items-center justify-between text-xs rounded px-2 py-1.5',
                                ko
                                  ? 'bg-destructive/10 text-destructive border border-destructive/30'
                                  : 'bg-muted/50',
                              )}
                            >
                              <span className="font-medium">Serie {log.set_number}</span>
                              <div className="flex items-center gap-3 flex-wrap justify-end">
                                <span className={cn(repsDelta && 'font-semibold')}>
                                  {log.reps_completed ?? '-'} reps
                                  {repsDelta && (
                                    <span className="text-muted-foreground ml-1">
                                      (prev. {prescribedReps})
                                    </span>
                                  )}
                                </span>
                                {(log.weight_used != null || ex.prescribed_weight != null) && (
                                  <span className={cn(weightDelta && 'font-semibold')}>
                                    {log.weight_used ?? '-'} kg
                                    {weightDelta && (
                                      <span className="text-muted-foreground ml-1">
                                        (prev. {ex.prescribed_weight} kg)
                                      </span>
                                    )}
                                  </span>
                                )}
                                {log.rpe != null && (
                                  <Badge variant="outline" className="h-5 text-[10px]">
                                    RPE {log.rpe}
                                  </Badge>
                                )}
                                {ko && (
                                  <span className="flex items-center gap-1 font-semibold">
                                    <AlertTriangle className="h-3 w-3" /> KO
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function PTAthleteHistoryTab({ atletaUserId, ptUserId }: Props) {
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['pt-athlete-history', atletaUserId, ptUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, completed_at, created_at,
          workout_exercises (
            id, order_index, prescribed_sets,
            prescribed_reps_min, prescribed_reps_max, prescribed_weight,
            exercises:exercise_id (name)
          )
        `)
        .eq('atleta_user_id', atletaUserId)
        .eq('pt_user_id', ptUserId)
        .eq('status', 'completato')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Workout[];
    },
  });

  return (
    <SectionCard
      title="Storico allenamenti"
      subtitle="Tutti gli allenamenti completati con il dettaglio per serie"
      icon={History}
      iconColor="primary"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Caricamento…</p>
      ) : workouts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nessun allenamento completato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default PTAthleteHistoryTab;
