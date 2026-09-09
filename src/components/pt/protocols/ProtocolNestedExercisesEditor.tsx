// =====================================================
// Lista esercizi annidata — riusabile in ogni protocollo
// senza editor dedicato (Ladder, Dead Ladder, Ramping, RxT…).
// =====================================================

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type NestedProtocolExercise,
  makeNestedExercise,
} from '@/lib/protocols/nestedExercises';
import {
  type ProtocolExercisePickerProps,
} from '@/components/pt/protocols/ProtocolExerciseCombobox';
import { ProtocolExerciseRow } from '@/components/pt/protocols/ProtocolExerciseRow';
import { MobileNotesField } from '@/components/pt/MobileNotesField';

interface ProtocolNestedExercisesEditorProps extends ProtocolExercisePickerProps {
  exercises: NestedProtocolExercise[];
  onChange: (next: NestedProtocolExercise[]) => void;
  /** Minimo esercizi (default 1). */
  minCount?: number;
}

export function ProtocolNestedExercisesEditor({
  exercises,
  onChange,
  minCount = 1,
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  catalogOptions = [],
  archiveExerciseOptions,
}: ProtocolNestedExercisesEditorProps) {
  const [autoOpenIndex, setAutoOpenIndex] = useState<number | null>(null);
  const min = Math.max(1, minCount);

  const updateExercise = (idx: number, patch: Partial<NestedProtocolExercise>) => {
    onChange(exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const addExercise = () => {
    const next = [...exercises, makeNestedExercise()];
    onChange(next);
    setAutoOpenIndex(next.length - 1);
  };

  const removeExercise = (idx: number) => {
    if (exercises.length <= min) return;
    onChange(exercises.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Esercizi del protocollo</p>
      {exercises.map((ex, eIdx) => (
        <ProtocolExerciseRow
          key={ex.id}
          className="bg-background"
          exerciseName={ex.name}
          workoutExerciseOptions={workoutExerciseOptions}
          favoriteExerciseOptions={favoriteExerciseOptions}
          mineExerciseOptions={mineExerciseOptions}
          globalExerciseOptions={globalExerciseOptions}
          catalogOptions={catalogOptions}
          archiveExerciseOptions={archiveExerciseOptions}
          onExerciseChange={(opt) =>
            updateExercise(eIdx, { name: opt.name, exercise_id: opt.id })
          }
          target={ex}
          onTargetChange={(next) => updateExercise(eIdx, next)}
          load={ex}
          onLoadChange={(load) => updateExercise(eIdx, load)}
          canRemove={exercises.length > min}
          onRemove={() => removeExercise(eIdx)}
          autoOpen={autoOpenIndex === eIdx}
          onAutoOpenConsumed={() => setAutoOpenIndex(null)}
        >
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Note (opzionali)</Label>
            <MobileNotesField
              value={ex.notes ?? ''}
              rows={3}
              placeholder="Es. focus tecnica, variazione, intensità…"
              onChange={(raw) => updateExercise(eIdx, { notes: raw })}
            />
          </div>
        </ProtocolExerciseRow>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full sm:w-auto"
        onClick={addExercise}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Aggiungi esercizio
      </Button>
    </div>
  );
}
