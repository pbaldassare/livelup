// =====================================================
// ATLETA AMRAP PLAYER
// Timer globale + conteggio round manuali.
// Cicla gli esercizi della lista ad ogni round completato.
// =====================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExerciseHeader } from '@/components/app/ExerciseHeader';
import {
  formatAmrapDurationSeconds,
  normalizeAmrapParams,
} from '@/lib/protocols/amrap';

interface AtletaAmrapPlayerProps {
  exerciseName: string;
  protocolParams: Record<string, unknown> | null | undefined;
  onFinished: (summary: { roundsCompleted: number; totalDurationSeconds: number }) => void;
  notes?: string | null;
  onShowDetails?: () => void;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

export function AtletaAmrapPlayer({
  exerciseName,
  protocolParams,
  onFinished,
  notes,
  onShowDetails,
}: AtletaAmrapPlayerProps) {
  const params = useMemo(
    () => normalizeAmrapParams(protocolParams ?? {}),
    [protocolParams],
  );

  const [secondsLeft, setSecondsLeft] = useState(params.duration_seconds);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const finishedRef = useRef(false);
  const elapsedRef = useRef(0);

  const currentExerciseIndex =
    params.exercises.length > 0 ? roundsCompleted % params.exercises.length : 0;
  const currentExercise = params.exercises[currentExerciseIndex];

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => s - 1);
      elapsedRef.current += 1;
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft > 0 || finishedRef.current) return;
    finishedRef.current = true;
    setIsRunning(false);
    onFinished({
      roundsCompleted,
      totalDurationSeconds: elapsedRef.current || params.duration_seconds,
    });
  }, [secondsLeft, roundsCompleted, onFinished, params.duration_seconds]);

  const handleStart = () => {
    setHasStarted(true);
    setIsRunning(true);
  };

  const handleCompleteRound = () => {
    setRoundsCompleted((r) => r + 1);
  };

  const handleFinishEarly = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsRunning(false);
    onFinished({
      roundsCompleted,
      totalDurationSeconds: elapsedRef.current,
    });
  };

  const progressPct =
    params.duration_seconds > 0
      ? ((params.duration_seconds - secondsLeft) / params.duration_seconds) * 100
      : 0;

  return (
    <div className="flex flex-col items-center px-5 py-6">
      <ExerciseHeader
        name={exerciseName}
        protocolType="AMRAP"
        notes={notes ?? null}
        onShowDetails={onShowDetails}
        size="md"
        align="center"
        className="mb-3"
      />

      <p className="text-xs uppercase tracking-[0.2em] text-app-muted-foreground mb-2">
        Round completati: {roundsCompleted}
      </p>
      <p className="text-sm text-app-muted-foreground mb-6">
        AMRAP · {formatAmrapDurationSeconds(params.duration_seconds)} totali
      </p>

      <div className="relative w-56 h-56 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--app-border))" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="hsl(var(--app-accent))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            strokeDashoffset={(2 * Math.PI * 46) * (1 - progressPct / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-linear"
          />
        </svg>
        <div role="timer" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-app-foreground tabular-nums">
            {formatClock(secondsLeft)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-app-muted-foreground mt-1">
            {isRunning ? 'In corso' : hasStarted ? 'In pausa' : 'Pronto'}
          </span>
        </div>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-app-border/70 bg-app-card/60 p-4 mb-6">
        <p className="text-sm font-bold text-app-foreground mb-2">Round corrente</p>
        <ul className="space-y-1.5">
          {params.exercises.map((ex, idx) => (
            <li
              key={ex.id}
              className={cn(
                'flex items-baseline gap-2 text-sm',
                idx === currentExerciseIndex
                  ? 'text-app-foreground font-semibold'
                  : 'text-app-muted-foreground',
              )}
            >
              <span className={idx === currentExerciseIndex ? 'text-app-accent' : 'text-app-border'}>
                •
              </span>
              <span className="flex-1">
                {ex.name?.trim() || exerciseName || 'Esercizio'}
                <span className="text-app-muted-foreground font-normal"> · {ex.reps} reps</span>
              </span>
            </li>
          ))}
        </ul>
        {currentExercise?.weight != null && currentExercise.weight > 0 && (
          <p className="text-xs text-app-muted-foreground mt-2">
            Peso suggerito: {currentExercise.weight} kg
          </p>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col gap-3">
        {!hasStarted ? (
          <Button
            onClick={handleStart}
            className="w-full h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
          >
            <Play className="h-5 w-5 mr-2" />
            Inizia AMRAP
          </Button>
        ) : (
          <>
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
                onClick={handleCompleteRound}
                className="flex-1 h-12 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Round fatto
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={handleFinishEarly}
              className="text-app-muted-foreground"
            >
              Termina anticipatamente
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
