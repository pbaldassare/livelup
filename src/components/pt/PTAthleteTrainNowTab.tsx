import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/button';
import { GuidedWorkoutFlow, type GWExercise } from '@/components/app/GuidedWorkoutFlow';
import { Dumbbell, Play, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// =====================================================
// PT ATHLETE "ALLENA ORA" TAB
// Lancia la sessione guidata in modalità "PT on-behalf".
// I workout_logs vengono salvati sull'atleta tramite RPC.
// =====================================================

interface Props {
  atletaUserId: string;
  ptUserId: string;
  atletaName: string;
}

export function PTAthleteTrainNowTab({ atletaUserId, ptUserId, atletaName }: Props) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: workout, isLoading, refetch } = useQuery({
    queryKey: ['pt-athlete-current-workout', atletaUserId, ptUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date, created_at,
          workout_exercises (
            id, exercise_id, order_index, prescribed_sets,
            prescribed_reps_min, prescribed_reps_max, prescribed_weight,
            prescribed_duration_seconds, rest_seconds, notes,
            protocol_type, protocol_params, sets_data,
            exercises:exercise_id (name, category, video_url, image_url, instructions, muscle_groups)
          )
        `)
        .eq('atleta_user_id', atletaUserId)
        .eq('pt_user_id', ptUserId)
        .in('status', ['attivo', 'in_sospeso', 'in_corso'])
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingLogs } = useQuery({
    queryKey: ['pt-athlete-current-workout-logs', workout?.id],
    queryFn: async () => {
      const exerciseIds = workout?.workout_exercises?.map((e: any) => e.id) || [];
      if (exerciseIds.length === 0) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exerciseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workout?.id,
  });

  const completeWorkout = useMutation({
    mutationFn: async () => {
      if (!workout?.id) throw new Error('Workout mancante');
      const { error } = await supabase
        .from('workouts')
        .update({
          status: 'completato',
          completed_at: new Date().toISOString(),
        })
        .eq('id', workout.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Sessione di ${atletaName} salvata 🎉`);
      setRunning(false);
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-current-workout'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-history'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts'] });
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || 'Errore nel salvare la sessione'),
  });

  // Restore completed sets for resume
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>({});
  const [startIdx, setStartIdx] = useState(0);
  const [startSet, setStartSet] = useState(1);

  useEffect(() => {
    const ex = (workout?.workout_exercises || []) as any[];
    if (!existingLogs || existingLogs.length === 0 || ex.length === 0) return;
    const restored: Record<string, number[]> = {};
    existingLogs.forEach((log: any) => {
      if (log.is_completed) {
        (restored[log.workout_exercise_id] ||= []).push(log.set_number);
      }
    });
    setCompletedSets(restored);
    const firstIncomplete = ex.findIndex((e: any) => {
      const c = restored[e.id]?.length || 0;
      return c < e.prescribed_sets;
    });
    if (firstIncomplete >= 0) {
      setStartIdx(firstIncomplete);
      const e = ex[firstIncomplete];
      const cs = restored[e.id] || [];
      const next = Array.from({ length: e.prescribed_sets }, (_, i) => i + 1).find(
        (s) => !cs.includes(s),
      ) || 1;
      setStartSet(next);
    }
  }, [existingLogs, workout?.workout_exercises]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Caricamento…</p>;
  }

  if (!workout) {
    return (
      <SectionCard
        title="Allena ora"
        subtitle="Esegui una sessione in presenza per questo atleta"
        icon={Play}
        iconColor="primary"
      >
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nessun allenamento assegnato disponibile.</p>
          <p className="text-xs mt-1">Assegna un allenamento per poter avviare la sessione.</p>
        </div>
      </SectionCard>
    );
  }

  const exercises = ((workout.workout_exercises || []) as any[]).sort(
    (a, b) => a.order_index - b.order_index,
  ) as GWExercise[];

  if (running) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-app-accent/40 bg-app-accent/10 p-3 flex items-start gap-3">
          <UserCheck className="h-5 w-5 text-app-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Stai allenando {atletaName}</p>
            <p className="text-muted-foreground text-xs">
              I dati verranno salvati sul suo profilo.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setRunning(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="rounded-lg overflow-hidden border">
          <GuidedWorkoutFlow
            workoutId={workout.id}
            exercises={exercises}
            initialExerciseIndex={startIdx}
            initialSet={startSet}
            initialCompletedSets={completedSets}
            ptOnBehalfMode
            onCompleted={() => completeWorkout.mutate()}
          />
        </div>
      </div>
    );
  }

  return (
    <SectionCard
      title="Allena ora"
      subtitle="Esegui la sessione in presenza per questo atleta"
      icon={Play}
      iconColor="primary"
    >
      <div className="space-y-4">
        <div className="rounded-lg border p-4 bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{workout.title}</p>
              {workout.description && (
                <p className="text-sm text-muted-foreground mt-1">{workout.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {exercises.length} esercizi · stato: {workout.status}
                {workout.scheduled_date &&
                  ` · ${format(new Date(workout.scheduled_date), 'dd MMM yyyy', { locale: it })}`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-app-accent/40 bg-app-accent/10 p-3 text-sm flex items-start gap-2">
          <UserCheck className="h-4 w-4 mt-0.5 text-app-accent" />
          <span>
            Avviando la sessione, i log (ripetizioni, peso, durate) verranno salvati sul profilo di{' '}
            <strong>{atletaName}</strong> come se l'avesse eseguita lui stesso. Verranno aggiornati
            badge, streak e sessioni rimanenti.
          </span>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => setRunning(true)}
          disabled={exercises.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Avvia sessione
        </Button>
      </div>
    </SectionCard>
  );
}

export default PTAthleteTrainNowTab;
