import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Dumbbell, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// =====================================================
// REUSABLE WORKOUT HISTORY LIST
// Used by PT athlete detail ("Storico" tab) and athlete PWA.
// variant='pt'     → teal accents, dashboard card style
// variant='atleta' → lime (#D4FF00) accents, dark app style
// =====================================================

export interface WorkoutHistoryListProps {
  atletaUserId: string;
  ptUserId?: string;
  variant?: 'pt' | 'atleta';
}

type WorkoutExercise = {
  id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  prescribed_weight: number | null;
  exercises: { name: string } | null;
};

type Workout = {
  id: string;
  title: string;
  completed_at: string | null;
  created_at: string;
  athlete_reordered_at?: string | null;
  workout_exercises: WorkoutExercise[];
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

function repsLabel(min: number | null, max: number | null): string {
  if (min != null && max != null && max !== min) return `${min}–${max}`;
  return `${min ?? max ?? '–'}`;
}

function prescribedSummary(ex: WorkoutExercise): string {
  const reps = repsLabel(ex.prescribed_reps_min, ex.prescribed_reps_max);
  const base = `${ex.prescribed_sets}×${reps}`;
  return ex.prescribed_weight != null ? `${base} @ ${ex.prescribed_weight} kg` : base;
}

// ---- per-set delta row ----
function SetRow({
  log,
  ex,
  variant,
}: {
  log: LogRow;
  ex: WorkoutExercise;
  variant: 'pt' | 'atleta';
}) {
  const ko = !log.is_completed;
  const isAtleta = variant === 'atleta';

  const prescribedReps = repsLabel(ex.prescribed_reps_min, ex.prescribed_reps_max);
  const hasPrescribed =
    ex.prescribed_reps_min != null ||
    ex.prescribed_reps_max != null ||
    ex.prescribed_weight != null;

  const prescribedStr = [
    prescribedReps !== '–' ? `${prescribedReps} reps` : null,
    ex.prescribed_weight != null ? `@ ${ex.prescribed_weight} kg` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const executedStr =
    [
      log.reps_completed != null ? `${log.reps_completed} reps` : null,
      log.weight_used != null ? `@ ${log.weight_used} kg` : null,
      log.duration_seconds != null && log.reps_completed == null
        ? `${log.duration_seconds}s`
        : null,
    ]
      .filter(Boolean)
      .join(' ') || '–';

  return (
    <div
      className={cn(
        'flex items-start gap-2 text-xs rounded px-2 py-1.5',
        ko
          ? 'bg-destructive/10 border border-destructive/30 text-destructive'
          : isAtleta
          ? 'bg-white/5'
          : 'bg-muted/50',
      )}
    >
      <span
        className={cn(
          'font-bold shrink-0 mt-0.5 w-5',
          isAtleta ? 'text-app-accent' : 'text-teal-600 dark:text-teal-400',
        )}
      >
        S{log.set_number}
      </span>

      <div className="flex-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 min-w-0">
        {hasPrescribed && (
          <>
            <span className={cn(isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground')}>
              Prescritto:
            </span>
            <span className="font-medium">{prescribedStr || '–'}</span>
            <span className={cn('mx-0.5', isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground')}>
              →
            </span>
          </>
        )}
        <span className={cn(isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground')}>
          Eseguito:
        </span>
        <span className={cn('font-medium', ko && 'text-destructive')}>{executedStr}</span>

        {log.rpe != null && (
          <Badge
            variant="outline"
            className={cn(
              'h-4 text-[10px] px-1.5 ml-1 shrink-0',
              isAtleta && 'border-app-accent/40 text-app-accent',
            )}
          >
            RPE {log.rpe}
          </Badge>
        )}
        {ko && <AlertTriangle className="h-3 w-3 ml-1 shrink-0 text-destructive" />}
      </div>
    </div>
  );
}

// ---- collapsible workout row ----
function WorkoutRow({ workout, variant }: { workout: Workout; variant: 'pt' | 'atleta' }) {
  const [open, setOpen] = useState(false);
  const exerciseIds = workout.workout_exercises.map((e) => e.id);
  const isAtleta = variant === 'atleta';

  const { data: logs = [] } = useQuery({
    queryKey: ['workout-history-logs', workout.id],
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
      <div
        className={cn(
          isAtleta
            ? 'rounded-xl border border-app-border bg-app-muted'
            : 'rounded-lg border bg-card',
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between p-3 transition-colors text-left rounded-xl',
              isAtleta ? 'hover:bg-white/5' : 'hover:bg-accent/50',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  isAtleta ? 'bg-white/10' : 'bg-muted',
                )}
              >
                <Dumbbell
                  className={cn(
                    'h-4 w-4',
                    isAtleta ? 'text-app-accent' : 'text-teal-600 dark:text-teal-400',
                  )}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'font-medium truncate',
                    isAtleta ? 'text-app-foreground' : '',
                  )}
                >
                  {workout.title}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground',
                  )}
                >
                  {dateLabel} · {workout.workout_exercises.length} esercizi
                </p>
                {workout.athlete_reordered_at && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-1 h-5 text-[10px]',
                      isAtleta && 'border-app-accent/40 text-app-accent',
                    )}
                  >
                    Ordine modificato dall&apos;atleta
                  </Badge>
                )}
              </div>
            </div>
            {open ? (
              <ChevronUp
                className={cn('h-4 w-4 shrink-0', isAtleta ? 'text-app-muted-foreground' : '')}
              />
            ) : (
              <ChevronDown
                className={cn('h-4 w-4 shrink-0', isAtleta ? 'text-app-muted-foreground' : '')}
              />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            className={cn(
              'px-3 pb-3 space-y-3 border-t pt-3',
              isAtleta ? 'border-app-border' : '',
            )}
          >
            {workout.workout_exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map((ex) => {
                const exLogs = (logsByExercise[ex.id] || []).sort(
                  (a, b) => a.set_number - b.set_number,
                );
                return (
                  <div key={ex.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isAtleta ? 'text-app-foreground' : '',
                        )}
                      >
                        {ex.exercises?.name ?? 'Esercizio'}
                      </p>
                      <span
                        className={cn(
                          'text-xs shrink-0',
                          isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {prescribedSummary(ex)}
                      </span>
                    </div>
                    {exLogs.length === 0 ? (
                      <p
                        className={cn(
                          'text-xs italic',
                          isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground',
                        )}
                      >
                        Nessun log registrato
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {exLogs.map((log) => (
                          <SetRow key={log.id} log={log} ex={ex} variant={variant} />
                        ))}
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

// ---- main export ----
export function WorkoutHistoryList({
  atletaUserId,
  ptUserId,
  variant = 'pt',
}: WorkoutHistoryListProps) {
  const qc = useQueryClient();
  const queryKey = ['workout-history', atletaUserId, ptUserId ?? 'self'];
  const { data: workouts = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('workouts')
        .select(
          `id, title, completed_at, created_at, athlete_reordered_at,
          workout_exercises (
            id, order_index, prescribed_sets,
            prescribed_reps_min, prescribed_reps_max, prescribed_weight,
            exercises:exercise_id (name)
          )`,
        )
        .eq('atleta_user_id', atletaUserId)
        .eq('status', 'completato');

      if (ptUserId) {
        q = q.eq('pt_user_id', ptUserId);
      }

      const { data, error } = await q
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Workout[];
    },
    enabled: !!atletaUserId,
  });

  // Realtime: sincronizza storico PT ↔ atleta su qualsiasi modifica del workout dell'atleta
  useEffect(() => {
    if (!atletaUserId) return;
    const channel = supabase
      .channel(`workout-history-${atletaUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workouts', filter: `atleta_user_id=eq.${atletaUserId}` },
        () => qc.invalidateQueries({ queryKey }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_logs' },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [atletaUserId, ptUserId, qc]);

  const isAtleta = variant === 'atleta';

  if (isLoading) {
    return (
      <p
        className={cn(
          'text-sm py-8 text-center',
          isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground',
        )}
      >
        Caricamento…
      </p>
    );
  }

  if (workouts.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-12',
          isAtleta ? 'text-app-muted-foreground' : 'text-muted-foreground',
        )}
      >
        <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nessun allenamento completato</p>
        <p className="text-xs mt-1 opacity-60">
          Completa il tuo primo workout per vedere lo storico
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workouts.map((w) => (
        <WorkoutRow key={w.id} workout={w} variant={variant} />
      ))}
    </div>
  );
}

export default WorkoutHistoryList;
