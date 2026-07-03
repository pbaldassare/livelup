// =====================================================
// TIMED ROUNDS EDITOR — Shared editor per HIIT e TABATA (PT)
// L'unica differenza tra HIIT e TABATA in questo step è il `title`.
// =====================================================

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type TimedRoundsParams,
  type TimedRoundsExercise,
  makeTimedRoundsExercise,
  syncExercisesCount,
} from '@/lib/protocols/timedRounds';
import {
  ProtocolExerciseCombobox,
  type ProtocolExerciseOption,
  type ProtocolExercisePickerProps,
} from '@/components/pt/protocols/ProtocolExerciseCombobox';

export type TimedRoundsExerciseOption = ProtocolExerciseOption;

interface TimedRoundsEditorProps extends ProtocolExercisePickerProps {
  value: TimedRoundsParams;
  onChange: (next: TimedRoundsParams) => void;
  /** @deprecated */
  exerciseOptions?: TimedRoundsExerciseOption[];
  title?: string;
}

function commit(
  base: TimedRoundsParams,
  patch: Partial<TimedRoundsParams>,
  onChange: (n: TimedRoundsParams) => void,
) {
  let merged: TimedRoundsParams = { ...base, ...patch };
  if (patch.exercises_count !== undefined && patch.exercises === undefined) {
    merged.exercises = syncExercisesCount(merged.exercises, merged.exercises_count);
  }
  if (patch.exercises !== undefined) {
    merged.exercises_count = merged.exercises.length;
  }
  onChange(merged);
}

export function TimedRoundsEditor({
  value,
  onChange,
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  exerciseOptions,
  title = 'Intervalli a tempo',
}: TimedRoundsEditorProps) {
  const workoutOpts = workoutExerciseOptions.length > 0 ? workoutExerciseOptions : (exerciseOptions ?? []);
  const updateExercise = (idx: number, patch: Partial<TimedRoundsExercise>) => {
    const exercises = value.exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    commit(value, { exercises }, onChange);
  };

  const addExercise = () => {
    const exercises = [...value.exercises, makeTimedRoundsExercise()];
    commit(value, { exercises }, onChange);
  };

  const removeExercise = (idx: number) => {
    if (value.exercises.length <= 1) return;
    const exercises = value.exercises.filter((_, i) => i !== idx);
    commit(value, { exercises }, onChange);
  };

  const setNum = (
    key: keyof TimedRoundsParams,
    raw: string,
    min: number,
  ) => {
    const n = Math.max(min, Math.floor(Number(raw) || 0));
    commit(value, { [key]: n } as Partial<TimedRoundsParams>, onChange);
  };

  return (
    <div className="rounded-md border bg-muted/20 p-2.5 space-y-3 min-w-0 max-w-full overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground">Configurazione {title}</p>

      {/* A — Dati generali */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Numero esercizi</Label>
          <Input
            type="number"
            min={1}
            value={value.exercises_count}
            onChange={(e) => setNum('exercises_count', e.target.value, 1)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Durata esercizio (s)</Label>
          <Input
            type="number"
            min={1}
            step={5}
            value={value.exercise_duration_seconds}
            onChange={(e) => setNum('exercise_duration_seconds', e.target.value, 1)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recupero tra esercizi (s)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={value.rest_between_exercises_seconds}
            onChange={(e) => setNum('rest_between_exercises_seconds', e.target.value, 0)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recupero tra round (s)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={value.rest_between_rounds_seconds}
            onChange={(e) => setNum('rest_between_rounds_seconds', e.target.value, 0)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Numero round</Label>
          <Input
            type="number"
            min={1}
            value={value.rounds}
            onChange={(e) => setNum('rounds', e.target.value, 1)}
            className="h-8"
          />
        </div>
      </div>

      {/* B — Lista esercizi */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          Esercizi del round (eseguiti in ordine per ogni round)
        </p>
        {value.exercises.map((ex, eIdx) => (
          <div
            key={ex.id}
            className="rounded-md border border-dashed bg-background p-1.5 space-y-1.5"
          >
            <div className="flex flex-col md:flex-row md:items-end gap-1.5">
              <div className="flex items-center justify-center md:justify-start w-full md:w-8 shrink-0">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {eIdx + 1}.
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">Esercizio</Label>
                <ProtocolExerciseCombobox
                  value={ex.name}
                  workoutExerciseOptions={workoutOpts}
                  favoriteExerciseOptions={favoriteExerciseOptions}
                  mineExerciseOptions={mineExerciseOptions}
                  globalExerciseOptions={globalExerciseOptions}
                  onChange={(opt) =>
                    updateExercise(eIdx, {
                      name: opt.name,
                      exercise_id: opt.id,
                    })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive self-end"
                disabled={value.exercises.length <= 1}
                onClick={() => removeExercise(eIdx)}
                aria-label="Elimina esercizio"
                title="Elimina esercizio"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Note (opzionali)</Label>
              <Input
                value={ex.notes ?? ''}
                placeholder="Es. focus tecnica, variazione, intensità…"
                onChange={(e) => updateExercise(eIdx, { notes: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full md:w-auto gap-1"
          onClick={addExercise}
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi esercizio
        </Button>
      </div>
    </div>
  );
}
