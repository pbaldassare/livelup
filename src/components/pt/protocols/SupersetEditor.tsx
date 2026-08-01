// =====================================================
// SUPERSET EDITOR — Structured editor (PT)
// - Dati generali: esercizi, superset, recuperi
// - Lista esercizi con dropdown dal tab Esercizi del workout
// - Tabella set finale (Set X = Superset X) editabile e fonte di verità runtime
// - commit() centralizza gli invarianti (no scritture automatiche al mount)
// =====================================================

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type SupersetParams,
  type SupersetExercise,
  type SupersetSetCell,
  makeSupersetExercise,
  syncExercisesCount,
  syncSetData,
} from '@/lib/protocols/superset';
import {
  ProtocolExerciseCombobox,
  type ProtocolExerciseOption,
  type ProtocolExercisePickerProps,
} from '@/components/pt/protocols/ProtocolExerciseCombobox';
import { ProtocolTargetField } from '@/components/pt/protocols/ProtocolTargetField';
import { LoadField } from '@/components/pt/LoadField';
import { getProtocolTargetMode } from '@/lib/protocols/exerciseTarget';
import { getLoadMode } from '@/lib/loadPrescription';

export type SupersetExerciseOption = ProtocolExerciseOption;

interface SupersetEditorProps extends ProtocolExercisePickerProps {
  value: SupersetParams;
  onChange: (next: SupersetParams) => void;
  /** @deprecated Usare workoutExerciseOptions + archive groups */
  exerciseOptions?: SupersetExerciseOption[];
}

/**
 * Applica un patch garantendo gli invarianti del protocollo.
 * Centralizza il sync di exercises_count, set_data (righe/colonne),
 * e la propagazione "soft" dei default sopra → tabella.
 */
function commit(
  base: SupersetParams,
  patch: Partial<SupersetParams>,
  onChange: (n: SupersetParams) => void,
) {
  let merged: SupersetParams = { ...base, ...patch };

  // 1. exercises_count vs exercises
  if (patch.exercises_count !== undefined && patch.exercises === undefined) {
    merged.exercises = syncExercisesCount(merged.exercises, merged.exercises_count);
  }
  if (patch.exercises !== undefined) {
    merged.exercises_count = merged.exercises.length;
  }

  // 2. rest_between_exercises_enabled
  if (patch.rest_between_exercises_enabled === false) {
    merged.rest_between_exercises = null;
  } else if (patch.rest_between_exercises_enabled === true && merged.rest_between_exercises == null) {
    merged.rest_between_exercises = base.rest_between_exercises ?? 30;
  }

  // 3. Resize set_data se serve
  const needSetDataSync =
    patch.exercises !== undefined ||
    patch.exercises_count !== undefined ||
    patch.supersets_count !== undefined;
  if (needSetDataSync) {
    merged.set_data = syncSetData(
      merged.set_data,
      merged.exercises,
      merged.supersets_count,
      merged.rest_between_supersets,
    );
  }

  onChange(merged);
}

