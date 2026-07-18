import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useExerciseCatalogs,
  useAllPtCatalogItems,
  useToggleCatalogItem,
} from '@/hooks/useExerciseCatalogs';

interface ExerciseCatalogPickerProps {
  exerciseId: string;
}

export function ExerciseCatalogPicker({ exerciseId }: ExerciseCatalogPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: catalogs = [] } = useExerciseCatalogs();
  const { data: items = [] } = useAllPtCatalogItems();
  const toggleItem = useToggleCatalogItem();

  const memberCatalogIds = new Set(
    items.filter((i) => i.exercise_id === exerciseId).map((i) => i.catalog_id),
  );
  const isInAnyCatalog = memberCatalogIds.size > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title="Aggiungi a un catalogo"
        >
          <Layers
            className={cn(
              'h-4 w-4 transition-colors',
              isInAnyCatalog ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-sm font-medium mb-2">Aggiungi ai cataloghi</p>
        {catalogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Non hai ancora creato nessun catalogo. Usa "Crea catalogo" per iniziare.
          </p>
        ) : (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {catalogs.map((c) => {
              const checked = memberCatalogIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/60 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      toggleItem.mutate({ catalogId: c.id, exerciseId, checked: !checked })
                    }
                    disabled={toggleItem.isPending}
                  />
                  <span>{c.emoji}</span>
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default ExerciseCatalogPicker;
