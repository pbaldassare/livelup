// =====================================================
// AMRAP EDITOR — Flat exercise list with global timer
// - 2 parametri globali in alto: duration_seconds, exercises_count
// - exercises_count è una scorciatoia: invariante exercises.length === exercises_count
// - Lista piatta: ExerciseCombobox + Target (Reps|Sec) + Carico
// - Nessuna scrittura automatica: ogni edit chiama onChange esplicitamente
// =====================================================

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type AmrapParams,
  type AmrapExercise,
  makeAmrapExercise,
  syncExercisesCount,
  formatAmrapDurationSeconds,
} from '@/lib/protocols/amrap';
import {
  type ProtocolExerciseOption,
  type ProtocolExercisePickerProps,
} from '@/components/pt/protocols/ProtocolExerciseCombobox';
import { ProtocolExerciseRow } from '@/components/pt/protocols/ProtocolExerciseRow';

export type AmrapExerciseOption = ProtocolExerciseOption;

interface AmrapEditorProps extends ProtocolExercisePickerProps {
  value: AmrapParams;
  onChange: (next: AmrapParams) => void;
  /** @deprecated */
  exerciseOptions?: AmrapExerciseOption[];
}

/** Applica un patch garantendo l'invariante exercises.length === exercises_count. */
function commit(
  base: AmrapParams,
  patch: Partial<AmrapParams>,
  onChange: (n: AmrapParams) => void,
) {
  const merged: AmrapParams = { ...base, ...patch };
  if (patch.exercises_count !== undefined && patch.exercises === undefined) {
    merged.exercises = syncExercisesCount(merged.exercises, merged.exercises_count);
  }
  if (patch.exercises !== undefined) {
    merged.exercises_count = merged.exercises.length;
  }
  onChange(merged);
}

export function AmrapEditor({
  value,
  onChange,
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  exerciseOptions,
}: AmrapEditorProps) {
  const workoutOpts = workoutExerciseOptions.length > 0 ? workoutExerciseOptions : (exerciseOptions ?? []);
  const updateExercise = (idx: number, patch: Partial<AmrapExercise>) => {
    const exercises = value.exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    commit(value, { exercises }, onChange);
  };

  const addExercise = () => {
    const exercises = [...value.exercises, makeAmrapExercise()];
    commit(value, { exercises }, onChange);
  };

  const removeExercise = (idx: number) => {
    if (value.exercises.length <= 1) return;
    const exercises = value.exercises.filter((_, i) => i !== idx);
    commit(value, { exercises }, onChange);
  };

  const durationLabel = formatAmrapDurationSeconds(value.duration_seconds);

  return (
    <div className="rounded-md border bg-muted/20 p-2.5 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Configurazione AMRAP</p>

      {/* Parametri globali */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">
            Durata totale (s) <span className="text-muted-foreground">· {durationLabel}</span>
          </Label>
          <Input
            type="number"
            min={1}
            step={30}
            value={value.duration_seconds}
            onChange={(e) => {
              const n = Number(e.target.value);
              commit(
                value,
                { duration_seconds: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1 },
                onChange,
              );
            }}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Numero esercizi
            <span className="ml-1 text-muted-foreground">· sincronizzato con la lista</span>
          </Label>
          <Input
            type="number"
            min={1}
            value={value.exercises_count}
            onChange={(e) => {
              const n = Number(e.target.value);
              const clamped = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
              commit(value, { exercises_count: clamped }, onChange);
            }}
            className="h-8"
          />
        </div>
      </div>

      {/* Lista esercizi */}
      <div className="space-y-2">
        {value.exercises.map((ex, eIdx) => (
          <ProtocolExerciseRow
            key={ex.id}
            className="bg-background"
            exerciseName={ex.name}
            workoutExerciseOptions={workoutOpts}
            favoriteExerciseOptions={favoriteExerciseOptions}
            mineExerciseOptions={mineExerciseOptions}
            globalExerciseOptions={globalExerciseOptions}
            onExerciseChange={(opt) =>
              updateExercise(eIdx, { name: opt.name, exercise_id: opt.id })
            }
            target={ex}
            onTargetChange={(next) => updateExercise(eIdx, next)}
            load={ex}
            onLoadChange={(load) => updateExercise(eIdx, load)}
            canRemove={value.exercises.length > 1}
            onRemove={() => removeExercise(eIdx)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="h-9 w-full sm:w-auto" onClick={addExercise}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Aggiungi esercizio
      </Button>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        L'atleta eseguirà questa lista di esercizi in loop continuo fino allo scadere del timer
        globale.
      </p>
    </div>
  );
}
