// =====================================================
// AMRAP EDITOR — Flat exercise list with global timer
// - 2 parametri globali in alto: duration_seconds, exercises_count
// - exercises_count è una scorciatoia: invariante exercises.length === exercises_count
// - Lista piatta: ExerciseCombobox + Reps + Kg
// - Nessuna scrittura automatica: ogni edit chiama onChange esplicitamente
// =====================================================

import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  type AmrapParams,
  type AmrapExercise,
  makeAmrapExercise,
  syncExercisesCount,
  formatAmrapDurationSeconds,
} from '@/lib/protocols/amrap';

export interface AmrapExerciseOption {
  id: string;
  name: string;
}

interface AmrapEditorProps {
  value: AmrapParams;
  onChange: (next: AmrapParams) => void;
  /** Esercizi del template corrente (TUTTI, non solo del blocco/circuito). */
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

export function AmrapEditor({ value, onChange, exerciseOptions = [] }: AmrapEditorProps) {
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
    <div className="rounded-md border bg-muted/20 p-3 space-y-4">
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
          <div
            key={ex.id}
            className="grid grid-cols-12 gap-2 items-end rounded-md border border-dashed bg-background p-2"
          >
            <div className="col-span-12 md:col-span-6 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Esercizio</Label>
              <ExerciseCombobox
                value={ex.name}
                options={exerciseOptions}
                onChange={(opt) =>
                  updateExercise(eIdx, { name: opt.name, exercise_id: opt.id })
                }
              />
            </div>
            <div className="col-span-6 md:col-span-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Reps</Label>
              <Input
                type="number"
                min={1}
                value={ex.reps}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  updateExercise(eIdx, {
                    reps: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1,
                  });
                }}
                className="h-8"
              />
            </div>
            <div className="col-span-5 md:col-span-3 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Kg</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={ex.weight ?? ''}
                placeholder="—"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    updateExercise(eIdx, { weight: null });
                    return;
                  }
                  const n = Number(raw);
                  updateExercise(eIdx, {
                    weight: Number.isFinite(n) && n >= 0 ? n : null,
                  });
                }}
                className="h-8"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                disabled={value.exercises.length <= 1}
                onClick={() => removeExercise(eIdx)}
                aria-label="Elimina esercizio"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="h-8" onClick={addExercise}>
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

// =====================================================
// ExerciseCombobox — autocomplete sui soli esercizi del template.
// Mantiene fallback "personalizzato" per non rompere righe legacy.
// =====================================================
interface ExerciseComboboxProps {
  value: string;
  options: AmrapExerciseOption[];
  onChange: (opt: { id?: string; name: string }) => void;
}

function ExerciseCombobox({ value, options, onChange }: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const uniqueOptions = (() => {
    const seen = new Set<string>();
    const out: AmrapExerciseOption[] = [];
    for (const o of options) {
      const k = o.name.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(o);
    }
    return out;
  })();

  const q = search.trim().toLowerCase();
  const filtered = q ? uniqueOptions.filter((o) => o.name.toLowerCase().includes(q)) : uniqueOptions;
  const showFreeOption = q.length > 0 && !uniqueOptions.some((o) => o.name.toLowerCase() === q);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-8 w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate">{value || 'Seleziona esercizio'}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca esercizio…"
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList>
            {filtered.length === 0 && !showFreeOption && (
              <CommandEmpty>
                {uniqueOptions.length === 0
                  ? "Nessun esercizio nel workout. Aggiungili nel tab Esercizi."
                  : 'Nessun esercizio trovato'}
              </CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Esercizi del workout">
                {filtered.map((o) => (
                  <CommandItem
                    key={o.id || o.name}
                    value={o.name}
                    onSelect={() => {
                      onChange({ id: o.id, name: o.name });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value === o.name ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showFreeOption && (
              <CommandGroup heading="Personalizzato">
                <CommandItem
                  value={`__free__${search}`}
                  onSelect={() => {
                    onChange({ name: search.trim() });
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Usa "{search.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
