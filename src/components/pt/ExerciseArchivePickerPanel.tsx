import { useMemo, useState, useEffect } from 'react';
import { Plus, Check, Star } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export type ExerciseOption = {
  id: string;
  name: string;
};

/** @deprecated Usare ExerciseOption */
export type ProtocolExerciseOption = ExerciseOption;

export function dedupeExerciseOptions(options: ExerciseOption[]): ExerciseOption[] {
  const seen = new Set<string>();
  const out: ExerciseOption[] = [];
  for (const o of options) {
    if (!o.name?.trim()) continue;
    const key = o.id?.trim() || o.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

/** Valore univoco per cmdk (evita collisioni su nomi uguali). */
export function exerciseCommandValue(o: ExerciseOption): string {
  return o.id ? `ex:${o.id}` : `nm:${o.name.trim().toLowerCase()}`;
}

function filterBySearch(options: ExerciseOption[], q: string): ExerciseOption[] {
  if (!q) return options;
  const lower = q.toLowerCase();
  return options.filter((o) => o.name.toLowerCase().includes(lower));
}

type SourceTab = 'workout' | 'favorites' | 'mine' | 'global';

function OptionItems({
  items,
  value,
  onPick,
  keyPrefix,
  showStar,
}: {
  items: ExerciseOption[];
  value?: string;
  onPick: (o: ExerciseOption) => void;
  keyPrefix: string;
  showStar?: boolean;
}) {
  return (
    <>
      {items.map((o) => (
        <CommandItem
          key={`${keyPrefix}-${o.id || o.name}`}
          value={exerciseCommandValue(o)}
          className="py-1 text-sm"
          onSelect={() => onPick(o)}
        >
          {value !== undefined && (
            <Check
              className={cn(
                'mr-2 h-3.5 w-3.5 shrink-0',
                value === o.name ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
          {showStar && <Star className="mr-1.5 h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
          <span className="truncate">{o.name}</span>
        </CommandItem>
      ))}
    </>
  );
}

export interface ExerciseArchivePickerProps {
  workoutExerciseOptions?: ExerciseOption[];
  favoriteExerciseOptions?: ExerciseOption[];
  mineExerciseOptions?: ExerciseOption[];
  globalExerciseOptions?: ExerciseOption[];
  /** @deprecated Usare favorite/mine/global */
  archiveExerciseOptions?: ExerciseOption[];
  /** Valore selezionato (mostra check). Omesso in modalità aggiunta. */
  value?: string;
  /** Quando true, azzera ricerca e tab (apertura popover). */
  open?: boolean;
  onSelect: (opt: { id?: string; name: string }) => void;
  /** Consenti nome libero non in archivio (editor protocolli). */
  showFreeOption?: boolean;
  /** Contenuto quando l'archivio è completamente vuoto. */
  emptyFallback?: React.ReactNode;
  className?: string;
}

export function ExerciseArchivePickerPanel({
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  archiveExerciseOptions = [],
  value,
  onSelect,
  showFreeOption = false,
  emptyFallback,
  open,
  className,
}: ExerciseArchivePickerProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<SourceTab | null>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTab(null);
    }
  }, [open]);

  const workout = dedupeExerciseOptions(workoutExerciseOptions);
  const favorites = dedupeExerciseOptions(favoriteExerciseOptions);
  const mine = dedupeExerciseOptions(mineExerciseOptions);
  const global =
    globalExerciseOptions.length > 0
      ? dedupeExerciseOptions(globalExerciseOptions)
      : dedupeExerciseOptions(archiveExerciseOptions);

  const sources = useMemo(
    () => ({ workout, favorites, mine, global }),
    [workout, favorites, mine, global],
  );

  const tabsWithItems = useMemo(() => {
    const defs: { key: SourceTab; label: string; count: number; star?: boolean }[] = [
      { key: 'workout', label: 'Workout', count: sources.workout.length },
      { key: 'favorites', label: 'Preferiti', count: sources.favorites.length, star: true },
      { key: 'mine', label: 'I miei', count: sources.mine.length },
      { key: 'global', label: 'Globale', count: sources.global.length },
    ];
    return defs.filter((d) => d.count > 0);
  }, [sources]);

  const activeTab: SourceTab | null =
    tab && tabsWithItems.some((t) => t.key === tab)
      ? tab
      : tabsWithItems[0]?.key ?? null;

  const q = search.trim();
  const activeItems = activeTab ? filterBySearch(sources[activeTab], q) : [];

  const allKnown = [...workout, ...favorites, ...mine, ...global];
  const showFree =
    showFreeOption &&
    q.length > 0 &&
    !allKnown.some((o) => o.name.toLowerCase() === q.toLowerCase());

  const pick = (o: ExerciseOption) => {
    onSelect({ id: o.id, name: o.name });
  };

  if (allKnown.length === 0 && emptyFallback) {
    return <>{emptyFallback}</>;
  }

  return (
    <Command
      shouldFilter={false}
      className={cn(
        'max-h-full overflow-hidden [&_[cmdk-item]]:py-2.5 sm:[&_[cmdk-item]]:py-1',
        className,
      )}
    >
      {tabsWithItems.length > 0 && (
        <div className="flex shrink-0 flex-nowrap gap-1 overflow-x-auto border-b p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabsWithItems.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:py-0.5',
                activeTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {t.star && (
                <Star
                  className={cn(
                    'h-2.5 w-2.5',
                    activeTab === t.key
                      ? 'fill-primary-foreground text-primary-foreground'
                      : 'fill-amber-400 text-amber-400',
                  )}
                />
              )}
              {t.label}
              <span className="opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      )}
      <CommandInput
        placeholder="Cerca esercizio…"
        value={search}
        onValueChange={setSearch}
        className="h-8 shrink-0 text-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
      />
      <CommandList className="max-h-[min(36vh,200px)] min-h-0 overflow-y-auto">
        {activeItems.length === 0 && !showFree && (
          <CommandEmpty className="py-4 text-xs">
            {allKnown.length === 0
              ? "Nessun esercizio disponibile nell'archivio."
              : 'Nessun esercizio trovato'}
          </CommandEmpty>
        )}
        {activeItems.length > 0 && (
          <CommandGroup>
            <OptionItems
              items={activeItems}
              value={value}
              keyPrefix={activeTab ?? 'x'}
              onPick={pick}
              showStar={activeTab === 'favorites'}
            />
          </CommandGroup>
        )}
        {showFree && (
          <CommandGroup heading="Personalizzato" className="[&_[cmdk-group-heading]]:text-[10px]">
            <CommandItem
              value={`__free__${search}`}
              className="py-1 text-sm"
              onSelect={() => onSelect({ name: q })}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Usa &quot;{q}&quot;
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

/** Stile condiviso per i popover del picker esercizi. */
export const exercisePickerPopoverClassName =
  'z-50 w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-1.5rem,280px)] max-w-[calc(100vw-1.5rem)] max-h-[min(70vh,420px)] overflow-hidden border-2 border-border p-0 shadow-lg';

export const exercisePickerPopoverProps = {
  side: 'bottom' as const,
  align: 'start' as const,
  sideOffset: 4,
  avoidCollisions: true,
  collisionPadding: 12,
};
