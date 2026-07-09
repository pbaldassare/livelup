import { useReducer, useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Check,
  SkipForward,
  Plus,
  Minus,
  Timer as TimerIcon,
  Dumbbell,
  ChevronsRight,
  PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AtletaEmomPlayer } from '@/components/app/AtletaEmomPlayer';
import { AtletaTimedRoundsPlayer } from '@/components/app/AtletaTimedRoundsPlayer';
import { AtletaAmrapPlayer } from '@/components/app/AtletaAmrapPlayer';
import { AtletaSupersetPlayer } from '@/components/app/AtletaSupersetPlayer';
import { NextExercisePreview } from '@/components/app/NextExercisePreview';
import { ExerciseHeader } from '@/components/app/ExerciseHeader';
import { AtletaExerciseDetailSheet } from '@/components/app/AtletaExerciseDetailSheet';
import { WorkoutProgressBar } from '@/components/app/WorkoutProgressBar';
import { resolveRampingUnit } from '@/lib/protocols/registry';
import { logExerciseSet } from '@/lib/api/workouts';
import { useAdvanceExercise } from '@/hooks/useAdvanceExercise';
import type { ProtocolConfig, SetData, WorkoutRowUpdate } from '@/types/database';

// =====================================================
// GUIDED WORKOUT FLOW
// State machine: ready → input → rest → next
// One dynamic view, zero navigation decisions for the user
// =====================================================

export interface GWExercise {
  id: string; // workout_exercise_id
  exercise_id?: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  prescribed_duration_seconds?: number | null;
  prescribed_weight?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  protocol_type?: string | null;
  protocol_params?: ProtocolConfig | null;
  sets_data?: SetData[] | null;
  exercises?: {
    name: string;
    category?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    instructions?: string | null;
    muscle_groups?: string[] | null;
  } | null;
}

function exerciseMeta(ex?: GWExercise | null) {
  const joined = ex?.exercises;
  return {
    name: joined?.name ?? 'Esercizio',
    category: joined?.category ?? null,
    image_url: joined?.image_url ?? null,
    video_url: joined?.video_url ?? null,
    instructions: joined?.instructions ?? null,
    muscle_groups: joined?.muscle_groups ?? null,
  };
}

interface GuidedWorkoutFlowProps {
  workoutId: string;
  exercises: GWExercise[];
  initialExerciseIndex?: number;
  initialSet?: number;
  initialCompletedSets?: Record<string, number[]>;
  onCompleted: () => void;
  /**
   * When true, the flow runs in "PT on-behalf" mode: logs are saved via the
   * `pt_save_workout_log` RPC so the data persists on the athlete's profile
   * even though it's the PT executing the session in person.
   */
  ptOnBehalfMode?: boolean;
}

type FlowState = 'ready' | 'input' | 'rest' | 'next' | 'finished';

interface State {
  flow: FlowState;
  exerciseIndex: number;
  setNumber: number;
  reps: number;
  duration: number; // secondi (per esercizi a tempo)
  weight: number;
  rpe: number;
  restSeconds: number;
  restTotal: number;
  restStartedAt: number | null;
  // virtual extra sets per exercise id
  extraSets: Record<string, number>;
  // skipped exercise ids
  skipped: Record<string, boolean>;
  // completed sets restored + added during session
  completed: Record<string, number[]>;
  transitionMessage: string | null;
}

