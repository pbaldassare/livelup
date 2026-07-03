// =====================================================
// EMOM BLOCKS EDITOR (v2)
// - 3 parametri globali in alto: rounds, round_duration, blocks_count.
// - blocks_count è la fonte di verità: sincronizzato con blocks.length.
// - Ogni blocco contiene esercizi con SOLO: dropdown esercizio + reps.
// - Il dropdown viene popolato da `exerciseOptions` (tutti gli esercizi del workout).
// - Nessuna scrittura automatica: ogni edit chiama onChange esplicitamente.
// =====================================================

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type EmomParams,
  type EmomBlock,
  type EmomBlockExercise,
  makeEmomBlock,
  makeEmomExercise,
  syncBlocksCount,
  autoBlockLabel,
  formatRoundDurationSeconds,
} from '@/lib/protocols/emom';
import {
  ProtocolExerciseCombobox,
  type ProtocolExerciseOption,
  type ProtocolExercisePickerProps,
} from '@/components/pt/protocols/ProtocolExerciseCombobox';

export type EmomExerciseOption = ProtocolExerciseOption;

interface EmomBlocksEditorProps extends ProtocolExercisePickerProps {
  value: EmomParams;
  onChange: (next: EmomParams) => void;
  /** @deprecated */
  exerciseOptions?: EmomExerciseOption[];
}

/** Helper: applica un patch garantendo l'invariante blocks.length === blocks_count. */
function commit(
  base: EmomParams,
  patch: Partial<EmomParams>,
  onChange: (n: EmomParams) => void,
) {
  const merged: EmomParams = { ...base, ...patch };
  // Se cambia blocks_count → sincronizza blocks
  if (patch.blocks_count !== undefined && patch.blocks === undefined) {
    merged.blocks = syncBlocksCount(merged.blocks, merged.blocks_count);
  }
  // Se cambiano blocks → forza blocks_count = blocks.length
  if (patch.blocks !== undefined) {
    merged.blocks_count = merged.blocks.length;
  }
  onChange(merged);
}

export function EmomBlocksEditor({
  value,
  onChange,
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  exerciseOptions,
}: EmomBlocksEditorProps) {
  const workoutOpts = workoutExerciseOptions.length > 0 ? workoutExerciseOptions : (exerciseOptions ?? []);
  const updateBlock = (idx: number, patch: Partial<EmomBlock>) => {
    const blocks = value.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    commit(value, { blocks }, onChange);
  };

  const updateExercise = (
    blockIdx: number,
    exIdx: number,
    patch: Partial<EmomBlockExercise>,
  ) => {
    const blocks = value.blocks.map((b, i) => {
      if (i !== blockIdx) return b;
      const exercises = b.exercises.map((e, j) => (j === exIdx ? { ...e, ...patch } : e));
      return { ...b, exercises };
    });
    commit(value, { blocks }, onChange);
  };

  const addBlock = () => {
    const blocks = [...value.blocks, makeEmomBlock()];
    commit(value, { blocks }, onChange);
  };

  const removeBlock = (idx: number) => {
    if (value.blocks.length <= 1) return;
    const blocks = value.blocks.filter((_, i) => i !== idx);
    commit(value, { blocks }, onChange);
  };

  const addExercise = (blockIdx: number) => {
    const blocks = value.blocks.map((b, i) =>
      i === blockIdx ? { ...b, exercises: [...b.exercises, makeEmomExercise()] } : b,
    );
    commit(value, { blocks }, onChange);
  };

  const removeExercise = (blockIdx: number, exIdx: number) => {
    const blocks = value.blocks.map((b, i) => {
      if (i !== blockIdx) return b;
      if (b.exercises.length <= 1) return b;
      return { ...b, exercises: b.exercises.filter((_, j) => j !== exIdx) };
    });
    commit(value, { blocks }, onChange);
  };

  const durationLabel = formatRoundDurationSeconds(value.round_duration);

  return (
    <div className="rounded-md border bg-muted/20 p-2.5 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Configurazione EMOM</p>

      {/* Parametri globali */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Numero round</Label>
          <Input
            type="number"
            min={1}
            value={value.rounds}
            onChange={(e) => {
              const n = Number(e.target.value);
              commit(
                value,
                { rounds: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1 },
                onChange,
              );
            }}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Durata round (s) <span className="text-muted-foreground">· {durationLabel}</span>
          </Label>
          <Input
            type="number"
            min={10}
            step={5}
            value={value.round_duration}
            onChange={(e) => {
              const n = Number(e.target.value);
              commit(
                value,
                { round_duration: Number.isFinite(n) && n >= 10 ? Math.floor(n) : 10 },
                onChange,
              );
            }}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Numero blocchi</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={value.blocks_count}
            onChange={(e) => {
              const n = Number(e.target.value);
              const clamped = Number.isFinite(n) ? Math.min(10, Math.max(1, Math.floor(n))) : 1;
              commit(value, { blocks_count: clamped }, onChange);
            }}
            className="h-8"
          />
        </div>
      </div>

      {/* Blocchi */}
      <div className="space-y-2">
        {value.blocks.map((block, bIdx) => {
          const defaultLabel = autoBlockLabel(bIdx);
          return (
            <div key={block.id} className="rounded-md border bg-background p-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground/80 shrink-0 w-16">
                  {defaultLabel}
                </span>
                <Input
                  placeholder="Etichetta opzionale"
                  value={block.label ?? ''}
                  onChange={(e) => updateBlock(bIdx, { label: e.target.value || undefined })}
                  className="h-8 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  disabled={value.blocks.length <= 1}
                  onClick={() => removeBlock(bIdx)}
                  aria-label="Elimina blocco"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                {block.exercises.map((ex, eIdx) => (
                  <div
                    key={ex.id}
                    className="grid grid-cols-12 gap-1.5 items-end rounded-md border border-dashed bg-muted/20 p-1.5"
                  >
                    <div className="col-span-12 md:col-span-8 space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Esercizio</Label>
                      <ProtocolExerciseCombobox
                        value={ex.name}
                        workoutExerciseOptions={workoutOpts}
                        favoriteExerciseOptions={favoriteExerciseOptions}
                        mineExerciseOptions={mineExerciseOptions}
                        globalExerciseOptions={globalExerciseOptions}
                        onChange={(opt) =>
                          updateExercise(bIdx, eIdx, {
                            name: opt.name,
                            exercise_id: opt.id,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-9 md:col-span-3 space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Ripetizioni</Label>
                      <Input
                        type="number"
                        min={1}
                        value={ex.reps}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          updateExercise(bIdx, eIdx, {
                            reps: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1,
                          });
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        disabled={block.exercises.length <= 1}
                        onClick={() => removeExercise(bIdx, eIdx)}
                        aria-label="Elimina esercizio"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => addExercise(bIdx)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Aggiungi esercizio
              </Button>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="secondary" size="sm" className="h-8" onClick={addBlock}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Aggiungi blocco
      </Button>
    </div>
  );
}
