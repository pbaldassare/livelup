// =====================================================
// ATLETA EMOM PLAYER
// Player dedicato per esercizi con protocol_type === 'EMOM'.
// Mostra un round alla volta. Alterna i blocchi in loop:
//   currentBlock = blocks[(round - 1) % blocks.length]
// Pulsanti: Start, Pausa/Riprendi, Prossimo round.
// A fine ultimo round chiama onFinished().
// =====================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExerciseHeader } from '@/components/app/ExerciseHeader';
import {
  normalizeEmomParams,
  formatRoundDurationSeconds,
} from '@/lib/protocols/emom';

interface AtletaEmomPlayerProps {
  exerciseName: string;
  protocolParams: Record<string, unknown> | null | undefined;
  onFinished: () => void;
  notes?: string | null;
  onShowDetails?: () => void;
  /** Scheda progressiva: reserved for future tighter EMOM gates */
  requireFullCompletion?: boolean;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function formatReps(reps: number): string {
  return reps === 1 ? '1 ripetizione' : `${reps} ripetizioni`;
}

export function AtletaEmomPlayer({
  exerciseName,
  protocolParams,
  onFinished,
  notes,
  onShowDetails,
  requireFullCompletion: _requireFullCompletion = false,
}: AtletaEmomPlayerProps) {
  const emom = useMemo(
    () => normalizeEmomParams(protocolParams ?? {}, exerciseName),
    [protocolParams, exerciseName],
  );

  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(emom.round_duration);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const finishedRef = useRef(false);

  const currentBlock = emom.blocks[(round - 1) % emom.blocks.length];
  const blockLabel =
    currentBlock?.label?.trim() ||
    `Blocco ${((round - 1) % emom.blocks.length) + 1}`;

  // Tick 1Hz
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  // Round transition / finish
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (round < emom.rounds) {
      setRound((r) => r + 1);
      setSecondsLeft(emom.round_duration);
    } else if (!finishedRef.current) {
      finishedRef.current = true;
      setIsRunning(false);
      onFinished();
    }
  }, [secondsLeft, round, emom.rounds, emom.round_duration, onFinished]);

  const handleStart = () => {
    setHasStarted(true);
    setIsRunning(true);
  };

  const handleTogglePause = () => setIsRunning((v) => !v);

  const handleNextRound = () => {
    if (round >= emom.rounds) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        setIsRunning(false);
        onFinished();
      }
      return;
    }
    setRound((r) => r + 1);
    setSecondsLeft(emom.round_duration);
  };

  const progressPct =
    emom.round_duration > 0
      ? ((emom.round_duration - secondsLeft) / emom.round_duration) * 100
      : 0;

  return (
    <div className="flex flex-col items-center px-5 py-6">
      <ExerciseHeader
        name={exerciseName}
        protocolType="EMOM"
        notes={notes ?? null}
        onShowDetails={onShowDetails}
        size="md"
        align="center"
        className="mb-3"
      />
      {/* Counter round */}
      <p className="text-xs uppercase tracking-[0.2em] text-app-muted-foreground mb-2">
        Round {round} di {emom.rounds}
      </p>
      <p className="text-sm text-app-muted-foreground mb-6">
        EMOM · round da {formatRoundDurationSeconds(emom.round_duration)}
      </p>

      {/* Timer */}
      <div className="relative w-56 h-56 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="hsl(var(--app-border))"
            strokeWidth="6"
          />
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
        <div
          role="timer"
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="text-5xl font-black text-app-foreground tabular-nums">
            {formatClock(secondsLeft)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-app-muted-foreground mt-1">
            {isRunning ? 'In corso' : hasStarted ? 'In pausa' : 'Pronto'}
          </span>
        </div>
      </div>

      {/* Blocco corrente */}
      <div className="w-full max-w-md rounded-2xl border border-app-border/70 bg-app-card/60 p-4 mb-6">
        <p className="text-sm font-bold text-app-foreground mb-2">{blockLabel}</p>
        <ul className="space-y-1.5">
          {currentBlock?.exercises.map((ex) => (
            <li
              key={ex.id}
              className="flex items-baseline gap-2 text-sm text-app-foreground/90"
            >
              <span className="text-app-accent">•</span>
              <span className="flex-1">
                <span className="font-semibold">
                  {ex.name?.trim() || exerciseName || 'Esercizio'}
                </span>
                <span className="text-app-muted-foreground">
                  {' '}
                  {formatReps(ex.reps)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Controlli */}
      <div className="w-full max-w-md flex flex-col gap-3">
        {!hasStarted ? (
          <Button
            onClick={handleStart}
            className="w-full h-14 rounded-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 text-base font-semibold"
          >
            <Play className="h-5 w-5 mr-2" />
            Inizia EMOM
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleTogglePause}
              className={cn(
                'h-12 rounded-full font-semibold',
                'border-app-border text-app-foreground hover:bg-app-muted',
              )}
              aria-label={isRunning ? 'Metti in pausa' : 'Riprendi'}
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
              variant="secondary"
              onClick={handleNextRound}
              className="h-12 rounded-full font-semibold"
              aria-label="Prossimo round"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              {round >= emom.rounds ? 'Termina' : 'Prossimo round'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
