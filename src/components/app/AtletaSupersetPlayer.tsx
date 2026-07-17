// =====================================================
// ATLETA SUPERSET PLAYER
// Guida l'atleta attraverso supersets × esercizi con recuperi.
// =====================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pause, Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExerciseHeader } from '@/components/app/ExerciseHeader';
import { normalizeSupersetParams } from '@/lib/protocols/superset';

type Phase = 'work' | 'rest_between_exercises' | 'rest_between_supersets';

interface AtletaSupersetPlayerProps {
  exerciseName: string;
  protocolParams: Record<string, unknown> | null | undefined;
  onFinished: () => void;
  notes?: string | null;
  onShowDetails?: () => void;
  /** Scheda progressiva: recuperi restano saltabili */
  requireFullCompletion?: boolean;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

export function AtletaSupersetPlayer({
  exerciseName,
  protocolParams,
  onFinished,
  notes,
  onShowDetails,
  requireFullCompletion: _requireFullCompletion = false,
}: AtletaSupersetPlayerProps) {
  const params = useMemo(
    () => normalizeSupersetParams(protocolParams ?? {}),
    [protocolParams],
  );

  const [supersetIndex, setSupersetIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const finishedRef = useRef(false);

  const currentRow = params.set_data[exerciseIndex];
  const currentCell = currentRow?.sets[supersetIndex];
  const displayName =
    currentRow?.exercise_name?.trim() ||
    params.exercises[exerciseIndex]?.name?.trim() ||
    exerciseName ||
    'Esercizio';

  const isLastExercise = exerciseIndex >= params.exercises_count - 1;
  const isLastSuperset = supersetIndex >= params.supersets_count - 1;

  useEffect(() => {
    if (!isRunning || phase === 'work') return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [isRunning, phase]);

  useEffect(() => {
    if (phase === 'work' || secondsLeft > 0 || !isRunning) return;
    setIsRunning(false);
    advanceAfterRest();
  }, [secondsLeft, phase, isRunning]);

  const advanceAfterRest = () => {
    if (phase === 'rest_between_exercises') {
      setExerciseIndex((i) => i + 1);
      setPhase('work');
      return;
    }
    if (phase === 'rest_between_supersets') {
      setSupersetIndex((s) => s + 1);
      setExerciseIndex(0);
      setPhase('work');
    }
  };

  const finishWorkout = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsRunning(false);
    onFinished();
  };

  const handleCompleteExercise = () => {
    if (!isLastExercise && params.rest_between_exercises_enabled && params.rest_between_exercises) {
      setPhase('rest_between_exercises');
      setSecondsLeft(params.rest_between_exercises);
      setIsRunning(true);
      return;
    }

    if (isLastExercise && !isLastSuperset && params.rest_between_supersets > 0) {
      setPhase('rest_between_supersets');
      setSecondsLeft(params.rest_between_supersets);
      setIsRunning(true);
      return;
    }

    if (isLastExercise && isLastSuperset) {
      finishWorkout();
      return;
    }

    if (!isLastExercise) {
      setExerciseIndex((i) => i + 1);
    } else {
      setSupersetIndex((s) => s + 1);
      setExerciseIndex(0);
    }
    setPhase('work');
  };

  const handleSkipRest = () => {
    setIsRunning(false);
    setSecondsLeft(0);
    advanceAfterRest();
  };

  const phaseLabel =
    phase === 'work'
      ? 'Esercizio'
      : phase === 'rest_between_exercises'
        ? 'Recupero tra esercizi'
        : 'Recupero tra supersets';

  return (
    <div className="flex flex-col items-center px-5 py-6">
      <ExerciseHeader
        name={exerciseName}
        protocolType="SUPERSET"
        notes={notes ?? null}
        onShowDetails={onShowDetails}
        size="md"
        align="center"
        className="mb-3"
      />

      <p className="text-xs uppercase tracking-[0.2em] text-app-muted-foreground mb-2">
        Superset {supersetIndex + 1} di {params.supersets_count}
      </p>
      <p className="text-sm text-app-muted-foreground mb-6">
        Esercizio {exerciseIndex + 1} di {params.exercises_count} · {phaseLabel}
      </p>

      {phase === 'work' ? (
        <>
          <div className="w-full max-w-md rounded-2xl border border-app-border/70 bg-app-card/60 p-6 mb-8 text-center">
            <p className="text-xl font-bold text-app-foreground mb-3">{displayName}</p>
            <p className="text-3xl font-black text-app-accent tabular-nums">
              {currentCell?.reps ?? params.exercises[exerciseIndex]?.reps ?? 10} reps
            </p>
            {(currentCell?.weight ?? params.exercises[exerciseIndex]?.weight) != null && (
              <p className="text-sm text-app-muted-foreground mt-2">
                {currentCell?.weight ?? params.exercises[exerciseIndex]?.weight} kg
              </p>
            )}
          </div>

          <div className="w-full max-w-md flex flex-col gap-3">
            {!hasStarted ? (
              <Button
                onClick={() => setHasStarted(true)}
                className="w-full h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
              >
                <Play className="h-5 w-5 mr-2" />
                Inizia superset
              </Button>
            ) : (
              <Button
                onClick={handleCompleteExercise}
                className="w-full h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
              >
                <Check className="h-5 w-5 mr-2" />
                Completato
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="relative w-56 h-56 mb-8">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-app-foreground tabular-nums">
                {formatClock(secondsLeft)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-app-muted-foreground mt-1">
                {isRunning ? 'Recupero' : 'In pausa'}
              </span>
            </div>
          </div>

          <div className="w-full max-w-md flex flex-col gap-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsRunning((v) => !v)}
                className="flex-1 h-12 rounded-full border-app-border"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausa
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Riprendi
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleSkipRest}
                className="flex-1 h-12 rounded-full border-app-border"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Salta
              </Button>
            </div>
          </div>
        </>
      )}

      {hasStarted && phase === 'work' && (
        <ul className="w-full max-w-md mt-8 space-y-1">
          {params.exercises.map((ex, idx) => (
            <li
              key={ex.id}
              className={cn(
                'text-sm px-3 py-1.5 rounded-lg',
                idx === exerciseIndex
                  ? 'bg-app-accent/10 text-app-foreground font-medium'
                  : 'text-app-muted-foreground',
              )}
            >
              {ex.name?.trim() || `Esercizio ${idx + 1}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
