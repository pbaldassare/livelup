import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { PtCoachingPausedCard } from '@/components/app/PtCoachingPausedCard';
import { supabase } from '@/integrations/supabase/client';
import { completeWorkout } from '@/lib/api/workouts';
import { PhasedGuidedWorkout } from '@/components/app/PhasedGuidedWorkout';
import { isSummaryPhase } from '@/lib/pt/templateRoles';
import { AtletaExerciseDetailSheet } from '@/components/app/AtletaExerciseDetailSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  X,
  Play,
  Clock,
  Dumbbell,
  Trophy,
  Star,
  Timer,
  TrendingUp,
  CheckCircle2,
  Repeat,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,

} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatSetsTargetSummary,
  getSetTargetMode,
  resolveSetsData,
} from '@/lib/setsData';
import { toast } from 'sonner';
import { reorderWorkoutFreeExercises } from '@/lib/api/workouts';
import {
  TEMPLATE_KIND_BADGE_CLASS,
  TEMPLATE_KIND_DESCRIPTION,
  TEMPLATE_KIND_LABEL,
  canAthleteReorder,
  allowsAthleteReorder,
  normalizeTemplateKind,
  requiresFullCompletion,
} from '@/lib/pt/templateKinds';
import { ExportSheetPdfButton } from '@/components/shared/ExportSheetPdfButton';

// =====================================================
// ATLETA WORKOUT DETAIL PAGE - Workout execution
// With resume, RPE, and post-workout summary
// =====================================================

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min?: number;
  prescribed_reps_max?: number;
  prescribed_duration_seconds?: number | null;
  prescribed_weight?: number;
  rest_seconds?: number;
  notes?: string;
  block_id?: string | null;
  sets_data?: unknown;
  protocol_type?: string | null;
  protocol_params?: unknown;
  exercises?: {
    name: string;
    category: string;
    video_url?: string;
    image_url?: string;
    instructions?: string;
    muscle_groups?: string[];
  } | null;
}

interface WorkoutBlock {
  id: string;
  order_index: number;
  type: string;
  name: string | null;
  params: any;
}

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

// (variants extra rimossi: la vista attiva è gestita da GuidedWorkoutFlow)

