// =====================================================
// EMOM BLOCKS EDITOR
// Editor dedicato per il protocollo EMOM con struttura a blocchi.
// Sostituisce la form generica nei `paramFields` quando ptype === 'EMOM'.
// =====================================================

import { Plus, Trash2, ChevronDown, ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  autoBlockLabel,
} from '@/lib/protocols/emom';

export interface EmomExerciseOption {
  id: string;
  name: string;
}

interface EmomBlocksEditorProps {
  value: EmomParams;
  onChange: (next: EmomParams) => void;
  /**
   * Esercizi disponibili nel template corrente (tab "Esercizi").
   * Usati per l'autocomplete del campo "Esercizio" nei blocchi.
   */
  exerciseOptions?: EmomExerciseOption[];
}

export function EmomBlocksEditor({ value, onChange, exerciseOptions = [] }: EmomBlocksEditorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const updateBlock = (idx: number, patch: Partial<EmomBlock>) => {
    const blocks = value.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange({ ...value, blocks });
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
    onChange({ ...value, blocks });
  };

  const addBlock = () => {
    onChange({ ...value, blocks: [...value.blocks, makeEmomBlock()] });
  };

  const removeBlock = (idx: number) => {
    if (value.blocks.length <= 1) return;
    onChange({ ...value, blocks: value.blocks.filter((_, i) => i !== idx) });
  };

  const addExercise = (blockIdx: number) => {
    const blocks = value.blocks.map((b, i) =>
      i === blockIdx ? { ...b, exercises: [...b.exercises, makeEmomExercise()] } : b,
    );
    onChange({ ...value, blocks });
  };

  const removeExercise = (blockIdx: number, exIdx: number) => {
    const blocks = value.blocks.map((b, i) => {
      if (i !== blockIdx) return b;
      if (b.exercises.length <= 1) return b;
      return { ...b, exercises: b.exercises.filter((_, j) => j !== exIdx) };
    });
    onChange({ ...value, blocks });
  };

  // Anteprima alternanza (max 6 round)
  const previewRounds = Math.min(value.rounds, 6);
  const preview = Array.from({ length: previewRounds }).map((_, i) => {
    const b = value.blocks[i % value.blocks.length];
    return b?.label?.trim() || autoBlockLabel(value.blocks.indexOf(b));
  });

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Parametri EMOM a blocchi</p>

      {/* Parametri base */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Numero round</Label>
          <Input
            type="number"
            min={1}
            value={value.rounds}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ ...value, rounds: Number.isFinite(n) && n > 0 ? n : 1 });
            }}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Durata round (min)</Label>
          <Input
            type="number"
            min={1}
            step={0.5}
            value={value.duration_minutes}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ ...value, duration_minutes: Number.isFinite(n) && n > 0 ? n : 1 });
            }}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Numero blocchi</Label>
          <div className="h-8 flex items-center px-3 rounded-md border bg-background text-sm font-medium">
            {value.blocks.length}
          </div>
        </div>
      </div>

      {/* Anteprima alternanza */}
      <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
        <p className="text-[11px] font-semibold text-foreground/80 mb-1">
          Alternanza round → blocco
        </p>
        <div className="flex flex-wrap gap-1.5">
          {preview.map((label, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] font-normal">
              R{i + 1} → {label}
            </Badge>
          ))}
          {value.rounds > previewRounds && (
            <Badge variant="outline" className="text-[10px] font-normal">
              … (loop)
            </Badge>
          )}
        </div>
      </div>

      {/* Blocchi */}
      <div className="space-y-3">
        {value.blocks.map((block, bIdx) => {
          const isCollapsed = collapsed[block.id] ?? false;
          const defaultLabel = autoBlockLabel(bIdx);
          return (
            <div key={block.id} className="rounded-md border bg-background p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !isCollapsed }))}
                  aria-label={isCollapsed ? 'Espandi' : 'Riduci'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  placeholder={defaultLabel}
                  value={block.label ?? ''}
                  onChange={(e) => updateBlock(bIdx, { label: e.target.value || undefined })}
                  className="h-8 flex-1"
                />
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {block.exercises.length}{' '}
                  {block.exercises.length === 1 ? 'esercizio' : 'esercizi'}
                </Badge>
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

              {!isCollapsed && (
                <>
                  <div className="space-y-2">
                    {block.exercises.map((ex, eIdx) => (
                      <div
                        key={ex.id}
                        className="grid grid-cols-12 gap-2 items-end rounded-md border border-dashed bg-muted/20 p-2"
                      >
                        <div className="col-span-12 md:col-span-5 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Esercizio
                          </Label>
                          <ExerciseCombobox
                            value={ex.name}
                            options={exerciseOptions}
                            onChange={(name) =>
                              updateExercise(bIdx, eIdx, { name })
                            }
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Tipo</Label>
                          <Select
                            value={ex.measure}
                            onValueChange={(v) =>
                              updateExercise(bIdx, eIdx, {
                                measure: v as 'reps' | 'time',
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="reps">Reps</SelectItem>
                              <SelectItem value="time">Tempo (s)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Valore</Label>
                          <Input
                            type="number"
                            min={1}
                            value={ex.value}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              updateExercise(bIdx, eIdx, {
                                value: Number.isFinite(n) && n > 0 ? n : 1,
                              });
                            }}
                            className="h-8"
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Modalità</Label>
                          <Select
                            value={ex.progression}
                            onValueChange={(v) =>
                              updateExercise(bIdx, eIdx, {
                                progression: v as 'fixed' | 'ladder',
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fisso</SelectItem>
                              <SelectItem value="ladder">Ladder</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 flex justify-end">
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
                </>
              )}
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
// ExerciseCombobox — autocomplete sui soli esercizi del template,
// con possibilità di scrivere un nome libero (fallback).
// =====================================================
interface ExerciseComboboxProps {
  value: string;
  options: EmomExerciseOption[];
  onChange: (name: string) => void;
}

function ExerciseCombobox({ value, options, onChange }: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Deduplica opzioni per nome (case-insensitive)
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

  // Permette di confermare un nome libero (non presente in lista)
  const showFreeOption =
    q.length > 0 &&
    !uniqueOptions.some((o) => o.name.toLowerCase() === q);

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
            placeholder="Cerca o scrivi un esercizio…"
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList>
            {filtered.length === 0 && !showFreeOption && (
              <CommandEmpty>Nessun esercizio trovato</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Esercizi del workout">
                {filtered.map((o) => (
                  <CommandItem
                    key={o.id || o.name}
                    value={o.name}
                    onSelect={() => {
                      onChange(o.name);
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
                    onChange(search.trim());
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
