// =====================================================
// EMOM BLOCKS EDITOR (v2)
// - 3 parametri globali in alto: rounds, round_duration, blocks_count.
// - blocks_count è la fonte di verità: sincronizzato con blocks.length.
// - Ogni blocco contiene esercizi con SOLO: dropdown esercizio + reps.
// - Il dropdown viene popolato da `exerciseOptions` (tutti gli esercizi del workout).
// - Nessuna scrittura automatica: ogni edit chiama onChange esplicitamente.
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
  type EmomParams,
  type EmomBlock,
  type EmomBlockExercise,
  makeEmomBlock,
  makeEmomExercise,
  syncBlocksCount,
  autoBlockLabel,
  formatRoundDurationSeconds,
} from '@/lib/protocols/emom';

export interface EmomExerciseOption {
  id: string;     // exercise_id
  name: string;
}

interface EmomBlocksEditorProps {
  value: EmomParams;
  onChange: (next: EmomParams) => void;
  /** Esercizi del template corrente (TUTTI, non solo quelli del blocco/circuito). */
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
  exerciseOptions = [],
}: EmomBlocksEditorProps) {
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
    <div className="rounded-md border bg-muted/20 p-3 space-y-4">
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
      <div className="space-y-3">
        {value.blocks.map((block, bIdx) => {
          const defaultLabel = autoBlockLabel(bIdx);
          return (
            <div key={block.id} className="rounded-md border bg-background p-3 space-y-3">
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

              <div className="space-y-2">
                {block.exercises.map((ex, eIdx) => (
                  <div
                    key={ex.id}
                    className="grid grid-cols-12 gap-2 items-end rounded-md border border-dashed bg-muted/20 p-2"
                  >
                    <div className="col-span-12 md:col-span-8 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Esercizio</Label>
                      <ExerciseCombobox
                        value={ex.name}
                        options={exerciseOptions}
                        onChange={(opt) =>
                          updateExercise(bIdx, eIdx, {
                            name: opt.name,
                            exercise_id: opt.id,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-9 md:col-span-3 space-y-1">
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

// =====================================================
// ExerciseCombobox — autocomplete sui soli esercizi del template.
// Mantiene fallback "personalizzato" per non rompere righe legacy.
// =====================================================
interface ExerciseComboboxProps {
  value: string;
  options: EmomExerciseOption[];
  onChange: (opt: { id?: string; name: string }) => void;
}

function ExerciseCombobox({ value, options, onChange }: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Deduplica per nome (case-insensitive)
  const uniqueOptions = (() => {
    const seen = new Set<string>();
    const out: EmomExerciseOption[] = [];
    for (const o of options) {
      const k = o.name.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(o);
    }
    return out;
  })();

  const q = search.trim().toLowerCase();
  const filtered = q
    ? uniqueOptions.filter((o) => o.name.toLowerCase().includes(q))
    : uniqueOptions;

  const showFreeOption =
    q.length > 0 && !uniqueOptions.some((o) => o.name.toLowerCase() === q);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-8 w-full justify-between font-normal',
            !value && 'text-muted-foreground',
          )}
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
