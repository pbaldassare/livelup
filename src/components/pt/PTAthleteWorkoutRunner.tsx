import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GuidedWorkoutFlow, type GWExercise } from '@/components/app/GuidedWorkoutFlow';
import { Loader2, UserCheck, X } from 'lucide-react';
import { completeWorkout } from '@/lib/api/workouts';

export const STARTABLE_WORKOUT_STATUSES = ['attivo', 'in_sospeso', 'in_corso'] as const;

export function isWorkoutStartable(status: string): boolean {
  return (STARTABLE_WORKOUT_STATUSES as readonly string[]).includes(status);
}

interface PTAthleteWorkoutRunnerProps {
  workoutId: string;
  atletaUserId: string;
  atletaName: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export function PTAthleteWorkoutRunner({
  workoutId,
  atletaUserId,
  atletaName,
  onClose,
  onCompleted,
}: PTAthleteWorkoutRunnerProps) {
  const queryClient = useQueryClient();

  const { data: workout, isLoading, isError } = useQuery({
    queryKey: ['pt-athlete-workout-run', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, status, atleta_user_id, template_kind,
          workout_exercises (
            id, exercise_id, order_index, prescribed_sets,
            prescribed_reps_min, prescribed_reps_max, prescribed_weight,
            prescribed_duration_seconds, rest_seconds, notes,
            protocol_type, protocol_params, sets_data,
            exercises:exercise_id (name, category, video_url, image_url, instructions, muscle_groups)
          )
        `)
        .eq('id', workoutId)
        .eq('atleta_user_id', atletaUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workoutId && !!atletaUserId,
  });

  const { data: existingLogs } = useQuery({
    queryKey: ['pt-athlete-workout-run-logs', workoutId],
    queryFn: async () => {
      const exerciseIds = workout?.workout_exercises?.map((e: { id: string }) => e.id) || [];
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

  const completeWorkoutMutation = useMutation({
    mutationFn: () => completeWorkout(workoutId),
    onSuccess: () => {
      toast.success(`Sessione di ${atletaName} salvata 🎉`);
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workout-run'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-current-workout'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-history'] });
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout-history', atletaUserId] });
      onCompleted?.();
      onClose();
    },
    onError: (e: Error) => toast.error(e?.message || 'Errore nel salvare la sessione'),
  });

  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>({});
  const [startIdx, setStartIdx] = useState(0);
  const [startSet, setStartSet] = useState(1);

  useEffect(() => {
    const ex = (workout?.workout_exercises || []) as unknown as GWExercise[];
    if (!existingLogs || existingLogs.length === 0 || ex.length === 0) return;
    const restored: Record<string, number[]> = {};
    existingLogs.forEach((log: { is_completed: boolean; workout_exercise_id: string; set_number: number }) => {
      if (log.is_completed) {
        (restored[log.workout_exercise_id] ||= []).push(log.set_number);
      }
    });
    setCompletedSets(restored);
    const firstIncomplete = ex.findIndex((e) => {
      const c = restored[e.id]?.length || 0;
      return c < e.prescribed_sets;
    });
    if (firstIncomplete >= 0) {
      setStartIdx(firstIncomplete);
      const e = ex[firstIncomplete];
      const cs = restored[e.id] || [];
      const next =
        Array.from({ length: e.prescribed_sets }, (_, i) => i + 1).find((s) => !cs.includes(s)) || 1;
      setStartSet(next);
    }
  }, [existingLogs, workout?.workout_exercises]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !workout) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>Impossibile caricare l&apos;allenamento.</p>
        <Button variant="link" onClick={onClose}>
          Chiudi
        </Button>
      </div>
    );
  }

  const exercises = ((workout.workout_exercises || []) as unknown as GWExercise[]).sort(
    (a, b) => a.order_index - b.order_index,
  );

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-lg border border-app-accent/40 bg-app-accent/10 p-3 flex items-start gap-3">
        <UserCheck className="h-5 w-5 text-app-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold truncate">{workout.title}</p>
          <p className="text-muted-foreground text-xs">
            Stai allenando <strong>{atletaName}</strong> · i dati vanno sul suo profilo
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="Chiudi">
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
          templateKind={(workout as { template_kind?: string }).template_kind}
          onCompleted={() => completeWorkoutMutation.mutate()}
        />
      </div>
    </div>
  );
}
