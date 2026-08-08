import { useMemo, useState, useEffect } from 'react';
import { Plus, Check, Star, ChevronLeft } from 'lucide-react';
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

export type CatalogPickerOption = {
  id: string;
  name: string;
  emoji?: string | null;
  exercises: ExerciseOption[];
};

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

type SourceTab = 'favorites' | 'mine' | 'global' | 'catalogs' | 'workout';

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
  /** Cataloghi PT con esercizi precaricati. */
  catalogOptions?: CatalogPickerOption[];
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

const EMPTY_TAB_MESSAGE: Record<Exclude<SourceTab, 'catalogs' | 'workout'>, string> = {
  favorites: 'Nessun preferito',
  mine: 'Nessun esercizio personale',
  global: 'Nessun esercizio globale',
};

export function ExerciseArchivePickerPanel({
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  catalogOptions = [],
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
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTab(null);
      setSelectedCatalogId(null);
    }
  }, [open]);

  const workout = dedupeExerciseOptions(workoutExerciseOptions);
  const favorites = dedupeExerciseOptions(favoriteExerciseOptions);
  const mine = dedupeExerciseOptions(mineExerciseOptions);
  const global =
    globalExerciseOptions.length > 0
      ? dedupeExerciseOptions(globalExerciseOptions)
      : dedupeExerciseOptions(archiveExerciseOptions);
  const catalogs = useMemo(
    () =>
      catalogOptions.map((c) => ({
        ...c,
        exercises: dedupeExerciseOptions(c.exercises ?? []),
      })),
    [catalogOptions],
  );

  const sources = useMemo(
    () => ({ workout, favorites, mine, global }),
    [workout, favorites, mine, global],
  );

  const tabsWithItems = useMemo(() => {
    const always: { key: SourceTab; label: string; count: number; star?: boolean }[] = [
      { key: 'favorites', label: 'Preferiti', count: sources.favorites.length, star: true },
      { key: 'mine', label: 'I miei', count: sources.mine.length },
      { key: 'global', label: 'Globale', count: sources.global.length },
      { key: 'catalogs', label: 'Cataloghi', count: catalogs.length },
    ];
    if (sources.workout.length > 0) {
      always.push({ key: 'workout', label: 'Workout', count: sources.workout.length });
    }
    return always;
  }, [sources, catalogs.length]);

  const activeTab: SourceTab =
    tab && tabsWithItems.some((t) => t.key === tab)
      ? tab
      : tabsWithItems[0]?.key ?? 'favorites';

  const selectedCatalog = useMemo(
    () => (selectedCatalogId ? catalogs.find((c) => c.id === selectedCatalogId) ?? null : null),
    [catalogs, selectedCatalogId],
  );

  // Reset drill-down when leaving Cataloghi
  useEffect(() => {
    if (activeTab !== 'catalogs') {
      setSelectedCatalogId(null);
    }
  }, [activeTab]);

  const q = search.trim();

  const catalogListFiltered = useMemo(() => {
    if (!q) return catalogs;
    const lower = q.toLowerCase();
    return catalogs.filter((c) => c.name.toLowerCase().includes(lower));
  }, [catalogs, q]);

  const activeItems =
    activeTab === 'catalogs'
      ? selectedCatalog
        ? filterBySearch(selectedCatalog.exercises, q)
        : []
      : filterBySearch(sources[activeTab], q);

  const allKnown = useMemo(() => {
    const fromCatalogs = catalogs.flatMap((c) => c.exercises);
    return [...workout, ...favorites, ...mine, ...global, ...fromCatalogs];
  }, [workout, favorites, mine, global, catalogs]);

  const showFree =
    showFreeOption &&
    q.length > 0 &&
    activeTab !== 'catalogs' &&
    !allKnown.some((o) => o.name.toLowerCase() === q.toLowerCase());

  const pick = (o: ExerciseOption) => {
    onSelect({ id: o.id, name: o.name });
  };

  const handleTabClick = (key: SourceTab) => {
    setTab(key);
    setSearch('');
    if (key !== 'catalogs') setSelectedCatalogId(null);
  };

  const emptyMessage = (): string => {
    if (activeTab === 'catalogs') {
      if (!selectedCatalog) {
        return catalogs.length === 0
          ? 'Nessun catalogo. Creane uno da Archivio Esercizi.'
          : 'Nessun catalogo trovato';
      }
      return selectedCatalog.exercises.length === 0
        ? 'Nessun esercizio in questo catalogo'
        : 'Nessun esercizio trovato';
    }
    if (activeTab === 'workout') {
      return sources.workout.length === 0
        ? 'Nessun esercizio nel workout'
        : 'Nessun esercizio trovato';
    }
    if (sources[activeTab].length === 0) {
      return EMPTY_TAB_MESSAGE[activeTab];
    }
    return 'Nessun esercizio trovato';
  };

  // Solo se non ci sono tab (caso estremo) e c'è un fallback dedicato
  if (tabsWithItems.length === 0 && emptyFallback) {
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
              onClick={() => handleTabClick(t.key)}
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

      {activeTab === 'catalogs' && selectedCatalog && (
        <button
          type="button"
          onClick={() => {
            setSelectedCatalogId(null);
            setSearch('');
          }}
          className="flex shrink-0 items-center gap-1 border-b px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Cataloghi
          <span className="ml-1 truncate text-foreground">
            {selectedCatalog.emoji ? `${selectedCatalog.emoji} ` : ''}
            {selectedCatalog.name}
          </span>
        </button>
      )}

      <CommandInput
        placeholder={
          activeTab === 'catalogs' && !selectedCatalog
            ? 'Cerca catalogo…'
            : 'Cerca esercizio…'
        }
        value={search}
        onValueChange={setSearch}
        className="h-8 shrink-0 text-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
      />
      <CommandList className="max-h-[min(36vh,200px)] min-h-0 overflow-y-auto">
        {activeTab === 'catalogs' && !selectedCatalog ? (
          catalogListFiltered.length === 0 ? (
            <CommandEmpty className="py-4 text-xs">{emptyMessage()}</CommandEmpty>
          ) : (
            <CommandGroup>
              {catalogListFiltered.map((c) => (
                <CommandItem
                  key={`cat-${c.id}`}
                  value={`catalog:${c.id}:${c.name}`}
                  className="py-1 text-sm"
                  onSelect={() => {
                    setSelectedCatalogId(c.id);
                    setSearch('');
                  }}
                >
                  <span className="mr-1.5 shrink-0">{c.emoji || '🗂️'}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                    {c.exercises.length}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        ) : (
          <>
            {activeItems.length === 0 && !showFree && (
              <CommandEmpty className="py-4 text-xs">{emptyMessage()}</CommandEmpty>
            )}
            {activeItems.length > 0 && (
              <CommandGroup>
                <OptionItems
                  items={activeItems}
                  value={value}
                  keyPrefix={
                    activeTab === 'catalogs' && selectedCatalog
                      ? `cat-${selectedCatalog.id}`
                      : activeTab
                  }
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
          </>
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
