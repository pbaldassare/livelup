import { useState } from 'react';
import { Folders, FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateCatalogDialog } from '@/components/pt/CreateCatalogDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  useExerciseCatalogs,
  useExerciseCatalogItems,
  useToggleCatalogItem,
  type ExerciseCatalog,
} from '@/hooks/useExerciseCatalogs';

interface ExerciseCatalogAssignPopoverProps {
  exerciseId: string;
}

export function ExerciseCatalogAssignPopover({ exerciseId }: ExerciseCatalogAssignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { user } = useAuth();
  const { data: allCatalogs = [] } = useExerciseCatalogs();
  const catalogs = allCatalogs.filter((c) => c.pt_user_id === user?.id);
  const { data: assignedCatalogIds = [], isLoading } = useExerciseCatalogItems(exerciseId, open);
  const toggleItem = useToggleCatalogItem();

  const assignedSet = new Set(assignedCatalogIds);

  const handleCatalogCreated = (catalog: ExerciseCatalog) => {
    // UX: il catalogo appena creato viene subito associato all'esercizio da cui si è partiti.
    toggleItem.mutate({ exerciseId, catalogId: catalog.id, checked: true });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title="Aggiungi ai cataloghi"
          >
            <Folders className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-3"
          align="end"
          onInteractOutside={(e) => {
            if (createOpen) e.preventDefault();
          }}
        >
          <p className="text-sm font-medium mb-2">Aggiungi ai cataloghi</p>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : catalogs.length === 0 ? (
            <p className="text-xs text-muted-foreground mb-2">
              Non hai ancora nessun catalogo. Creane uno per organizzare i tuoi esercizi.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto mb-2 -mx-1">
              {catalogs.map((c) => {
                const checked = assignedSet.has(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={toggleItem.isPending}
                      onCheckedChange={(v) =>
                        toggleItem.mutate({ exerciseId, catalogId: c.id, checked: v === true })
                      }
                    />
                    <span className="shrink-0">{c.emoji}</span>
                    <span className="truncate">{c.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
            Crea catalogo
          </Button>
        </PopoverContent>
      </Popover>

      <CreateCatalogDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCatalogCreated}
      />
    </>
  );
}

export default ExerciseCatalogAssignPopover;
