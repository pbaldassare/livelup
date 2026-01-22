import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExerciseVideoPlayer } from '@/components/app/ExerciseVideoPlayer';
import { WorkoutTimer } from '@/components/app/WorkoutTimer';
import { SetTracker } from '@/components/app/SetTracker';
import { 
  ChevronLeft, 
  Settings2, 
  Play, 
  Clock,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// =====================================================
// ATLETA WORKOUT DETAIL PAGE - Workout execution
// Design reference: Ladder_iOS_60, 61, 62
// With framer-motion animations
// =====================================================

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min?: number;
  prescribed_reps_max?: number;
  prescribed_weight?: number;
  rest_seconds?: number;
  notes?: string;
  exercises: {
    name: string;
    category: string;
    video_url?: string;
    image_url?: string;
    instructions?: string;
  };
}

// Animation variants
const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

const exerciseVariants = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

const slideUpVariants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 50 },
};

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

  // Fetch workout with exercises
  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      if (!workoutId) return null;

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          title,
          description,
          status,
          scheduled_date,
          notes_pt,
          pt_user_id,
          workout_exercises (
            id,
            exercise_id,
            order_index,
            prescribed_sets,
            prescribed_reps_min,
            prescribed_reps_max,
            prescribed_weight,
            rest_seconds,
            notes,
            exercises:exercise_id (
              name,
              category,
              video_url,
              image_url,
              instructions
            )
          )
        `)
        .eq('id', workoutId)
        .single();

      if (error) throw error;

      // Sort exercises by order_index
      const sortedExercises = data.workout_exercises?.sort(
        (a: any, b: any) => a.order_index - b.order_index
      );

      return { ...data, workout_exercises: sortedExercises };
    },
    enabled: !!workoutId,
  });

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
    }) => {
      const { error } = await supabase
        .from('workout_logs')
        .insert({
          workout_exercise_id: data.workoutExerciseId,
          set_number: data.setNumber,
          reps_completed: data.repsCompleted,
          weight_used: data.weightUsed,
          is_completed: true,
        });

      if (error) throw error;
    },
  });

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isWorkoutStarted && !isResting) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkoutStarted, isResting]);

  // Current exercise
  const exercises = workout?.workout_exercises || [];
  const currentExercise = exercises[currentExerciseIndex] as WorkoutExercise | undefined;
  const totalExercises = exercises.length;
  const workoutProgress = totalExercises > 0 
    ? ((currentExerciseIndex + 1) / totalExercises) * 100 
    : 0;

  // Format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Handle set completion
  const handleSetComplete = (setNumber: number, reps: number, weight?: number) => {
    if (!currentExercise) return;

    // Log to database
    logSetMutation.mutate({
      workoutExerciseId: currentExercise.id,
      setNumber,
      repsCompleted: reps,
      weightUsed: weight,
    });

    // Update local state
    setCompletedSets(prev => ({
      ...prev,
      [currentExercise.id]: [...(prev[currentExercise.id] || []), setNumber],
    }));

    // Move to next set or exercise
    if (setNumber >= currentExercise.prescribed_sets) {
      // All sets done, move to next exercise
      if (currentExerciseIndex < totalExercises - 1) {
        // Show rest timer before next exercise
        setIsResting(true);
        setShowTimer(true);
      } else {
        // Workout complete
        completeWorkoutMutation.mutate();
      }
    } else {
      // More sets to do
      setCurrentSet(setNumber + 1);
      // Optional: show short rest timer
      setIsResting(true);
      setShowTimer(true);
    }
  };

  // Handle rest complete
  const handleRestComplete = () => {
    setIsResting(false);
    setShowTimer(false);

    // Check if we need to move to next exercise
    if (currentExercise && (completedSets[currentExercise.id]?.length || 0) >= currentExercise.prescribed_sets) {
      if (currentExerciseIndex < totalExercises - 1) {
        setExerciseDirection(1);
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
      }
    }
  };

  // Navigate to previous exercise
  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setExerciseDirection(-1);
      setCurrentExerciseIndex(prev => prev - 1);
      setCurrentSet(1);
    }
  };

  // Generate sets data for SetTracker
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-app-background p-4"
      >
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

  // Pre-workout screen
  if (!isWorkoutStarted) {
    return (
      <motion.div 
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-app-background"
      >
        {/* Header */}
        <div className="sticky top-0 z-50 bg-app-background/95 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app/workout')}
              className="text-app-foreground hover:bg-app-muted"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="font-semibold text-app-foreground">{workout.title}</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Workout info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-2"
          >
            <h2 className="text-2xl font-bold text-app-foreground">{workout.title}</h2>
            {workout.description && (
              <p className="text-app-muted-foreground">{workout.description}</p>
            )}
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
          </motion.div>

          {/* Exercise list preview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-app-foreground">Esercizi</h3>
            {exercises.map((ex: WorkoutExercise, idx: number) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
                className="flex items-center gap-3 p-3 bg-app-card border border-app-border rounded-xl"
              >
                <div className="w-8 h-8 rounded-full bg-app-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-app-accent">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-app-foreground">{ex.exercises?.name}</p>
                  <p className="text-sm text-app-muted-foreground">
                    {ex.prescribed_sets} set × {ex.prescribed_reps_min || 10}
                    {ex.prescribed_reps_max ? `-${ex.prescribed_reps_max}` : ''} rep
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* PT notes */}
          {workout.notes_pt && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-app-card border border-app-border rounded-xl p-4"
            >
              <h3 className="font-semibold text-app-foreground mb-2">Note del coach</h3>
              <p className="text-sm text-app-muted-foreground">{workout.notes_pt}</p>
            </motion.div>
          )}

          {/* Start button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => setIsWorkoutStarted(true)}
              className="w-full h-14 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 rounded-full text-lg font-semibold"
            >
              <Play className="h-5 w-5 mr-2" />
              Inizia Allenamento
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Active workout screen
  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-app-background flex flex-col"
    >
      {/* Header with progress */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-app-background/95 backdrop-blur"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-app-foreground tabular-nums">{formatTime(elapsedTime)}</span>
            <span className="text-app-muted-foreground">•</span>
            <span className="text-app-muted-foreground">{Math.round(workoutProgress)}%</span>
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

        {/* Progress segments */}
        <div className="flex gap-1 px-4 pb-2">
          {exercises.map((_: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                'flex-1 h-1 rounded-full origin-left',
                idx < currentExerciseIndex
                  ? 'bg-app-accent'
                  : idx === currentExerciseIndex
                  ? 'bg-app-accent/50'
                  : 'bg-app-muted'
              )}
            />
          ))}
        </div>
      </motion.div>

      {/* Video area with animation */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={exerciseDirection}>
          <motion.div
            key={currentExerciseIndex}
            custom={exerciseDirection}
            variants={exerciseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0"
          >
            <ExerciseVideoPlayer
              videoUrl={currentExercise?.exercises?.video_url || undefined}
              imageUrl={currentExercise?.exercises?.image_url || undefined}
              exerciseName={currentExercise?.exercises?.name || 'Esercizio'}
              setNumber={currentSet}
              totalSets={currentExercise?.prescribed_sets || 1}
              coachAvatar={ptProfile?.avatar_url || undefined}
              coachName={`${ptProfile?.first_name || ''} ${ptProfile?.last_name || ''}`}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom panel - Set tracker with animation */}
      <motion.div
        variants={slideUpVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        <SetTracker
          sets={setsData}
          currentSet={currentSet}
          onSetComplete={handleSetComplete}
          onSetChange={setCurrentSet}
          restSeconds={currentExercise?.rest_seconds || 60}
        />
      </motion.div>

      {/* Rest timer sheet */}
      <Sheet open={showTimer} onOpenChange={setShowTimer}>
        <SheetContent side="bottom" className="bg-app-background border-app-border rounded-t-3xl">
          <SheetHeader className="text-center">
            <SheetTitle className="text-app-foreground">
              {isResting ? 'Tempo di recupero' : 'Prossimo esercizio'}
            </SheetTitle>
          </SheetHeader>

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-8"
          >
            <WorkoutTimer
              initialSeconds={currentExercise?.rest_seconds || 60}
              onComplete={handleRestComplete}
              isRest={true}
              autoStart={true}
            />
          </motion.div>

          <div className="text-center pb-4">
            <p className="text-app-muted-foreground mb-2">Prossimo:</p>
            <p className="text-lg font-semibold text-app-foreground">
              {exercises[currentExerciseIndex + 1]?.exercises?.name || 'Fine allenamento'}
            </p>
          </div>

          <Button
            onClick={handleRestComplete}
            variant="outline"
            className="w-full rounded-full border-app-border text-app-foreground hover:bg-app-muted"
          >
            Salta recupero
          </Button>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

export default AtletaWorkoutDetailPage;
