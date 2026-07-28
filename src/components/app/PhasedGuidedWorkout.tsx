import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GuidedWorkoutFlow, type GWExercise } from '@/components/app/GuidedWorkoutFlow';
import {
  normalizeWorkoutPhase,
  WORKOUT_PHASE_LABEL,
  type WorkoutPhase,
} from '@/lib/pt/templateRoles';
import { Flame, Snowflake, Dumbbell, SkipForward } from 'lucide-react';
import type { TemplateKind } from '@/lib/pt/templateKinds';

export type PhasedGWExercise = GWExercise & { phase?: WorkoutPhase | string | null };

type Props = {
  workoutId: string;
  exercises: PhasedGWExercise[];
  initialCompletedSets?: Record<string, number[]>;
  onCompleted: () => void;
  ptOnBehalfMode?: boolean;
  templateKind?: TemplateKind | string | null;
};

const PHASE_ORDER: WorkoutPhase[] = ['warmup', 'main', 'cooldown'];

function phaseIcon(phase: WorkoutPhase) {
  if (phase === 'warmup') return Flame;
  if (phase === 'cooldown') return Snowflake;
  return Dumbbell;
}

export function PhasedGuidedWorkout({
  workoutId,
  exercises,
  initialCompletedSets,
  onCompleted,
  ptOnBehalfMode,
  templateKind,
}: Props) {
  const byPhase = useMemo(() => {
    const map: Record<WorkoutPhase, PhasedGWExercise[]> = {
      warmup: [],
      main: [],
      cooldown: [],
    };
    for (const ex of exercises) {
      map[normalizeWorkoutPhase(ex.phase)].push(ex);
    }
    for (const p of PHASE_ORDER) {
      map[p].sort((a, b) => a.order_index - b.order_index);
    }
    return map;
  }, [exercises]);

  const availablePhases = useMemo(
    () => PHASE_ORDER.filter((p) => byPhase[p].length > 0),
    [byPhase],
  );

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [introDismissed, setIntroDismissed] = useState(false);

  const currentPhase = availablePhases[phaseIndex] ?? 'main';
  const phaseExercises = byPhase[currentPhase];
  const isExtraPhase = currentPhase === 'warmup' || currentPhase === 'cooldown';
  const Icon = phaseIcon(currentPhase);

  const goNextPhaseOrFinish = () => {
    if (phaseIndex >= availablePhases.length - 1) {
      onCompleted();
      return;
    }
    setPhaseIndex((i) => i + 1);
    setIntroDismissed(false);
  };

  // Solo main senza intro: parti subito
  const showIntro = isExtraPhase && !introDismissed;

  if (availablePhases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-6">
        <p className="text-sm text-app-muted">Nessun esercizio in questa scheda.</p>
        <Button onClick={onCompleted}>Chiudi</Button>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-12 text-center min-h-[50vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-accent/15 text-app-accent">
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-semibold text-app-foreground">
            {WORKOUT_PHASE_LABEL[currentPhase]}
          </h2>
          <p className="text-sm text-app-muted">
            {phaseExercises.length}{' '}
            {phaseExercises.length === 1 ? 'esercizio' : 'esercizi'}. Puoi saltare questa fase:
            non conta nel riepilogo della scheda.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            className="w-full bg-app-accent text-app-accent-foreground"
            onClick={() => setIntroDismissed(true)}
          >
            Inizia {WORKOUT_PHASE_LABEL[currentPhase].toLowerCase()}
          </Button>
          <Button variant="ghost" className="w-full gap-2" onClick={goNextPhaseOrFinish}>
            <SkipForward className="h-4 w-4" />
            Salta {WORKOUT_PHASE_LABEL[currentPhase].toLowerCase()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isExtraPhase && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-app-border bg-app-background/95 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-app-foreground">
            <Icon className="h-4 w-4 text-app-accent" />
            {WORKOUT_PHASE_LABEL[currentPhase]}
            <span className="text-xs text-app-muted font-normal">(extra)</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            onClick={goNextPhaseOrFinish}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Salta
          </Button>
        </div>
      )}
      <GuidedWorkoutFlow
        key={`${currentPhase}-${phaseIndex}`}
        workoutId={workoutId}
        exercises={phaseExercises}
        initialCompletedSets={initialCompletedSets}
        onCompleted={goNextPhaseOrFinish}
        ptOnBehalfMode={ptOnBehalfMode}
        templateKind={currentPhase === 'main' ? templateKind : 'libera'}
      />
    </div>
  );
}
