// =====================================================
// ATLETA TIMED ROUNDS PLAYER
// Player condiviso per HIIT e TABATA.
// Sequenza per round: E1 (work) → rest_ex → E2 → rest_ex → … → En
//   r < R → rest_round → round r+1
//   r = R → onFinished() auto-advance (no schermata finale, no bottone).
// =====================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExerciseHeader } from '@/components/app/ExerciseHeader';
import {
  normalizeTimedRoundsParams,
  type TimedRoundsParams,
} from '@/lib/protocols/timedRounds';

type Phase = 'work' | 'rest_between_exercises' | 'rest_between_rounds';

interface AtletaTimedRoundsPlayerProps {
  protocolLabel: 'HIIT' | 'TABATA';
  exerciseName: string;
  protocolParams: Record<string, unknown> | null | undefined;
  onFinished: (summary: {
    roundsCompleted: number;
    totalDurationSeconds: number;
  }) => void;
  notes?: string | null;
  onShowDetails?: () => void;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function phaseDuration(params: TimedRoundsParams, phase: Phase): number {
  switch (phase) {
    case 'work':
      return params.exercise_duration_seconds;
    case 'rest_between_exercises':
      return params.rest_between_exercises_seconds;
    case 'rest_between_rounds':
      return params.rest_between_rounds_seconds;
  }
}

function exerciseDisplayName(
  params: TimedRoundsParams,
  index: number,
  fallback: string,
): string {
  const ex = params.exercises[index];
  return ex?.name?.trim() || fallback || 'Esercizio';
}

export function AtletaTimedRoundsPlayer({
  protocolLabel,
  exerciseName,
  protocolParams,
  onFinished,
  notes,
  onShowDetails,
}: AtletaTimedRoundsPlayerProps) {
  const params = useMemo(
    () => normalizeTimedRoundsParams(protocolParams ?? {}),
    [protocolParams],
  );

  const totalExercises = params.exercises.length;
  const totalRounds = params.rounds;

  const [phase, setPhase] = useState<Phase>('work');
  const [round, setRound] = useState(1);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [phaseTotal, setPhaseTotal] = useState(params.exercise_duration_seconds);
  const [secondsLeft, setSecondsLeft] = useState(params.exercise_duration_seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Refs robusti
  const isCompletingRef = useRef(false);
  const accumulatedWorkSecondsRef = useRef(0);
  const phaseStartedAtRef = useRef<number | null>(null);
  const phaseTotalRef = useRef(phaseTotal);
  phaseTotalRef.current = phaseTotal;

  const finish = () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    setIsRunning(false);
    onFinished({
      roundsCompleted: totalRounds,
      totalDurationSeconds: accumulatedWorkSecondsRef.current,
    });
  };

  // Setta una nuova fase (con skip automatico se duration === 0)
  const enterPhase = (
    nextPhase: Phase,
    nextRound: number,
    nextExerciseIndex: number,
  ) => {
    const dur = phaseDuration(params, nextPhase);
    if (dur <= 0) {
      // skip immediato
      advanceFrom(nextPhase, nextRound, nextExerciseIndex);
      return;
    }
    setPhase(nextPhase);
    setRound(nextRound);
    setExerciseIndex(nextExerciseIndex);
    setPhaseTotal(dur);
    setSecondsLeft(dur);
    phaseStartedAtRef.current = isRunning || !hasStarted ? Date.now() : null;
  };

  // Calcola la fase successiva a partire da una fase appena completata
  const advanceFrom = (
    completedPhase: Phase,
    curRound: number,
    curExerciseIndex: number,
  ) => {
    if (isCompletingRef.current) return;

    if (completedPhase === 'work') {
      accumulatedWorkSecondsRef.current += params.exercise_duration_seconds;
      if (curExerciseIndex < totalExercises - 1) {
        enterPhase('rest_between_exercises', curRound, curExerciseIndex);
        return;
      }
      if (curRound < totalRounds) {
        enterPhase('rest_between_rounds', curRound, curExerciseIndex);
        return;
      }
      finish();
      return;
    }

    if (completedPhase === 'rest_between_exercises') {
      enterPhase('work', curRound, curExerciseIndex + 1);
      return;
    }

    // rest_between_rounds
    enterPhase('work', curRound + 1, 0);
  };

  const advancePhase = () => {
    if (isCompletingRef.current) return;
    advanceFrom(phase, round, exerciseIndex);
  };

  // Timer timestamp-based (250ms), un solo interval attivo
  useEffect(() => {
    if (!isRunning) return;
    if (phaseStartedAtRef.current === null) {
      phaseStartedAtRef.current = Date.now() - (phaseTotalRef.current - secondsLeft) * 1000;
    }
    const id = setInterval(() => {
      const started = phaseStartedAtRef.current;
      if (started === null) return;
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = phaseTotalRef.current - elapsed;
      if (left <= 0) {
        // ferma il tick e avanza una sola volta
        setSecondsLeft(0);
        phaseStartedAtRef.current = null;
        advancePhase();
      } else {
        setSecondsLeft(left);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, phase, round, exerciseIndex]);

  const handleStart = () => {
    setHasStarted(true);
    phaseStartedAtRef.current = Date.now();
    setIsRunning(true);
  };

  const handleTogglePause = () => {
    setIsRunning((v) => {
      const next = !v;
      if (next) {
        // riprende: ricostruisce l'origine in base ai secondi rimasti
        phaseStartedAtRef.current = Date.now() - (phaseTotalRef.current - secondsLeft) * 1000;
      } else {
        phaseStartedAtRef.current = null;
      }
      return next;
    });
  };

  const handleSkip = () => {
    if (isCompletingRef.current) return;
    phaseStartedAtRef.current = null;
    advancePhase();
  };

  const progressPct =
    phaseTotal > 0 ? ((phaseTotal - secondsLeft) / phaseTotal) * 100 : 0;

  const currentName = exerciseDisplayName(params, exerciseIndex, exerciseName);
  const nextLabel = (() => {
    if (phase === 'work') {
      if (exerciseIndex < totalExercises - 1) {
        return `Prossimo: ${exerciseDisplayName(params, exerciseIndex + 1, exerciseName)}`;
      }
      if (round < totalRounds) return `Prossimo round: ${round + 1} di ${totalRounds}`;
      return 'Ultimo esercizio';
    }
    if (phase === 'rest_between_exercises') {
      return `Prossimo: ${exerciseDisplayName(params, exerciseIndex + 1, exerciseName)}`;
    }
    return `Round ${round + 1} di ${totalRounds} — ${exerciseDisplayName(params, 0, exerciseName)}`;
  })();

  const phaseLabel =
    !hasStarted
      ? 'Pronto'
      : !isRunning
        ? 'In pausa'
        : phase === 'work'
          ? 'Lavoro'
          : phase === 'rest_between_exercises'
            ? 'Recupero'
            : 'Recupero round';

  const ringColor =
    phase === 'work' ? 'hsl(var(--app-accent))' : 'hsl(var(--app-muted-foreground))';

  return (
    <div className="flex flex-col items-center px-5 py-6">
      <ExerciseHeader
        name={exerciseName}
        protocolType={protocolLabel}
        notes={notes ?? null}
        onShowDetails={onShowDetails}
        size="md"
        align="center"
        className="mb-3"
      />
      <p className="text-xs uppercase tracking-[0.2em] text-app-muted-foreground mb-2">
        {protocolLabel} · Round {round} di {totalRounds}
      </p>
      <p className="text-sm text-app-muted-foreground mb-6">
        Esercizio {Math.min(exerciseIndex + 1, totalExercises)} di {totalExercises}
      </p>

      <div className="relative w-56 h-56 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--app-border))" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            strokeDashoffset={(2 * Math.PI * 46) * (1 - progressPct / 100)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        <div role="timer" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-app-foreground tabular-nums">
            {formatClock(secondsLeft)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-app-muted-foreground mt-1">
            {phaseLabel}
          </span>
        </div>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-app-border/70 bg-app-card/60 p-4 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-app-muted-foreground mb-1">
          {phase === 'work' ? 'Esercizio corrente' : 'Recupero'}
        </p>
        <p className="text-base font-bold text-app-foreground">
          {phase === 'work' ? currentName : 'Riposo'}
        </p>
        <p className="text-sm text-app-muted-foreground mt-1">{nextLabel}</p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-3">
        {!hasStarted ? (
          <Button
            onClick={handleStart}
            className="w-full h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
          >
            <Play className="h-5 w-5 mr-2" />
            Inizia {protocolLabel}
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleTogglePause}
              className={cn('h-12 rounded-full font-semibold', 'border-app-border text-app-foreground hover:bg-app-muted')}
              aria-label={isRunning ? 'Metti in pausa' : 'Riprendi'}
            >
              {isRunning ? (
                <><Pause className="h-4 w-4 mr-2" />Pausa</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Riprendi</>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSkip}
              className="h-12 rounded-full font-semibold"
              aria-label="Salta fase"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Salta fase
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
