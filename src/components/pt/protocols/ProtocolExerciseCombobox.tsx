import { useMemo, useState } from 'react';
import { Plus, Check, ChevronsUpDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export type ProtocolExerciseOption = {
  id: string;
  name: string;
};

export function dedupeExerciseOptions(
  options: ProtocolExerciseOption[],
): ProtocolExerciseOption[] {
  const seen = new Set<string>();
  const out: ProtocolExerciseOption[] = [];
  for (const o of options) {
    const key = (o.id || o.name.trim().toLowerCase()).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

function filterBySearch(options: ProtocolExerciseOption[], q: string): ProtocolExerciseOption[] {
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
  items: ProtocolExerciseOption[];
  value: string;
  onPick: (o: ProtocolExerciseOption) => void;
  keyPrefix: string;
  showStar?: boolean;
}) {
  return (
    <>
      {items.map((o) => (
        <CommandItem
          key={`${keyPrefix}-${o.id || o.name}`}
          value={o.name}
          className="py-1.5 text-sm"
          onSelect={() => onPick(o)}
        >
          <Check
            className={cn(
              'mr-2 h-3.5 w-3.5 shrink-0',
              value === o.name ? 'opacity-100' : 'opacity-0',
            )}
          />
          {showStar && <Star className="mr-1.5 h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
          <span className="truncate">{o.name}</span>
        </CommandItem>
      ))}
    </>
  );
}

export interface ProtocolExercisePickerProps {
  workoutExerciseOptions?: ProtocolExerciseOption[];
  favoriteExerciseOptions?: ProtocolExerciseOption[];
  mineExerciseOptions?: ProtocolExerciseOption[];
  globalExerciseOptions?: ProtocolExerciseOption[];
  /** @deprecated Usare favorite/mine/global */
  archiveExerciseOptions?: ProtocolExerciseOption[];
}

interface ProtocolExerciseComboboxProps extends ProtocolExercisePickerProps {
  value: string;
  onChange: (opt: { id?: string; name: string }) => void;
}

export function ProtocolExerciseCombobox({
  value,
  workoutExerciseOptions = [],
  favoriteExerciseOptions = [],
  mineExerciseOptions = [],
  globalExerciseOptions = [],
  archiveExerciseOptions = [],
  onChange,
}: ProtocolExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<SourceTab | null>(null);

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

  // Tab attivo: quello scelto, altrimenti il primo disponibile.
  const activeTab: SourceTab | null =
    tab && tabsWithItems.some((t) => t.key === tab)
      ? tab
      : tabsWithItems[0]?.key ?? null;

  const q = search.trim();
  const activeItems = activeTab ? filterBySearch(sources[activeTab], q) : [];

  const allKnown = [...workout, ...favorites, ...mine, ...global];
  const showFreeOption =
    q.length > 0 && !allKnown.some((o) => o.name.toLowerCase() === q.toLowerCase());

  const pick = (o: ProtocolExerciseOption) => {
    onChange({ id: o.id, name: o.name });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setSearch('');
          setTab(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-8 w-full justify-between font-normal text-sm',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{value || 'Seleziona esercizio'}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
        <Command shouldFilter={false}>
          {tabsWithItems.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b p-1.5">
              {tabsWithItems.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
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
            className="h-8 text-sm"
          />
          <CommandList className="max-h-72">
            {activeItems.length === 0 && !showFreeOption && (
              <CommandEmpty className="py-4 text-xs">
                {allKnown.length === 0
                  ? 'Nessun esercizio disponibile nell\'archivio.'
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
            {showFreeOption && (
              <CommandGroup heading="Personalizzato" className="[&_[cmdk-group-heading]]:text-[10px]">
                <CommandItem
                  value={`__free__${search}`}
                  className="py-1.5 text-sm"
                  onSelect={() => {
                    onChange({ name: q });
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Usa &quot;{q}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