export function SupersetEditor({
  value,
  onChange,
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  exerciseOptions,
}: SupersetEditorProps) {
  const workoutOpts = workoutExerciseOptions.length > 0 ? workoutExerciseOptions : (exerciseOptions ?? []);
  // --- exercises CRUD ------------------------------------------------
  const updateExercise = (idx: number, patch: Partial<SupersetExercise>) => {
    const oldEx = value.exercises[idx];
    const nextExercises = value.exercises.map((e, i) =>
      i === idx ? { ...e, ...patch } : e,
    );

    // Propaga target/carico/name nelle celle che ancora hanno il vecchio valore di default
    const nextSetData = value.set_data.map((row, r) => {
      if (r !== idx) return row;
      const nextRow = { ...row };
      if (patch.exercise_id !== undefined) nextRow.exercise_id = patch.exercise_id;
      if (patch.name !== undefined) nextRow.exercise_name = patch.name;
      const targetChanged =
        patch.reps !== undefined ||
        patch.mode !== undefined ||
        patch.duration_seconds !== undefined;
      const loadChanged =
        patch.weight !== undefined ||
        patch.load_mode !== undefined ||
        patch.band_color !== undefined ||
        patch.other_text !== undefined;
      if (targetChanged || loadChanged) {
        nextRow.sets = row.sets.map((c) => {
          const next = { ...c };
          const sameOldTarget =
            getProtocolTargetMode(c) === getProtocolTargetMode(oldEx) &&
            c.reps === oldEx.reps &&
            (c.duration_seconds ?? null) === (oldEx.duration_seconds ?? null);
          if (targetChanged && sameOldTarget) {
            if (patch.mode !== undefined) next.mode = patch.mode;
            if (patch.reps !== undefined) next.reps = patch.reps;
            if (patch.duration_seconds !== undefined) {
              next.duration_seconds = patch.duration_seconds;
            }
          }
          const sameOldLoad =
            getLoadMode(c) === getLoadMode(oldEx) &&
            c.weight === oldEx.weight &&
            (c.band_color ?? null) === (oldEx.band_color ?? null) &&
            (c.other_text ?? null) === (oldEx.other_text ?? null);
          if (loadChanged && sameOldLoad) {
            if (patch.load_mode !== undefined) next.load_mode = patch.load_mode;
            if (patch.weight !== undefined) next.weight = patch.weight;
            if (patch.band_color !== undefined) next.band_color = patch.band_color;
            if (patch.other_text !== undefined) next.other_text = patch.other_text;
          }
          return next;
        });
      }
      return nextRow;
    });

    commit(value, { exercises: nextExercises, set_data: nextSetData }, onChange);
  };

  const addExercise = () => {
    const exercises = [...value.exercises, makeSupersetExercise()];
    commit(value, { exercises }, onChange);
  };

  const removeExercise = (idx: number) => {
    if (value.exercises.length <= 1) return;
    const exercises = value.exercises.filter((_, i) => i !== idx);
    commit(value, { exercises }, onChange);
  };

  // --- set_data cell edit -------------------------------------------
  const updateCell = (rIdx: number, cIdx: number, patch: Partial<SupersetSetCell>) => {
    const set_data = value.set_data.map((row, r) => {
      if (r !== rIdx) return row;
      return {
        ...row,
        sets: row.sets.map((c, i) => (i === cIdx ? { ...c, ...patch } : c)),
      };
    });
    commit(value, { set_data }, onChange);
  };

  // --- columns (supersets) add/remove from table ---------------------
  const addSuperset = () => {
    commit(value, { supersets_count: value.supersets_count + 1 }, onChange);
  };
  const removeSuperset = (cIdx: number) => {
    if (value.supersets_count <= 1) return;
    const set_data = value.set_data.map((row) => ({
      ...row,
      sets: row.sets
        .filter((_, i) => i !== cIdx)
        .map((c, i) => ({ ...c, set_number: i + 1 })),
    }));
    commit(value, { supersets_count: value.supersets_count - 1, set_data }, onChange);
  };

  // --- general fields ------------------------------------------------
  const setExercisesCount = (n: number) => {
    const clamped = Math.max(1, Math.floor(n));
    commit(value, { exercises_count: clamped }, onChange);
  };
  const setSupersetsCount = (n: number) => {
    const clamped = Math.max(1, Math.floor(n));
    commit(value, { supersets_count: clamped }, onChange);
  };
  const setRestBetweenSupersets = (n: number) => {
    const clamped = Math.max(0, Math.floor(n));
    const oldDefault = value.rest_between_supersets;
    // Propaga alle celle con rest_seconds === oldDefault (non personalizzate)
    const set_data = value.set_data.map((row) => ({
      ...row,
      sets: row.sets.map((c) =>
        c.rest_seconds === oldDefault ? { ...c, rest_seconds: clamped } : c,
      ),
    }));
    commit(value, { rest_between_supersets: clamped, set_data }, onChange);
  };

  return (
    <div className="rounded-md border bg-muted/20 p-2.5 space-y-3 min-w-0 max-w-full overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground">Configurazione Superset</p>

      {/* A — Dati generali */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Numero esercizi</Label>
          <Input
            type="number"
            min={1}
            value={value.exercises_count}
            onChange={(e) => setExercisesCount(Number(e.target.value) || 1)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Numero superset</Label>
          <Input
            type="number"
            min={1}
            value={value.supersets_count}
            onChange={(e) => setSupersetsCount(Number(e.target.value) || 1)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recupero tra superset (s)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={value.rest_between_supersets}
            onChange={(e) => setRestBetweenSupersets(Number(e.target.value) || 0)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recupero tra esercizi</Label>
          <div className="flex items-center gap-3 h-8">
            <Switch
              checked={value.rest_between_exercises_enabled}
              onCheckedChange={(checked) =>
                commit(value, { rest_between_exercises_enabled: checked }, onChange)
              }
            />
            {value.rest_between_exercises_enabled && (
              <Input
                type="number"
                min={0}
                step={5}
                value={value.rest_between_exercises ?? 30}
                onChange={(e) => {
                  const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                  commit(value, { rest_between_exercises: n }, onChange);
                }}
                className="h-8 w-24"
                placeholder="30"
              />
            )}
            {value.rest_between_exercises_enabled && (
              <span className="text-[10px] text-muted-foreground">secondi</span>
            )}
          </div>
        </div>
      </div>

      {/* B — Lista esercizi */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Esercizi del Superset</p>
        {value.exercises.map((ex, eIdx) => (
          <div
            key={ex.id}
            className="rounded-md border border-dashed bg-background p-1.5 space-y-1.5"
          >
            <div className="flex flex-col md:flex-row md:items-end gap-1.5">
              <div className="flex-1 min-w-0 space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">Esercizio</Label>
                <ProtocolExerciseCombobox
                  value={ex.name}
                  workoutExerciseOptions={workoutOpts}
                  favoriteExerciseOptions={favoriteExerciseOptions}
                  mineExerciseOptions={mineExerciseOptions}
                  globalExerciseOptions={globalExerciseOptions}
                  onChange={(opt) =>
                    updateExercise(eIdx, { name: opt.name, exercise_id: opt.id })
                  }
                />
              </div>
              <div className="flex items-end gap-1.5">
                <div className="w-24">
                  <ProtocolTargetField
                    value={ex}
                    label="Target"
                    onChange={(next) => updateExercise(eIdx, next)}
                  />
                </div>
                <div className="w-36">
                  <LoadField
                    compact
                    value={ex}
                    onChange={(load) => updateExercise(eIdx, load)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  disabled={value.exercises.length <= 1}
                  onClick={() => removeExercise(eIdx)}
                  aria-label="Elimina esercizio"
                  title="Elimina esercizio"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Note</Label>
              <Input
                type="text"
                value={ex.notes}
                placeholder="Es. fermo 1s al petto"
                onChange={(e) => updateExercise(eIdx, { notes: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={addExercise}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Aggiungi esercizio
        </Button>
      </div>

      {/* C — Tabella set finale */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          Tabella set <span className="text-muted-foreground/70">· la colonna Set X corrisponde al Superset X</span>
        </p>
        <div className="rounded-md border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 text-xs">Esercizio</TableHead>
                {Array.from({ length: value.supersets_count }).map((_, c) => (
                  <TableHead key={c} className="h-8 text-xs text-center">
                    Set {c + 1}
                  </TableHead>
                ))}
                <TableHead className="h-8 text-xs text-center w-[80px]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={addSuperset}
                    aria-label="Aggiungi set"
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> Set
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.set_data.map((row, rIdx) => (
                <TableRow key={value.exercises[rIdx]?.id ?? rIdx}>
                  <TableCell className="py-2 text-xs font-medium align-top">
                    {row.exercise_name || (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  {row.sets.map((cell, cIdx) => (
                    <TableCell key={cIdx} className="py-2 align-top">
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <ProtocolTargetField
                          value={cell}
                          showLabel={false}
                          inputClassName="h-7 text-xs px-1.5"
                          onChange={(next) => updateCell(rIdx, cIdx, next)}
                        />
                        <LoadField
                          compact
                          showLabel={false}
                          value={cell}
                          onChange={(load) => updateCell(rIdx, cIdx, load)}
                        />
                        <div className="grid grid-cols-1 gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={5}
                            value={cell.rest_seconds}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              updateCell(rIdx, cIdx, {
                                rest_seconds: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0,
                              });
                            }}
                            className="h-7 text-xs px-1.5"
                            aria-label={`Recupero Set ${cIdx + 1}`}
                            title="rec (s)"
                          />
                        </div>
                      </div>
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="py-1" />
                {Array.from({ length: value.supersets_count }).map((_, c) => (
                  <TableCell key={c} className="py-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      disabled={value.supersets_count <= 1}
                      onClick={() => removeSuperset(c)}
                      aria-label={`Elimina Set ${c + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Durante l'esecuzione i valori reali (reps, kg, recupero) sono quelli della tabella.
        La colonna Set X corrisponde al Superset X. L'atleta eseguirà la sequenza di esercizi
        e la ripeterà per il numero di superset impostato. Tra un esercizio e l'altro applica
        il recupero esercizi (se attivo); al termine della sequenza applica il recupero tra
        superset, tranne dopo l'ultimo.
      </p>
    </div>
  );
}