type Action =
  | { type: 'START_SET' }
  | { type: 'SET_REPS'; v: number }
  | { type: 'SET_DURATION'; v: number }
  | { type: 'SET_WEIGHT'; v: number }
  | { type: 'SET_RPE'; v: number }
  | { type: 'MARK_SET_COMPLETED'; exerciseId: string; setNumber: number }
  | { type: 'AFTER_SAVE'; rest: number }
  | { type: 'TICK_REST' }
  | { type: 'ADJUST_REST'; delta: number }
  | { type: 'SKIP_REST' }
  | { type: 'GOTO_NEXT'; payload: { exerciseIndex: number; setNumber: number; flow: FlowState; transitionMessage?: string } }
  | { type: 'ADD_EXTRA_SET'; exerciseId: string }
  | { type: 'SKIP_EXERCISE'; exerciseId: string }
  | { type: 'CLEAR_TRANSITION' }
  | { type: 'FINISH' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_SET':
      return { ...state, flow: 'input' };
    case 'SET_REPS':
      return { ...state, reps: Math.max(0, action.v) };
    case 'SET_DURATION':
      return { ...state, duration: Math.max(0, action.v) };
    case 'SET_WEIGHT':
      return { ...state, weight: Math.max(0, action.v) };
    case 'SET_RPE':
      return { ...state, rpe: Math.min(10, Math.max(6, action.v)) };
    case 'AFTER_SAVE':
      return {
        ...state,
        flow: 'rest',
        restSeconds: action.rest,
        restTotal: action.rest,
        restStartedAt: Date.now(),
      };
    case 'TICK_REST':
      return { ...state, restSeconds: Math.max(0, state.restSeconds - 1) };
    case 'ADJUST_REST': {
      const next = Math.max(5, state.restSeconds + action.delta);
      const total = Math.max(state.restTotal, next);
      return { ...state, restSeconds: next, restTotal: total };
    }
    case 'SKIP_REST':
      return { ...state, restSeconds: 0 };
    case 'GOTO_NEXT':
      return {
        ...state,
        flow: action.payload.flow,
        exerciseIndex: action.payload.exerciseIndex,
        setNumber: action.payload.setNumber,
        transitionMessage: action.payload.transitionMessage ?? null,
      };
    case 'ADD_EXTRA_SET':
      return {
        ...state,
        extraSets: {
          ...state.extraSets,
          [action.exerciseId]: (state.extraSets[action.exerciseId] || 0) + 1,
        },
      };
    case 'SKIP_EXERCISE':
      return {
        ...state,
        skipped: { ...state.skipped, [action.exerciseId]: true },
      };
    case 'CLEAR_TRANSITION':
      return { ...state, transitionMessage: null };
    case 'MARK_SET_COMPLETED':
      return {
        ...state,
        completed: {
          ...state.completed,
          [action.exerciseId]: [
            ...(state.completed[action.exerciseId] || []),
            action.setNumber,
          ],
        },
      };
    case 'FINISH':
      return { ...state, flow: 'finished' };
    default:
      return state;
  }
}

const isTimedExercise = (ex?: GWExercise) =>
  !!ex && (ex.prescribed_duration_seconds ?? 0) > 0;