export function AtletaWorkoutDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseDirection, setExerciseDirection] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderList, setReorderList] = useState<WorkoutExercise[]>([]);
  const [workoutRating, setWorkoutRating] = useState(0);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [totalSetsCompleted, setTotalSetsCompleted] = useState(0);

  // Detail sheet state
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmMarkOpen, setConfirmMarkOpen] = useState(false);
  const [pendingMarkExercise, setPendingMarkExercise] = useState<WorkoutExercise | null>(null);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  /** After intentional exit, stay on detail (don't auto-reenter guided flow). */
  const [skipAutoStart, setSkipAutoStart] = useState(false);


  const { isCoachingPaused, ptName } = useAtletaStatus();

  // Fetch workout with exercises + blocks

  const { data: workout, isLoading, isError, error } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      if (!workoutId) return null;
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date, notes_pt, pt_user_id,
          template_kind, athlete_reordered_at,
          workout_blocks (id, order_index, type, name, params),
          workout_exercises (
            id, exercise_id, order_index, prescribed_sets,
            prescribed_reps_min, prescribed_reps_max, prescribed_weight,
            prescribed_duration_seconds, rest_seconds, notes, block_id,
            protocol_type, protocol_params, sets_data, phase,
            exercises:exercise_id (name, category, video_url, image_url, instructions, muscle_groups)
          )
        `)
        .eq('id', workoutId)
        .single();
      if (error) {
        // Fallback se colonna phase non ancora migrata
        if (/phase|42703|PGRST204|schema cache/i.test(error.message)) {
          const { data: legacy, error: legacyErr } = await supabase
            .from('workouts')
            .select(`
              id, title, description, status, scheduled_date, notes_pt, pt_user_id,
              template_kind, athlete_reordered_at,
              workout_blocks (id, order_index, type, name, params),
              workout_exercises (
                id, exercise_id, order_index, prescribed_sets,
                prescribed_reps_min, prescribed_reps_max, prescribed_weight,
                prescribed_duration_seconds, rest_seconds, notes, block_id,
                protocol_type, protocol_params, sets_data,
                exercises:exercise_id (name, category, video_url, image_url, instructions, muscle_groups)
              )
            `)
            .eq('id', workoutId)
            .single();
          if (legacyErr) throw legacyErr;
          const sortedEx = legacy.workout_exercises?.sort(
            (a: any, b: any) => a.order_index - b.order_index,
          );
          const sortedBl = (legacy.workout_blocks || []).sort(
            (a: any, b: any) => a.order_index - b.order_index,
          );
          return { ...legacy, workout_exercises: sortedEx, workout_blocks: sortedBl };
        }
        throw error;
      }
      const sortedExercises = data.workout_exercises?.sort(
        (a: any, b: any) => a.order_index - b.order_index
      );
      const sortedBlocks = (data.workout_blocks || []).sort(
        (a: any, b: any) => a.order_index - b.order_index
      );
      return { ...data, workout_exercises: sortedExercises, workout_blocks: sortedBlocks };
    },
    enabled: !!workoutId,
  });

  // Fetch existing logs for resume
  const { data: existingLogs, isFetched: logsFetched } = useQuery({
    queryKey: ['workout-logs', workoutId],
    queryFn: async () => {
      if (!workoutId) return [];
      const exerciseIds = workout?.workout_exercises?.map((e: any) => e.id) || [];
      if (exerciseIds.length === 0) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exerciseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workoutId && !!workout,
  });

  // Reorder mutation (solo per schede 'libera')
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!workoutId) throw new Error('Workout id mancante');
      const { error } = await supabase.rpc('atleta_reorder_workout_exercises', {
        _workout_id: workoutId,
        _ordered_exercise_ids: orderedIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ordine aggiornato');
      queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
      setReorderOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Errore riordino'),
  });

  // Pre-populate completed sets and stats from existing logs
  useEffect(() => {
    const wExercises = workout?.workout_exercises || [];
    if (existingLogs && existingLogs.length > 0 && wExercises.length > 0) {
      const restored: Record<string, number[]> = {};
      let resumedVolume = 0;
      let resumedReps = 0;
      let resumedSets = 0;

      const mainIds = new Set(
        wExercises
          .filter((e: any) => isSummaryPhase(e.phase))
          .map((e: any) => e.id as string),
      );
      existingLogs.forEach((log) => {
        if (log.is_completed) {
          if (!restored[log.workout_exercise_id]) {
            restored[log.workout_exercise_id] = [];
          }
          restored[log.workout_exercise_id].push(log.set_number);
          if (mainIds.has(log.workout_exercise_id)) {
            resumedSets++;
            resumedReps += log.reps_completed || 0;
            resumedVolume += (log.reps_completed || 0) * (Number(log.weight_used) || 0);
          }
        }
      });
      setCompletedSets(restored);
      setTotalVolume(resumedVolume);
      setTotalReps(resumedReps);
      setTotalSetsCompleted(resumedSets);

      // Auto-skip to first incomplete exercise
      const firstIncompleteIdx = wExercises.findIndex((ex: any) => {
        const completedCount = restored[ex.id]?.length || 0;
        return completedCount < ex.prescribed_sets;
      });
      if (firstIncompleteIdx >= 0) {
        setCurrentExerciseIndex(firstIncompleteIdx);
        const ex = wExercises[firstIncompleteIdx] as any;
        const completedForEx = restored[ex.id] || [];
        const firstIncompleteSet = Array.from({ length: ex.prescribed_sets }, (_, i) => i + 1)
          .find((s: number) => !completedForEx.includes(s)) || 1;
        setCurrentSet(firstIncompleteSet);
      }
    }
  }, [existingLogs, workout?.workout_exercises]);

  // Auto-avvia il flow se l'allenamento è già in corso (es. da Home "Continua")
  useEffect(() => {
    if (!workout || isLoading || isWorkoutStarted || !logsFetched || skipAutoStart) return;
    if (workout.status === 'in_corso' || workout.status === 'in_sospeso') {
      setIsWorkoutStarted(true);
    }
  }, [workout, isLoading, isWorkoutStarted, logsFetched, skipAutoStart]);


  // Fetch PT profile for coach avatar
  const { data: ptProfile } = useQuery({
    queryKey: ['pt-profile', workout?.pt_user_id],
    queryFn: async () => {
      if (!workout?.pt_user_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', workout.pt_user_id)
        .single();
      return data;
    },
    enabled: !!workout?.pt_user_id,
  });

  // Complete workout mutation — salva anche riepilogo sessione (PT + atleta)
  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!workoutId) throw new Error('Workout ID mancante');
      await completeWorkout(workoutId, {
        rating: workoutRating || undefined,
        notesAtleta: workoutNotes || undefined,
        durationSeconds: elapsedTime,
        // fallback UI se i log non sono ancora leggibili
        setsCompleted: totalSetsCompleted,
        repsTotal: totalReps,
        volumeKg: totalVolume,
        recomputeFromLogs: true,
      });
    },
    onSuccess: () => {
      toast.success('Allenamento completato! 🎉');
      queryClient.invalidateQueries({ queryKey: ['atleta-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout-history'] });
      navigate('/app/workout');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Log set mutation
  const logSetMutation = useMutation({
    mutationFn: async (data: {
      workoutExerciseId: string;
      setNumber: number;
      repsCompleted: number;
      weightUsed?: number;
      rpe?: number;
    }) => {
      // Upsert: delete existing log for this set then insert
      await supabase
        .from('workout_logs')
        .delete()
        .eq('workout_exercise_id', data.workoutExerciseId)
        .eq('set_number', data.setNumber);

      const { error } = await supabase
        .from('workout_logs')
        .insert({
          workout_exercise_id: data.workoutExerciseId,
          set_number: data.setNumber,
          reps_completed: data.repsCompleted,
          weight_used: data.weightUsed,
          rpe: data.rpe,
          is_completed: true,
        });
      if (error) throw error;
    },
  });

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isWorkoutStarted && !isResting && !showSummary) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isWorkoutStarted, isResting, showSummary]);

  const exercises = workout?.workout_exercises || [];
  const currentExercise = exercises[currentExerciseIndex] as WorkoutExercise | undefined;
  const totalExercises = exercises.length;
  const workoutProgress = totalExercises > 0 
    ? ((currentExerciseIndex + 1) / totalExercises) * 100 
    : 0;

  const templateKind = normalizeTemplateKind((workout as any)?.template_kind);
  const hasCompletedLogs = !!(existingLogs && existingLogs.some((l) => l.is_completed));
  const canReorder =
    allowsAthleteReorder(templateKind) &&
    workout?.status === 'attivo' &&
    !hasCompletedLogs &&
    !isWorkoutStarted;

  const freeExerciseIds = useMemo(
    () =>
      (exercises as WorkoutExercise[])
        .filter((e) => !e.block_id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((e) => e.id),
    [exercises],
  );

  const reorderFreeMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!workoutId) throw new Error('Workout mancante');
      await reorderWorkoutFreeExercises(workoutId, orderedIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
      toast.success('Ordine aggiornato');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Impossibile riordinare');
    },
  });

  const moveFreeExercise = (exerciseId: string, direction: -1 | 1) => {
    const idx = freeExerciseIds.indexOf(exerciseId);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= freeExerciseIds.length) return;
    const nextOrder = [...freeExerciseIds];
    [nextOrder[idx], nextOrder[next]] = [nextOrder[next], nextOrder[idx]];
    reorderFreeMutation.mutate(nextOrder);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Handle set completion
  const handleSetComplete = (setNumber: number, reps: number, weight?: number, rpe?: number) => {
    if (!currentExercise) return;

    logSetMutation.mutate({
      workoutExerciseId: currentExercise.id,
      setNumber,
      repsCompleted: reps,
      weightUsed: weight,
      rpe,
    });

    // Track stats
    setTotalReps(prev => prev + reps);
    setTotalVolume(prev => prev + (reps * (weight || 0)));
    setTotalSetsCompleted(prev => prev + 1);

    setCompletedSets(prev => ({
      ...prev,
      [currentExercise.id]: [...(prev[currentExercise.id] || []), setNumber],
    }));

    if (setNumber >= currentExercise.prescribed_sets) {
      if (currentExerciseIndex < totalExercises - 1) {
        setIsResting(true);
        setShowTimer(true);
      } else {
        // All exercises done - show summary
        setShowSummary(true);
      }
    } else {
      setCurrentSet(setNumber + 1);
      setIsResting(true);
      setShowTimer(true);
    }
  };

  const handleRestComplete = () => {
    setIsResting(false);
    setShowTimer(false);
    if (currentExercise && (completedSets[currentExercise.id]?.length || 0) >= currentExercise.prescribed_sets) {
      if (currentExerciseIndex < totalExercises - 1) {
        setExerciseDirection(1);
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
      }
    }
  };

  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setExerciseDirection(-1);
      setCurrentExerciseIndex(prev => prev - 1);
      setCurrentSet(1);
    }
  };

  // ===== Status helper for exercise list =====
  const getExerciseStatus = (
    ex: WorkoutExercise,
    logCount: number
  ): 'not_started' | 'in_progress' | 'completed' => {
    if (logCount <= 0) return 'not_started';
    if (logCount < ex.prescribed_sets) return 'in_progress';
    return 'completed';
  };

  // ===== Start exercise from sheet =====
  const handleStartFromSheet = async (ex: WorkoutExercise) => {
    const idx = exercises.findIndex((e: any) => e.id === ex.id);
    if (idx < 0) return;

    // Progressiva: non puoi saltare avanti — solo il primo esercizio incompleto in ordine
    if (requiresFullCompletion(templateKind)) {
      const firstIncompleteIdx = (exercises as WorkoutExercise[]).findIndex((e) => {
        const done = completedSets[e.id]?.length || 0;
        return done < e.prescribed_sets;
      });
      if (firstIncompleteIdx >= 0 && idx > firstIncompleteIdx) {
        toast.error(
          'Scheda progressiva: completa prima l\'esercizio (o blocco) precedente al 100%',
        );
        return;
      }
    }

    setCurrentExerciseIndex(idx);

    const completedForEx = completedSets[ex.id] || [];
    const firstIncomplete =
      Array.from({ length: ex.prescribed_sets }, (_, i) => i + 1).find(
        (s) => !completedForEx.includes(s)
      ) || 1;
    setCurrentSet(firstIncomplete);

    if (!isWorkoutStarted) {
      setSkipAutoStart(false);
      setIsWorkoutStarted(true);
      if (workoutId && workout?.status !== 'in_corso') {
        await supabase
          .from('workouts')
          .update({ status: 'in_corso' as any })
          .eq('id', workoutId)
          .in('status', ['attivo', 'in_sospeso']);
        queryClient.invalidateQueries({ queryKey: ['atleta-focus-workout'] });
      }
    }

    setSheetOpen(false);
  };

  // ===== Exit guided workout (pause, don't complete) =====
  const handleConfirmExitWorkout = async () => {
    setExitDialogOpen(false);
    setSkipAutoStart(true);
    setIsWorkoutStarted(false);
    // Sospende senza completare: i log già salvati restano e si può riprendere
    if (workoutId && workout?.status === 'in_corso') {
      await supabase
        .from('workouts')
        .update({ status: 'in_sospeso' as any })
        .eq('id', workoutId)
        .eq('status', 'in_corso');
      queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workout-logs', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['atleta-focus-workout'] });
    }
  };

  // ===== Mark exercise as completed (logs only missing sets) =====

  const performMarkAllCompleted = async (ex: WorkoutExercise) => {
    const completedForEx = completedSets[ex.id] || [];
    const missing = Array.from({ length: ex.prescribed_sets }, (_, i) => i + 1).filter(
      (s) => !completedForEx.includes(s)
    );

    if (missing.length === 0) {
      setSheetOpen(false);
      return;
    }

    const reps = ex.prescribed_reps_min ?? ex.prescribed_reps_max ?? 0;
    const weight = ex.prescribed_weight ?? undefined;

    try {
      for (const s of missing) {
        await logSetMutation.mutateAsync({
          workoutExerciseId: ex.id,
          setNumber: s,
          repsCompleted: reps,
          weightUsed: weight,
        });
      }

      setCompletedSets((prev) => ({
        ...prev,
        [ex.id]: [...(prev[ex.id] || []), ...missing].sort((a, b) => a - b),
      }));
      setTotalSetsCompleted((prev) => prev + missing.length);
      setTotalReps((prev) => prev + reps * missing.length);
      setTotalVolume((prev) => prev + reps * (weight || 0) * missing.length);

      queryClient.invalidateQueries({ queryKey: ['workout-logs', workoutId] });
      toast.success('Esercizio completato');
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Errore nel salvare i set');
    }
  };

  const handleMarkAllCompleted = async (ex: WorkoutExercise) => {
    if (requiresFullCompletion(templateKind)) {
      toast.error(
        'Scheda progressiva: completa le serie nel flusso allenamento con le reps prescritte',
      );
      return;
    }
    const logCount = completedSets[ex.id]?.length || 0;
    const status = getExerciseStatus(ex, logCount);
    if (status === 'completed') return;
    if (status === 'not_started') {
      // Confirmation required
      setPendingMarkExercise(ex);
      setConfirmMarkOpen(true);
      return;
    }
    await performMarkAllCompleted(ex);
  };

  const setsData = useMemo(() => {
    if (!currentExercise) return [];
    const exerciseCompletedSets = completedSets[currentExercise.id] || [];
    const repsDisplay = currentExercise.prescribed_reps_max
      ? `${currentExercise.prescribed_reps_min}-${currentExercise.prescribed_reps_max}`
      : `${currentExercise.prescribed_reps_min || 10}`;
    return Array.from({ length: currentExercise.prescribed_sets }, (_, i) => ({
      setNumber: i + 1,
      prescribedReps: repsDisplay,
      prescribedWeight: currentExercise.prescribed_weight || undefined,
      isCompleted: exerciseCompletedSets.includes(i + 1),
    }));
  }, [currentExercise, completedSets]);

  if (isCoachingPaused) {
    return (
      <div className="min-h-screen bg-app-background p-4 pt-10">
        <PtCoachingPausedCard ptName={ptName} />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-app-background p-4">
        <div className="text-center pt-20">
          <Dumbbell className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-app-foreground mb-2">Errore caricamento</h2>
          <p className="text-sm text-app-muted-foreground mb-4">
            {(error as Error)?.message || 'Impossibile caricare l\'allenamento.'}
          </p>
          <Button onClick={() => navigate('/app')} className="bg-app-accent text-app-accent-foreground">
            Torna alla Home
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!workout) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-app-background p-4">
        <div className="text-center pt-20">
          <Dumbbell className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-app-foreground mb-2">Workout non trovato</h2>
          <Button onClick={() => navigate('/app/workout')} className="bg-app-accent text-app-accent-foreground">
            Torna ai workout
          </Button>
        </div>
      </motion.div>
    );
  }

  // Post-workout summary screen
  if (showSummary) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-app-background flex flex-col"
      >
        <div className="flex-1 p-4 flex flex-col items-center justify-center space-y-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <Trophy className="h-20 w-20 text-app-accent mx-auto" />
          </motion.div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-app-foreground">Allenamento completato!</h1>
            <p className="text-app-muted-foreground">{workout.title}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-app-card border border-app-border rounded-xl p-4 text-center"
            >
              <Timer className="h-6 w-6 text-app-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-app-foreground">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-app-muted-foreground">Durata</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-app-card border border-app-border rounded-xl p-4 text-center"
            >
              <CheckCircle2 className="h-6 w-6 text-app-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-app-foreground">{totalSetsCompleted}</p>
              <p className="text-xs text-app-muted-foreground">Set completati</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-app-card border border-app-border rounded-xl p-4 text-center"
            >
              <TrendingUp className="h-6 w-6 text-app-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-app-foreground">{totalReps}</p>
              <p className="text-xs text-app-muted-foreground">Reps totali</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-app-card border border-app-border rounded-xl p-4 text-center"
            >
              <Dumbbell className="h-6 w-6 text-app-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-app-foreground">
                {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—'}
              </p>
              <p className="text-xs text-app-muted-foreground">Volume totale</p>
            </motion.div>
          </div>

          {/* Rating */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full max-w-sm space-y-3"
          >
            <p className="text-center text-app-foreground font-medium">Come valuti l'allenamento?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setWorkoutRating(star)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      star <= workoutRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-app-muted-foreground'
                    )}
                  />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-sm"
          >
            <Textarea
              placeholder="Note sull'allenamento (opzionale)..."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
              rows={3}
            />
          </motion.div>

          {/* Complete button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full max-w-sm"
          >
            <Button
              onClick={() => completeWorkoutMutation.mutate()}
              disabled={completeWorkoutMutation.isPending}
              className="w-full h-14 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full text-lg font-semibold"
            >
              {completeWorkoutMutation.isPending ? 'Salvataggio...' : 'Salva e chiudi'}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Pre-workout screen
  if (!isWorkoutStarted) {
    const hasExistingLogs = existingLogs && existingLogs.length > 0;
    const isResumeStatus = workout.status === 'in_corso' || workout.status === 'in_sospeso';
    const startLabel = hasExistingLogs || isResumeStatus
      ? 'Continua allenamento'
      : 'Inizia allenamento';

    if (totalExercises === 0) {
      return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-app-background p-4">
          <div className="text-center pt-20">
            <Dumbbell className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-app-foreground mb-2">Nessun esercizio</h2>
            <p className="text-sm text-app-muted-foreground mb-4">
              Questo allenamento non contiene esercizi. Contatta il tuo coach.
            </p>
            <Button onClick={() => navigate('/app')} className="bg-app-accent text-app-accent-foreground">
              Torna alla Home
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen bg-app-background">
        <div className="sticky top-0 z-50 bg-app-background/95 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => navigate('/app/workout')} className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-app-foreground" />
            </button>
            <h1 className="font-semibold text-app-foreground truncate px-2">{workout.title}</h1>
            <ExportSheetPdfButton
              mode="workout"
              workoutId={workout.id}
              iconOnly
              variant="ghost"
              className="text-app-foreground hover:text-app-accent shrink-0"
            />
          </div>
        </div>

        <div className="p-4 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-app-foreground">{workout.title}</h2>
            {workout.description && <p className="text-app-muted-foreground">{workout.description}</p>}
            <div className="flex justify-center gap-4 pt-2">
              <div className="flex items-center gap-1 text-sm text-app-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span>{totalExercises} esercizi</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-app-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>~{totalExercises * 5} min</span>
              </div>
            </div>
            {hasExistingLogs && (
              <div className="inline-flex items-center gap-2 bg-app-accent/10 text-app-accent px-3 py-1 rounded-full text-sm font-medium mt-2">
                <Play className="h-3 w-3" />
                Hai progressi salvati
              </div>
            )}
            {isResumeStatus && !hasExistingLogs && (
              <div className="inline-flex items-center gap-2 bg-app-accent/10 text-app-accent px-3 py-1 rounded-full text-sm font-medium mt-2">
                <Play className="h-3 w-3" />
                Allenamento in corso
              </div>
            )}

            {/* Tipologia scheda */}
            {(() => {
              const kind = normalizeTemplateKind((workout as any).template_kind);
              return (
                <div className={cn(
                  "mt-3 mx-auto max-w-md rounded-xl border p-3 text-left",
                  TEMPLATE_KIND_BADGE_CLASS[kind]
                )}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", TEMPLATE_KIND_BADGE_CLASS[kind])}>
                      Scheda {TEMPLATE_KIND_LABEL[kind]}
                    </Badge>
                  </div>
                  <p className="text-xs mt-1 opacity-90 leading-snug">
                    {TEMPLATE_KIND_DESCRIPTION[kind]}
                  </p>
                </div>
              );
            })()}
          </motion.div>

          <div className="space-y-4">
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h3 className='font-semibold text-app-foreground'>Esercizi</h3>
                {canReorder && freeExerciseIds.length > 1 && (
                  <p className='text-xs text-app-muted-foreground mt-0.5'>
                    Scheda libera: puoi cambiare l&apos;ordine degli esercizi liberi prima di iniziare.
                    I circuiti restano fissi.
                  </p>
                )}
                {templateKind === 'propedeutica' && (
                  <p className='text-xs text-app-muted-foreground mt-0.5'>
                    Scheda propedeutica: l&apos;ordine è fissato dal coach. Puoi avanzare anche senza
                    completare reps o esercizi al 100%.
                  </p>
                )}
                {templateKind === 'progressiva' && (
                  <p className='text-xs text-app-muted-foreground mt-0.5'>
                    Scheda progressiva: completa al 100% ogni esercizio (e ogni blocco) con le reps
                    prescritte prima di passare al successivo. I recuperi si possono saltare.
                  </p>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                {canAthleteReorder((workout as any).template_kind) && !hasExistingLogs && !isWorkoutStarted && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setReorderList([...exercises]);
                      setReorderOpen(true);
                    }}
                    className='h-8 gap-1.5'
                  >
                    <ArrowUpDown className='h-3.5 w-3.5' />
                    Riordina
                  </Button>
                )}
                {(workout as any).athlete_reordered_at && (
                  <span className='text-[10px] font-medium px-2 py-1 rounded-full bg-app-accent/15 text-app-accent shrink-0'>
                    Ordine personalizzato
                  </span>
                )}
              </div>
            </div>
            {(() => {
              // Raggruppa esercizi per blocco; orfani in blocco virtuale finale
              const blocks = (workout as any).workout_blocks as WorkoutBlock[] | undefined;
              const groups: Array<{ block: WorkoutBlock | null; items: WorkoutExercise[] }> = [];
              if (blocks && blocks.length > 0) {
                blocks.forEach((b) => {
                  const items = exercises.filter((e: any) => e.block_id === b.id);
                  if (items.length > 0) groups.push({ block: b, items });
                });
                const orphans = exercises.filter((e: any) => !e.block_id);
                if (orphans.length > 0) groups.push({ block: null, items: orphans });
              } else {
                groups.push({ block: null, items: exercises });
              }

              let globalIdx = 0;
              return groups.map((g, gi) => {
                const isFreeGroup = !g.block;
                const blockTitle = g.block
                  ? (g.block.name && g.block.name.trim() !== ''
                      ? g.block.name
                      : `Blocco ${gi + 1}`)
                  : 'Esercizi liberi';
                // Soft summary: solo numeri, no tipo tecnico
                const p = g.block?.params || {};
                const summaryParts: string[] = [];
                if (p.sets) {
                  if (p.reps) summaryParts.push(`${p.sets}×${p.reps}`);
                  else if (p.duration_seconds) summaryParts.push(`${p.sets}×${p.duration_seconds}s`);
                  else summaryParts.push(`${p.sets} serie`);
                }
                if (p.rest_seconds) summaryParts.push(`recupero ${p.rest_seconds}s`);

                return (
                  <div key={g.block?.id || `orphans-${gi}`} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold text-app-foreground">{blockTitle}</p>
                      {summaryParts.length > 0 && (
                        <p className="text-xs text-app-muted-foreground">{summaryParts.join(' · ')}</p>
                      )}
                    </div>
                    <div className="divide-y divide-app-border rounded-xl border border-app-border bg-app-card overflow-hidden">
                      {g.items.map((ex: WorkoutExercise) => {
                        const idx = globalIdx++;
                        const logCount = completedSets[ex.id]?.length
                          ?? (existingLogs?.filter(l => l.workout_exercise_id === ex.id && l.is_completed).length || 0);
                        const status = getExerciseStatus(ex, logCount);
                        const resolvedSets = resolveSetsData(ex.sets_data, {
                          sets: ex.prescribed_sets,
                          reps_min: ex.prescribed_reps_min,
                          reps_max: ex.prescribed_reps_max,
                          rest_seconds: ex.rest_seconds,
                          prescribed_duration_seconds: ex.prescribed_duration_seconds,
                        });
                        const targetSummary = formatSetsTargetSummary(resolvedSets);
                        const allSeconds =
                          resolvedSets.length > 0 &&
                          resolvedSets.every((s) => getSetTargetMode(s) === 'seconds');
                        const freeIdx = freeExerciseIds.indexOf(ex.id);
                        const showReorder = canReorder && isFreeGroup && freeIdx >= 0 && freeExerciseIds.length > 1;
                        return (
                          <div
                            key={ex.id}
                            className={cn(
                              "flex items-center gap-1",
                              status === 'in_progress' && "bg-app-accent/5",
                              status === 'completed' && "opacity-60"
                            )}
                          >
                            {showReorder && (
                              <div className="flex flex-col pl-1.5 shrink-0">
                                <button
                                  type="button"
                                  aria-label="Sposta su"
                                  disabled={freeIdx === 0 || reorderFreeMutation.isPending}
                                  onClick={() => moveFreeExercise(ex.id, -1)}
                                  className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-app-muted-foreground hover:text-app-foreground hover:bg-app-muted disabled:opacity-30"
                                >
                                  <ChevronUp className="h-5 w-5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Sposta giù"
                                  disabled={freeIdx === freeExerciseIds.length - 1 || reorderFreeMutation.isPending}
                                  onClick={() => moveFreeExercise(ex.id, 1)}
                                  className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-app-muted-foreground hover:text-app-foreground hover:bg-app-muted disabled:opacity-30"
                                >
                                  <ChevronDown className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.04 }}
                              onClick={() => {
                                setSelectedExercise(ex);
                                setSheetOpen(true);
                              }}
                              className="flex-1 flex items-center gap-3 p-3 text-left hover:bg-app-muted/40 transition-colors min-w-0"
                            >
                              <div className={cn(
                                "w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-app-muted border-2",
                                status === 'in_progress' ? "border-app-accent" : "border-transparent"
                              )}>
                                {ex.exercises?.image_url ? (
                                  <img
                                    src={ex.exercises.image_url}
                                    alt={ex.exercises.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Dumbbell className="h-6 w-6 text-app-muted-foreground/60" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-app-foreground truncate">
                                  {ex.exercises?.name}
                                </p>
                                {ex.notes && (
                                  <p className="text-xs text-app-muted-foreground/80 italic truncate mt-0.5">
                                    {ex.notes}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 text-sm text-app-muted-foreground mt-0.5">
                                  {allSeconds ? (
                                    <>
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="tabular-nums">{targetSummary}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Repeat className="h-3.5 w-3.5" />
                                      <span className="tabular-nums">
                                        {targetSummary !== '—'
                                          ? targetSummary
                                          : `${ex.prescribed_sets} set`}
                                      </span>
                                    </>
                                  )}
                                  {status === 'in_progress' && (
                                    <span className="ml-1 text-xs text-app-accent font-medium">
                                      · {logCount}/{ex.prescribed_sets}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex-shrink-0 flex items-center gap-1">
                                {status === 'completed' ? (
                                  <CheckCircle2 className="h-5 w-5 text-app-accent" />
                                ) : status === 'in_progress' ? (
                                  <span className="h-2.5 w-2.5 rounded-full bg-app-accent animate-pulse" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-app-muted-foreground" />
                                )}
                              </div>
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {workout.notes_pt && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-app-card border border-app-border rounded-xl p-4">
              <h3 className="font-semibold text-app-foreground mb-2">Note del coach</h3>
              <p className="text-sm text-app-muted-foreground">{workout.notes_pt}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <ExportSheetPdfButton
              mode="workout"
              workoutId={workout.id}
              label="Scarica scheda"
              variant="outline"
              size="default"
              className="w-full h-11 rounded-full border-app-border text-app-foreground"
            />
            <Button
              onClick={async () => {
                setSkipAutoStart(false);
                setIsWorkoutStarted(true);
                // Marca workout come "in_corso" per la Home action-first
                if (workoutId && workout?.status !== 'in_corso') {
                  await supabase
                    .from('workouts')
                    .update({ status: 'in_corso' as any })
                    .eq('id', workoutId)
                    .in('status', ['attivo', 'in_sospeso']);
                  queryClient.invalidateQueries({ queryKey: ['atleta-focus-workout'] });
                }
              }}

              className="w-full h-14 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full text-lg font-semibold"
            >
              <Play className="h-5 w-5 mr-2" />
              {startLabel}
            </Button>
          </motion.div>
        </div>

        {/* Exercise detail sheet */}
        <AtletaExerciseDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          exercise={selectedExercise as any}
          completedSetsForEx={selectedExercise ? completedSets[selectedExercise.id] || [] : []}
          status={
            selectedExercise
              ? getExerciseStatus(
                  selectedExercise,
                  completedSets[selectedExercise.id]?.length || 0
                )
              : 'not_started'
          }
          onStart={() => selectedExercise && handleStartFromSheet(selectedExercise)}
          onMarkAllCompleted={() =>
            selectedExercise ? handleMarkAllCompleted(selectedExercise) : Promise.resolve()
          }
        />

        {/* Confirm mark-as-completed dialog */}
        <AlertDialog open={confirmMarkOpen} onOpenChange={setConfirmMarkOpen}>
          <AlertDialogContent className="bg-app-card border-app-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-app-foreground">
                Segnare come completato?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-app-muted-foreground">
                Vuoi segnare questo esercizio come completato? Tutti i set verranno
                registrati con i valori prescritti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-app-muted text-app-foreground border-app-border">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (pendingMarkExercise) {
                    await performMarkAllCompleted(pendingMarkExercise);
                    setPendingMarkExercise(null);
                  }
                }}
                className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              >
                Conferma
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Riordina esercizi (solo schede libere) */}
        <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
          <DialogContent className="bg-app-card border-app-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-app-foreground">Riordina esercizi</DialogTitle>
              <DialogDescription className="text-app-muted-foreground">
                Trascina o usa le frecce per organizzare gli esercizi nell'ordine che preferisci.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {reorderList.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-2 rounded-lg border border-app-border bg-app-background p-2"
                >
                  <span className="w-6 text-center text-xs font-semibold text-app-muted-foreground tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-app-foreground truncate">
                      {ex.exercises?.name || 'Esercizio'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...reorderList];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setReorderList(next);
                      }}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === reorderList.length - 1}
                      onClick={() => {
                        const next = [...reorderList];
                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                        setReorderList(next);
                      }}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReorderOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => reorderMutation.mutate(reorderList.map((e) => e.id))}
                disabled={reorderMutation.isPending}
                className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              >
                {reorderMutation.isPending ? 'Salvataggio…' : 'Salva ordine'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  // Active workout screen — Guided flow (ready → input → rest → next)
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-app-background flex flex-col"
    >
      <div className="sticky top-0 z-50 bg-app-background/95 backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-bold text-app-foreground tabular-nums shrink-0">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-app-muted-foreground shrink-0">•</span>
            <span className="text-app-muted-foreground text-sm truncate">
              {workout.title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExitDialogOpen(true)}
            className="shrink-0 gap-1.5 text-app-foreground hover:bg-app-muted"
            aria-label="Esci dall'allenamento"
          >
            <X className="h-5 w-5" />
            <span className="text-sm font-medium">Esci</span>
          </Button>
        </div>
      </div>


      <div className="flex-1">
        <PhasedGuidedWorkout
          workoutId={workoutId!}
          exercises={exercises as any}
          initialCompletedSets={completedSets}
          onCompleted={() => setShowSummary(true)}
          templateKind={templateKind}
        />
      </div>

      {/* Exit workout confirmation dialog */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent className="bg-app-card border-app-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-app-foreground">
              Uscire dall'allenamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-app-muted-foreground">
              {hasCompletedLogs
                ? "I progressi già registrati restano salvati. Potrai riprendere quando vuoi."
                : "La sessione verrà sospesa. Potrai riprendere l'allenamento in seguito."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setExitDialogOpen(false)}
              className="bg-app-muted text-app-foreground border-app-border"
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExitWorkout}
              className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
            >
              Esci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>

  );
}

export default AtletaWorkoutDetailPage;
