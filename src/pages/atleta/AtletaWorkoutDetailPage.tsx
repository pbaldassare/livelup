import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GuidedWorkoutFlow } from '@/components/app/GuidedWorkoutFlow';
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
  ArrowLeft, 
  Settings2, 
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  exercises: {
    name: string;
    category: string;
    video_url?: string;
    image_url?: string;
    instructions?: string;
    muscle_groups?: string[];
  };
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
  const [workoutRating, setWorkoutRating] = useState(0);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [totalSetsCompleted, setTotalSetsCompleted] = useState(0);

  // Fetch workout with exercises + blocks
  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      if (!workoutId) return null;
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, title, description, status, scheduled_date, notes_pt, pt_user_id,
          workout_blocks (id, order_index, type, name, params),
          workout_exercises (
            id, exercise_id, order_index, prescribed_sets,
            prescribed_reps_min, prescribed_reps_max, prescribed_weight,
            prescribed_duration_seconds, rest_seconds, notes, block_id,
            exercises:exercise_id (name, category, video_url, image_url, instructions)
          )
        `)
        .eq('id', workoutId)
        .single();
      if (error) throw error;
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
  const { data: existingLogs } = useQuery({
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

  // Pre-populate completed sets and stats from existing logs
  useEffect(() => {
    const wExercises = workout?.workout_exercises || [];
    if (existingLogs && existingLogs.length > 0 && wExercises.length > 0) {
      const restored: Record<string, number[]> = {};
      let resumedVolume = 0;
      let resumedReps = 0;
      let resumedSets = 0;

      existingLogs.forEach((log) => {
        if (log.is_completed) {
          if (!restored[log.workout_exercise_id]) {
            restored[log.workout_exercise_id] = [];
          }
          restored[log.workout_exercise_id].push(log.set_number);
          resumedSets++;
          resumedReps += log.reps_completed || 0;
          resumedVolume += (log.reps_completed || 0) * (Number(log.weight_used) || 0);
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

  // Complete workout mutation
  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!workoutId) throw new Error('Workout ID mancante');
      const { error } = await supabase
        .from('workouts')
        .update({
          status: 'completato',
          completed_at: new Date().toISOString(),
          rating: workoutRating || null,
          notes_atleta: workoutNotes || null,
        })
        .eq('id', workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Allenamento completato! 🎉');
      queryClient.invalidateQueries({ queryKey: ['atleta-workouts'] });
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
    return (
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen bg-app-background">
        <div className="sticky top-0 z-50 bg-app-background/95 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => navigate('/app/workout')} className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-app-foreground" />
            </button>
            <h1 className="font-semibold text-app-foreground">{workout.title}</h1>
            <div className="w-10" />
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
          </motion.div>

          <div className="space-y-4">
            <h3 className="font-semibold text-app-foreground">Esercizi</h3>
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
                const blockTitle = g.block
                  ? (g.block.name && g.block.name.trim() !== ''
                      ? g.block.name
                      : `Blocco ${gi + 1}`)
                  : 'Esercizi';
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
                    {g.items.map((ex: WorkoutExercise) => {
                      const idx = globalIdx++;
                      const logCount = existingLogs?.filter(l => l.workout_exercise_id === ex.id && l.is_completed).length || 0;
                      const repsLabel = ex.prescribed_duration_seconds
                        ? `${ex.prescribed_duration_seconds}s`
                        : `${ex.prescribed_reps_min || 10}${ex.prescribed_reps_max ? `-${ex.prescribed_reps_max}` : ''} rep`;
                      return (
                        <motion.div
                          key={ex.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + idx * 0.05 }}
                          className="flex items-center gap-3 p-3 bg-app-card border border-app-border rounded-xl"
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            logCount >= ex.prescribed_sets ? "bg-app-accent/20" : "bg-app-accent/10"
                          )}>
                            {logCount >= ex.prescribed_sets ? (
                              <CheckCircle2 className="h-4 w-4 text-app-accent" />
                            ) : (
                              <span className="text-sm font-bold text-app-accent">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-app-foreground">{ex.exercises?.name}</p>
                            <p className="text-sm text-app-muted-foreground">
                              {ex.prescribed_sets} set × {repsLabel}
                              {logCount > 0 && ` • ${logCount}/${ex.prescribed_sets} completati`}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button
              onClick={async () => {
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
              {hasExistingLogs ? 'Riprendi Allenamento' : 'Inizia Allenamento'}
            </Button>
          </motion.div>
        </div>
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
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-app-foreground tabular-nums">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-app-muted-foreground">•</span>
            <span className="text-app-muted-foreground text-sm">
              {workout.title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/workout')}
            className="text-app-foreground hover:bg-app-muted"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <GuidedWorkoutFlow
          workoutId={workoutId!}
          exercises={exercises as any}
          initialExerciseIndex={currentExerciseIndex}
          initialSet={currentSet}
          initialCompletedSets={completedSets}
          onCompleted={() => setShowSummary(true)}
        />
      </div>
    </motion.div>
  );
}

export default AtletaWorkoutDetailPage;