export function GuidedWorkoutFlow({
  workoutId,
  exercises,
  initialExerciseIndex = 0,
  initialSet = 1,
  initialCompletedSets = {},
  onCompleted,
  ptOnBehalfMode = false,
}: GuidedWorkoutFlowProps) {
  const queryClient = useQueryClient();

  const initialExercise = exercises[initialExerciseIndex];
  const [state, dispatch] = useReducer(reducer, {
    flow: 'ready',
    exerciseIndex: initialExerciseIndex,
    setNumber: initialSet,
    reps: parseInitialReps(initialExercise),
    duration: Number(initialExercise?.prescribed_duration_seconds || 0),
    weight: Number(initialExercise?.prescribed_weight || 0),
    rpe: 7,
    restSeconds: initialExercise?.rest_seconds || 60,
    restTotal: initialExercise?.rest_seconds || 60,
    restStartedAt: null,
    extraSets: {},
    skipped: {},
    completed: initialCompletedSets,
    transitionMessage: null,
  });

  const currentExercise = exercises[state.exerciseIndex];

  // Detail sheet for the clickable exercise header
  const [detailOpen, setDetailOpen] = useState(false);
  const openDetails = useCallback(() => setDetailOpen(true), []);
  const currentMeta = exerciseMeta(currentExercise);
  const detailSheet = currentExercise ? (
    <AtletaExerciseDetailSheet
      open={detailOpen}
      onOpenChange={setDetailOpen}
      exercise={{
        id: currentExercise.id,
        prescribed_sets: currentExercise.prescribed_sets,
        prescribed_reps_min: currentExercise.prescribed_reps_min ?? undefined,
        prescribed_reps_max: currentExercise.prescribed_reps_max ?? undefined,
        prescribed_duration_seconds: currentExercise.prescribed_duration_seconds ?? null,
        prescribed_weight: currentExercise.prescribed_weight ?? undefined,
        rest_seconds: currentExercise.rest_seconds ?? undefined,
        notes: currentExercise.notes ?? undefined,
        sets_data: currentExercise.sets_data,
        protocol_type: currentExercise.protocol_type ?? null,
        protocol_params: currentExercise.protocol_params ?? null,
        exercises: {
          name: currentMeta.name,
          category: currentMeta.category ?? undefined,
          video_url: currentMeta.video_url ?? undefined,
          image_url: currentMeta.image_url ?? undefined,
          instructions: currentMeta.instructions ?? undefined,
          muscle_groups: currentMeta.muscle_groups ?? undefined,
        },
      }}
      completedSetsForEx={state.completed[currentExercise.id] ?? []}
      status="in_progress"
      onStart={() => setDetailOpen(false)}
      onMarkAllCompleted={() => setDetailOpen(false)}
    />
  ) : null;
  const totalSetsForCurrent =
    (currentExercise?.prescribed_sets || 0) +
    (currentExercise ? state.extraSets[currentExercise.id] || 0 : 0);

  // Mark workout in_corso on first interaction
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current && state.flow === 'input') {
      startedRef.current = true;
      supabase
        .from('workouts')
        .update({ status: 'in_corso' } satisfies Pick<WorkoutRowUpdate, 'status'>)
        .eq('id', workoutId)
        .in('status', ['attivo', 'in_sospeso'])
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['atleta-focus-workout'] });
        });
    }
  }, [state.flow, workoutId, queryClient]);

  // Re-sync inputs when exercise changes
  useEffect(() => {
    dispatch({ type: 'SET_REPS', v: parseInitialReps(currentExercise) });
    dispatch({ type: 'SET_DURATION', v: Number(currentExercise?.prescribed_duration_seconds || 0) });
    dispatch({ type: 'SET_WEIGHT', v: Number(currentExercise?.prescribed_weight || 0) });
  }, [state.exerciseIndex, currentExercise]);

  // Auto-clear transition messages
  useEffect(() => {
    if (state.transitionMessage) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_TRANSITION' }), 700);
      return () => clearTimeout(t);
    }
  }, [state.transitionMessage]);

  // Save log
  const saveSet = useMutation({
    mutationFn: async (payload: {
      workoutExerciseId: string;
      setNumber: number;
      reps: number;
      durationSeconds: number;
      weight: number;
      restPlanned: number;
      rpe?: number;
    }) => {
      if (ptOnBehalfMode) {
        // PT executing the session in person on the athlete's behalf.
        // Use SECURITY DEFINER RPC to bypass athlete-only RLS after server-side checks.
        const { error } = await supabase.rpc('pt_save_workout_log', {
          _workout_exercise_id: payload.workoutExerciseId,
          _set_number: payload.setNumber,
          _reps_completed: payload.reps || null,
          _weight_used: payload.weight || null,
          _duration_seconds: payload.durationSeconds || null,
          _rpe: payload.rpe ?? null,
          _notes: `rest_planned:${payload.restPlanned}`,
        });
        if (error) throw error;
        return;
      }

      await logExerciseSet({
        workoutExerciseId: payload.workoutExerciseId,
        setNumber: payload.setNumber,
        repsCompleted: payload.reps || undefined,
        durationSeconds: payload.durationSeconds || undefined,
        weightUsed: payload.weight || undefined,
        rpe: payload.rpe,
        notes: `rest_planned:${payload.restPlanned}`,
      });
    },
  });

  const advanceAfterProtocol = useAdvanceExercise({
    exerciseIndex: state.exerciseIndex,
    exercises,
    skipped: state.skipped,
    onFinish: () => dispatch({ type: 'FINISH' }),
    onGoToNext: (nextIdx) =>
      dispatch({
        type: 'GOTO_NEXT',
        payload: {
          exerciseIndex: nextIdx,
          setNumber: 1,
          flow: 'ready',
          transitionMessage: 'Prossimo esercizio',
        },
      }),
  });

  const advance = useCallback(
    (afterCompletion: boolean) => {
      if (!currentExercise) return;
      const isLastSet = state.setNumber >= totalSetsForCurrent;
      const isLastExercise = state.exerciseIndex >= exercises.length - 1;

      if (afterCompletion && isLastSet && isLastExercise) {
        // Workout finito
        dispatch({ type: 'FINISH' });
        return;
      }

      if (isLastSet || !afterCompletion) {
        // skip o fine esercizio → vai al prossimo
        let nextIdx = state.exerciseIndex + 1;
        // skip eventuali esercizi marcati skipped
        while (nextIdx < exercises.length && state.skipped[exercises[nextIdx].id]) {
          nextIdx++;
        }
        if (nextIdx >= exercises.length) {
          dispatch({ type: 'FINISH' });
          return;
        }
        dispatch({
          type: 'GOTO_NEXT',
          payload: {
            exerciseIndex: nextIdx,
            setNumber: 1,
            flow: 'ready',
            transitionMessage: 'Prossimo esercizio',
          },
        });
      } else {
        dispatch({
          type: 'GOTO_NEXT',
          payload: {
            exerciseIndex: state.exerciseIndex,
            setNumber: state.setNumber + 1,
            flow: 'ready',
            transitionMessage: 'Serie completata',
          },
        });
      }
    },
    [state, exercises, totalSetsForCurrent, currentExercise]
  );

  const handleRestEnd = useCallback(() => {
    advance(true);
  }, [advance]);

  // Rest timer ticking
  useEffect(() => {
    if (state.flow !== 'rest') return;
    if (state.restSeconds <= 0) {
      handleRestEnd();
      return;
    }
    const t = setTimeout(() => dispatch({ type: 'TICK_REST' }), 1000);
    return () => clearTimeout(t);
  }, [state.flow, state.restSeconds, handleRestEnd]);

  const handleCompleteSet = async () => {
    if (!currentExercise) return;
    try {
      const restPlanned = currentExercise.rest_seconds || 60;
      await saveSet.mutateAsync({
        workoutExerciseId: currentExercise.id,
        setNumber: state.setNumber,
        reps: isTimedExercise(currentExercise) ? 0 : state.reps,
        durationSeconds: isTimedExercise(currentExercise) ? state.duration : 0,
        weight: state.weight,
        restPlanned,
        rpe: state.rpe,
      });

      dispatch({
        type: 'MARK_SET_COMPLETED',
        exerciseId: currentExercise.id,
        setNumber: state.setNumber,
      });

      const isLastSet = state.setNumber >= totalSetsForCurrent;
      const isLastExercise = state.exerciseIndex >= exercises.length - 1;

      if (isLastSet && isLastExercise) {
        dispatch({ type: 'FINISH' });
        return;
      }

      // Va sempre in rest, anche tra esercizi (auto-advance al termine)
      dispatch({ type: 'AFTER_SAVE', rest: restPlanned });
    } catch (e: any) {
      toast.error(e.message || 'Errore salvataggio set');
    }
  };

  const handleSkipExercise = () => {
    if (!currentExercise) return;
    dispatch({ type: 'SKIP_EXERCISE', exerciseId: currentExercise.id });
    advance(false);
  };

  const handleAddExtraSet = () => {
    if (!currentExercise) return;
    dispatch({ type: 'ADD_EXTRA_SET', exerciseId: currentExercise.id });
    // ritorna nello stato ready sull'esercizio corrente
    dispatch({
      type: 'GOTO_NEXT',
      payload: {
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber + 1,
        flow: 'ready',
      },
    });
  };

  // Completion of workout
  useEffect(() => {
    if (state.flow === 'finished') {
      onCompleted();
    }
  }, [state.flow, onCompleted]);

  if (!currentExercise) {
    return (
      <div className="p-8 text-center text-app-muted-foreground">
        Nessun esercizio disponibile.
      </div>
    );
  }

  const repsLabel = formatRepsLabel(currentExercise);
  const restProgress =
    state.restTotal > 0 ? ((state.restTotal - state.restSeconds) / state.restTotal) * 100 : 0;

  // Find next non-skipped exercise (for last-rest preview card)
  const nextExercise = (() => {
    let i = state.exerciseIndex + 1;
    while (i < exercises.length && state.skipped[exercises[i].id]) i++;
    return i < exercises.length ? exercises[i] : null;
  })();
  const isLastSetOfCurrent = state.setNumber >= totalSetsForCurrent;
  const showNextPreview =
    state.flow === 'rest' && isLastSetOfCurrent && !!nextExercise;
  const nextMeta = exerciseMeta(nextExercise);
  const nextPreviewInfo = nextExercise
    ? {
        name: nextMeta.name,
        category: nextMeta.category,
        imageUrl: nextMeta.image_url,
        sets: nextExercise.prescribed_sets ?? null,
        repsLabel: formatRepsLabel(nextExercise),
        protocolType: nextExercise.protocol_type ?? null,
      }
    : null;

  const rampingNote = getRampingCoachNote(currentExercise.protocol_params);

  // Branch dedicato EMOM: player a round con timer, alternanza blocchi in loop.
  if (currentExercise.protocol_type === 'EMOM') {
    return (
      <>
      <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
        <WorkoutProgressBar
          exercises={exercises}
          exerciseIndex={state.exerciseIndex}
          skipped={state.skipped}
          current={state.exerciseIndex + 1}
          total={exercises.length}
        />

        <AtletaEmomPlayer
          key={currentExercise.id}
          exerciseName={currentMeta.name}
          protocolParams={currentExercise.protocol_params ?? null}
          notes={currentExercise.notes ?? null}
          onShowDetails={openDetails}
          onFinished={async () => {
            try {
              const { rounds, roundDuration } = getEmomLogMetrics(currentExercise.protocol_params);
              await saveSet.mutateAsync({
                workoutExerciseId: currentExercise.id,
                setNumber: 1,
                reps: rounds,
                durationSeconds: rounds * roundDuration,
                weight: 0,
                restPlanned: 0,
              });
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Errore salvataggio EMOM';
              toast.error(message);
            }
            advanceAfterProtocol();
          }}
        />
      </div>
      {detailSheet}
      </>
    );
  }

  // Branch dedicato HIIT/TABATA: player condiviso a tempo con auto-advance.
  if (currentExercise.protocol_type === 'HIIT' || currentExercise.protocol_type === 'TABATA') {
    const protocolLabel = currentExercise.protocol_type as 'HIIT' | 'TABATA';
    return (
      <>
      <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
        <WorkoutProgressBar
          exercises={exercises}
          exerciseIndex={state.exerciseIndex}
          skipped={state.skipped}
          current={state.exerciseIndex + 1}
          total={exercises.length}
        />

        <AtletaTimedRoundsPlayer
          key={currentExercise.id}
          protocolLabel={protocolLabel}
          exerciseName={currentMeta.name}
          protocolParams={currentExercise.protocol_params ?? null}
          notes={currentExercise.notes ?? null}
          onShowDetails={openDetails}
          onFinished={async ({ roundsCompleted, totalDurationSeconds }) => {
            try {
              await saveSet.mutateAsync({
                workoutExerciseId: currentExercise.id,
                setNumber: 1,
                reps: roundsCompleted,
                durationSeconds: totalDurationSeconds,
                weight: 0,
                restPlanned: 0,
              });
            } catch (e: unknown) {
              const message =
                e instanceof Error ? e.message : `Errore salvataggio ${protocolLabel}`;
              toast.error(message);
            }
            advanceAfterProtocol();
          }}
        />
      </div>
      {detailSheet}
      </>
    );
  }

  // Branch dedicato AMRAP: timer globale + round manuali.
  if (currentExercise.protocol_type === 'AMRAP') {
    return (
      <>
      <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
        <WorkoutProgressBar
          exercises={exercises}
          exerciseIndex={state.exerciseIndex}
          skipped={state.skipped}
          current={state.exerciseIndex + 1}
          total={exercises.length}
        />

        <AtletaAmrapPlayer
          key={currentExercise.id}
          exerciseName={currentMeta.name}
          protocolParams={currentExercise.protocol_params ?? null}
          notes={currentExercise.notes ?? null}
          onShowDetails={openDetails}
          onFinished={async ({ roundsCompleted, totalDurationSeconds }) => {
            try {
              await saveSet.mutateAsync({
                workoutExerciseId: currentExercise.id,
                setNumber: 1,
                reps: roundsCompleted,
                durationSeconds: totalDurationSeconds,
                weight: 0,
                restPlanned: 0,
              });
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Errore salvataggio AMRAP';
              toast.error(message);
            }
            advanceAfterProtocol();
          }}
        />
      </div>
      {detailSheet}
      </>
    );
  }

  // Branch dedicato SUPERSET: ciclo esercizi × supersets con recuperi.
  if (currentExercise.protocol_type === 'SUPERSET') {
    return (
      <>
      <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
        <WorkoutProgressBar
          exercises={exercises}
          exerciseIndex={state.exerciseIndex}
          skipped={state.skipped}
          current={state.exerciseIndex + 1}
          total={exercises.length}
        />

        <AtletaSupersetPlayer
          key={currentExercise.id}
          exerciseName={currentMeta.name}
          protocolParams={currentExercise.protocol_params ?? null}
          notes={currentExercise.notes ?? null}
          onShowDetails={openDetails}
          onFinished={async () => {
            try {
              await saveSet.mutateAsync({
                workoutExerciseId: currentExercise.id,
                setNumber: 1,
                reps: 1,
                durationSeconds: 0,
                weight: 0,
                restPlanned: 0,
              });
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Errore salvataggio SUPERSET';
              toast.error(message);
            }
            advanceAfterProtocol();
          }}
        />
      </div>
      {detailSheet}
      </>
    );
  }

  return (
    <>
    <div className="min-h-[calc(100dvh-0px)] bg-app-background flex flex-col">
      <WorkoutProgressBar
        exercises={exercises}
        exerciseIndex={state.exerciseIndex}
        skipped={state.skipped}
        current={state.exerciseIndex + 1}
        total={exercises.length}
        label={`Serie ${Math.min(state.setNumber, totalSetsForCurrent)}/${totalSetsForCurrent}`}
      />

      {/* Main dynamic area */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {state.flow === 'ready' && (
            <motion.div
              key={`ready-${state.exerciseIndex}-${state.setNumber}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-app-accent/10 flex items-center justify-center mb-4">
                <Dumbbell className="h-8 w-8 text-app-accent" />
              </div>
              <ExerciseHeader
                name={currentMeta.name}
                protocolType={currentExercise.protocol_type ?? 'standard'}
                notes={currentExercise.notes ?? null}
                onShowDetails={openDetails}
                size="lg"
                align="center"
                className="mb-2"
              />
              <p className="text-sm text-app-muted-foreground mb-6 mt-2">
                Serie {state.setNumber} di {totalSetsForCurrent}
              </p>

              {rampingNote && (
                <div className="w-full max-w-xs mb-4 rounded-xl border border-app-border bg-app-card/60 px-4 py-3 text-left">
                  <p className="text-xs text-app-muted-foreground mb-1">Note del coach</p>
                  <p className="text-sm text-app-foreground whitespace-pre-line">
                    {rampingNote}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
                <Stat
                  label="Target"
                  value={isTimedExercise(currentExercise) ? `${currentExercise.prescribed_duration_seconds}s` : repsLabel}
                />
                <Stat
                  label={currentExercise.protocol_type === 'RAMPING' ? resolveRampingUnit(currentExercise.protocol_params) : 'Peso'}
                  value={
                    currentExercise.prescribed_weight
                      ? `${currentExercise.prescribed_weight}`
                      : '—'
                  }
                />
                <Stat
                  label="Recupero"
                  value={`${currentExercise.rest_seconds || 60}s`}
                />
              </div>


              <Button
                onClick={() => dispatch({ type: 'START_SET' })}
                className="w-full max-w-xs h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
              >
                <Play className="h-5 w-5 mr-2" />
                Inizia serie
              </Button>
            </motion.div>
          )}

          {state.flow === 'input' && (
            <motion.div
              key={`input-${state.exerciseIndex}-${state.setNumber}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8"
            >
              <ExerciseHeader
                name={currentMeta.name}
                protocolType={currentExercise.protocol_type ?? 'standard'}
                notes={currentExercise.notes ?? null}
                onShowDetails={openDetails}
                size="md"
                align="center"
                className="mb-2"
              />
              <p className="text-sm text-app-muted-foreground mb-8 text-center mt-2">
                Serie {state.setNumber} • inserisci i risultati
              </p>

              <div className="w-full max-w-xs space-y-5 mb-8">
                {isTimedExercise(currentExercise) ? (
                  <NumberRow
                    label="Tempo (s)"
                    value={state.duration}
                    step={5}
                    onChange={(v) => dispatch({ type: 'SET_DURATION', v })}
                  />
                ) : (
                  <NumberRow
                    label="Reps"
                    value={state.reps}
                    step={1}
                    onChange={(v) => dispatch({ type: 'SET_REPS', v })}
                  />
                )}
                <NumberRow
                  label={currentExercise.protocol_type === 'RAMPING' ? resolveRampingUnit(currentExercise.protocol_params) : 'Peso (kg)'}
                  value={state.weight}
                  step={2.5}
                  onChange={(v) => dispatch({ type: 'SET_WEIGHT', v })}
                />
                <RpeSelector value={state.rpe} onChange={(v) => dispatch({ type: 'SET_RPE', v })} />
              </div>

              <Button
                onClick={handleCompleteSet}
                disabled={saveSet.isPending}
                className="w-full max-w-xs h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
              >
                <Check className="h-5 w-5 mr-2" />
                {saveSet.isPending ? 'Salvataggio…' : 'Completa serie'}
              </Button>
            </motion.div>
          )}

          {state.flow === 'rest' && (
            <motion.div
              key={`rest-${state.exerciseIndex}-${state.setNumber}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8"
            >
              <p className="text-sm text-app-muted-foreground mb-4 uppercase tracking-wider">
                Recupero
              </p>

              <div className="relative w-56 h-56 mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="hsl(var(--app-muted))"
                    strokeWidth="6"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="hsl(var(--app-accent))"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={
                      2 * Math.PI * 60 - (restProgress / 100) * (2 * Math.PI * 60)
                    }
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-app-foreground tabular-nums">
                    {formatTime(state.restSeconds)}
                  </span>
                  <span className="text-xs text-app-muted-foreground mt-1">
                    {isLastSetOfCurrent
                      ? nextExercise
                        ? 'Prossimo esercizio in arrivo'
                        : 'Ultima serie completata'
                      : `Prossima: serie ${Math.min(state.setNumber + 1, totalSetsForCurrent)}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch({ type: 'ADJUST_REST', delta: -15 })}
                  className="rounded-full border-app-border text-app-foreground hover:bg-app-muted"
                >
                  −15s
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch({ type: 'ADJUST_REST', delta: 15 })}
                  className="rounded-full border-app-border text-app-foreground hover:bg-app-muted"
                >
                  +15s
                </Button>
              </div>

              <button
                onClick={() => dispatch({ type: 'SKIP_REST' })}
                className="text-sm text-app-muted-foreground hover:text-app-foreground transition-colors flex items-center gap-1"
              >
                <ChevronsRight className="h-4 w-4" />
                Salta recupero
              </button>
            </motion.div>
          )}

          {state.flow === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-app-accent/10 flex items-center justify-center mb-4">
                <PartyPopper className="h-10 w-10 text-app-accent" />
              </div>
              <h2 className="text-2xl font-bold text-app-foreground mb-2">
                Allenamento completato
              </h2>
              <p className="text-sm text-app-muted-foreground">
                Stai per vedere il riepilogo…
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next exercise slide-up preview (last rest only) */}
        <NextExercisePreview show={showNextPreview} next={nextPreviewInfo} />

        {/* Transition micro-feedback */}
        <AnimatePresence>
          {state.transitionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 bg-app-accent/10 text-app-accent text-xs font-medium px-3 py-1 rounded-full"
            >
              {state.transitionMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Secondary actions bar */}
      {state.flow !== 'finished' && (
        <div className="border-t border-app-border bg-app-card/40 px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={handleSkipExercise}
            className="text-xs text-app-muted-foreground hover:text-app-foreground transition-colors flex items-center gap-1"
          >
            <SkipForward className="h-4 w-4" />
            Salta esercizio
          </button>

          {state.flow === 'rest' &&
            state.setNumber >= totalSetsForCurrent && (
              <button
                onClick={handleAddExtraSet}
                className="text-xs text-app-accent hover:underline flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Serie extra
              </button>
            )}

          <div className="text-xs text-app-muted-foreground flex items-center gap-1">
            <TimerIcon className="h-3.5 w-3.5" />
            {currentMeta.category || 'Esercizio'}
          </div>
        </div>
      )}
    </div>
    {detailSheet}
    </>
  );
}

// =====================================================
// Helpers
// =====================================================

function parseInitialReps(ex?: GWExercise): number {
  if (!ex) return 0;
  if (ex.prescribed_reps_min) return ex.prescribed_reps_min;
  return 10;
}

function getRampingCoachNote(params: ProtocolConfig | null | undefined): string | null {
  const note = params?.note;
  if (typeof note !== 'string' || note.trim() === '') return null;
  return note;
}

function getEmomLogMetrics(params: ProtocolConfig | null | undefined) {
  const p = params ?? {};
  const rounds =
    typeof p.rounds === 'number' && p.rounds > 0 ? Math.floor(p.rounds) : 0;
  const roundDuration =
    typeof p.round_duration === 'number' && p.round_duration > 0
      ? Math.floor(p.round_duration)
      : typeof p.duration_minutes === 'number'
        ? Math.floor(p.duration_minutes * 60)
        : 0;
  return { rounds, roundDuration };
}

const RPE_LABELS: Record<number, string> = {
  6: 'Facile',
  7: 'Moderato',
  8: 'Impegnativo',
  9: 'Molto duro',
  10: 'Massimale',
};

function RpeSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-app-foreground font-medium">RPE (sforzo percepito)</span>
        <span className="text-sm text-app-accent font-semibold">{value}/10</span>
      </div>
      <div className="flex gap-1.5">
        {[6, 7, 8, 9, 10].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              value === val
                ? 'bg-app-accent text-app-accent-foreground'
                : 'bg-app-muted text-app-muted-foreground hover:bg-app-muted/80',
            )}
          >
            {val}
          </button>
        ))}
      </div>
      <p className="text-xs text-app-muted-foreground text-center">
        {RPE_LABELS[value] || ''}
      </p>
    </div>
  );
}

function formatRepsLabel(ex: GWExercise): string {
  if (ex.prescribed_reps_min && ex.prescribed_reps_max) {
    return `${ex.prescribed_reps_min}-${ex.prescribed_reps_max}`;
  }
  if (ex.prescribed_reps_min) return `${ex.prescribed_reps_min}`;
  return '—';
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-app-card border border-app-border rounded-xl py-2 px-1">
      <p className="text-[10px] uppercase tracking-wider text-app-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-bold text-app-foreground tabular-nums">{value}</p>
    </div>
  );
}

function NumberRow({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-app-foreground font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(value - step)}
          className="h-10 w-10 rounded-full border-app-border"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) =>
            onChange(step === 1 ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)
          }
          className="w-20 text-center bg-app-muted border-app-border text-app-foreground text-xl font-bold"
          step={step}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(value + step)}
          className="h-10 w-10 rounded-full border-app-border"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default GuidedWorkoutFlow;
